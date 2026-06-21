"""
Repository for artifacts collection
Agent-generated content (research notes, drafts, edits, world-building notes)
"""
from typing import Dict, Any, Optional, List
from bson import ObjectId
from datetime import datetime
from app.infrastructure.database.mongo import get_db
from app.services.indexing import enqueue_index_artifact
from app.core.streaming import publish_sync_event


def create_artifact(
    project_id: str,
    agent_run_id: str,
    agent_name: str,  # "world_builder" | "writer" (legacy artifacts may use removed agent names)
    artifact_type: str,  # "research_notes" | "world_building" | "draft" | "edited_content"
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
    related_chapter_id: Optional[str] = None
) -> str:
    """Create a new artifact"""
    db = get_db()
    artifact_id = f"artifact_{ObjectId()}"
    
    artifact = {
        "_id": artifact_id,
        "projectId": project_id,
        "agentRunId": agent_run_id,
        "agentName": agent_name,
        "artifactType": artifact_type,
        "content": content,
        "metadata": metadata or {},
        "relatedChapterId": related_chapter_id,
        "createdAt": datetime.utcnow().isoformat()
    }
    db.artifacts.insert_one(artifact)

    enqueue_index_artifact(artifact_id)
    payload = {**artifact, "id": artifact_id}
    publish_sync_event("artifact_created", artifact=payload)
    return artifact_id


def get_artifact(artifact_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific artifact"""
    db = get_db()
    artifact = db.artifacts.find_one({"_id": artifact_id})
    if artifact:
        artifact["id"] = artifact["_id"]
    return artifact


def attach_pending_write(artifact_id: str, pending_write: Dict[str, Any]) -> None:
    """Persist HITL pending write on the artifact so approval can commit after resume."""
    db = get_db()
    snapshot = {key: value for key, value in pending_write.items() if key != "content"}
    db.artifacts.update_one(
        {"_id": artifact_id},
        {
            "$set": {
                "metadata.pendingWrite": snapshot,
                "metadata.task": pending_write.get("task", ""),
            }
        },
    )


def get_project_artifacts(
    project_id: str,
    agent_name: Optional[str] = None,
    artifact_type: Optional[str] = None,
    limit: Optional[int] = None,
    include_content: bool = True,
) -> List[Dict[str, Any]]:
    """Get artifacts for a project with optional filtering"""
    db = get_db()
    
    query = {"projectId": project_id}
    
    if agent_name:
        query["agentName"] = agent_name
    
    if artifact_type:
        query["artifactType"] = artifact_type
    
    projection = None if include_content else {"content": 0}
    cursor = db.artifacts.find(query, projection).sort("createdAt", -1)
    
    if limit:
        cursor = cursor.limit(limit)
    
    artifacts = list(cursor)
    for artifact in artifacts:
        artifact["id"] = artifact["_id"]
    
    return artifacts


def get_agent_run_artifacts(agent_run_id: str) -> List[Dict[str, Any]]:
    """Get all artifacts created during a specific agent run"""
    db = get_db()
    artifacts = list(
        db.artifacts
        .find({"agentRunId": agent_run_id})
        .sort("createdAt", 1)
    )
    
    for artifact in artifacts:
        artifact["id"] = artifact["_id"]
    
    return artifacts
