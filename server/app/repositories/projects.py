from typing import Dict, Any, Optional, List
from bson import ObjectId
from app.infrastructure.database.mongo import get_db
from app.infrastructure.vector.store import delete_project_vectors

from app.repositories.assets import get_project_assets
from app.repositories.chapters import get_project_chapters
from app.repositories.characters import get_project_characters
from app.repositories.entities import get_project_entities
from app.repositories.artifacts import get_project_artifacts


def _format_character_for_memory(character: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": character.get("id") or character.get("_id"),
        "name": character.get("name", "Unnamed Character"),
        "role": character.get("role", ""),
        "arc": character.get("arc", ""),
        "activeChapters": character.get("activeChapters", []),
        "attributes": character.get("attributes", {}),
        "status": character.get("status", "draft"),
    }


def _format_entity_for_memory(entity: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": entity.get("id") or entity.get("_id"),
        "name": entity.get("name", "Unnamed Entity"),
        "type": entity.get("type", "concept"),
        "description": entity.get("description", ""),
        "attributes": entity.get("attributes", {}),
        "status": entity.get("status", "draft"),
    }


def build_project_memory_payload(project: Dict[str, Any], characters: List[Dict[str, Any]], entities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Structured memory block for the workspace Memory tab."""
    return {
        "projectVoice": {
            "genre": project.get("genre", ""),
            "tonality": project.get("tonality", "Conversational"),
            "bookSummary": project.get("bookSummary", ""),
            "readerProfile": project.get("readerProfile", ""),
            "targetWordCount": project.get("targetWordCount"),
            "forbiddenPhrases": project.get("forbiddenPhrases", []),
        },
        "characters": [_format_character_for_memory(c) for c in characters],
        "worldEntities": [_format_entity_for_memory(e) for e in entities],
    }


DEFAULT_PROJECT_SETTINGS: Dict[str, Any] = {
    "plannerModel": {"provider": "Nvidia", "modelName": "mistralai/mistral-large-3-675b-instruct-2512"},
    "writerModel": {"provider": "Nvidia", "modelName": "mistralai/mistral-large-3-675b-instruct-2512"},
    "worldBuilderModel": {"provider": "Nvidia", "modelName": "mistralai/mistral-large-3-675b-instruct-2512"},
}


def get_project_settings(project_id: str) -> Dict[str, Any]:
    db = get_db()
    project = db.projects.find_one({"_id": project_id}, {"settings": 1})
    if not project:
        return {}
    return project.get("settings", {})


def update_project_settings(project_id: str, settings: Dict[str, Any]) -> None:
    db = get_db()
    db.projects.update_one(
        {"_id": project_id},
        {"$set": {"settings": settings}},
    )


def get_unified_project_payload(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Full project payload for the workspace view.
    Returns the workspace payload used by the frontend as source of truth.
    """
    p = get_project(project_id)
    if not p:
        return None

    chapters = get_project_chapters(project_id)
    characters = get_project_characters(project_id)
    entities = get_project_entities(project_id)
    assets = get_project_assets(project_id)
    artifacts = get_project_artifacts(project_id, include_content=False)

    has_published = any(c.get("status") in {"published", "completed"} for c in chapters)

    return {
        "id":        p["_id"],
        "title":     p["title"],
        "subtitle":  p.get("subtitle", ""),
        "genre":     p.get("genre", ""),
        "brief":     assets[0]["content"] if assets else "",
        "tonality":  p["tonality"],
        "readerProfile": p.get("readerProfile", ""),
        "targetWordCount": p.get("targetWordCount"),
        "status":    "Reviewing" if has_published else "Planning",
        "createdAt": p["createdAt"],
        "bookSummary": p.get("bookSummary", ""),
        "chapters":  chapters,
        "assets":    assets,
        "artifacts": artifacts,
        "settings":  p.get("settings", {}),
        "memory": build_project_memory_payload(p, characters, entities),
    }


def get_project_summary(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Lightweight project summary for list views.
    Only fetches essential metadata — no chapter content, no characters.
    """
    db = get_db()
    p = db.projects.find_one({"_id": project_id})
    if not p:
        return None

    asset_count = db.user_assets.count_documents({"projectId": project_id})
    chapter_count = db.chapters.count_documents({"projectId": project_id})
    published_chapter_count = db.chapters.count_documents(
        {"projectId": project_id, "status": {"$in": ["published", "completed"]}}
    )
    first_asset = db.user_assets.find_one(
        {"projectId": project_id},
        sort=[("addedAt", 1)],
    )
    brief = first_asset.get("content", "") if first_asset else ""

    assets = list(db.user_assets.find(
        {"projectId": project_id},
        {"_id": 1, "name": 1, "type": 1, "size": 1, "addedAt": 1},
    ).sort("addedAt", -1))

    formatted_assets = [
        {
            "id":      str(a["_id"]),
            "name":    a.get("name", ""),
            "type":    a.get("type", ""),
            "size":    a.get("size", ""),
            "addedAt": a.get("addedAt", ""),
        }
        for a in assets
    ]

    return {
        "id":         p["_id"],
        "title":      p["title"],
        "subtitle":   p.get("subtitle", ""),
        "genre":      p.get("genre", ""),
        "brief":      brief,
        "tonality":   p.get("tonality", "Conversational"),
        "status":     "Ready",
        "createdAt":  p["createdAt"],
        "assets":     formatted_assets,
        "assetCount": asset_count,
        "chapterCount": chapter_count,
        "publishedChapterCount": published_chapter_count,
    }


def create_project(
    title: str,
    subtitle: str,
    genre: str,
    tonality: str,
    created_at: str,
    settings: Dict[str, Any],
) -> str:
    db = get_db()
    project_id = f"project_{ObjectId()}"
    db.projects.insert_one({
        "_id":        project_id,
        "id":         project_id,
        "title":      title,
        "subtitle":   subtitle,
        "genre":      genre,
        "tonality":   tonality,
        "createdAt":  created_at,
        "bookSummary": "",
        "settings":   settings,
    })
    return project_id


def delete_project(project_id: str) -> None:
    """Hard-delete a project and all related documents."""
    db = get_db()
    db.projects.delete_one({"_id": project_id})
    db.chapters.delete_many({"projectId": project_id})
    db.user_assets.delete_many({"projectId": project_id})
    db.character_bible.delete_many({"projectId": project_id})
    db.entity_bible.delete_many({"projectId": project_id})
    db.agent_runs.delete_many({"projectId": project_id})
    db.artifacts.delete_many({"projectId": project_id})
    db.chat_messages.delete_many({"projectId": project_id})
    delete_project_vectors(project_id)


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    return db.projects.find_one({"_id": project_id})


def get_all_projects() -> List[Dict[str, Any]]:
    db = get_db()
    return list(db.projects.find({}).sort("createdAt", -1))


def get_book_summary(project_id: str) -> str:
    """Return the rolling book summary stored on the project document."""
    db = get_db()
    project = db.projects.find_one({"_id": project_id}, {"bookSummary": 1})
    if not project:
        return ""
    return project.get("bookSummary", "")


def update_book_summary(project_id: str, summary: str) -> None:
    """
    Persist the rolling book summary (≤ ~400 words) back to the project document.
    Called by the editor node after every chapter is published.
    """
    db = get_db()
    db.projects.update_one(
        {"_id": project_id},
        {"$set": {"bookSummary": summary}},
    )
