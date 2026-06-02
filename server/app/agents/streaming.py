"""
Streaming utilities for agent orchestration.

This module owns the active SSE queue context so routes, agent nodes, and the
LLM gateway can publish events without depending on each other directly.
"""
from __future__ import annotations

import asyncio
import contextvars
import json
import logging
import os
import queue
import re
import threading
from contextlib import contextmanager
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Union

from app.core.telemetry import langfuse_context, observe

logger = logging.getLogger(__name__)

StreamEvent = Dict[str, Any]
STREAM_DEBUG = os.getenv("BOOKISH_STREAM_DEBUG", "").lower() in {"1", "true", "yes", "on"}


def _debug_stream(message: str, **data: Any) -> None:
    """Temporary print diagnostics for SSE debugging."""
    if not STREAM_DEBUG:
        return
    details = " ".join(f"{key}={value!r}" for key, value in data.items())
    print(f"[SSE DEBUG] {message}" + (f" | {details}" if details else ""), flush=True)

stream_queue_var = contextvars.ContextVar[Optional[queue.Queue]](
    "stream_queue_var",
    default=None,
)
stream_event_type_var = contextvars.ContextVar[str](
    "stream_event_type_var",
    default="hidden_stream",
)


class GuardedStreamBuffer:
    """Buffer initial LLM tokens until they are safe to expose to the UI."""

    def __init__(self, event_type: str) -> None:
        self.event_type = event_type
        self.tokens: List[str] = []
        self.released = False
        self.seen_tokens = False

    def append(self, text: str) -> None:
        self.seen_tokens = True
        if self.released:
            _debug_stream("guard_released_emit", event=self.event_type, text_preview=text[:80])
            publish_event({"event": self.event_type, "text": text})
            return

        self.tokens.append(text)
        if self._looks_user_visible():
            _debug_stream(
                "guard_release_user_visible",
                event=self.event_type,
                buffered_chars=len("".join(self.tokens)),
            )
            self.flush()

    def flush(self) -> None:
        if self.event_type == HIDDEN_STREAM:
            _debug_stream("guard_flush_hidden_discard", buffered_chars=len("".join(self.tokens)))
            self.tokens.clear()
            return

        _debug_stream("guard_flush", event=self.event_type, token_count=len(self.tokens))
        for token in self.tokens:
            publish_event({"event": self.event_type, "text": token})
        self.tokens.clear()
        self.released = True

    def discard(self) -> None:
        _debug_stream("guard_discard", event=self.event_type, buffered_chars=len("".join(self.tokens)))
        self.tokens.clear()

    def _looks_user_visible(self) -> bool:
        text = "".join(self.tokens).lstrip()
        if not text:
            return False

        # Tool calls and planner responses are JSON-shaped. Keep buffering them
        # until the runtime can parse and decide whether they are internal.
        if text[0] in "{[":
            return False
        if text.startswith("```") and "json" in text[:12].lower():
            return False

        return True


StreamBuffer = Union[GuardedStreamBuffer, List[str]]


