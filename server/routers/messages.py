from fastapi import APIRouter, HTTPException
from repository.projects import get_project
from repository.messages import get_messages
from agents.orchestrator import initialize_orchestration_state
from agents.orchestration_graph import new_orchestration_graph
from models.schemas import MessageSubmitPayload


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


@router.post("/{id}/message")
def submit_message(id: str, payload: MessageSubmitPayload):
    """
    Submit a message to the agent orchestration system.
    Renamed from 'prompt' to 'message'. Runs the multi-agent orchestration graph.
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

    # Execute orchestration graph
    try:
        result_state = new_orchestration_graph.invoke(initial_state)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent orchestration failed: {str(e)}"
        ) from e

    # Build response
    return {
        "reply": result_state.get("finalResponse", "Task completed."),
        "thinking": "\n".join(result_state.get("thinking_logs", [])),
        "cost": result_state.get("cost", 0.0),
        "tokens": result_state.get("tokens", 0),
        "projectState": {
            "id": id
        }
    }
