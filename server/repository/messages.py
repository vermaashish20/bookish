"""
Repository for messages collection
Provides DB operations to GET and POST chat messages
"""
from typing import List, Dict, Any, Optional
from bson import ObjectId
from db.mongo import get_db


def save_message(
    project_id: str,
    role: str,  # "user" | "assistant" | "system"
    content: str,
    agent_run_id: Optional[str] = None,
    artifact_references: Optional[List[str]] = None
) -> str:
    """
    Save a chat message to MongoDB.
    
    Collection: chat_messages
    """
    db = get_db()
    message_id = f"msg_{ObjectId()}"
    
    # Generation time of ObjectID split
    hex_time = message_id.split("_")[1]
    created_at = ObjectId(hex_time).generation_time.isoformat()
    
    db.chat_messages.insert_one({
        "_id": message_id,
        "projectId": project_id,
        "role": role,
        "content": content,
        "agentRunId": agent_run_id,
        "artifactReferences": artifact_references or [],
        "createdAt": created_at
    })
    
    return message_id


def get_messages(
    project_id: str,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve chat messages for a project ordered by creation time.
    """
    db = get_db()
    query = {"projectId": project_id}
    
    cursor = db.chat_messages.find(query).sort("createdAt", 1)
    
    if limit:
        cursor = cursor.limit(limit)
        
    messages = list(cursor)
    for msg in messages:
        msg["id"] = msg["_id"]
        
    return messages
