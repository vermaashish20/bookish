from typing import Any, Dict, List

from bson import ObjectId

from app.infrastructure.database.mongo import get_db
from app.services.indexing import index_character


def add_character(project_id: str, name: str, role: str, arc: str, active_chapters: List[int], attributes: Dict[str, Any], status: str = "draft"):
    db = get_db()
    char_id = f"character_{ObjectId()}"
    db.character_bible.insert_one({
        "_id": char_id,
        "id": char_id,
        "projectId": project_id,
        "name": name,
        "role": role,
        "arc": arc,
        "activeChapters": active_chapters,
        "attributes": attributes,
        "status": status,  # "draft" or "published"
    })
    index_character(project_id, char_id)
    return char_id


def get_project_characters(project_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    characters = list(db.character_bible.find({"projectId": project_id}))
    for char in characters:
        char["id"] = char["_id"]
    return characters


def update_character(
    character_id: str,
    name: str = None,
    role: str = None,
    arc: str = None,
    active_chapters: List[int] = None,
    attributes: Dict[str, Any] = None,
    status: str = None
):
    """Update an existing character"""
    db = get_db()
    update_fields = {}
    
    if name is not None:
        update_fields["name"] = name
    if role is not None:
        update_fields["role"] = role
    if arc is not None:
        update_fields["arc"] = arc
    if active_chapters is not None:
        update_fields["activeChapters"] = active_chapters
    if attributes is not None:
        update_fields["attributes"] = attributes
    if status is not None:
        update_fields["status"] = status
    
    if update_fields:
        db.character_bible.update_one(
            {"_id": character_id},
            {"$set": update_fields}
        )
        doc = db.character_bible.find_one({"_id": character_id}, {"projectId": 1})
        if doc:
            index_character(doc["projectId"], character_id)
