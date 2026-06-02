"""
Humanizer Node - Remove AI tells, naturalize prose, apply tone presets.
Reads draftContent from state; writes humanizedContent (and updates draftContent) to state.
"""
from datetime import datetime

from app.agents.orchestration_state import AgentOrchestrationState
from app.core.model_config import load_model_config
from app.prompts.humanizer import PROMPT as HUMANIZER_PROMPT
from app.infrastructure.llm.service import call_llm
from app.agents.streaming import publish_status, stream_event_type_var
from app.repositories.artifacts import create_artifact
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.projects import get_project
from app.core.telemetry import observe


@observe()
def humanizer_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Humanizer agent node.
    - Removes AI-generated artifacts and unnatural phrasing
    - Applies genre/tone preset guidelines
    - Guards: skips gracefully if no draftContent exists in state
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]

    if current_task_idx >= len(state["tasks"]):
        return state

    current_task = state["tasks"][current_task_idx]

    if current_task["agent"] != "humanizer":
        return state

    thinking = f"[Humanizer] Starting task: {current_task['task']}\n"

    publish_status("Humanizer is adjusting tone and style...")

    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="humanizer",
        task_input=current_task["task"],
        status="running",
    )

    # Guard: humanizer requires draftContent to work on
    source_text = state.get("draftContent") or ""
    if not source_text:
        thinking += "[Humanizer] No draftContent in state — skipping humanization.\n"
        state["tasks"][current_task_idx]["status"] = "failed"
        state["tasks"][current_task_idx]["error"] = "No draft content to humanize."
        state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
        state["currentTaskIndex"] += 1
        state["thinking_logs"].append(thinking)
        update_agent_execution(
            run_id=state["agentRunId"],
            execution_index=exec_idx,
            status="failed",
        )
        return state

    project = get_project(project_id)
    model = load_model_config(
        project, "humanizerModel", fallback_keys=["writerModel"]
    )
    project_ctx = state["projectContext"]

    context_block = f"""
TASK:
{current_task['task']}

BOOK CONTEXT:
  Title:  {project_ctx.get('title', 'Untitled')}
  Genre:  {project_ctx.get('genre', 'Unknown')}
  Tone:   {project_ctx.get('tonality', 'Unknown')}

TEXT TO HUMANIZE:
{source_text}
""".strip()

    token = stream_event_type_var.set("document_stream")
    try:
        humanized_content = call_llm(
            provider=model["provider"],
            model_name=model["model_name"],
            api_key=model["api_key"],
            system_prompt=HUMANIZER_PROMPT,
            user_prompt=context_block,
            default_fallback=source_text,  # safe fallback: return input unchanged
            base_url=model["base_url"],
        )
    finally:
        stream_event_type_var.reset(token)

    word_count = len(humanized_content.split())
    thinking += f"[Humanizer] Complete. Word count: {word_count}\n"

    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="humanizer",
        artifact_type="humanized_content",
        content=humanized_content,
        metadata={"wordCount": word_count, "task": current_task["task"]},
    )

    thinking += f"[Humanizer] Artifact saved: {artifact_id}\n"

    # humanizedContent is the canonical output; draftContent is updated so downstream
    # editor always gets the most refined version via draftContent
    state["humanizedContent"] = humanized_content
    state["draftContent"] = humanized_content
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["status"] = "completed"
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)

    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id,
    )

    return state
