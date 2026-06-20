"""Editor agent node."""
from __future__ import annotations

from typing import Any

from app.agent.nodes.agent_runner import latest_chapter_id, run_agent_node
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.prompts.editor import PROMPT as EDITOR_PROMPT


def editor_node(state: BookishAgentState) -> dict[str, Any]:
    source_text = state.get("draftContent") or ""
    result = run_agent_node(
        state,
        agent="editor",
        model_key="editorModel",
        fallback_keys=["writerModel", "plannerModel"],
        artifact_type="edited_content",
        output_state_key="editedContent",
        system_prompt=EDITOR_PROMPT,
        source_label="DRAFT TO EDIT",
        source_text=source_text,
        default_fallback=source_text or "No draft content was available to edit.",
    )
    edited = result.get("editedContent")
    if isinstance(edited, str) and edited.strip():
        chapter_id = latest_chapter_id(result.get("tasks", []))
        if chapter_id:
            task_idx = max(0, int(result.get("currentTaskIndex", 1)) - 1)
            pending_write = {
                "kind": "chapter_update",
                "agent": "editor",
                "task": result.get("tasks", [{}])[task_idx].get("task", "Edit chapter"),
                "taskIndex": task_idx,
                "artifactId": (result.get("artifactIds") or [""])[-1],
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
        result["draftContent"] = edited
    return result
