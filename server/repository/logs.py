from typing import Any, Dict, List, Optional

from bson import ObjectId

from db.mongo import get_db


def add_episodic_log(project_id: str, sender: str, text: str, thinking: Optional[str], cost: float, tokens: int, timestamp: str):
    db = get_db()
    log_id = f"log_{ObjectId()}"
    db.episodic_logs.insert_one({
        "_id": log_id,
        "id": log_id,
        "projectId": project_id,
        "sender": sender,
        "text": text,
        "thinking": thinking,
        "cost": cost,
        "tokens": tokens,
        "timestamp": timestamp,
    })
    return log_id


def get_project_logs(project_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    logs = list(db.episodic_logs.find({"projectId": project_id}).sort("timestamp", 1))
    for log in logs:
        log["id"] = log["_id"]
    return logs
