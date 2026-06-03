"""
Repository for chat_messages collection.

Chat messages are scoped by project and chat session. Project memory remains
separate from chat sessions; clearing a session only clears conversational UI.
"""
from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.infrastructure.database.mongo import get_db


DEFAULT_CHAT_SESSION_ID = "default"


def add_chat_message(
    project_id: str,
    role: str,  # "user" | "assistant" | "system"
    content: str,
    agent_run_id: Optional[str] = None,
    artifact_references: Optional[List[str]] = None,
    session_id: Optional[str] = None,
) -> str:
    """Add a chat message to the project's chat history"""
    db = get_db()
    message_id = f"msg_{ObjectId()}"
    resolved_session_id = session_id or DEFAULT_CHAT_SESSION_ID
    
    db.chat_messages.insert_one({
        "_id": message_id,
        "projectId": project_id,
        "sessionId": resolved_session_id,
        "role": role,
        "content": content,
        "agentRunId": agent_run_id,
        "artifactReferences": artifact_references or [],
        "createdAt": ObjectId(message_id.split("_")[1]).generation_time.isoformat()
    })
    
    return message_id


def get_project_chat_messages(
    project_id: str,
    limit: Optional[int] = None,
    session_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get chat messages for a project, ordered by creation time"""
    db = get_db()
    resolved_session_id = session_id or DEFAULT_CHAT_SESSION_ID
    query = {
        "projectId": project_id,
        "$or": [
            {"sessionId": resolved_session_id},
            *([{"sessionId": {"$exists": False}}] if resolved_session_id == DEFAULT_CHAT_SESSION_ID else []),
        ],
    }
    
    cursor = db.chat_messages.find(query).sort("createdAt", 1)
    
    if limit:
        cursor = cursor.limit(limit)
    
    messages = list(cursor)
    for msg in messages:
        msg["id"] = msg["_id"]
    
    return messages


def get_recent_chat_messages(
    project_id: str,
    count: int = 10,
    session_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get the most recent N chat messages for context"""
    db = get_db()
    resolved_session_id = session_id or DEFAULT_CHAT_SESSION_ID
    messages = list(
        db.chat_messages
        .find({
            "projectId": project_id,
            "$or": [
                {"sessionId": resolved_session_id},
                *([{"sessionId": {"$exists": False}}] if resolved_session_id == DEFAULT_CHAT_SESSION_ID else []),
            ],
        })
        .sort("createdAt", -1)
        .limit(count)
    )
    
    # Reverse to get chronological order
    messages.reverse()
    
    for msg in messages:
        msg["id"] = msg["_id"]
    
    return messages


def list_chat_sessions(project_id: str) -> List[Dict[str, Any]]:
    """Return chat sessions inferred from message history."""
    db = get_db()
    sessions: Dict[str, Dict[str, Any]] = {
        DEFAULT_CHAT_SESSION_ID: {
            "id": DEFAULT_CHAT_SESSION_ID,
            "title": "Default chat",
            "messageCount": 0,
            "createdAt": None,
            "updatedAt": None,
        }
    }

    for msg in db.chat_messages.find({"projectId": project_id}).sort("createdAt", 1):
        session_id = msg.get("sessionId") or DEFAULT_CHAT_SESSION_ID
        session = sessions.setdefault(
            session_id,
            {
                "id": session_id,
                "title": "New chat" if session_id != DEFAULT_CHAT_SESSION_ID else "Default chat",
                "messageCount": 0,
                "createdAt": None,
                "updatedAt": None,
            },
        )
        session["messageCount"] += 1
        session["createdAt"] = session["createdAt"] or msg.get("createdAt")
        session["updatedAt"] = msg.get("createdAt")

    return sorted(
        sessions.values(),
        key=lambda item: item.get("updatedAt") or item.get("createdAt") or "",
        reverse=True,
    )


def create_chat_session(project_id: str) -> Dict[str, Any]:
    """Create a lightweight chat session id without adding messages."""
    session_id = f"chat_{ObjectId()}"
    return {
        "id": session_id,
        "projectId": project_id,
        "title": "New chat",
        "messageCount": 0,
        "createdAt": ObjectId(session_id.split("_")[1]).generation_time.isoformat(),
        "updatedAt": None,
    }


def clear_chat_session(project_id: str, session_id: Optional[str] = None) -> int:
    """Delete messages from one chat session only."""
    db = get_db()
    resolved_session_id = session_id or DEFAULT_CHAT_SESSION_ID
    query: Dict[str, Any] = {"projectId": project_id}
    if resolved_session_id == DEFAULT_CHAT_SESSION_ID:
        query["$or"] = [{"sessionId": DEFAULT_CHAT_SESSION_ID}, {"sessionId": {"$exists": False}}]
    else:
        query["sessionId"] = resolved_session_id
    result = db.chat_messages.delete_many(query)
    return int(result.deleted_count)
