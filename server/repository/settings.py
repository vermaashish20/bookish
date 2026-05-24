from typing import Any, Dict

from db.mongo import get_db


def get_project_settings(project_id: str) -> Dict[str, Any]:
    db = get_db()
    project = db.projects.find_one({"_id": project_id}, {"settings": 1})
    if not project:
        return {}
    return project.get("settings", {})


def update_project_settings(project_id: str, settings: Dict[str, Any]):
    db = get_db()
    db.projects.update_one(
        {"_id": project_id},
        {"$set": {"settings": settings}},
    )
