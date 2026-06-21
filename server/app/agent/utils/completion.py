"""Run completion helpers for the Bookish graph."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.utils.context_schema import BookishContext
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.repositories.agent_runs import complete_agent_run, fail_agent_run
from app.repositories.chat_messages import add_chat_message
from app.repositories.projects import get_unified_project_payload


def complete_run(
    state: BookishAgentState,
    config: RunnableConfig,
    runtime: Runtime[BookishContext],
) -> dict[str, Any]:
    """Persist the final assistant message and close the run."""
    if state.get("finalMessageId"):
        return {}

    now = datetime.utcnow().isoformat()
    status = state.get("status", "completed")
    thread_id = (config.get("configurable") or {}).get("thread_id", "unknown")
    project_id = runtime.context.project_id

    if status == "rejected":
        final_response = state.get("finalResponse") or "Run cancelled."
        final_message_id = _add_final_message(state, final_response, project_id, thread_id)
        complete_agent_run(state["agentRunId"], final_message_id, status="failed")
        emit_custom(
            "run_rejected",
            runId=state["agentRunId"],
            messageId=final_message_id,
            projectState=get_unified_project_payload(project_id),
        )
        return {
            "finalResponse": final_response,
            "finalMessageId": final_message_id,
            "status": "rejected",
            "completedAt": now,
        }

    failed_tasks = [task for task in state.get("tasks", []) if task.get("status") == "failed"]
    final_response = state.get("finalResponse") or _default_final_response(state)
    final_message_id = _add_final_message(state, final_response, project_id, thread_id)

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
        projectState=get_unified_project_payload(project_id),
    )
    return {
        "finalResponse": final_response,
        "finalMessageId": final_message_id,
        "status": final_status,
        "completedAt": now,
    }


def _add_final_message(
    state: BookishAgentState,
    final_response: str,
    project_id: str,
    thread_id: str,
) -> str:
    return add_chat_message(
        project_id=project_id,
        role="assistant",
        content=final_response,
        agent_run_id=state["agentRunId"],
        artifact_references=state.get("artifactIds", []),
        thread_id=thread_id,
    )


def _default_final_response(state: BookishAgentState) -> str:
    if state.get("planSummary") and not state.get("tasks"):
        return state["planSummary"]
    completed = [task for task in state.get("tasks", []) if task.get("status") == "completed"]
    if completed:
        agents = ", ".join(str(task.get("agent") or "agent") for task in completed)
        return f"Completed tasks: {agents}. Review the generated artifacts in the workspace."
    return state.get("planSummary") or "Done."
