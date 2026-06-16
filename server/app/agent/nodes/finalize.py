"""Finalization node."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.repositories.agent_runs import complete_agent_run, fail_agent_run
from app.repositories.chat_messages import add_chat_message
from app.repositories.projects import get_unified_project_payload


def finalize_node(state: BookishAgentState) -> dict[str, Any]:
    """Persist the final assistant message and close the run."""
    now = datetime.utcnow().isoformat()
    status = state.get("status", "completed")

    if status == "rejected":
        final_response = state.get("finalResponse") or "Run cancelled."
        final_message_id = add_chat_message(
            project_id=state["projectId"],
            role="assistant",
            content=final_response,
            agent_run_id=state["agentRunId"],
            artifact_references=state.get("artifactIds", []),
            session_id=state.get("chatSessionId"),
        )
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
    final_response = state.get("finalResponse")
    if not final_response:
        if state.get("editedContent"):
            final_response = "Final edited draft complete. Review the generated chapter and artifact preview."
        elif state.get("humanizedContent"):
            final_response = "Humanized draft complete. Review the generated artifact preview."
        elif state.get("draftContent"):
            final_response = "Draft complete. Review the generated chapter and artifact preview."
        elif state.get("worldBuildingNotes"):
            final_response = "World-building pass complete. Review the generated lore artifact."
        elif state.get("factCheckReport"):
            final_response = state["factCheckReport"] or "Fact-check complete."
        elif state.get("researchNotes"):
            final_response = state["researchNotes"] or "Research complete."
        else:
            final_response = "Done."

    final_message_id = add_chat_message(
        project_id=state["projectId"],
        role="assistant",
        content=final_response,
        agent_run_id=state["agentRunId"],
        artifact_references=state.get("artifactIds", []),
        session_id=state.get("chatSessionId"),
    )

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

