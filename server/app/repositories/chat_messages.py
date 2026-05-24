"""
Repository for chat_messages collection.

Chat messages are scoped by project and thread id (LangGraph checkpointer key).
"""
from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.infrastructure.database.mongo import get_db


def create_thread_id() -> str:
    return f"thread_{ObjectId()}"


def add_chat_message(
    project_id: str,
    role: str,  # "user" | "assistant" | "system"
    content: str,
    thread_id: str,
    agent_run_id: Optional[str] = None,
    artifact_references: Optional[List[str]] = None,
) -> str:
    db = get_db()
    message_id = f"msg_{ObjectId()}"
    db.chat_messages.insert_one({
        "_id": message_id,
        "projectId": project_id,
        "threadId": thread_id,
        "role": role,
        "content": content,
        "agentRunId": agent_run_id,
        "artifactReferences": artifact_references or [],
        "createdAt": ObjectId(message_id.split("_")[1]).generation_time.isoformat(),
    })
    return message_id


def _thread_query(project_id: str, thread_id: str) -> Dict[str, Any]:
    return {
        "projectId": project_id,
        "$or": [
            {"threadId": thread_id},
            {"sessionId": thread_id},
        ],
    }


def get_project_chat_messages(
    project_id: str,
    thread_id: str,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    db = get_db()
    cursor = db.chat_messages.find(_thread_query(project_id, thread_id)).sort("createdAt", 1)
    if limit:
        cursor = cursor.limit(limit)
    messages = list(cursor)
    for msg in messages:
        msg["id"] = msg["_id"]
    return messages


def get_recent_chat_messages(
    project_id: str,
    thread_id: str,
    count: int = 10,
) -> List[Dict[str, Any]]:
    db = get_db()
    messages = list(
        db.chat_messages.find(_thread_query(project_id, thread_id))
        .sort("createdAt", -1)
        .limit(count)
    )
    messages.reverse()
    for msg in messages:
        msg["id"] = msg["_id"]
    return messages


def list_chat_threads(project_id: str) -> List[Dict[str, Any]]:
    """Return chat threads inferred from message history (aggregation — no full scan into app)."""
    db = get_db()
    pipeline = [
        {"$match": {"projectId": project_id}},
        {
            "$group": {
                "_id": {"$ifNull": ["$threadId", "$sessionId"]},
                "messageCount": {"$sum": 1},
                "createdAt": {"$min": "$createdAt"},
                "updatedAt": {"$max": "$createdAt"},
            }
        },
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"updatedAt": -1}},
    ]
    threads: List[Dict[str, Any]] = []
    for row in db.chat_messages.aggregate(pipeline):
        thread_id = row["_id"]
        threads.append(
            {
                "id": thread_id,
                "threadId": thread_id,
                "title": "New chat",
                "messageCount": row.get("messageCount", 0),
                "createdAt": row.get("createdAt"),
                "updatedAt": row.get("updatedAt"),
            }
        )
    return threads


def create_chat_thread(project_id: str) -> Dict[str, Any]:
    thread_id = create_thread_id()
    return {
        "id": thread_id,
        "threadId": thread_id,
        "projectId": project_id,
        "title": "New chat",
        "messageCount": 0,
        "createdAt": ObjectId(thread_id.split("_")[1]).generation_time.isoformat(),
        "updatedAt": None,
    }


def clear_chat_thread(project_id: str, thread_id: str) -> int:
    db = get_db()
    result = db.chat_messages.delete_many(_thread_query(project_id, thread_id))
    return int(result.deleted_count)
