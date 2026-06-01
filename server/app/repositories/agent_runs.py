"""
Repository for agent_runs collection
Tracks execution history for all agent orchestrations
"""
from typing import List, Dict, Any, Optional
from bson import ObjectId
from datetime import datetime
from app.infrastructure.database.mongo import get_db


def create_agent_run(
    project_id: str,
    user_message_id: str,
    user_prompt: str
) -> str:
    """Create a new agent run record"""
    db = get_db()
    run_id = f"run_{ObjectId()}"
    
    db.agent_runs.insert_one({
        "_id": run_id,
        "projectId": project_id,
        "userMessageId": user_message_id,
        "userPrompt": user_prompt,
        "plannerDecision": None,
        "agentExecutions": [],
        "finalOutputMessageId": None,
        "status": "pending",
        "startedAt": datetime.utcnow().isoformat(),
        "completedAt": None
    })
    
    return run_id


def update_agent_run_planner_decision(
    run_id: str,
    planner_decision: Dict[str, Any]
):
    """Update agent run with planner decision"""
    db = get_db()
    db.agent_runs.update_one(
        {"_id": run_id},
        {"$set": {"plannerDecision": planner_decision}}
    )


def add_agent_execution(
    run_id: str,
    agent: str,
    task_input: str,
    status: str = "pending"
) -> int:
    """Add an agent execution to the run and return its index"""
    db = get_db()
    
    execution = {
        "agent": agent,
        "taskInput": task_input,
        "status": status,
        "startedAt": datetime.utcnow().isoformat() if status == "running" else None,
        "completedAt": None,
        "outputArtifactId": None,
    }
    
    result = db.agent_runs.update_one(
        {"_id": run_id},
        {"$push": {"agentExecutions": execution}}
    )
    
    # Get the index of the newly added execution
    run = db.agent_runs.find_one({"_id": run_id})
    return len(run["agentExecutions"]) - 1


def update_agent_execution(
    run_id: str,
    execution_index: int,
    status: Optional[str] = None,
    output_artifact_id: Optional[str] = None,
):
    """Update a specific agent execution's status and artifact reference."""
    db = get_db()

    update_fields = {}

    if status:
        update_fields[f"agentExecutions.{execution_index}.status"] = status
        if status == "running":
            update_fields[f"agentExecutions.{execution_index}.startedAt"] = datetime.utcnow().isoformat()
        elif status in ["completed", "failed"]:
            update_fields[f"agentExecutions.{execution_index}.completedAt"] = datetime.utcnow().isoformat()

    if output_artifact_id:
        update_fields[f"agentExecutions.{execution_index}.outputArtifactId"] = output_artifact_id

    if update_fields:
        db.agent_runs.update_one(
            {"_id": run_id},
            {"$set": update_fields}
        )


def fail_agent_run(run_id: str, error: Optional[str] = None) -> None:
    """Mark agent run as failed without a final assistant message."""
    db = get_db()
    update: Dict[str, Any] = {
        "status": "failed",
        "completedAt": datetime.utcnow().isoformat(),
    }
    if error:
        update["error"] = error
    db.agent_runs.update_one({"_id": run_id}, {"$set": update})


def complete_agent_run(
    run_id: str,
    final_message_id: str,
    status: str = "completed"
):
    """Mark agent run as completed"""
    db = get_db()
    db.agent_runs.update_one(
        {"_id": run_id},
        {
            "$set": {
                "finalOutputMessageId": final_message_id,
                "status": status,
                "completedAt": datetime.utcnow().isoformat()
            }
        }
    )


def get_agent_run(run_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific agent run"""
    db = get_db()
    return db.agent_runs.find_one({"_id": run_id})


def get_project_agent_runs(
    project_id: str,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Get agent runs for a project"""
    db = get_db()
    
    cursor = db.agent_runs.find({"projectId": project_id}).sort("startedAt", -1)
    
    if limit:
        cursor = cursor.limit(limit)
    
    runs = list(cursor)
    for run in runs:
        run["id"] = run["_id"]
    
    return runs
