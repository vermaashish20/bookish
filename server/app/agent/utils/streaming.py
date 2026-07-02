"""LangGraph custom stream helpers.

Emit application UI events on the `custom` channel via get_stream_writer().
The API forwards `custom` and `tasks` channels to the frontend; see
https://docs.langchain.com/oss/python/langgraph/event-streaming
"""
from __future__ import annotations

from typing import Any


def emit_custom(kind: str, **payload: Any) -> None:
    """Emit a custom LangGraph stream payload when a stream writer is active."""
    try:
        from langgraph.config import get_stream_writer

        writer = get_stream_writer()
        writer({"kind": kind, **payload})
    except Exception:
        pass
