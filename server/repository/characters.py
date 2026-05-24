from typing import Any, Dict, List

from bson import ObjectId

from db.mongo import get_db


def add_character(project_id: str, name: str, role: str, arc: str, active_chapters: List[int], attributes: Dict[str, Any]):
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
    })
    return char_id


def get_project_characters(project_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    characters = list(db.character_bible.find({"projectId": project_id}))
    for char in characters:
        char["id"] = char["_id"]
    return characters
