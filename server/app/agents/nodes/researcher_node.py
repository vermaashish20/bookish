"""
Researcher Node - Gather and summarize information via RAG.
"""
from app.core.telemetry import observe

from app.agents.orchestration_state import AgentOrchestrationState
from app.agents.runtime import (
    complete_task_and_advance,
    get_current_task,
    begin_task,
    resolve_task_context,
    run_react_loop,
)
from app.core.model_config import load_model_config
from app.prompts.researcher import PROMPT as RESEARCHER_PROMPT
from app.repositories.artifacts import create_artifact
from app.repositories.projects import get_project
from app.infrastructure.llm.service import call_llm
from app.agents.streaming import publish_status, stream_event_type_var


@observe()
def researcher_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    match = get_current_task(state, "researcher")
    if not match:
        return state

    task_idx, current_task = match
    project_id = state["projectId"]
    thinking = f"[Researcher] Starting task: {current_task['task']}\n"

    publish_status("Researcher is gathering context...")

    task_idx, exec_idx = begin_task(state, "researcher", current_task["task"])

    project = get_project(project_id)
    model = load_model_config(
        project, "researcherModel", fallback_keys=["plannerModel", "writerModel"]
    )
    project_ctx = state["projectContext"]
    book_summary = project_ctx.get("bookSummary") or "Story not yet started."
    prior_context = resolve_task_context(state, current_task)

    context_block = f"""
TASK:
{current_task['task']}

BOOK CONTEXT:
  Title:    {project_ctx.get('title', 'Untitled')}
  Genre:    {project_ctx.get('genre', 'Unknown')}
  Tone:     {project_ctx.get('tonality', 'Unknown')}
  Chapters: {project_ctx.get('chapterCount', 0)}

STORY SO FAR:
{book_summary}

{prior_context}
""".strip()

    fallback_content = (
        f"# Research Report\n\nResearch completed for: {current_task['task']}\n\n"
        "Could not generate automated report. Please configure API credentials."
    )

    token = stream_event_type_var.set("document_stream")
    try:
        react = run_react_loop(
            project_id=project_id,
            system_prompt=RESEARCHER_PROMPT,
            base_user_prompt=context_block + (
                "\n\nOutput your final research report as Markdown only (not JSON) when done."
            ),
            call_llm=call_llm,
            llm_kwargs={
                "provider": model["provider"],
                "model_name": model["model_name"],
                "api_key": model["api_key"],
                "default_fallback": fallback_content,
                "base_url": model["base_url"],
            },
            fallback_content=fallback_content,
            thinking_prefix="[Researcher] ",
        )
    finally:
        stream_event_type_var.reset(token)

    thinking += react.thinking
    research_report = react.content or fallback_content

    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="researcher",
        artifact_type="research_notes",
        content=research_report,
        metadata={"query": current_task["task"]},
    )

    state["researchNotes"] = research_report
    state["artifactIds"].append(artifact_id)
    state["thinking_logs"].append(thinking)
    complete_task_and_advance(state, task_idx, exec_idx, artifact_id)

    return state
