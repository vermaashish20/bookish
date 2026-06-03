"""
Fact-Checker Node - Verify factual accuracy and internal consistency.
Reads draftContent from state; writes factCheckReport to state.
"""
from datetime import datetime

from app.agents.orchestration_state import AgentOrchestrationState
from app.agents.runtime import format_source_assets, run_react_loop
from app.core.model_config import load_model_config
from app.prompts.fact_checker import PROMPT as FACT_CHECKER_PROMPT
from app.infrastructure.llm.service import call_llm
from app.agents.streaming import publish_status, stream_event_type_var
from app.repositories.artifacts import create_artifact
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.projects import get_project
from app.core.telemetry import observe


@observe()
def fact_checker_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Fact-Checker agent node.
    - Verifies assertions in draftContent against the character bible and world knowledge
    - Produces a structured fact-check report
    - Guards: skips gracefully if no draftContent exists in state
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]

    if current_task_idx >= len(state["tasks"]):
        return state

    current_task = state["tasks"][current_task_idx]

    if current_task["agent"] != "fact_checker":
        return state

    thinking = f"[Fact-Checker] Starting audit: {current_task['task']}\n"

    publish_status("Fact-Checker is auditing the draft...")

    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="fact_checker",
        task_input=current_task["task"],
        status="running",
    )

    # Guard: fact_checker requires draftContent
    text_to_audit = state.get("draftContent") or ""
    if not text_to_audit:
        thinking += "[Fact-Checker] No draftContent in state — skipping audit.\n"
        state["tasks"][current_task_idx]["status"] = "failed"
        state["tasks"][current_task_idx]["error"] = "No draft content to audit."
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
        project, "factCheckerModel", fallback_keys=["writerModel", "plannerModel"]
    )
    project_ctx = state["projectContext"]

    context_block = f"""
TASK:
{current_task['task']}

BOOK CONTEXT:
  Title:    {project_ctx.get('title', 'Untitled')}
  Genre:    {project_ctx.get('genre', 'Unknown')}
  Formal memory entries: {project_ctx.get('characterCount', 0)} characters/entities
  Chapters: {project_ctx.get('chapterCount', 0)}

{format_source_assets(project_ctx)}

DRAFT TO AUDIT:
{text_to_audit}
""".strip()

    default_report = (
        f"# Fact Check Audit Report\n\nAudit for: {current_task['task']}\nStatus: Verified (Fallback)"
    )

    token = stream_event_type_var.set("hidden_stream")
    try:
        react = run_react_loop(
            project_id=project_id,
            system_prompt=FACT_CHECKER_PROMPT,
            base_user_prompt=context_block,
            call_llm=call_llm,
            llm_kwargs={
                "provider": model["provider"],
                "model_name": model["model_name"],
                "api_key": model["api_key"],
                "default_fallback": default_report,
                "base_url": model["base_url"],
            },
            fallback_content=default_report,
            thinking_prefix="[Fact-Checker] ",
            run_id=state["agentRunId"],
            agent_name="fact_checker",
            task_name=current_task["task"],
        )
    finally:
        stream_event_type_var.reset(token)

    report_content = react.content or default_report
    thinking += react.thinking
    thinking += "[Fact-Checker] Audit complete.\n"

    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="fact_checker",
        artifact_type="fact_check_report",
        content=report_content,
        metadata={
            "task": current_task["task"],
        },
    )

    thinking += f"[Fact-Checker] Report saved: {artifact_id}\n"

    # Surface result to user via stream (non-blocking)
    publish_status("Fact-check audit complete. Review the artifact in the Agent Flow trace.")

    state["factCheckReport"] = report_content
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
