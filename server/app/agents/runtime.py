"""
Shared runtime for agent nodes: tools, ReAct loop, task validation, HITL helpers.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple

from app.core.exceptions import RunAbortedError
from app.agents.orchestration_state import AgentOrchestrationState, TaskStatus
from app.core.parsing import extract_json
from app.core.telemetry import langfuse_observation, preview_text, update_observation
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.knowledge.tools import execute_knowledge_tool

logger = logging.getLogger(__name__)

ALLOWED_TASK_AGENTS = frozenset({
    "researcher",
    "world_builder",
    "writer",
    "fact_checker",
    "humanizer",
    "editor",
})

# Planner hints → LangGraph state keys
CONTEXT_STATE_KEYS: Dict[str, str] = {
    "researchnotes": "researchNotes",
    "research_notes": "researchNotes",
    "draftcontent": "draftContent",
    "draft_content": "draftContent",
    "humanizedcontent": "humanizedContent",
    "humanized_content": "humanizedContent",
    "factcheckreport": "factCheckReport",
    "fact_check_report": "factCheckReport",
    "editedcontent": "editedContent",
    "edited_content": "editedContent",
}

STATE_HANDOFF_FIELDS = (
    "researchNotes",
    "draftContent",
    "humanizedContent",
    "factCheckReport",
    "editedContent",
)


def normalize_context_key(hint: Optional[str]) -> Optional[str]:
    """Map planner context_from_previous text to a state field name."""
    if not hint:
        return None
    if hint in STATE_HANDOFF_FIELDS:
        return hint
    normalized = hint.lower().replace(" ", "").replace("-", "_")
    if normalized in CONTEXT_STATE_KEYS:
        return CONTEXT_STATE_KEYS[normalized]
    for token in hint.replace("-", "_").split():
        key = CONTEXT_STATE_KEYS.get(token.lower().strip())
        if key:
            return key
    return None


def resolve_task_context(
    state: AgentOrchestrationState,
    task: TaskStatus,
    *,
    max_chars: int = 2000,
) -> str:
    """Return extra context block from a prior agent's state field."""
    field = normalize_context_key(task.get("contextFromPrevious"))
    if not field:
        return ""
    value = state.get(field)  # type: ignore[literal-required]
    if not value:
        return ""
    text = str(value)
    if len(text) > max_chars:
        text = text[:max_chars] + "..."
    return f"PRIOR AGENT OUTPUT ({field}):\n{text}"


def format_source_assets(project_ctx: Dict[str, Any]) -> str:
    """Return a bounded source-asset summary for agent context blocks."""
    asset_count = project_ctx.get("assetCount", 0)
    assets = project_ctx.get("assetSummaries") or []
    if not asset_count:
        return "SOURCE ASSETS:\n  None attached."

    lines = [
        f"SOURCE ASSETS: {asset_count} attached. These may contain unpromoted canon; "
        "use persistent source tools (`read_project_sources` / `read_user_asset`) for exact contents."
    ]
    for asset in assets:
        lines.append(
            f"  - {asset.get('name', 'Untitled asset')} "
            f"({asset.get('type', 'unknown')}, id: {asset.get('id') or asset.get('_id')})"
        )
    return "\n".join(lines)


