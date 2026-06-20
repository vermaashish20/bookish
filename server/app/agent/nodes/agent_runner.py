"""Shared execution helpers for agent nodes."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agent.utils.models import call_project_model
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.agent.utils.tools import read_project_sources, retrieve_project_knowledge
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.artifacts import create_artifact


def run_agent_node(
    state: BookishAgentState,
    *,
    agent: str,
    model_key: str,
    fallback_keys: list[str],
    artifact_type: str,
    output_state_key: str,
    system_prompt: str,
    source_label: str,
    source_text: str,
    default_fallback: str,
) -> dict[str, Any]:
    idx = state.get("currentTaskIndex", 0)
    tasks = list(state.get("tasks", []))
    if idx >= len(tasks) or tasks[idx].get("agent") != agent:
        return {}

    task = {**tasks[idx]}
    now = datetime.utcnow().isoformat()
    task["status"] = "running"
    task["startedAt"] = now
    tasks[idx] = task

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent=agent,
        task_input=task["task"],
        status="running",
    )
    emit_custom("task_started", runId=state["agentRunId"], agent=agent, task=task)

    sources = read_project_sources(
        state["projectId"],
        run_id=state["agentRunId"],
        agent=agent,
        task=task["task"],
    )
    retrieval = retrieve_project_knowledge(
        state["projectId"],
        query=task["task"],
        run_id=state["agentRunId"],
        agent=agent,
        task=task["task"],
    )
    context = _build_context(state, task["task"], source_label, source_text, sources, retrieval)
    output = call_project_model(
        state["projectId"],
        model_key,
        fallback_keys=fallback_keys,
        system_prompt=_native_tool_system_prompt(system_prompt),
        user_prompt=context,
        default_fallback=default_fallback,
    )

    artifact_id = create_artifact(
        project_id=state["projectId"],
        agent_run_id=state["agentRunId"],
        agent_name=agent,
        artifact_type=artifact_type,
        content=output,
        metadata={"task": task["task"]},
        related_chapter_id=latest_chapter_id(tasks),
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
        agent=agent,
        artifactType=artifact_type,
    )
    emit_custom("task_completed", runId=state["agentRunId"], agent=agent, task=task)

    return {
        "tasks": tasks,
        "currentTaskIndex": idx + 1,
        output_state_key: output,
        "artifactIds": [*state.get("artifactIds", []), artifact_id],
    }


def _native_tool_system_prompt(prompt: str) -> str:
    return f"""{prompt}

# LANGGRAPH TOOL RUNTIME
Knowledge tools are executed by LangGraph ToolNode before this model turn. Use
the PROJECT SOURCES and RETRIEVAL RESULTS sections in the user message as tool
evidence. Do not output JSON tool calls or tool-call instructions; output the
requested artifact directly.
""".strip()


def _build_context(
    state: BookishAgentState,
    task: str,
    source_label: str,
    source_text: str,
    sources: str,
    retrieval: str,
) -> str:
    project_context = state.get("projectContext", {})
    return f"""
TASK:
{task}

BOOK:
Title: {project_context.get('title', 'Untitled')}
Genre: {project_context.get('genre', 'Unknown')}
Tone: {project_context.get('tonality', 'Unknown')}
Story so far: {project_context.get('bookSummary') or 'The story has not started yet.'}

{source_label}:
{source_text or 'No prior agent output is available.'}

RESEARCH NOTES:
{state.get('researchNotes') or 'No research notes were produced.'}

PROJECT SOURCES:
{sources}

RETRIEVAL RESULTS:
{retrieval}
""".strip()


def latest_chapter_id(tasks: list[dict[str, Any]]) -> str | None:
    for task in reversed(tasks):
        chapter_id = task.get("chapterId")
        if chapter_id:
            return str(chapter_id)
    return None
