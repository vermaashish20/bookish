"""Routing helpers for the LangGraph-native Bookish graph."""
from __future__ import annotations

from app.agent.utils.state import BookishAgentState


def route_after_agent_node(state: BookishAgentState) -> str:
    pending_write = state.get("pendingWrite") or {}
    return "approve_write" if pending_write.get("status") == "pending" else "execute_next"


def route_after_write_approval(state: BookishAgentState) -> str:
    pending_write = state.get("pendingWrite") or {}
    return "commit_write" if pending_write.get("status") == "approved" else "execute_next"


def route_next_task(state: BookishAgentState) -> str:
    tasks = state.get("tasks", [])
    idx = state.get("currentTaskIndex", 0)
    if idx >= len(tasks):
        return "end"

    agent = tasks[idx].get("agent")
    if agent in {
        "researcher",
        "writer",
        "editor",
        "world_builder",
    }:
        return agent
    return "end"

