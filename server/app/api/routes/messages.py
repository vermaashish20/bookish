import asyncio
import contextvars
import json
import logging
import queue
import threading

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.core.telemetry import langfuse_context, observe

from app.core.exceptions import RunAbortedError
from app.agents.hitl import resume_hitl_event
from app.agents.orchestration_graph import new_orchestration_graph
from app.agents.orchestrator import initialize_orchestration_state
from app.schemas.api import MessageSubmitPayload, ResumePayload
from app.repositories.agent_runs import fail_agent_run
from app.repositories.chat_messages import add_chat_message, get_project_chat_messages
from app.repositories.projects import get_project, get_unified_project_payload
from app.infrastructure.llm.service import stream_queue_var

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["messages"])


@router.get("/{id}/messages")
def fetch_messages(id: str):
    """Fetch all chat messages for a project, ordered by creation date."""
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return get_project_chat_messages(id)


@observe()
def run_graph_in_thread(q: queue.Queue, initial_state: dict):
    """Run the orchestration graph in a background thread with the SSE queue in context."""
    langfuse_context.update_current_trace(
        session_id=initial_state["projectId"],
        name="bookish-agent-orchestration",
    )
    token = stream_queue_var.set(q)
    run_id = initial_state["agentRunId"]
    try:
        q.put({"event": "token", "text": ""})
        result_state = new_orchestration_graph.invoke(initial_state)
        project_payload = get_unified_project_payload(result_state["projectId"])
        q.put({
            "event": "done",
            "reply": result_state.get("finalResponse", "Task completed."),
            "thinking": "\n".join(result_state.get("thinking_logs", [])),
            "projectState": project_payload,
        })
    except RunAbortedError as exc:
        logger.info("[Graph] Run aborted by user: %s", exc)
        fail_agent_run(run_id, str(exc))
        msg_id = add_chat_message(
            project_id=initial_state["projectId"],
            role="assistant",
            content="Run cancelled — you rejected the proposed plan.",
            agent_run_id=run_id,
        )
        q.put({
            "event": "done",
            "reply": "Run cancelled.",
            "thinking": "",
            "projectState": get_unified_project_payload(initial_state["projectId"]),
            "cancelled": True,
            "messageId": msg_id,
        })
    except Exception as exc:
        logger.error("[Graph] Execution failed: %s", exc, exc_info=True)
        fail_agent_run(run_id, str(exc))
        q.put({"event": "error", "error": str(exc)})
    finally:
        stream_queue_var.reset(token)


@router.post("/{id}/message")
async def submit_message(id: str, payload: MessageSubmitPayload):
    """
    Submit a user message to the agent orchestration system.
    Runs the multi-agent graph and streams output in real-time via SSE.
    """
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    message_text = payload.message or payload.prompt
    if not message_text:
        raise HTTPException(status_code=400, detail="A message body or prompt is required.")

    initial_state = initialize_orchestration_state(
        project_id=id,
        user_prompt=message_text,
    )

    async def event_generator():
        q: queue.Queue = queue.Queue()
        ctx = contextvars.copy_context()
        thread = threading.Thread(target=ctx.run, args=(run_graph_in_thread, q, initial_state))
        thread.start()

        while thread.is_alive() or not q.empty():
            try:
                event = q.get_nowait()
                yield f"data: {json.dumps(event, default=str)}\n\n"
                q.task_done()
            except queue.Empty:
                await asyncio.sleep(0.01)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{id}/resume")
async def resume_agent(id: str, payload: ResumePayload):
    """Resume a suspended (HITL-paused) agent thread."""
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    success = resume_hitl_event(payload.run_id, payload.response)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid run_id or agent is not paused.")

    return {"status": "resumed", "response": payload.response}
