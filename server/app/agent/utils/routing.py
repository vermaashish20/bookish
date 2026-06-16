"""Routing helpers for the LangGraph-native Bookish graph."""
from __future__ import annotations

from app.agent.utils.state import BookishAgentState


def route_after_approval(state: BookishAgentState) -> str:
    approval = state.get("approval") or {}
    return "execute_next" if approval.get("approved") else "rejected"


def route_next_task(state: BookishAgentState) -> str:
    tasks = state.get("tasks", [])
    idx = state.get("currentTaskIndex", 0)
    if idx >= len(tasks):
        return "finalize"

    agent = tasks[idx].get("agent")
    if agent in {
        "researcher",
        "writer",
        "fact_checker",
        "humanizer",
        "editor",
        "world_builder",
    }:
        return agent
    return "finalize"

