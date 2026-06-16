"""Shared streaming/event helpers independent of any agent implementation."""
from __future__ import annotations

import contextvars
import json
import queue
from typing import Any, Dict, Optional

StreamEvent = Dict[str, Any]

stream_queue_var = contextvars.ContextVar[Optional[queue.Queue]](
    "stream_queue_var",
    default=None,
)
stream_event_type_var = contextvars.ContextVar[str](
    "stream_event_type_var",
    default="hidden_stream",
)

CHAT_STREAM = "chat_message"
DOCUMENT_STREAM = "document_stream"
HIDDEN_STREAM = "hidden_stream"
STATUS_STREAM = "agent_status"
STREAM_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def publish_event(event: StreamEvent) -> None:
    """Publish an event to the active request stream, if one exists."""
    q = stream_queue_var.get()
    if q is not None:
        q.put(event)


def publish_status(text: str) -> None:
    publish_event({"event": STATUS_STREAM, "text": text})


def publish_stream_token(text: str) -> None:
    """Publish an LLM token under the selected stream channel."""
    if not text:
        return
    event_type = stream_event_type_var.get()
    if event_type == HIDDEN_STREAM:
        return
    publish_event({"event": event_type, "text": text})


def publish_sync_event(event_type: str, **payload: Any) -> None:
    """Publish a normalized frontend sync event."""
    publish_event({"event": "sync_event", "type": event_type, **payload})


def publish_timeline_snapshot(project_id: str) -> None:
    """Publish the current execution timeline derived from agent runs."""
    from app.repositories.projects import get_unified_project_payload

    project_payload = get_unified_project_payload(project_id)
    if project_payload:
        decision_log = project_payload.get("memory", {}).get("decisionLog", [])
        publish_sync_event("timeline_updated", decisionLog=decision_log)


def encode_sse(event: StreamEvent) -> str:
    return f"data: {json.dumps(event, default=str)}\n\n"
