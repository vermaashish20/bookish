"""LangGraph-native agent API routes."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, AsyncIterator, Dict, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langgraph.types import Command
from pydantic import BaseModel

from app.agent.agent import api_graph as graph
from app.agent.utils.context_schema import build_bookish_context
from app.agent.utils.event_stream import UI_STREAM_MODES, normalize_stream_part, run_interrupted
from app.agent.utils.state import BookishAgentState
from app.core.streaming import STREAM_HEADERS
from app.core.telemetry import flush_langfuse, langfuse_attributes, with_langfuse_callbacks
from app.repositories.agent_runs import create_agent_run
from app.repositories.chat_messages import add_chat_message, create_chat_thread
from app.repositories.projects import get_project

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ThreadCreatePayload(BaseModel):
    projectId: str


class RunStreamPayload(BaseModel):
    projectId: Optional[str] = None
    message: Optional[str] = None
    command: Optional[Dict[str, Any]] = None


@router.post("/threads")
def create_thread(payload: ThreadCreatePayload) -> Dict[str, str]:
    project = get_project(payload.projectId)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    thread = create_chat_thread(payload.projectId)
    return {
        "threadId": thread["threadId"],
        "projectId": payload.projectId,
    }


@router.post("/threads/{thread_id}/runs/stream")
async def stream_thread_run(thread_id: str, payload: RunStreamPayload):
    graph_input, project_id = _build_graph_input(thread_id, payload)
    config = {"configurable": {"thread_id": thread_id}}
    agent_run_id = _extract_run_id(graph_input)
    if isinstance(graph_input, Command):
        checkpoint_state = await graph.aget_state(config)
        if checkpoint_state and checkpoint_state.values:
            agent_run_id = str(checkpoint_state.values.get("agentRunId") or agent_run_id)
    context = build_bookish_context(project_id, agent_run_id=agent_run_id)

    return StreamingResponse(
        _stream_graph_parts(graph_input, config, context),
        media_type="text/event-stream",
        headers=STREAM_HEADERS,
    )


def _build_graph_input(
    thread_id: str,
    payload: RunStreamPayload,
) -> tuple[BookishAgentState | Command, str]:
    if payload.command is not None:
        if "resume" not in payload.command:
            raise HTTPException(status_code=400, detail="Only command.resume is supported.")
        if not payload.projectId:
            raise HTTPException(status_code=400, detail="projectId is required for resume.")
        return Command(resume=payload.command["resume"]), payload.projectId

    if not payload.projectId:
        raise HTTPException(status_code=400, detail="projectId is required for new runs.")
    project = get_project(payload.projectId)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required for new runs.")

    user_message_id = add_chat_message(
        project_id=payload.projectId,
        role="user",
        content=message,
        thread_id=thread_id,
    )
    run_id = create_agent_run(
        project_id=payload.projectId,
        user_message_id=user_message_id,
        user_prompt=message,
        thread_id=thread_id,
    )

    return BookishAgentState(
        userMessageId=user_message_id,
        userPrompt=message,
        agentRunId=run_id,
        memoryBrief="",
        artifactIds=[],
        finalResponse="",
        finalMessageId=None,
        status="pending",
        error=None,
        startedAt=datetime.utcnow().isoformat(),
        completedAt=None,
    ), payload.projectId


async def _stream_graph_parts(
    graph_input: BookishAgentState | Command,
    config: Dict[str, Any],
    context: Any,
) -> AsyncIterator[str]:
    """Stream LangGraph protocol channels to the UI (custom + tasks only)."""
    seq = 0
    interrupted = False
    thread_id = str((config.get("configurable") or {}).get("thread_id") or "unknown")
    project_id = getattr(context, "project_id", "")
    run_id = getattr(context, "agent_run_id", "") or _extract_run_id(graph_input)
    trace_config = with_langfuse_callbacks(config)

    try:
        with langfuse_attributes(
            session_id=thread_id,
            trace_name="bookish-agent-run",
            tags=["bookish", "langgraph"],
            metadata={
                "projectId": project_id,
                "agentRunId": run_id,
                "threadId": thread_id,
            },
        ):
            async for part in graph.astream(
                graph_input,
                config=trace_config,
                context=context,
                stream_mode=list(UI_STREAM_MODES),
                subgraphs=True,
                version="v2",
            ):
                if run_interrupted(part):
                    interrupted = True
                for payload in normalize_stream_part(seq, part):
                    yield _encode_sse(payload)
                    seq += 1
        yield _encode_sse({"event": "done", "interrupted": interrupted})
    except Exception as exc:
        yield _encode_sse({"event": "error", "error": str(exc)})
    finally:
        flush_langfuse()


def _encode_sse(payload: Dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _extract_run_id(graph_input: Any) -> str:
    """Pull agentRunId from a BookishAgentState dict; empty string for resume Commands."""
    if isinstance(graph_input, dict):
        return str(graph_input.get("agentRunId") or "")
    return ""
