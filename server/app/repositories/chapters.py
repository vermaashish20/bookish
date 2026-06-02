from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.infrastructure.database.mongo import get_db
from app.services.indexing import enqueue_index_chapter
from app.agents.streaming import publish_sync_event


def _publish_chapter(project_id: str, chapter_id: str) -> None:
    db = get_db()
    chapter = db.chapters.find_one({"_id": chapter_id, "projectId": project_id})
    if chapter:
        chapter["id"] = chapter["_id"]
        publish_sync_event("chapter_upserted", chapter=chapter)


def add_chapter(project_id: str, number: int, title: str, content: Optional[str], word_count: int, status: str, summary: Optional[str] = None):
    db = get_db()
    chapter_id = f"chapter_{ObjectId()}"
    chapter = {
        "_id": chapter_id,
        "id": chapter_id,
        "projectId": project_id,
        "number": number,
        "title": title,
        "content": content,
        "summary": summary or "",   # one-paragraph synopsis, updated by editor
        "wordCount": word_count,
        "status": status,
    }
    db.chapters.insert_one(chapter)
    enqueue_index_chapter(project_id, chapter_id)
    publish_sync_event("chapter_upserted", chapter=chapter)
    return chapter_id


def get_project_chapters(project_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    chapters = list(db.chapters.find({"projectId": project_id}).sort("number", 1))
    for ch in chapters:
        ch["id"] = ch["_id"]
    return chapters


def update_chapter_content(chapter_id: str, content: str, word_count: int, status: str, summary: Optional[str] = None):
    db = get_db()
    update_fields = {
        "content": content,
        "wordCount": word_count,
        "status": status,
    }
    if summary is not None:
        update_fields["summary"] = summary
    db.chapters.update_one(
        {"_id": chapter_id},
        {"$set": update_fields},
    )
    doc = db.chapters.find_one({"_id": chapter_id}, {"projectId": 1})
    if doc:
        enqueue_index_chapter(doc["projectId"], chapter_id)
        _publish_chapter(doc["projectId"], chapter_id)


def update_chapter_summary(chapter_id: str, summary: str):
    """Update only the chapter summary (called by editor after polishing)."""
    db = get_db()
    db.chapters.update_one(
        {"_id": chapter_id},
        {"$set": {"summary": summary}},
    )
    doc = db.chapters.find_one({"_id": chapter_id}, {"projectId": 1})
    if doc:
        enqueue_index_chapter(doc["projectId"], chapter_id)
        _publish_chapter(doc["projectId"], chapter_id)


def get_chapter_content(
    project_id: str,
    *,
    chapter_id: Optional[str] = None,
    chapter_number: Optional[int] = None,
) -> Optional[str]:
    """Load full chapter body for read_chapter tool / RAG."""
    db = get_db()
    query: Dict[str, Any] = {"projectId": project_id}
    if chapter_id:
        query["_id"] = chapter_id
    elif chapter_number is not None:
        query["number"] = chapter_number
    else:
        return None

    doc = db.chapters.find_one(query, {"content": 1})
    if not doc:
        return None
    return doc.get("content") or ""


def get_chapter_summaries(project_id: str) -> List[Dict[str, Any]]:
    """
    Lightweight chapter list — excludes full content.
    Returns number, title, summary, wordCount, status only.
    Safe to embed in agent context without bloating the token budget.
    """
    db = get_db()
    chapters = list(
        db.chapters.find(
            {"projectId": project_id},
            {"_id": 1, "number": 1, "title": 1, "summary": 1, "wordCount": 1, "status": 1},
        ).sort("number", 1)
    )
    for ch in chapters:
        ch["id"] = ch["_id"]
    return chapters


def shift_chapters_upstream(project_id: str, start_number: int):
    db = get_db()
    db.chapters.update_many(
        {"projectId": project_id, "number": {"$gte": start_number}},
        {"$inc": {"number": 1}},
    )
