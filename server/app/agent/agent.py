"""Compiled LangGraph-native Bookish agent — intent router + peer agents."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from langgraph.graph import END, StateGraph
from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.graphs.agent import planner_agent, world_builder_agent, writer_agent
from app.agent.nodes.classify import classify_intent_node, route_by_intent
from app.agent.utils.context_schema import BookishContext
from app.agent.utils.memory import load_store_memory_node
from app.agent.utils.persistence import build_checkpointer, build_store
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.repositories.agent_runs import complete_agent_run
from app.repositories.artifacts import get_agent_run_artifacts
from app.repositories.chat_messages import add_chat_message
from app.repositories.projects import get_unified_project_payload


def complete_node(
    state: BookishAgentState,
    config: RunnableConfig,
    runtime: Runtime[BookishContext],
) -> dict[str, Any]:
    """Save the final assistant message and close the run."""
    if state.get("finalMessageId"):
        return {}

    now = datetime.utcnow().isoformat()
    thread_id = (config.get("configurable") or {}).get("thread_id", "unknown")
    project_id = runtime.context.project_id
    run_id = state["agentRunId"]

    final_response = state.get("finalResponse") or state.get("userPrompt") or "Done."

    artifact_ids = [a["_id"] for a in get_agent_run_artifacts(run_id)]
    final_message_id = add_chat_message(
        project_id=project_id,
        role="assistant",
        content=final_response,
        agent_run_id=run_id,
        artifact_references=artifact_ids,
        thread_id=thread_id,
    )

    status = state.get("status", "completed")
    if status == "rejected":
        complete_agent_run(run_id, final_message_id, status="failed")
        emit_custom(
            "run_rejected",
            runId=run_id,
            messageId=final_message_id,
            projectState=get_unified_project_payload(project_id),
        )
        return {"finalMessageId": final_message_id, "completedAt": now, "status": "rejected"}

    complete_agent_run(run_id, final_message_id, status="completed")
    emit_custom(
        "run_completed",
        runId=run_id,
        status="completed",
        messageId=final_message_id,
        reply=final_response,
        projectState=get_unified_project_payload(project_id),
    )
    return {
        "finalResponse": final_response,
        "finalMessageId": final_message_id,
        "status": "completed",
        "completedAt": now,
    }


def build_graph(*, with_persistence: bool = False):
    workflow = StateGraph(BookishAgentState, context_schema=BookishContext)

    workflow.add_node("load_memory", load_store_memory_node)
    workflow.add_node("classify", classify_intent_node)
    workflow.add_node("planner_agent", planner_agent)
    workflow.add_node("writer_agent", writer_agent)
    workflow.add_node("world_builder_agent", world_builder_agent)
    workflow.add_node("complete", complete_node)

    workflow.set_entry_point("load_memory")
    workflow.add_edge("load_memory", "classify")
    workflow.add_conditional_edges(
        "classify",
        route_by_intent,
        {
            "planner_agent": "planner_agent",
            "writer_agent": "writer_agent",
            "world_builder_agent": "world_builder_agent",
        },
    )
    workflow.add_edge("planner_agent", "complete")
    workflow.add_edge("writer_agent", "complete")
    workflow.add_edge("world_builder_agent", "complete")
    workflow.add_edge("complete", END)

    if with_persistence:
        return workflow.compile(
            checkpointer=build_checkpointer(),
            store=build_store(),
        )

    return workflow.compile()


graph = build_graph()
api_graph = build_graph(with_persistence=True)