stream_buffer_var = contextvars.ContextVar[Optional[StreamBuffer]](
    "stream_buffer_var",
    default=None,
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

_FAST_DIRECT_MAX_CHARS = 220
_AGENT_WORK_RE = re.compile(
    r"\b("
    r"write|draft|chapter|scene|outline|plot|story|book|novel|character|entity|world|"
    r"research|fact[- ]?check|edit|revise|humanize|polish|memory|remember|save|persist|"
    r"finali[sz]e|publish|artifact|agent|planner|writer|timeline|bible|upload|attachment"
    r")\b",
    re.IGNORECASE,
)
_SIMPLE_DIRECT_RE = re.compile(
    r"^\s*(hi|hello|hey|thanks|thank you|what|where|when|who|why|how|is|are|can|could|"
    r"tell me|explain|define)\b",
    re.IGNORECASE,
)


def should_fast_direct_response(prompt: str) -> bool:
    """Route obvious conversational prompts directly to chat for low-latency UX."""
    text = (prompt or "").strip()
    if not text or len(text) > _FAST_DIRECT_MAX_CHARS:
        return False
    if _AGENT_WORK_RE.search(text):
        return False
    return bool(_SIMPLE_DIRECT_RE.search(text)) or text.endswith("?")


def publish_event(event: StreamEvent) -> None:
    """Publish an event to the active stream, if one exists."""
    q = stream_queue_var.get()
    if q is not None:
        text = str(event.get("text", event.get("reply", event.get("error", ""))))
        _debug_stream(
            "publish_event",
            event=event.get("event"),
            type=event.get("type"),
            text_preview=text[:120],
            queue_size=q.qsize(),
        )
        q.put(event)
    else:
        _debug_stream("drop_event_no_queue", event=event.get("event"), type=event.get("type"))


def publish_status(text: str) -> None:
    publish_event({"event": STATUS_STREAM, "text": text})


def publish_user_confirmation(text: str, run_id: str) -> None:
    publish_event({"event": "user_confirmation", "text": text, "run_id": run_id})


def publish_stream_token(text: str) -> None:
    """Publish an LLM token under the currently selected visibility channel."""
    if not text:
        return

    event_type = stream_event_type_var.get()
    if event_type == HIDDEN_STREAM:
        _debug_stream("drop_hidden_token", text_preview=text[:80])
        return

    buffer = stream_buffer_var.get()
    if buffer is not None:
        _debug_stream("buffer_token", event=event_type, text_preview=text[:80])
        buffer.append(text)
        return

    _debug_stream("publish_token_direct", event=event_type, text_preview=text[:80])
    publish_event({"event": event_type, "text": text})


def publish_chat_message(text: str) -> None:
    publish_text(text, CHAT_STREAM)


def publish_document_text(text: str) -> None:
    publish_text(text, DOCUMENT_STREAM)


def publish_text(text: str, event_type: Optional[str] = None, *, chunk_size: int = 80) -> None:
    """Publish already-complete text in small chunks for the UI stream."""
    if not text:
        return

    target_event = event_type or stream_event_type_var.get()
    if target_event == HIDDEN_STREAM:
        return

    for start in range(0, len(text), chunk_size):
        publish_event({"event": target_event, "text": text[start:start + chunk_size]})


@contextmanager
def buffer_llm_stream(event_type: Optional[str] = None) -> Iterator[GuardedStreamBuffer]:
    """
    Capture LLM tokens without emitting them immediately.

    ReAct nodes use this while deciding whether an LLM response is an internal
    tool call or final user-visible text.
    """
    selected_event = event_type or stream_event_type_var.get()
    buffered_tokens = GuardedStreamBuffer(selected_event)
    event_token = stream_event_type_var.set(selected_event)
    buffer_token = stream_buffer_var.set(buffered_tokens)
    try:
        yield buffered_tokens
    finally:
        stream_buffer_var.reset(buffer_token)
        stream_event_type_var.reset(event_token)


def flush_buffered_stream(buffered_tokens: StreamBuffer, event_type: Optional[str] = None) -> None:
    if isinstance(buffered_tokens, GuardedStreamBuffer):
        buffered_tokens.flush()
        return

    if not buffered_tokens:
        return
    target_event = event_type or stream_event_type_var.get()
    if target_event == HIDDEN_STREAM:
        return
    for token in buffered_tokens:
        publish_event({"event": target_event, "text": token})


def publish_sync_event(event_type: str, **payload: Any) -> None:
    """Publish a normalized frontend sync event."""
    publish_event({"event": "sync_event", "type": event_type, **payload})


def publish_project_snapshot(project_id: str) -> None:
    """Publish the canonical workspace payload for reconciliation."""
    from app.repositories.projects import get_unified_project_payload

    project_payload = get_unified_project_payload(project_id)
    if project_payload:
        publish_sync_event("project_snapshot", projectState=project_payload)


def publish_timeline_snapshot(project_id: str) -> None:
    """Publish the current execution timeline derived from agent runs."""
    from app.repositories.projects import get_unified_project_payload

    project_payload = get_unified_project_payload(project_id)
    if project_payload:
        decision_log = project_payload.get("memory", {}).get("decisionLog", [])
        publish_sync_event("timeline_updated", decisionLog=decision_log)


def encode_sse(event: StreamEvent) -> str:
    return f"data: {json.dumps(event, default=str)}\n\n"


def run_direct_chat_in_thread(q: queue.Queue, initial_state: dict) -> None:
    """Answer simple prompts directly with live chat-message streaming."""
    from app.core.model_config import load_model_config
    from app.infrastructure.llm.service import call_llm
    from app.repositories.agent_runs import complete_agent_run, fail_agent_run
    from app.repositories.chat_messages import add_chat_message
    from app.repositories.projects import get_project, get_unified_project_payload

    token = stream_queue_var.set(q)
    event_token = stream_event_type_var.set(CHAT_STREAM)
    run_id = initial_state["agentRunId"]
    project_id = initial_state["projectId"]
    prompt = initial_state["userPrompt"]
    _debug_stream("direct_chat_thread_start", run_id=run_id, project_id=project_id)
    try:
        publish_status("Answering directly...")
        project = get_project(project_id) or {}
        model = load_model_config(project, "plannerModel")
        project_context = initial_state.get("projectContext", {})
        system_prompt = (
            "You are Bookish, a helpful writing assistant. Answer the user's prompt directly. "
            "Do not output JSON, hidden reasoning, tool calls, or planner notes. "
            "Keep the answer clear and concise unless the user asks for detail."
        )
        user_prompt = f"""
USER PROMPT:
{prompt}

PROJECT CONTEXT:
Title: {project_context.get("title", "Untitled")}
Genre: {project_context.get("genre", "Unknown")}
Tone: {project_context.get("tonality", "Unknown")}

Answer the user in plain text.
""".strip()

        response = call_llm(
            provider=model["provider"],
            model_name=model["model_name"],
            api_key=model["api_key"],
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            default_fallback="I'm ready to help. Could you clarify your request?",
            base_url=model["base_url"],
        )
        final_message_id = add_chat_message(
            project_id=project_id,
            role="assistant",
            content=response,
            agent_run_id=run_id,
        )
        complete_agent_run(
            run_id=run_id,
            final_message_id=final_message_id,
            status="completed",
        )
        publish_event({
            "event": "done",
            "reply": response,
            "thinking": "[Direct Chat] Fast path completed.\n",
            "projectState": get_unified_project_payload(project_id),
        })
    except Exception as exc:
        _debug_stream("direct_chat_thread_error", run_id=run_id, error=str(exc))
        logger.error("[DirectChat] Execution failed: %s", exc, exc_info=True)
        fail_agent_run(run_id, str(exc))
        publish_event({"event": "error", "error": str(exc)})
    finally:
        _debug_stream("direct_chat_thread_finish", run_id=run_id, remaining_queue=q.qsize())
        stream_event_type_var.reset(event_token)
        stream_queue_var.reset(token)


@observe()
def run_graph_in_thread(q: queue.Queue, initial_state: dict) -> None:
    """Run the orchestration graph in a background thread with SSE context."""
    from app.agents.orchestration_graph import new_orchestration_graph
    from app.core.exceptions import RunAbortedError
    from app.repositories.agent_runs import fail_agent_run
    from app.repositories.chat_messages import add_chat_message
    from app.repositories.projects import get_unified_project_payload

    langfuse_context.update_current_trace(
        session_id=initial_state["projectId"],
        name="bookish-agent-orchestration",
    )
    token = stream_queue_var.set(q)
    run_id = initial_state["agentRunId"]
    _debug_stream("graph_thread_start", run_id=run_id, project_id=initial_state.get("projectId"))
    try:
        publish_status("Starting agent run...")
        result_state = new_orchestration_graph.invoke(initial_state)
        _debug_stream("graph_thread_done", run_id=run_id, status=result_state.get("status"))
        project_payload = get_unified_project_payload(result_state["projectId"])
        publish_event({
            "event": "done",
            "reply": result_state.get("finalResponse", "Task completed."),
            "thinking": "\n".join(result_state.get("thinking_logs", [])),
            "projectState": project_payload,
        })
    except RunAbortedError as exc:
        _debug_stream("graph_thread_aborted", run_id=run_id, error=str(exc))
        logger.info("[Graph] Run aborted by user: %s", exc)
        fail_agent_run(run_id, str(exc))
        msg_id = add_chat_message(
            project_id=initial_state["projectId"],
            role="assistant",
            content="Run cancelled - you rejected the proposed plan.",
            agent_run_id=run_id,
        )
        publish_event({
            "event": "done",
            "reply": "Run cancelled.",
            "thinking": "",
            "projectState": get_unified_project_payload(initial_state["projectId"]),
            "cancelled": True,
            "messageId": msg_id,
        })
    except Exception as exc:
        _debug_stream("graph_thread_error", run_id=run_id, error=str(exc))
        logger.error("[Graph] Execution failed: %s", exc, exc_info=True)
        fail_agent_run(run_id, str(exc))
        publish_event({"event": "error", "error": str(exc)})
    finally:
        _debug_stream("graph_thread_finish", run_id=run_id, remaining_queue=q.qsize())
        stream_queue_var.reset(token)


async def stream_agent_run(initial_state: dict) -> AsyncIterator[str]:
    """Start an agent run in a thread and yield encoded SSE events."""
    q: queue.Queue = queue.Queue()
    ctx = contextvars.copy_context()
    use_direct_chat = should_fast_direct_response(initial_state.get("userPrompt", ""))
    _debug_stream(
        "stream_agent_run_start",
        project_id=initial_state.get("projectId"),
        run_id=initial_state.get("agentRunId"),
        mode="direct_chat" if use_direct_chat else "graph",
    )
    target = run_direct_chat_in_thread if use_direct_chat else run_graph_in_thread
    thread = threading.Thread(
        target=ctx.run,
        args=(target, q, initial_state),
        daemon=True,
    )
    thread.start()

    while thread.is_alive() or not q.empty():
        try:
            event = q.get_nowait()
            _debug_stream(
                "yield_event",
                event=event.get("event"),
                type=event.get("type"),
                queue_size=q.qsize(),
            )
            yield encode_sse(event)
            q.task_done()
        except queue.Empty:
            await asyncio.sleep(0.01)
    _debug_stream("stream_agent_run_end", run_id=initial_state.get("agentRunId"))
