from typing import Dict, Any, Optional, List
from bson import ObjectId
from app.infrastructure.database.mongo import get_db
from app.infrastructure.vector.store import delete_project_vectors

from app.repositories.assets import get_project_assets
from app.repositories.chapters import get_project_chapters
from app.repositories.characters import get_project_characters
from app.repositories.entities import get_project_entities
from app.repositories.agent_runs import get_project_agent_runs
from app.repositories.artifacts import get_project_artifacts


def get_unified_project_payload(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Full project payload for the workspace view.
    Returns the workspace payload used by the frontend as source of truth.
    """
    p = get_project(project_id)
    if not p:
        return None

    chapters = get_project_chapters(project_id)
    characters = get_project_characters(project_id)
    entities = get_project_entities(project_id)
    assets = get_project_assets(project_id)
    artifacts = get_project_artifacts(project_id, include_content=False)

    tonality_key = str(p.get("tonality", "")).lower()
    tonality_scores = {
        "conversational": 1.0 if tonality_key == "conversational" else 0.0,
        "academic":       1.0 if tonality_key == "academic"       else 0.0,
        "storyteller":    1.0 if tonality_key == "storyteller"    else 0.0,
        "motivational":   1.0 if tonality_key == "motivational"   else 0.0,
        "witty":          1.0 if tonality_key == "witty"          else 0.0,
    }

    # Build decisionLog from agent_runs
    agent_runs = get_project_agent_runs(project_id)
    decision_log = []

    for run in reversed(agent_runs):
        if run.get("plannerDecision"):
            decision_log.append({
                "timestamp":  run.get("startedAt", ""),
                "step":       "Planning",
                "agent":      "Planner",
                "action":     "Created execution plan",
                "resolution": run["plannerDecision"].get("decision", "Task analysis complete"),
            })

        for exec_item in run.get("agentExecutions", []):
            status = exec_item.get("status", "")
            decision_item = {
                "timestamp":  exec_item.get("startedAt") or run.get("startedAt", ""),
                "step":       "Execution",
                "agent":      exec_item.get("agent", "Agent").capitalize(),
                "action":     (exec_item.get("taskInput", "Task") or "")[:80] + "…",
                "resolution": f"[{status.upper()}]",
            }
            artifact_id = exec_item.get("outputArtifactId")
            if artifact_id:
                from app.repositories.artifacts import get_artifact
                artifact = get_artifact(artifact_id)
                if artifact:
                    decision_item["artifactId"]      = artifact_id
                    decision_item["artifactType"]    = artifact.get("artifactType", "")
            decision_log.append(decision_item)

    entity_bible = [
        {
            "id": e.get("id") or e.get("_id"),
            "name": e.get("name", "Unnamed Entity"),
            "role": e.get("type", "entity"),
            "type": e.get("type", "entity"),
            "description": e.get("description", ""),
            "arc": e.get("description", ""),
            "activeChapters": [],
            "attributes": e.get("attributes", {}),
            "status": e.get("status", "draft"),
        }
        for e in entities
    ]

    has_published = any(c.get("status") in {"published", "completed"} for c in chapters)

    return {
        "id":        p["_id"],
        "title":     p["title"],
        "subtitle":  p.get("subtitle", ""),
        "genre":     p.get("genre", ""),
        "brief":     assets[0]["content"] if assets else "",
        "tonality":  p["tonality"],
        "status":    "Reviewing" if has_published else "Planning",
        "createdAt": p["createdAt"],
        "bookSummary": p.get("bookSummary", ""),
        "chapters":  chapters,
        "assets":    assets,
        "artifacts": artifacts,
        "settings":  p.get("settings", {}),
        "memory": {
            "factRegistry":    [],
            "characterBible":  characters + entity_bible,
            "callbackIndex":   [],    # kept for frontend schema compat; always empty now
            "tonalityFingerprint": {
                "preset": p["tonality"],
                **tonality_scores,
                "forbiddenPhrases": [],
            },
            "decisionLog": decision_log,
        },
    }


def get_project_summary(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Lightweight project summary for list views.
    Only fetches essential metadata — no chapter content, no characters.
    """
    db = get_db()
    p = db.projects.find_one({"_id": project_id})
    if not p:
        return None

    asset_count = db.user_assets.count_documents({"projectId": project_id})
    first_asset = db.user_assets.find_one(
        {"projectId": project_id},
        sort=[("addedAt", 1)],
    )
    brief = first_asset.get("content", "") if first_asset else ""

    assets = list(db.user_assets.find(
        {"projectId": project_id},
        {"_id": 1, "name": 1, "type": 1, "size": 1, "addedAt": 1},
    ).sort("addedAt", -1))

    formatted_assets = [
        {
            "id":      str(a["_id"]),
            "name":    a.get("name", ""),
            "type":    a.get("type", ""),
            "size":    a.get("size", ""),
            "addedAt": a.get("addedAt", ""),
        }
        for a in assets
    ]

    return {
        "id":         p["_id"],
        "title":      p["title"],
        "subtitle":   p.get("subtitle", ""),
        "genre":      p.get("genre", ""),
        "brief":      brief,
        "tonality":   p.get("tonality", "Conversational"),
        "status":     "Ready",
        "createdAt":  p["createdAt"],
        "assets":     formatted_assets,
        "assetCount": asset_count,
    }


def create_project(
    title: str,
    subtitle: str,
    genre: str,
    tonality: str,
    created_at: str,
    settings: Dict[str, Any],
) -> str:
    db = get_db()
    project_id = f"project_{ObjectId()}"
    db.projects.insert_one({
        "_id":        project_id,
        "id":         project_id,
        "title":      title,
        "subtitle":   subtitle,
        "genre":      genre,
        "tonality":   tonality,
        "createdAt":  created_at,
        "bookSummary": "",
        "settings":   settings,
    })
    return project_id


def delete_project(project_id: str) -> None:
    """Hard-delete a project and all related documents."""
    db = get_db()
    db.projects.delete_one({"_id": project_id})
    db.chapters.delete_many({"projectId": project_id})
    db.user_assets.delete_many({"projectId": project_id})
    db.character_bible.delete_many({"projectId": project_id})
    db.entity_bible.delete_many({"projectId": project_id})
    db.agent_runs.delete_many({"projectId": project_id})
    db.artifacts.delete_many({"projectId": project_id})
    db.chat_messages.delete_many({"projectId": project_id})
    delete_project_vectors(project_id)


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    return db.projects.find_one({"_id": project_id})


def get_all_projects() -> List[Dict[str, Any]]:
    db = get_db()
    return list(db.projects.find({}).sort("createdAt", -1))


def get_book_summary(project_id: str) -> str:
    """Return the rolling book summary stored on the project document."""
    db = get_db()
    project = db.projects.find_one({"_id": project_id}, {"bookSummary": 1})
    if not project:
        return ""
    return project.get("bookSummary", "")


def update_book_summary(project_id: str, summary: str) -> None:
    """
    Persist the rolling book summary (≤ ~400 words) back to the project document.
    Called by the editor node after every chapter is published.
    """
    db = get_db()
    db.projects.update_one(
        {"_id": project_id},
        {"$set": {"bookSummary": summary}},
    )
