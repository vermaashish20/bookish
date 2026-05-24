from typing import Any, Dict, List

from bson import ObjectId

from db.mongo import get_db


def add_callback(project_id: str, context: str, setup_ch: int, payoff_ch: int, resolved: bool, timestamp: str):
    db = get_db()
    callback_id = f"callback_{ObjectId()}"
    db.callback_index.insert_one({
        "_id": callback_id,
        "id": callback_id,
        "projectId": project_id,
        "context": context,
        "setupChapter": setup_ch,
        "payoffChapter": payoff_ch,
        "resolved": resolved,
        "timestamp": timestamp,
    })
    return callback_id


def get_project_callbacks(project_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    callbacks = list(db.callback_index.find({"projectId": project_id}))
    for cb in callbacks:
        cb["id"] = cb["_id"]
    return callbacks


def resolve_callback(cb_id: str):
    db = get_db()
    db.callback_index.update_one(
        {"_id": cb_id},
        {"$set": {"resolved": True}},
    )


def shift_callbacks_downstream(project_id: str, start_number: int):
    db = get_db()
    db.callback_index.update_many(
        {"projectId": project_id, "setupChapter": {"$gte": start_number}},
        {"$inc": {"setupChapter": 1}},
    )
    db.callback_index.update_many(
        {"projectId": project_id, "payoffChapter": {"$gte": start_number}},
        {"$inc": {"payoffChapter": 1}},
    )
