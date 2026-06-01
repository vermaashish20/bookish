from typing import Any, Dict, List

from bson import ObjectId

from app.infrastructure.database.mongo import get_db
from app.services.indexing import index_user_asset


def add_user_asset(project_id: str, name: str, asset_type: str, size: str, added_at: str, content: str):
    db = get_db()
    asset_id = f"asset_{ObjectId()}"
    db.user_assets.insert_one({
        "_id": asset_id,
        "id": asset_id,
        "projectId": project_id,
        "name": name,
        "type": asset_type,
        "size": size,
        "addedAt": added_at,
        "content": content,
    })
    index_user_asset(project_id, asset_id, asset_type)
    return asset_id


def get_project_assets(project_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    assets = list(db.user_assets.find({"projectId": project_id}))
    for asset in assets:
        asset["id"] = asset["_id"]
    return assets
