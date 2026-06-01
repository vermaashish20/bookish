"""
Agent Orchestration Graph
"""
import logging
from datetime import datetime

from langgraph.graph import END, StateGraph

from app.agents.orchestration_state import AgentOrchestrationState
from app.agents.nodes.planner_node import planner_node
from app.agents.nodes.researcher_node import researcher_node
from app.agents.nodes.writer_node import writer_node
from app.agents.nodes.fact_checker_node import fact_checker_node
from app.agents.nodes.humanizer_node import humanizer_node
from app.agents.nodes.editor_node import editor_node
from app.agents.nodes.world_builder_node import world_builder_node
from app.agents.runtime import ALLOWED_TASK_AGENTS, summarize_task_outcomes
from app.repositories.chat_messages import add_chat_message
from app.repositories.agent_runs import complete_agent_run

logger = logging.getLogger(__name__)

# Graph node names = agent names + finalize
_GRAPH_ROUTES = {*ALLOWED_TASK_AGENTS, "finalize"}


def should_continue_tasks(state: AgentOrchestrationState) -> str:
    """
    Route to the next agent, or finalize.
    Short-circuits when the planner chose a direct response.
    """
    planner_output = state.get("plannerOutput")
    if planner_output and not planner_output.get("needsAgents", True):
        return "finalize"

    tasks = state["tasks"]
    index = state["currentTaskIndex"]
    if index >= len(tasks):
        return "finalize"

    agent_name = tasks[index]["agent"]
    if agent_name in ALLOWED_TASK_AGENTS:
        return agent_name

    logger.warning(
        "Task %s has invalid agent '%s' after validation — finalizing early.",
        index,
        agent_name,
    )
    return "finalize"


def _build_finalize_message(state: AgentOrchestrationState) -> tuple[str, str]:
    """Return (user_message, run_status) for complete_agent_run."""
    planner_output = state.get("plannerOutput")

    if planner_output and not planner_output.get("needsAgents", True):
        text = (
            planner_output.get("directResponse")
            or planner_output.get("userVisibleSummary", "Done.")
        )
        return text, "completed"

    counts = summarize_task_outcomes(state.get("tasks", []))
    summary = (planner_output or {}).get("userVisibleSummary", "Your request has been processed.")
    failed = counts.get("failed", 0) + counts.get("rejected", 0)

    if failed and counts.get("completed", 0) == 0:
        footer = (
            f"\n\n*Run finished with issues: {failed} task(s) did not complete successfully. "
            "See the Agent Flow trace for details.*"
        )
        return f"{summary}{footer}", "failed"

    if failed:
        footer = (
            f"\n\n*{counts.get('completed', 0)} task(s) completed; "
            f"{failed} task(s) failed or were skipped. "
            "Preview artifacts in the Agent Flow trace.*"
        )
    else:
        footer = (
            "\n\n*Tasks completed. Preview generated artifacts in the Agent Flow trace.*"
        )

    return f"{summary}{footer}", "failed" if failed else "completed"


def finalize_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """Compose final chat response and close the agent run."""
    thinking = "[Orchestrator] Finalizing execution...\n"

    final_response, run_status = _build_finalize_message(state)

    final_message_id = add_chat_message(
        project_id=state["projectId"],
        role="assistant",
        content=final_response,
        agent_run_id=state["agentRunId"],
        artifact_references=state["artifactIds"],
    )

    complete_agent_run(
        run_id=state["agentRunId"],
        final_message_id=final_message_id,
        status=run_status,
    )

    thinking += f"[Orchestrator] Run {run_status}. Message: {final_message_id}\n"

    state["finalResponse"] = final_response
    state["finalMessageId"] = final_message_id
    state["status"] = run_status
    state["completedAt"] = datetime.utcnow().isoformat()
    state["thinking_logs"].append(thinking)

    return state


def _wire_agent(workflow: StateGraph, node_name: str) -> None:
    workflow.add_conditional_edges(
        node_name,
        should_continue_tasks,
        {route: route for route in _GRAPH_ROUTES},
    )


def build_orchestration_graph():
    """
    planner → [specialist agents in planner order] → finalize → END
    Each specialist returns to should_continue_tasks until tasks are exhausted.
    """
    workflow = StateGraph(AgentOrchestrationState)

    workflow.add_node("planner", planner_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("fact_checker", fact_checker_node)
    workflow.add_node("humanizer", humanizer_node)
    workflow.add_node("editor", editor_node)
    workflow.add_node("world_builder", world_builder_node)
    workflow.add_node("finalize", finalize_node)

    workflow.set_entry_point("planner")

    for node in (
        "planner", "researcher", "writer", "fact_checker",
        "humanizer", "editor", "world_builder",
    ):
        _wire_agent(workflow, node)

    workflow.add_edge("finalize", END)

    return workflow.compile()


new_orchestration_graph = build_orchestration_graph()
