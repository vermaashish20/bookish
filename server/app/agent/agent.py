"""Compiled LangGraph-native Bookish agent."""
from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.agent.nodes.finalize import finalize_node
from app.agent.nodes.planner import approval_node, plan_node, rejected_node
from app.agent.nodes.researcher import researcher_node
from app.agent.nodes.specialists import (
    editor_node,
    fact_checker_node,
    humanizer_node,
    world_builder_node,
)
from app.agent.nodes.writer import writer_node
from app.agent.utils.persistence import build_checkpointer, build_store
from app.agent.utils.routing import route_after_approval, route_next_task
from app.agent.utils.state import BookishAgentState


def execute_next_node(state: BookishAgentState) -> dict:
    """No-op router node that keeps task routing explicit in the graph."""
    return {}


def build_graph():
    workflow = StateGraph(BookishAgentState)

    workflow.add_node("plan", plan_node)
    workflow.add_node("approval", approval_node)
    workflow.add_node("rejected", rejected_node)
    workflow.add_node("execute_next", execute_next_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("fact_checker", fact_checker_node)
    workflow.add_node("humanizer", humanizer_node)
    workflow.add_node("editor", editor_node)
    workflow.add_node("world_builder", world_builder_node)
    workflow.add_node("finalize", finalize_node)

    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "approval")
    workflow.add_conditional_edges(
        "approval",
        route_after_approval,
        {
            "execute_next": "execute_next",
            "rejected": "rejected",
        },
    )
    workflow.add_edge("rejected", "finalize")
    workflow.add_conditional_edges(
        "execute_next",
        route_next_task,
        {
            "researcher": "researcher",
            "writer": "writer",
            "fact_checker": "fact_checker",
            "humanizer": "humanizer",
            "editor": "editor",
            "world_builder": "world_builder",
            "finalize": "finalize",
        },
    )
    workflow.add_edge("researcher", "execute_next")
    workflow.add_edge("writer", "execute_next")
    workflow.add_edge("fact_checker", "execute_next")
    workflow.add_edge("humanizer", "execute_next")
    workflow.add_edge("editor", "execute_next")
    workflow.add_edge("world_builder", "execute_next")
    workflow.add_edge("finalize", END)

    return workflow.compile(
        checkpointer=build_checkpointer(),
        store=build_store(),
    )


graph = build_graph()

