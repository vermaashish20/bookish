"""Normalize LangGraph stream parts into UI-facing protocol events.

LangGraph event streaming recommends typed channels (`custom`, `tasks`, …) over
raw `updates` for application UI. See:
https://docs.langchain.com/oss/python/langgraph/event-streaming
"""
from __future__ import annotations

from typing import Any

# Channels forwarded to the Bookish UI SSE stream.
UI_STREAM_MODES = frozenset({"custom", "tasks"})


def normalize_stream_part(seq: int, part: Any) -> list[dict[str, Any]]:
    """Convert one LangGraph `astream` part into zero or more protocol SSE payloads."""
    if not isinstance(part, dict):
        return []

    method = str(part.get("type") or part.get("method") or "")
    if method not in UI_STREAM_MODES:
        return []

    data = part.get("data")
    namespace = list(part.get("ns") or ())
    return [
        {
            "event": "protocol",
            "seq": seq,
            "method": method,
            "namespace": namespace,
            "data": data,
        }
    ]


def run_interrupted(part: Any) -> bool:
    """Return True when a tasks-channel part carries pending HITL interrupts."""
    if not isinstance(part, dict) or part.get("type") != "tasks":
        return False
    data = part.get("data")
    if not isinstance(data, dict):
        return False
    interrupts = data.get("interrupts")
    return isinstance(interrupts, list) and len(interrupts) > 0
