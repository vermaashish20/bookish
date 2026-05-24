from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.infrastructure.database.mongo import get_db
from app.services.indexing import enqueue_index_user_asset


def add_user_asset(project_id: str, name: str, asset_type: str, size: str, added_at: str, content: str):
    db = get_db()
    asset_id = f"asset_{ObjectId()}"
    db.user_assets.insert_one({
        "_id": asset_id,
        "projectId": project_id,
        "name": name,
        "type": asset_type,
        "size": size,
        "addedAt": added_at,
        "content": content,
    })
    enqueue_index_user_asset(project_id, asset_id, asset_type)
    return asset_id


def get_user_asset(asset_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    asset = db.user_assets.find_one({"_id": asset_id})
    if asset:
        asset["id"] = asset["_id"]
    return asset


def get_project_assets(project_id: str, *, include_content: bool = True) -> List[Dict[str, Any]]:
    db = get_db()
    projection = None if include_content else {"content": 0}
    assets = list(db.user_assets.find({"projectId": project_id}, projection).sort("addedAt", 1))
    for asset in assets:
        asset["id"] = asset["_id"]
    return assets


def get_project_brief(project_id: str) -> str:
    db = get_db()
    doc = db.user_assets.find_one(
        {"projectId": project_id},
        {"content": 1},
        sort=[("addedAt", 1)],
    )
    return str(doc.get("content") or "") if doc else ""
