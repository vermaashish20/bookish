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
from app.agent.utils.context import load_project_context
from app.agent.utils.state import BookishAgentState
from app.core.streaming import STREAM_HEADERS
from app.repositories.agent_runs import create_agent_run
from app.repositories.chat_messages import DEFAULT_CHAT_SESSION_ID, add_chat_message
from app.repositories.projects import get_project

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ThreadCreatePayload(BaseModel):
    projectId: str
    chatSessionId: Optional[str] = None


class RunStreamPayload(BaseModel):
    projectId: Optional[str] = None
    message: Optional[str] = None
    chatSessionId: Optional[str] = None
    command: Optional[Dict[str, Any]] = None


@router.post("/threads")
def create_thread(payload: ThreadCreatePayload) -> Dict[str, str]:
    project = get_project(payload.projectId)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    session_id = payload.chatSessionId or DEFAULT_CHAT_SESSION_ID
    return {
        "threadId": build_thread_id(payload.projectId, session_id),
        "projectId": payload.projectId,
        "chatSessionId": session_id,
    }


@router.post("/threads/{thread_id}/runs/stream")
async def stream_thread_run(thread_id: str, payload: RunStreamPayload):
    graph_input = _build_graph_input(thread_id, payload)
    config = {"configurable": {"thread_id": thread_id}}

    return StreamingResponse(
        _stream_graph_parts(graph_input, config),
        media_type="text/event-stream",
        headers=STREAM_HEADERS,
    )


def build_thread_id(project_id: str, chat_session_id: str) -> str:
    return f"{project_id}:{chat_session_id}"


def _build_graph_input(thread_id: str, payload: RunStreamPayload) -> BookishAgentState | Command:
    if payload.command is not None:
        if "resume" not in payload.command:
            raise HTTPException(status_code=400, detail="Only command.resume is supported.")
        return Command(resume=payload.command["resume"])

    if not payload.projectId:
        raise HTTPException(status_code=400, detail="projectId is required for new runs.")
    project = get_project(payload.projectId)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required for new runs.")

    session_id = payload.chatSessionId or DEFAULT_CHAT_SESSION_ID
    user_message_id = add_chat_message(
        project_id=payload.projectId,
        role="user",
        content=message,
        session_id=session_id,
    )
    run_id = create_agent_run(
        project_id=payload.projectId,
        user_message_id=user_message_id,
        user_prompt=message,
        session_id=session_id,
    )

    return BookishAgentState(
        projectId=payload.projectId,
        chatSessionId=session_id,
        userMessageId=user_message_id,
        userPrompt=message,
        agentRunId=run_id,
        threadId=thread_id,
        projectContext=load_project_context(payload.projectId),
        planSummary="",
        tasks=[],
        currentTaskIndex=0,
        approval=None,
        pendingWrite=None,
        researchNotes=None,
        draftContent=None,
        editedContent=None,
        worldBuildingNotes=None,
        artifactIds=[],
        finalResponse="",
        finalMessageId=None,
        status="pending",
        error=None,
        startedAt=datetime.utcnow().isoformat(),
        completedAt=None,
    )


async def _stream_graph_parts(
    graph_input: BookishAgentState | Command,
    config: Dict[str, Any],
) -> AsyncIterator[str]:
    try:
        async for part in graph.astream(
            graph_input,
            config=config,
            stream_mode=["updates", "custom", "tasks", "checkpoints"],
            version="v2",
        ):
            yield _encode_sse({"event": "langgraph", "part": part})
        yield _encode_sse({"event": "done"})
    except Exception as exc:
        yield _encode_sse({"event": "error", "error": str(exc)})


def _encode_sse(payload: Dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"
