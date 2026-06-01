"""
Planner Node - Master orchestrator and first decision layer.
"""
import json
from typing import Dict, Any

from app.core.telemetry import observe

from app.core.exceptions import RunAbortedError
from app.agents.orchestration_state import AgentOrchestrationState, PlannerOutput, TaskStatus
from app.agents.runtime import (
    run_react_loop,
    validate_planner_tasks,
    wait_for_hitl,
)
from app.core.model_config import load_model_config
from app.prompts.planner import PROMPT as PLANNER_PROMPT
from app.repositories.agent_runs import update_agent_run_planner_decision
from app.repositories.projects import get_project
from app.infrastructure.llm.service import call_llm, stream_event_type_var, stream_queue_var

AVAILABLE_AGENTS = [
    "researcher",
    "world_builder",
    "writer",
    "humanizer",
    "editor",
    "fact_checker",
]


def build_planner_context(state: AgentOrchestrationState, project: Dict[str, Any]) -> str:
    project_ctx = state["projectContext"]
    book_summary = project_ctx.get("bookSummary") or "The story has not started yet."

    chapter_summaries = project_ctx.get("chapterSummaries", [])
    if chapter_summaries:
        ch_lines = []
        for ch in chapter_summaries:
            status_badge = f"[{ch.get('status', '?').upper()}]"
            ch_summary = ch.get("summary", "").strip()
            ch_lines.append(
                f"  Ch.{ch['number']} — {ch['title']} {status_badge}"
                + (f": {ch_summary}" if ch_summary else "")
            )
        chapter_index = "\n".join(ch_lines)
    else:
        chapter_index = "  No chapters written yet."

    return f"""
USER REQUEST:
{state["userPrompt"]}

BOOK METADATA:
  Title:      {project_ctx.get("title", "Untitled")}
  Genre:      {project_ctx.get("genre", "Unknown")}
  Tone:       {project_ctx.get("tonality", "Unknown")}
  Characters: {project_ctx.get("characterCount", 0)}
  Chapters:   {project_ctx.get("chapterCount", 0)}

STORY SO FAR (rolling summary):
{book_summary}

CHAPTER INDEX:
{chapter_index}
""".strip()


def build_system_prompt(context: str) -> str:
    agents_list = "\n".join(f"  - {a}" for a in AVAILABLE_AGENTS)
    return PLANNER_PROMPT.format(context=context, available_agents=agents_list)


@observe()
def planner_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    project_id = state["projectId"]
    thinking = "[Planner] Analyzing user request...\n"

    q = stream_queue_var.get(None)
    if q:
        q.put({"event": "agent_status", "text": "Planner is analyzing your request..."})

    project = get_project(project_id)
    planner_context = build_planner_context(state, project)
    system_prompt = build_system_prompt(planner_context)
    model = load_model_config(project, "plannerModel")

    fallback_json = json.dumps({
        "type": "final",
        "intent": "direct_response",
        "needsAgents": False,
        "decision": "Fallback: could not parse planner output.",
        "directResponse": "I'm ready to help. Could you clarify your request?",
        "userVisibleSummary": "I'm ready to help. Could you clarify your request?",
    })

    token = stream_event_type_var.set("hidden_stream")
    try:
        react = run_react_loop(
            project_id=project_id,
            system_prompt=system_prompt,
            base_user_prompt=(
                "Analyze the user request from the context above and produce your JSON output."
            ),
            call_llm=call_llm,
            llm_kwargs={
                "provider": model["provider"],
                "model_name": model["model_name"],
                "api_key": model["api_key"],
                "default_fallback": fallback_json,
                "base_url": model["base_url"],
            },
            fallback_content=fallback_json,
            thinking_prefix="[Planner] ",
            use_type_discriminator=True,
        )
    finally:
        stream_event_type_var.reset(token)

    thinking += react.thinking

    try:
        planner_data = json.loads(extract_json_from_react(react.content, fallback_json))
    except json.JSONDecodeError:
        planner_data = json.loads(fallback_json)

    needs_agents = planner_data.get("needsAgents", True)
    raw_tasks = planner_data.get("tasks", []) if needs_agents else []
    valid_tasks, task_warnings = validate_planner_tasks(raw_tasks)

    for warning in task_warnings:
        thinking += f"[Planner] Warning: {warning}\n"

    if needs_agents and not valid_tasks:
        thinking += "[Planner] No valid tasks after validation — falling back to direct response.\n"
        needs_agents = False
        planner_data["directResponse"] = (
            planner_data.get("directResponse")
            or "I could not build a valid agent plan. Please rephrase your request."
        )

    planner_output = PlannerOutput(
        intent=planner_data.get("intent", "general_task"),
        decision=planner_data.get("decision", "Execute request"),
        needsAgents=needs_agents,
        agentsNeeded=planner_data.get("agentsNeeded", []),
        tasks=valid_tasks,
        directResponse=planner_data.get("directResponse"),
        memoryUpdates=planner_data.get("memoryUpdates", []),
        userVisibleSummary=planner_data.get(
            "userVisibleSummary", "Working on your request."
        ),
    )

    tasks: list[TaskStatus] = []
    if needs_agents:
        for task_def in valid_tasks:
            tasks.append(TaskStatus(
                agent=task_def["agent"],
                task=task_def["task"],
                contextFromPrevious=task_def.get("context_from_previous"),
                status="pending",
                startedAt=None,
                completedAt=None,
                outputArtifactId=None,
                error=None,
            ))

    thinking += f"[Planner] Intent: {planner_output['intent']} | needsAgents: {needs_agents}\n"

    state["plannerOutput"] = planner_output
    state["tasks"] = tasks
    state["currentTaskIndex"] = 0

    update_agent_run_planner_decision(
        run_id=state["agentRunId"],
        planner_decision=dict(planner_output),
    )

    if needs_agents:
        plan_text = (
            f"**Planner Analysis:** {planner_output.get('userVisibleSummary', '')}\n\n"
            "**Proposed Tasks:**\n"
        )
        for idx, t in enumerate(valid_tasks, 1):
            plan_text += f"{idx}. **{t['agent'].replace('_', ' ').title()}:** {t['task']}\n"

        thinking += "[Planner] Awaiting user confirmation...\n"
        try:
            wait_for_hitl(
                state,
                summary_text=plan_text,
                prompt_text="Review the execution plan. Approve to continue?",
            )
            thinking += "[Planner] Plan approved.\n"
        except RunAbortedError:
            thinking += "[Planner] Plan rejected by user.\n"
            state["thinking_logs"].append(thinking)
            raise

    state["thinking_logs"].append(thinking)
    return state


def extract_json_from_react(content: str, fallback_json: str) -> str:
    """ReAct final for planner is JSON string; pass through or use extract_json."""
    from app.core.parsing import extract_json
    text = content.strip()
    if text.startswith("{"):
        return text
    return extract_json(content) or fallback_json
