"""Writer node."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.nodes.agent_runner import run_tool_loop, tools_for_agent
from app.agent.utils.context_schema import BookishContext, context_header
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.prompts.writer import PROMPT as WRITER_PROMPT
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.artifacts import create_artifact
from app.repositories.chapters import get_project_chapters


_REVISION_KEYWORDS = re.compile(
    r"\b(edit|revise|revision|rewrite|polish|update|proofread|copyedit)\b",
    re.IGNORECASE,
)
_CHAPTER_NUMBER = re.compile(r"\bchapter\s+(\d+)\b", re.IGNORECASE)


def _find_target_chapter(task_text: str, chapters: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not chapters:
        return None
    match = _CHAPTER_NUMBER.search(task_text)
    if match:
        number = int(match.group(1))
        for chapter in chapters:
            if int(chapter.get("number") or 0) == number:
                return chapter
    if _REVISION_KEYWORDS.search(task_text) and len(chapters) == 1:
        return chapters[0]
    return None


def _is_revision_task(task_text: str) -> bool:
    return bool(_REVISION_KEYWORDS.search(task_text) or _CHAPTER_NUMBER.search(task_text))


def writer_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    config: RunnableConfig,
) -> dict[str, Any]:
    idx = state.get("currentTaskIndex", 0)
    tasks = list(state.get("tasks", []))
    if idx >= len(tasks) or tasks[idx].get("agent") != "writer":
        return {}

    task = {**tasks[idx]}
    task_text = str(task.get("task") or "")
    now = datetime.utcnow().isoformat()
    task["status"] = "running"
    task["startedAt"] = now
    tasks[idx] = task

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="writer",
        task_input=task_text,
        status="running",
    )
    emit_custom("task_started", runId=state["agentRunId"], agent="writer", task=task)

    existing_chapters = get_project_chapters(runtime.context.project_id)
    target_chapter = _find_target_chapter(task_text, existing_chapters)
    revision = _is_revision_task(task_text) and target_chapter is not None

    user_prompt = f"""
TASK:
{task_text}

{context_header(runtime.context)}

MEMORY BRIEF:
{state.get('memoryBrief') or 'No cross-thread memory loaded.'}

{"Revise the existing chapter content. Read the chapter via read_project first, preserve plot events, and polish prose." if revision else "Write the requested content as Markdown. Target 500-1000 words when drafting a scene or chapter."}
""".strip()

    draft = run_tool_loop(
        runtime,
        config=config,
        model_key="writerModel",
        fallback_keys=["plannerModel"],
        tools=tools_for_agent("writer"),
        system_prompt=WRITER_PROMPT,
        user_prompt=user_prompt,
        default_fallback=f"# Draft\n\nDraft for: {task_text}",
    )

    word_count = len(draft.split())
    artifact_id = create_artifact(
        project_id=runtime.context.project_id,
        agent_run_id=state["agentRunId"],
        agent_name="writer",
        artifact_type="draft" if not revision else "edited_content",
        content=draft,
        metadata={"task": task_text, "wordCount": word_count, "revision": revision},
    )

    if revision and target_chapter:
        chapter_id = str(target_chapter.get("_id") or target_chapter.get("id") or "")
        pending_write = {
            "kind": "chapter_update",
            "agent": "writer",
            "task": task_text,
            "taskIndex": idx,
            "artifactId": artifact_id,
            "targetCollection": "chapters",
            "operation": "update",
            "targetId": chapter_id,
            "payload": {
                "chapterId": chapter_id,
                "content": draft,
                "wordCount": word_count,
                "status": "completed",
            },
            "preview": draft[:1200],
            "status": "pending",
        }
    else:
        next_number = len(existing_chapters) + 1
        first_line = draft.splitlines()[0].replace("#", "").replace("*", "").strip() if draft.splitlines() else ""
        title = first_line if first_line.lower().startswith("chapter") else f"Chapter {next_number}"
        pending_write = {
            "kind": "chapter_create",
            "agent": "writer",
            "task": task_text,
            "taskIndex": idx,
            "artifactId": artifact_id,
            "targetCollection": "chapters",
            "operation": "insert",
            "payload": {
                "number": next_number,
                "title": title,
                "content": draft,
                "wordCount": word_count,
                "status": "draft",
            },
            "preview": draft[:1200],
            "status": "pending",
        }

    completed_at = datetime.utcnow().isoformat()
    task.update(
        status="completed",
        completedAt=completed_at,
        outputArtifactId=artifact_id,
    )
    if revision and target_chapter:
        task["chapterId"] = str(target_chapter.get("_id") or target_chapter.get("id") or "")
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
        artifactType="draft" if not revision else "edited_content",
        contentPreview=draft[:6000],
    )
    emit_custom("write_proposed", runId=state["agentRunId"], agent="writer", pendingWrite=pending_write)
    emit_custom("task_completed", runId=state["agentRunId"], agent="writer", task=task)

    return {
        "tasks": tasks,
        "currentTaskIndex": idx + 1,
        "artifactIds": [*state.get("artifactIds", []), artifact_id],
        "pendingWrite": pending_write,
    }
