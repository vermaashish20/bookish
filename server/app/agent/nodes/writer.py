"""Writer node."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agent.utils.models import call_project_model
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.artifacts import create_artifact
from app.repositories.chapters import add_chapter, get_project_chapters


WRITER_SYSTEM_PROMPT = """You are Bookish's writer agent.
Write polished, useful prose for the user's book project. Follow the supplied
project context and research notes. Output only Markdown prose."""


def writer_node(state: BookishAgentState) -> dict[str, Any]:
    idx = state.get("currentTaskIndex", 0)
    tasks = list(state.get("tasks", []))
    if idx >= len(tasks) or tasks[idx].get("agent") != "writer":
        return {}

    task = {**tasks[idx]}
    now = datetime.utcnow().isoformat()
    task["status"] = "running"
    task["startedAt"] = now
    tasks[idx] = task

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="writer",
        task_input=task["task"],
        status="running",
    )
    emit_custom("task_started", runId=state["agentRunId"], agent="writer", task=task)

    project_context = state.get("projectContext", {})
    research_notes = state.get("researchNotes") or "No separate research notes were produced."
    fact_check_report = state.get("factCheckReport") or "No fact-check report was produced yet."
    fallback = (
        f"# Draft\n\nDraft for: {task['task']}\n\n"
        "Configure the selected writer model credentials to generate full prose."
    )
    draft = call_project_model(
        state["projectId"],
        "writerModel",
        system_prompt=WRITER_SYSTEM_PROMPT,
        user_prompt=f"""
TASK:
{task['task']}

BOOK:
Title: {project_context.get('title', 'Untitled')}
Genre: {project_context.get('genre', 'Unknown')}
Tone: {project_context.get('tonality', 'Unknown')}
Story so far: {project_context.get('bookSummary') or 'The story has not started yet.'}

RESEARCH NOTES:
{research_notes}

FACT CHECK REPORT:
{fact_check_report}

Write the requested content as Markdown. Target 500-1000 words when drafting a scene or chapter.
""".strip(),
        default_fallback=fallback,
    )

    word_count = len(draft.split())
    artifact_id = create_artifact(
        project_id=state["projectId"],
        agent_run_id=state["agentRunId"],
        agent_name="writer",
        artifact_type="draft",
        content=draft,
        metadata={"task": task["task"], "wordCount": word_count},
    )

    existing_chapters = get_project_chapters(state["projectId"])
    next_number = len(existing_chapters) + 1
    first_line = draft.splitlines()[0].replace("#", "").replace("*", "").strip() if draft.splitlines() else ""
    title = first_line if first_line.lower().startswith("chapter") else f"Chapter {next_number}"
    chapter_id = add_chapter(
        project_id=state["projectId"],
        number=next_number,
        title=title,
        content=draft,
        word_count=word_count,
        status="draft",
    )

    completed_at = datetime.utcnow().isoformat()
    task.update(
        status="completed",
        completedAt=completed_at,
        outputArtifactId=artifact_id,
        chapterId=chapter_id,
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
        agent="writer",
        artifactType="draft",
    )
    emit_custom(
        "chapter_upserted",
        runId=state["agentRunId"],
        chapterId=chapter_id,
    )
    emit_custom("task_completed", runId=state["agentRunId"], agent="writer", task=task)

    return {
        "tasks": tasks,
        "currentTaskIndex": idx + 1,
        "draftContent": draft,
        "artifactIds": [*state.get("artifactIds", []), artifact_id],
    }

