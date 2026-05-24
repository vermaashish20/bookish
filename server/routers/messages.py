from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from repository.projects import get_project, get_unified_project_payload
from repository.messages import get_messages
from agents.orchestrator import initialize_orchestration_state
from agents.orchestration_graph import new_orchestration_graph
from models.schemas import MessageSubmitPayload
from services.llm_service import stream_queue_var
import queue
import contextvars
import threading
import json
import asyncio
import time


router = APIRouter(
    prefix="/api/projects",
    tags=["messages"]
)


@router.get("/{id}/messages")
def fetch_messages(id: str):
    """
    Fetch all chat messages associated with a project.
    Ordered by creation date.
    """
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    return get_messages(id)


@router.get("/test-stream")
async def test_stream():
    """
    Test endpoint to verify SSE streaming is working
    Sends a simple counter stream
    """
    async def generate():
        for i in range(10):
            yield f"data: {json.dumps({'event': 'token', 'text': f'Token {i} ', 'count': i})}\n\n"
            await asyncio.sleep(0.5)
        yield f"data: {json.dumps({'event': 'done', 'message': 'Stream complete'})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


def run_graph_in_thread(q: queue.Queue, initial_state: dict):
    """Runs the orchestration graph inside a background thread with the context queue."""
    token = stream_queue_var.set(q)
    print(f"[DEBUG] Stream queue set in thread context: {q}")
    try:
        # Send a test token to verify queue is working
        q.put({"event": "token", "text": "[Starting orchestration...] "})
        
        result_state = new_orchestration_graph.invoke(initial_state)
        
        # Fetch fresh unified project payload to synchronize state in frontend
        project_payload = get_unified_project_payload(result_state["projectId"])
        
        q.put({
            "event": "done",
            "reply": result_state.get("finalResponse", "Task completed."),
            "thinking": "\n".join(result_state.get("thinking_logs", [])),
            "cost": result_state.get("cost", 0.0),
            "tokens": result_state.get("tokens", 0),
            "projectState": project_payload
        })
    except Exception as e:
        print(f"[ERROR] Graph execution failed: {e}")
        q.put({
            "event": "error",
            "error": str(e)
        })
    finally:
        stream_queue_var.reset(token)
        print(f"[DEBUG] Stream queue reset")


@router.post("/{id}/message")
async def submit_message(id: str, payload: MessageSubmitPayload):
    """
    Submit a message to the agent orchestration system.
    Runs the multi-agent orchestration graph and streams the output in real-time using SSE.
    """
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Get input text from payload.message or payload.prompt fallback
    message_text = payload.message or payload.prompt
    if not message_text:
        raise HTTPException(
            status_code=400,
            detail="A message body or prompt is required."
        )

    # Initialize orchestration state
    initial_state = initialize_orchestration_state(
        project_id=id,
        user_prompt=message_text
    )

    async def event_generator():
        q = queue.Queue()
        print(f"[DEBUG] Event generator started, queue: {q}")
        
        # Start graph execution in a background thread with context variable propagation
        ctx = contextvars.copy_context()
        thread = threading.Thread(
            target=ctx.run,
            args=(run_graph_in_thread, q, initial_state)
        )
        thread.start()
        print(f"[DEBUG] Background thread started")

        event_count = 0
        # Yield events from the queue until the thread is finished and queue is empty
        while thread.is_alive() or not q.empty():
            try:
                # Use non-blocking get to prevent blocking the event loop
                event = q.get_nowait()
                event_count += 1
                # Send the event immediately
                event_data = f"data: {json.dumps(event, default=str)}\n\n"
                print(f"[DEBUG] Yielding event #{event_count}: {event.get('event', 'unknown')}")
                yield event_data
                q.task_done()
            except queue.Empty:
                # Yield control to the event loop so Starlette can write and flush buffered socket data immediately
                await asyncio.sleep(0.01)  # Reduced from 0.05 for faster streaming
        
        print(f"[DEBUG] Event generator complete, total events: {event_count}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
