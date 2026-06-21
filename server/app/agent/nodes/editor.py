"""Editor agent node."""
from __future__ import annotations

from typing import Any

from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.nodes.agent_runner import artifact_content_for_agent, latest_chapter_id, run_agent_node
from app.agent.utils.context_schema import BookishContext
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.prompts.editor import PROMPT as EDITOR_PROMPT


def editor_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    config: RunnableConfig,
) -> dict[str, Any]:
    source_text = artifact_content_for_agent(state, "writer") or artifact_content_for_agent(state, "editor")
    result = run_agent_node(
        state,
        runtime,
        config,
        agent="editor",
        model_key="editorModel",
        fallback_keys=["writerModel", "plannerModel"],
        artifact_type="edited_content",
        system_prompt=EDITOR_PROMPT,
        source_label="DRAFT TO EDIT",
        source_text=source_text,
        default_fallback=source_text or "No draft content was available to edit.",
    )
    edited_artifact_id = (result.get("artifactIds") or [""])[-1]
    from app.repositories.artifacts import get_artifact

    artifact = get_artifact(str(edited_artifact_id)) if edited_artifact_id else None
    edited = str((artifact or {}).get("content") or "")
    if edited.strip():
        chapter_id = latest_chapter_id(result.get("tasks", []))
        if chapter_id:
            task_idx = max(0, int(result.get("currentTaskIndex", 1)) - 1)
            pending_write = {
                "kind": "chapter_update",
                "agent": "editor",
                "task": result.get("tasks", [{}])[task_idx].get("task", "Edit chapter"),
                "taskIndex": task_idx,
                "artifactId": edited_artifact_id,
                "targetCollection": "chapters",
                "operation": "update",
                "targetId": chapter_id,
                "payload": {
                    "chapterId": chapter_id,
                    "content": edited,
                    "wordCount": len(edited.split()),
                    "status": "completed",
                },
                "preview": edited[:1200],
                "status": "pending",
            }
            emit_custom(
                "write_proposed",
                runId=state["agentRunId"],
                agent="editor",
                pendingWrite=pending_write,
            )
            result["pendingWrite"] = pending_write
    return result
