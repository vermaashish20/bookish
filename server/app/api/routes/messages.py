from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.hitl import resume_hitl_event
from app.agents.orchestrator import initialize_orchestration_state
from app.agents.streaming import STREAM_HEADERS, stream_agent_run
from app.schemas.api import MessageSubmitPayload, ResumePayload
from app.repositories.chat_messages import get_project_chat_messages
from app.repositories.projects import get_project

router = APIRouter(prefix="/api/projects", tags=["messages"])


@router.get("/{id}/messages")
def fetch_messages(id: str):
    """Fetch all chat messages for a project, ordered by creation date."""
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return get_project_chat_messages(id)

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

    return StreamingResponse(
        stream_agent_run(initial_state),
        media_type="text/event-stream",
        headers=STREAM_HEADERS,
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
