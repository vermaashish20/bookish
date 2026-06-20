"""Run completion helpers for the Bookish graph."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.repositories.agent_runs import complete_agent_run, fail_agent_run
from app.repositories.chat_messages import add_chat_message
from app.repositories.projects import get_unified_project_payload


def complete_run(state: BookishAgentState) -> dict[str, Any]:
    """Persist the final assistant message and close the run."""
    if state.get("finalMessageId"):
        return {}

    now = datetime.utcnow().isoformat()
    status = state.get("status", "completed")

    if status == "rejected":
        final_response = state.get("finalResponse") or "Run cancelled."
        final_message_id = _add_final_message(state, final_response)
        complete_agent_run(state["agentRunId"], final_message_id, status="failed")
        emit_custom(
            "run_rejected",
            runId=state["agentRunId"],
            messageId=final_message_id,
            projectState=get_unified_project_payload(state["projectId"]),
        )
        return {
            "finalResponse": final_response,
            "finalMessageId": final_message_id,
            "status": "rejected",
            "completedAt": now,
        }

    failed_tasks = [task for task in state.get("tasks", []) if task.get("status") == "failed"]
    final_response = state.get("finalResponse") or _default_final_response(state)
    final_message_id = _add_final_message(state, final_response)

    if failed_tasks:
        fail_agent_run(state["agentRunId"], "One or more graph tasks failed.")
        final_status = "failed"
    else:
        complete_agent_run(state["agentRunId"], final_message_id, status="completed")
        final_status = "completed"

    emit_custom(
        "run_completed",
        runId=state["agentRunId"],
        status=final_status,
        messageId=final_message_id,
        reply=final_response,
        projectState=get_unified_project_payload(state["projectId"]),
    )
    return {
        "finalResponse": final_response,
        "finalMessageId": final_message_id,
        "status": final_status,
        "completedAt": now,
    }


def _add_final_message(state: BookishAgentState, final_response: str) -> str:
    return add_chat_message(
        project_id=state["projectId"],
        role="assistant",
        content=final_response,
        agent_run_id=state["agentRunId"],
        artifact_references=state.get("artifactIds", []),
        session_id=state.get("chatSessionId"),
    )


def _default_final_response(state: BookishAgentState) -> str:
    if state.get("editedContent"):
        return "Final edited draft complete. Review the generated chapter and artifact preview."
    if state.get("draftContent"):
        return "Draft complete. Review the generated chapter and artifact preview."
    if state.get("worldBuildingNotes"):
        return "World-building pass complete. Review the generated lore artifact."
    if state.get("researchNotes"):
        return state["researchNotes"] or "Research complete."
    return "Done."
