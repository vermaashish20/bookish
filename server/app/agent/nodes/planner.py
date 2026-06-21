"""Planner node — route user requests via tools or delegate to specialists."""
from __future__ import annotations

import json
from typing import Any

from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.nodes.agent_runner import run_tool_loop, tools_for_agent
from app.agent.utils.context_schema import BookishContext, context_header
from app.agent.utils.state import AgentTask, BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.prompts.planner import PROMPT as PLANNER_PROMPT
from app.repositories.agent_runs import update_agent_run_planner_decision

ALLOWED_AGENTS = frozenset({"writer", "world_builder"})

AVAILABLE_AGENTS = """
- writer: draft, revise, or polish chapters/scenes/prose.
- world_builder: create or revise lore, characters, locations, and canon notes.
""".strip()


def plan_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    config: RunnableConfig,
) -> dict[str, Any]:
    """Run the planner model with LangGraph tools, then write routing state."""
    raw = run_tool_loop(
        runtime,
        config=config,
        model_key="plannerModel",
        fallback_keys=["writerModel"],
        tools=tools_for_agent("planner"),
        system_prompt=PLANNER_PROMPT.format(available_agents=AVAILABLE_AGENTS),
        user_prompt=_user_prompt(state, runtime),
        default_fallback=None,
    )

    decision = _parse_decision(raw)
    tasks = _build_tasks(decision)
    needs_agents = bool(decision.get("needsAgents") and tasks)
    summary = str(decision.get("userVisibleSummary") or "").strip()

    planner_decision = {
        "intent": "bookish_agent_run" if needs_agents else "direct_response",
        "needsAgents": needs_agents,
        "userVisibleSummary": summary,
        "tasks": tasks,
    }
    update_agent_run_planner_decision(state["agentRunId"], planner_decision)
    emit_custom(
        "plan_created",
        runId=state["agentRunId"],
        projectId=runtime.context.project_id,
        summary=summary,
        tasks=tasks,
    )
    return {
        "planSummary": summary,
        "tasks": tasks,
        "currentTaskIndex": 0,
        "finalResponse": "" if needs_agents else summary,
        "status": "running",
    }


def _user_prompt(state: BookishAgentState, runtime: Runtime[BookishContext]) -> str:
    memory = state.get("memoryBrief") or "No cross-thread memory loaded."
    return f"""USER REQUEST:
{state["userPrompt"]}

{context_header(runtime.context)}

MEMORY BRIEF:
{memory}

Use the bound tools when you need project facts or memory.
When you are done with tools, reply with JSON only (no markdown)."""


def _parse_decision(raw: str) -> dict[str, Any]:
    text = _strip_json_fence(raw)
    if not text:
        return {}

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

    return {"needsAgents": False, "userVisibleSummary": text}


def _strip_json_fence(raw: str) -> str:
    text = (raw or "").strip()
    if not text.startswith("```"):
        return text
    text = text.strip("`").strip()
    if text.lower().startswith("json"):
        return text[4:].strip()
    return text


def _build_tasks(decision: dict[str, Any]) -> list[AgentTask]:
    tasks: list[AgentTask] = []
    for item in decision.get("tasks") or []:
        if not isinstance(item, dict):
            continue
        agent = item.get("agent")
        task_text = str(item.get("task") or "").strip()
        if agent not in ALLOWED_AGENTS or not task_text:
            continue
        tasks.append(
            AgentTask(
                agent=agent,  # type: ignore[typeddict-item]
                task=task_text,
                status="pending",
                startedAt=None,
                completedAt=None,
                outputArtifactId=None,
                error=None,
            )
        )
    return tasks
