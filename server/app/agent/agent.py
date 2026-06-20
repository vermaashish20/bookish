"""Compiled LangGraph-native Bookish agent."""
from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.agent.nodes.editor import editor_node
from app.agent.nodes.planner import plan_node
from app.agent.nodes.researcher import researcher_node
from app.agent.nodes.write_control import approve_write_node, commit_write_node
from app.agent.nodes.world_builder import world_builder_node
from app.agent.nodes.writer import writer_node
from app.agent.utils.completion import complete_run
from app.agent.utils.persistence import build_checkpointer, build_store
from app.agent.utils.routing import route_after_agent_node, route_after_write_approval, route_next_task
from app.agent.utils.state import BookishAgentState


def execute_next_node(state: BookishAgentState) -> dict:
    """Route the next task or complete the run when the queue is exhausted."""
    tasks = state.get("tasks", [])
    idx = state.get("currentTaskIndex", 0)
    if idx >= len(tasks):
        return complete_run(state)
    return {}


def build_graph(*, with_persistence: bool = False):
    workflow = StateGraph(BookishAgentState)

    workflow.add_node("plan", plan_node)
    workflow.add_node("execute_next", execute_next_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("editor", editor_node)
    workflow.add_node("world_builder", world_builder_node)
    workflow.add_node("approve_write", approve_write_node)
    workflow.add_node("commit_write", commit_write_node)

    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "execute_next")
    workflow.add_conditional_edges(
        "execute_next",
        route_next_task,
        {
            "researcher": "researcher",
            "writer": "writer",
            "editor": "editor",
            "world_builder": "world_builder",
            "end": END,
        },
    )
    workflow.add_edge("researcher", "execute_next")
    workflow.add_conditional_edges(
        "writer",
        route_after_agent_node,
        {
            "approve_write": "approve_write",
            "execute_next": "execute_next",
        },
    )
    workflow.add_conditional_edges(
        "editor",
        route_after_agent_node,
        {
            "approve_write": "approve_write",
            "execute_next": "execute_next",
        },
    )
    workflow.add_conditional_edges(
        "world_builder",
        route_after_agent_node,
        {
            "approve_write": "approve_write",
            "execute_next": "execute_next",
        },
    )
    workflow.add_conditional_edges(
        "approve_write",
        route_after_write_approval,
        {
            "commit_write": "commit_write",
            "execute_next": "execute_next",
        },
    )
    workflow.add_edge("commit_write", "execute_next")

    if with_persistence:
        return workflow.compile(
            checkpointer=build_checkpointer(),
            store=build_store(),
        )

    # LangGraph Agent Server (`langgraph dev` / deployment) injects its own
    # checkpointer and store at runtime. Do not pass them here.
    return workflow.compile()


# Exported for langgraph.json / Agent Server.
graph = build_graph()

# FastAPI streams the graph directly and needs an explicit checkpointer for HITL.
api_graph = build_graph(with_persistence=True)

