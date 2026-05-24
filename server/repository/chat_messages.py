"""
Repository for chat_messages collection
Single chat session per project (no chatId)
"""
from typing import List, Dict, Any, Optional
from bson import ObjectId
from db.mongo import get_db


def add_chat_message(
    project_id: str,
    role: str,  # "user" | "assistant" | "system"
    content: str,
    agent_run_id: Optional[str] = None,
    artifact_references: Optional[List[str]] = None
) -> str:
    """Add a chat message to the project's chat history"""
    db = get_db()
    message_id = f"msg_{ObjectId()}"
    
    db.chat_messages.insert_one({
        "_id": message_id,
        "projectId": project_id,
        "role": role,
        "content": content,
        "agentRunId": agent_run_id,
        "artifactReferences": artifact_references or [],
        "createdAt": ObjectId(message_id.split("_")[1]).generation_time.isoformat()
    })
    
    return message_id


def get_project_chat_messages(project_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get chat messages for a project, ordered by creation time"""
    db = get_db()
    query = {"projectId": project_id}
    
    cursor = db.chat_messages.find(query).sort("createdAt", 1)
    
    if limit:
        cursor = cursor.limit(limit)
    
    messages = list(cursor)
    for msg in messages:
        msg["id"] = msg["_id"]
    
    return messages


def get_recent_chat_messages(project_id: str, count: int = 10) -> List[Dict[str, Any]]:
    """Get the most recent N chat messages for context"""
    db = get_db()
    messages = list(
        db.chat_messages
        .find({"projectId": project_id})
        .sort("createdAt", -1)
        .limit(count)
    )
    
    # Reverse to get chronological order
    messages.reverse()
    
    for msg in messages:
        msg["id"] = msg["_id"]
    
    return messages
