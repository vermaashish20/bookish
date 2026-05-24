from typing import Any, Dict, List, Optional

from bson import ObjectId

from db.mongo import get_db


def add_chapter(project_id: str, number: int, title: str, content: Optional[str], word_count: int, status: str):
    db = get_db()
    chapter_id = f"chapter_{ObjectId()}"
    db.chapters.insert_one({
        "_id": chapter_id,
        "id": chapter_id,
        "projectId": project_id,
        "number": number,
        "title": title,
        "content": content,
        "wordCount": word_count,
        "status": status,
    })
    return chapter_id


def get_project_chapters(project_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    chapters = list(db.chapters.find({"projectId": project_id}).sort("number", 1))
    for ch in chapters:
        ch["id"] = ch["_id"]
    return chapters


def update_chapter_content(chapter_id: str, content: str, word_count: int, status: str):
    db = get_db()
    db.chapters.update_one(
        {"_id": chapter_id},
        {"$set": {
            "content": content,
            "wordCount": word_count,
            "status": status,
        }},
    )


def shift_chapters_upstream(project_id: str, start_number: int):
    db = get_db()
    db.chapters.update_many(
        {"projectId": project_id, "number": {"$gte": start_number}},
        {"$inc": {"number": 1}},
    )