def validate_planner_tasks(raw_tasks: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Filter invalid agent names and ensure each task has required fields.
    Returns (valid_tasks, warning_messages).
    """
    valid: List[Dict[str, Any]] = []
    warnings: List[str] = []

    for i, task_def in enumerate(raw_tasks or []):
        agent = (task_def.get("agent") or "").strip()
        task_text = (task_def.get("task") or "").strip()

        if not agent:
            warnings.append(f"Task {i + 1}: missing agent name — skipped.")
            continue
        if agent not in ALLOWED_TASK_AGENTS:
            warnings.append(
                f"Task {i + 1}: unknown agent '{agent}' — skipped. "
                f"Allowed: {', '.join(sorted(ALLOWED_TASK_AGENTS))}."
            )
            continue
        if not task_text:
            warnings.append(f"Task {i + 1} ({agent}): empty task — skipped.")
            continue

        valid.append({
            "agent": agent,
            "task": task_text,
            "context_from_previous": task_def.get("context_from_previous"),
        })

    return valid, warnings


def execute_tool(
    project_id: str,
    tool_name: str,
    args: Dict[str, Any],
    *,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
) -> str:
    """Run a single agent tool and return text for the ReAct history."""
    with langfuse_observation(
        name=f"kb-tool-{tool_name}",
        as_type="tool",
        input={
            "tool": tool_name,
            "arguments": args,
            "projectId": project_id,
            "runId": run_id,
            "agent": agent,
            "taskPreview": preview_text(task, max_chars=500),
        },
        metadata={"tool": tool_name, "agent": agent, "runId": run_id},
    ) as observation:
        result = execute_knowledge_tool(
            project_id,
            tool_name,
            args,
            run_id=run_id,
            agent=agent,
            task=task,
        )
        update_observation(
            observation,
            output={"preview": preview_text(result), "chars": len(result or "")},
        )
        return result


@dataclass
class ReActResult:
    content: str
    thinking: str
    exhausted: bool = False


def run_react_loop(
    *,
    project_id: str,
    system_prompt: str,
    base_user_prompt: str,
    call_llm: Callable[..., str],
    llm_kwargs: Dict[str, Any],
    max_iterations: int = 3,
    fallback_content: str,
    thinking_prefix: str = "",
    use_type_discriminator: bool = False,
    run_id: Optional[str] = None,
    agent_name: Optional[str] = None,
    task_name: Optional[str] = None,
) -> ReActResult:
    """
    Standard ReAct loop for planner (type=tool_call|final) and worker agents (tool_call key).

    When use_type_discriminator=True, expects {"type": "tool_call"|"final", ...}.
    Otherwise treats JSON with tool_call as a tool request; any other response is final content.
    """
    thinking = thinking_prefix
    tool_context = ""
    iteration = 0
    last_response = ""
    seen_tool_calls: set[str] = set()

    while iteration < max_iterations:
        iteration += 1
        from app.agents.streaming import (
            HIDDEN_STREAM,
            buffer_llm_stream,
            flush_buffered_stream,
            publish_text,
            stream_event_type_var,
        )

        user_msg = base_user_prompt
        if tool_context:
            user_msg += (
                f"\n\n--- TOOL RESULTS ---\n{tool_context}\n--------------------\n"
                "Use the tool results above, call another tool if needed, or produce your final output."
            )

        thinking += f"Iteration {iteration}: calling LLM...\n"
        stream_event_type = stream_event_type_var.get()
        should_buffer_stream = stream_event_type != HIDDEN_STREAM
        buffered_tokens = None

        with langfuse_observation(
            name=f"react-iteration-{agent_name or 'agent'}-{iteration}",
            as_type="chain",
            input={
                "agent": agent_name,
                "iteration": iteration,
                "taskPreview": preview_text(task_name, max_chars=500),
                "hasToolContext": bool(tool_context),
                "streamEventType": stream_event_type,
            },
            metadata={"runId": run_id, "agent": agent_name, "iteration": iteration},
        ) as iteration_observation:
            if should_buffer_stream:
                with buffer_llm_stream(stream_event_type, auto_release=False) as buffered_tokens:
                    last_response = call_llm(
                        system_prompt=system_prompt,
                        user_prompt=user_msg,
                        **llm_kwargs,
                    )
            else:
                last_response = call_llm(
                    system_prompt=system_prompt,
                    user_prompt=user_msg,
                    **llm_kwargs,
                )
            update_observation(
                iteration_observation,
                output={
                    "responsePreview": preview_text(last_response),
                    "responseChars": len(last_response or ""),
                },
            )

        def flush_final_output() -> None:
            if not should_buffer_stream:
                return
            if buffered_tokens is not None and getattr(buffered_tokens, "seen_tokens", False):
                flush_buffered_stream(buffered_tokens, stream_event_type)
            else:
                publish_text(last_response, stream_event_type)

        try:
            parsed = json.loads(extract_json(last_response))
        except json.JSONDecodeError as exc:
            thinking += f"Non-JSON response ({exc}); treating as final output.\n"
            flush_final_output()
            return ReActResult(content=last_response, thinking=thinking)

        is_tool = False
        tool_name = ""
        args: Dict[str, Any] = {}

        if use_type_discriminator:
            if parsed.get("type") == "tool_call":
                is_tool = True
                tool_name = parsed.get("tool_call", "")
                args = parsed.get("arguments", {})
            elif parsed.get("type") == "final":
                thinking += "Final structured output received.\n"
                flush_final_output()
                return ReActResult(content=json.dumps(parsed), thinking=thinking)
        elif "tool_call" in parsed:
            is_tool = True
            tool_name = parsed["tool_call"]
            args = parsed.get("arguments", {})

        if is_tool:
            thinking += f"Tool call: {tool_name} | args: {args}\n"
            tool_key = json.dumps({"tool": tool_name, "args": args}, sort_keys=True, default=str)
            if tool_key in seen_tool_calls:
                thinking += "Duplicate tool call ignored; asking agent to use existing tool results.\n"
                tool_context += (
                    "\n[Duplicate tool call ignored] You already called this tool with the same arguments. "
                    "Use the existing tool results above and produce the final answer/content now. "
                    "Do not repeat the same JSON tool call.\n"
                )
                continue
            seen_tool_calls.add(tool_key)
            tool_context += f"\n{execute_tool(project_id, tool_name, args, run_id=run_id, agent=agent_name, task=task_name)}\n"
            continue

        thinking += "Final output received.\n"
        flush_final_output()
        return ReActResult(content=last_response, thinking=thinking)

    thinking += "Max iterations reached before final content; refusing to treat tool JSON as final output.\n"
    return ReActResult(
        content="",
        thinking=thinking,
        exhausted=True,
    )


def get_current_task(
    state: AgentOrchestrationState,
    expected_agent: str,
) -> Optional[Tuple[int, TaskStatus]]:
    """Return (index, task) if the current task matches expected_agent."""
    idx = state["currentTaskIndex"]
    tasks = state["tasks"]
    if idx >= len(tasks):
        return None
    task = tasks[idx]
    if task["agent"] != expected_agent:
        return None
    return idx, task


def begin_task(
    state: AgentOrchestrationState,
    agent_name: str,
    task_input: str,
) -> Tuple[int, int]:
    """Mark task running and register DB execution. Returns (task_index, exec_index)."""
    idx = state["currentTaskIndex"]
    state["tasks"][idx]["status"] = "running"
    state["tasks"][idx]["startedAt"] = datetime.utcnow().isoformat()
    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent=agent_name,
        task_input=task_input,
        status="running",
    )
    return idx, exec_idx


def fail_task_and_advance(
    state: AgentOrchestrationState,
    task_idx: int,
    exec_idx: int,
    error: str,
    thinking: str,
) -> AgentOrchestrationState:
    """Mark task failed, advance index, log execution."""
    state["tasks"][task_idx]["status"] = "failed"
    state["tasks"][task_idx]["error"] = error
    state["tasks"][task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="failed",
    )
    return state


def complete_task_and_advance(
    state: AgentOrchestrationState,
    task_idx: int,
    exec_idx: int,
    artifact_id: Optional[str] = None,
    *,
    task_status: str = "completed",
) -> None:
    state["tasks"][task_idx]["status"] = task_status  # type: ignore[assignment]
    state["tasks"][task_idx]["completedAt"] = datetime.utcnow().isoformat()
    if artifact_id:
        state["tasks"][task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed" if task_status == "completed" else task_status,
        output_artifact_id=artifact_id,
    )


def wait_for_hitl(
    state: AgentOrchestrationState,
    *,
    summary_text: str,
    prompt_text: str,
) -> str:
    """
    Pause for user confirmation unless skipHitl is set on state.
    Raises RunAbortedError if user rejects.
    """
    if state.get("skipHitl"):
        return "approve"

    from app.agents.hitl import create_hitl_event, get_hitl_response

    run_id = state["agentRunId"]
    from app.agents.streaming import publish_chat_message, publish_user_confirmation

    if summary_text:
        publish_chat_message(summary_text)
    publish_user_confirmation(prompt_text, run_id)

    event = create_hitl_event(run_id)
    event.wait()
    response = get_hitl_response(run_id) or ""

    if str(response).lower() in ("no", "reject", "false"):
        raise RunAbortedError("Run aborted by user.")

    return response


def summarize_task_outcomes(tasks: List[TaskStatus]) -> Dict[str, Any]:
    """Counts for finalize messaging."""
    counts = {"completed": 0, "failed": 0, "rejected": 0, "pending": 0, "running": 0}
    for t in tasks:
        status = t.get("status", "pending")
        counts[status] = counts.get(status, 0) + 1
    return counts
