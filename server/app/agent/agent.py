"""Compiled LangGraph-native Bookish agent."""
from __future__ import annotations

from langgraph.graph import END, StateGraph
from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.nodes.planner import plan_node
from app.agent.nodes.write_control import approve_write_node, commit_write_node
from app.agent.nodes.world_builder import world_builder_node
from app.agent.nodes.writer import writer_node
from app.agent.utils.completion import complete_run
from app.agent.utils.context_schema import BookishContext
from app.agent.utils.memory import load_store_memory_node, persist_memory_node
from app.agent.utils.persistence import build_checkpointer, build_store
from app.agent.utils.routing import route_after_agent_node, route_after_write_approval, route_next_task
from app.agent.utils.state import BookishAgentState


def execute_next_node(
    state: BookishAgentState,
    config: RunnableConfig,
    runtime: Runtime[BookishContext],
) -> dict:
    """Route the next task or complete the run when the queue is exhausted."""
    tasks = state.get("tasks", [])
    idx = state.get("currentTaskIndex", 0)
    if idx >= len(tasks):
        return complete_run(state, config, runtime)
    return {}


def build_graph(*, with_persistence: bool = False):
    workflow = StateGraph(BookishAgentState, context_schema=BookishContext)

    workflow.add_node("load_store_memory", load_store_memory_node)
    workflow.add_node("plan", plan_node)
    workflow.add_node("execute_next", execute_next_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("world_builder", world_builder_node)
    workflow.add_node("persist_memory", persist_memory_node)
    workflow.add_node("approve_write", approve_write_node)
    workflow.add_node("commit_write", commit_write_node)

    workflow.set_entry_point("load_store_memory")
    workflow.add_edge("load_store_memory", "plan")
    workflow.add_edge("plan", "execute_next")
    workflow.add_conditional_edges(
        "execute_next",
        route_next_task,
        {
            "writer": "writer",
            "world_builder": "world_builder",
            "end": END,
        },
    )
    workflow.add_edge("writer", "persist_memory")
    workflow.add_edge("world_builder", "persist_memory")
    workflow.add_conditional_edges(
        "persist_memory",
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

    return workflow.compile()


graph = build_graph()
api_graph = build_graph(with_persistence=True)
