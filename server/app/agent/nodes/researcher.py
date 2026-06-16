"""Researcher node."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agent.utils.models import call_project_model
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.agent.utils.tools import read_project_sources, retrieve_project_knowledge
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.artifacts import create_artifact


RESEARCHER_SYSTEM_PROMPT = """You are Bookish's research agent.
Synthesize only the supplied project sources and retrieval results. Be concise,
cite which project surface the information came from when possible, and do not
invent canon."""


def researcher_node(state: BookishAgentState) -> dict[str, Any]:
    idx = state.get("currentTaskIndex", 0)
    tasks = list(state.get("tasks", []))
    if idx >= len(tasks) or tasks[idx].get("agent") != "researcher":
        return {}

    task = {**tasks[idx]}
    now = datetime.utcnow().isoformat()
    task["status"] = "running"
    task["startedAt"] = now
    tasks[idx] = task

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="researcher",
        task_input=task["task"],
        status="running",
    )
    emit_custom("task_started", runId=state["agentRunId"], agent="researcher", task=task)

    sources = read_project_sources(
        state["projectId"],
        run_id=state["agentRunId"],
        agent="researcher",
        task=task["task"],
    )
    retrieval = retrieve_project_knowledge(
        state["projectId"],
        query=task["task"],
        run_id=state["agentRunId"],
        agent="researcher",
        task=task["task"],
    )
    project_context = state.get("projectContext", {})
    fallback = (
        f"# Research Notes\n\nTask: {task['task']}\n\n"
        f"{sources}\n\n{retrieval}"
    )
    report = call_project_model(
        state["projectId"],
        "researcherModel",
        fallback_keys=["plannerModel", "writerModel"],
        system_prompt=RESEARCHER_SYSTEM_PROMPT,
        user_prompt=f"""
TASK:
{task['task']}

BOOK:
Title: {project_context.get('title', 'Untitled')}
Genre: {project_context.get('genre', 'Unknown')}
Tone: {project_context.get('tonality', 'Unknown')}

PROJECT SOURCES:
{sources}

RETRIEVAL RESULTS:
{retrieval}

Return Markdown research notes only.
""".strip(),
        default_fallback=fallback,
    )

    artifact_id = create_artifact(
        project_id=state["projectId"],
        agent_run_id=state["agentRunId"],
        agent_name="researcher",
        artifact_type="research_notes",
        content=report,
        metadata={"task": task["task"]},
    )
    completed_at = datetime.utcnow().isoformat()
    task.update(
        status="completed",
        completedAt=completed_at,
        outputArtifactId=artifact_id,
    )
    tasks[idx] = task
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id,
    )
    emit_custom(
        "artifact_created",
        runId=state["agentRunId"],
        artifactId=artifact_id,
        agent="researcher",
        artifactType="research_notes",
    )
    emit_custom("task_completed", runId=state["agentRunId"], agent="researcher", task=task)

    return {
        "tasks": tasks,
        "currentTaskIndex": idx + 1,
        "researchNotes": report,
        "artifactIds": [*state.get("artifactIds", []), artifact_id],
    }

