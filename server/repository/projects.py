from typing import Dict, Any, Optional, List
from bson import ObjectId
from db.mongo import get_db
from db.chroma import delete_project_vectors

from repository.assets import get_project_assets
from repository.callbacks import get_project_callbacks
from repository.chapters import get_project_chapters
from repository.characters import get_project_characters
from repository.logs import get_project_logs
from repository.agent_runs import get_project_agent_runs

def get_unified_project_payload(project_id: str) -> Optional[Dict[str, Any]]:
    p = get_project(project_id)
    if not p:
        return None
        
    chapters = get_project_chapters(project_id)
    characters = get_project_characters(project_id)
    callbacks = get_project_callbacks(project_id)
    assets = get_project_assets(project_id)
    logs = get_project_logs(project_id)
    
    tonality_key = str(p.get("tonality", "")).lower()
    tonality_scores = {
        "conversational": 1.0 if tonality_key == "conversational" else 0.0,
        "academic": 1.0 if tonality_key == "academic" else 0.0,
        "storyteller": 1.0 if tonality_key == "storyteller" else 0.0,
        "motivational": 1.0 if tonality_key == "motivational" else 0.0,
        "witty": 1.0 if tonality_key == "witty" else 0.0,
    }
        
    # Build decisionLog from agent_runs
    agent_runs = get_project_agent_runs(project_id)
    decision_log = []
    
    # Process runs in chronological order (earliest first for log display)
    for run in reversed(agent_runs):
        # 1. Planner decision
        if run.get("plannerDecision"):
            decision_log.append({
                "timestamp": run.get("startedAt", ""),
                "step": "Planning",
                "agent": "Planner",
                "action": "Created execution plan",
                "resolution": run["plannerDecision"].get("decision", "Task analysis complete")
            })
            
        # 2. Agent Executions
        for exec_item in run.get("agentExecutions", []):
            status = exec_item.get("status", "")
            resolution_text = "Completed" if status == "completed" else status.capitalize()
            
            decision_item = {
                "timestamp": exec_item.get("startedAt") or run.get("startedAt", ""),
                "step": "Execution",
                "agent": exec_item.get("agent", "Agent").capitalize(),
                "action": exec_item.get("taskInput", "Task")[:50] + "...",
                "resolution": f"[{status.upper()}]"
            }
            
            # Fetch artifact if present
            artifact_id = exec_item.get("outputArtifactId")
            if artifact_id:
                from repository.artifacts import get_artifact
                artifact = get_artifact(artifact_id)
                if artifact:
                    decision_item["artifactId"] = artifact_id
                    decision_item["artifactType"] = artifact.get("artifactType", "")
                    decision_item["artifactContent"] = artifact.get("content", "")
            
            decision_log.append(decision_item)
            
    return {
        "id": p["_id"],
        "title": p["title"],
        "subtitle": p["subtitle"],
        "genre": p.get("genre", ""),
        "brief": assets[0]["content"] if assets else "",
        "tonality": p["tonality"],
        "status": "Reviewing" if any(c["status"] == "completed" for c in chapters) else "Planning",
        "createdAt": p["createdAt"],
        "chapters": chapters,
        "assets": assets,
        "settings": p["settings"],
        "memory": {
            "factRegistry": [],
            "characterBible": characters,
            "callbackIndex": callbacks,
            "tonalityFingerprint": {
                "preset": p["tonality"],
                **tonality_scores,
                "forbiddenPhrases": []
            },
            "decisionLog": decision_log
        }
    }

def get_project_summary(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Lightweight project summary for list views.
    Only fetches essential data without expensive nested queries.
    """
    db = get_db()
    p = db.projects.find_one({"_id": project_id})
    if not p:
        return None
    
    # Count assets instead of fetching all content
    asset_count = db.user_assets.count_documents({"projectId": project_id})
    
    # Get only the first asset's content for brief (if exists)
    first_asset = db.user_assets.find_one(
        {"projectId": project_id},
        sort=[("addedAt", 1)]
    )
    brief = first_asset.get("content", "") if first_asset else ""
    
    # Get minimal asset info for display
    assets = list(db.user_assets.find(
        {"projectId": project_id},
        {"_id": 1, "name": 1, "type": 1, "size": 1, "addedAt": 1}
    ).sort("addedAt", -1))
    
    # Format assets without content
    formatted_assets = [
        {
            "id": str(a["_id"]),
            "name": a.get("name", ""),
            "type": a.get("type", ""),
            "size": a.get("size", ""),
            "addedAt": a.get("addedAt", "")
        }
        for a in assets
    ]
    
    return {
        "id": p["_id"],
        "title": p["title"],
        "subtitle": p.get("subtitle", ""),
        "genre": p.get("genre", ""),
        "brief": brief,
        "tonality": p.get("tonality", "Conversational"),
        "status": "Ready",
        "createdAt": p["createdAt"],
        "assets": formatted_assets,
        "assetCount": asset_count
    }

def create_project(title: str, subtitle: str, genre: str, tonality: str, created_at: str, settings: Dict[str, Any]):
    db = get_db()
    project_id = f"project_{ObjectId()}"
    db.projects.insert_one({
        "_id": project_id,
        "id": project_id,
        "title": title,
        "subtitle": subtitle,
        "genre": genre,
        "tonality": tonality,
        "createdAt": created_at,
        "settings": settings
    })
    return project_id

def delete_project(project_id: str):
    """Hard-delete a project and all related documents from every collection and vector db."""
    db = get_db()
    
    # 1. Delete all MongoDB documents associated with the project
    db.projects.delete_one({"_id": project_id})
    db.chapters.delete_many({"projectId": project_id})
    db.user_assets.delete_many({"projectId": project_id})
    db.episodic_logs.delete_many({"projectId": project_id})
    db.character_bible.delete_many({"projectId": project_id})
    db.entity_bible.delete_many({"projectId": project_id})
    db.callback_index.delete_many({"projectId": project_id})
    db.agent_runs.delete_many({"projectId": project_id})
    db.artifacts.delete_many({"projectId": project_id})
    db.chat_messages.delete_many({"projectId": project_id})
    db.project_memory.delete_many({"projectId": project_id})
    
    # 2. Delete all related vectors from ChromaDB
    delete_project_vectors(project_id)

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    return db.projects.find_one({"_id": project_id})

def get_all_projects() -> List[Dict[str, Any]]:
    db = get_db()
    return list(db.projects.find({}).sort("createdAt", -1))
