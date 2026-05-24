"""
Repository for project_memory collection
Long-term project context and decisions
"""
from typing import List, Dict, Any, Optional
from bson import ObjectId
from datetime import datetime
from db.mongo import get_db


def add_project_memory(
    project_id: str,
    memory_type: str,  # "decision" | "constraint" | "preference" | "world_rule" | "style_guide"
    content: str,
    source: str = "user",  # "user" | "planner" | "agent"
    importance: str = "medium"  # "high" | "medium" | "low"
) -> str:
    """Add a memory to project memory"""
    db = get_db()
    memory_id = f"memory_{ObjectId()}"
    
    db.project_memory.insert_one({
        "_id": memory_id,
        "projectId": project_id,
        "memoryType": memory_type,
        "content": content,
        "source": source,
        "importance": importance,
        "createdAt": datetime.utcnow().isoformat(),
        "lastAccessedAt": datetime.utcnow().isoformat()
    })
    
    return memory_id


def get_project_memories(
    project_id: str,
    memory_type: Optional[str] = None,
    importance: Optional[str] = None,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Get project memories with optional filtering"""
    db = get_db()
    
    query = {"projectId": project_id}
    
    if memory_type:
        query["memoryType"] = memory_type
    
    if importance:
        query["importance"] = importance
    
    cursor = db.project_memory.find(query).sort("lastAccessedAt", -1)
    
    if limit:
        cursor = cursor.limit(limit)
    
    memories = list(cursor)
    for memory in memories:
        memory["id"] = memory["_id"]
    
    return memories


def update_memory_access(memory_id: str):
    """Update the lastAccessedAt timestamp for a memory"""
    db = get_db()
    db.project_memory.update_one(
        {"_id": memory_id},
        {"$set": {"lastAccessedAt": datetime.utcnow().isoformat()}}
    )


def get_recent_memories(project_id: str, count: int = 10) -> List[str]:
    """Get recent memory content as strings for context"""
    memories = get_project_memories(project_id, limit=count)
    return [mem["content"] for mem in memories]
