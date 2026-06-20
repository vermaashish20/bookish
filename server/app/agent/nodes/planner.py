"""Planner and approval nodes."""
from __future__ import annotations

import json
from typing import Any

from app.agent.utils.models import call_project_model
from app.agent.utils.state import AgentTask, BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.agent.utils.tools import run_bookish_tool
from app.prompts.planner import PROMPT as PLANNER_PROMPT
from app.repositories.agent_runs import update_agent_run_planner_decision


AVAILABLE_AGENTS = """
- researcher: retrieve, compare, and synthesize project evidence. Read-only; artifacts auto-save.
- writer: draft new chapter/scene/prose. Durable chapter writes require approval.
- editor: revise or polish existing draft/chapter content. Durable chapter updates require approval.
- world_builder: create or revise lore, characters, locations, organizations, systems, and canon notes. Durable canon writes require approval.
""".strip()


def _task(agent: str, task: str) -> AgentTask:
    return AgentTask(
        agent=agent,  # type: ignore[typeddict-item]
        task=task,
        status="pending",
        startedAt=None,
        completedAt=None,
        outputArtifactId=None,
        error=None,
    )


def plan_node(state: BookishAgentState) -> dict[str, Any]:
    """Let the planner model decide whether to answer, retrieve, or delegate."""
    decision = _run_planner(state)
    tasks = _coerce_tasks(decision)
    needs_agents = bool(decision.get("needsAgents") and tasks)
    direct_response = str(decision.get("directResponse") or decision.get("userVisibleSummary") or "").strip()
    summary = str(decision.get("userVisibleSummary") or "").strip()

    if needs_agents:
        agent_chain = " → ".join(task["agent"] for task in tasks)
        summary = summary or f"I will run this through: {agent_chain}."
    else:
        summary = summary or direct_response or "I can answer this directly."

    planner_decision = {
        "intent": decision.get("intent") or ("bookish_agent_run" if needs_agents else "direct_response"),
        "needsAgents": needs_agents,
        "decision": decision.get("decision", ""),
        "userVisibleSummary": summary,
        "tasks": tasks,
    }
    update_agent_run_planner_decision(state["agentRunId"], planner_decision)
    emit_custom(
        "plan_created",
        runId=state["agentRunId"],
        projectId=state["projectId"],
        summary=summary,
        tasks=tasks,
    )
    return {
        "planSummary": summary,
        "tasks": tasks,
        "currentTaskIndex": 0,
        "finalResponse": "" if needs_agents else (direct_response or summary),
        "status": "running",
    }


def _run_planner(state: BookishAgentState) -> dict[str, Any]:
    context = _planner_context(state)
    raw = _call_planner(state, context)
    decision = _parse_json(raw)

    if decision.get("type") == "tool_call" and decision.get("tool_call") == "retrieve_knowledge":
        tool_result = _execute_planner_tool(state, decision)
        emit_custom(
            "planner_tool_completed",
            runId=state["agentRunId"],
            projectId=state["projectId"],
            toolCall=decision,
        )
        raw = _call_planner(
            state,
            f"{context}\n\n# KNOWLEDGE TOOL RESULT\n{tool_result}",
        )
        decision = _parse_json(raw)

    if decision.get("type") != "final":
        return {
            "type": "final",
            "intent": "direct_response",
            "needsAgents": False,
            "decision": "Planner did not return a final decision.",
            "directResponse": "I could not form a reliable plan for that request. Please rephrase with the specific chapter, artifact, or project question you want handled.",
            "userVisibleSummary": "I could not form a reliable plan for that request. Please rephrase with the specific chapter, artifact, or project question you want handled.",
        }

    return decision


def _call_planner(state: BookishAgentState, context: str) -> str:
    return call_project_model(
        state["projectId"],
        "plannerModel",
        fallback_keys=["writerModel"],
        system_prompt=PLANNER_PROMPT.format(
            available_agents=AVAILABLE_AGENTS,
            context=context,
        ),
        user_prompt="Analyze the user request from the context above and output only the JSON decision.",
        default_fallback=json.dumps(
            {
                "type": "final",
                "intent": "direct_response",
                "needsAgents": False,
                "decision": "Planner model is not configured.",
                "directResponse": "Planner model credentials are not configured, so I cannot safely delegate this request yet.",
                "userVisibleSummary": "Planner model credentials are not configured, so I cannot safely delegate this request yet.",
            }
        ),
    )


def _planner_context(state: BookishAgentState) -> str:
    project_context = state.get("projectContext", {})
    chapter_summaries = project_context.get("chapterSummaries", [])
    asset_summaries = project_context.get("assetSummaries", [])
    return f"""
USER REQUEST:
{state["userPrompt"]}

PROJECT:
Title: {project_context.get("title", "Untitled")}
Genre: {project_context.get("genre", "Unknown")}
Tone: {project_context.get("tonality", "Unknown")}
Book summary: {project_context.get("bookSummary") or "No rolling summary yet."}
Source assets: {project_context.get("assetCount", 0)}
Promoted characters: {project_context.get("characterCount", 0)}
Chapters: {project_context.get("chapterCount", 0)}

ASSET SUMMARIES:
{json.dumps(asset_summaries, ensure_ascii=False, default=str)}

CHAPTER SUMMARIES:
{json.dumps(chapter_summaries, ensure_ascii=False, default=str)}
""".strip()


def _execute_planner_tool(state: BookishAgentState, decision: dict[str, Any]) -> str:
    args = dict(decision.get("arguments") or {})
    args = _normalize_tool_args(args)
    args["project_id"] = state["projectId"]
    args["run_id"] = state["agentRunId"]
    args["agent"] = "planner"
    args["task"] = state["userPrompt"]
    return run_bookish_tool("retrieve_knowledge", args)


def _normalize_tool_args(args: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(args)
    aliases = {
        "maxResults": "max_results",
        "chapterId": "chapter_id",
        "chapterNumber": "chapter_number",
        "characterId": "character_id",
        "entityId": "entity_id",
        "artifactId": "artifact_id",
        "assetIds": "asset_ids",
    }
    for old, new in aliases.items():
        if old in normalized and new not in normalized:
            normalized[new] = normalized.pop(old)
    return normalized


def _parse_json(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return {}
        try:
            parsed = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return {}
    return parsed if isinstance(parsed, dict) else {}


def _coerce_tasks(decision: dict[str, Any]) -> list[AgentTask]:
    result: list[AgentTask] = []
    for item in decision.get("tasks") or []:
        if not isinstance(item, dict):
            continue
        agent = item.get("agent")
        task_text = str(item.get("task") or "").strip()
        if agent not in {"researcher", "writer", "editor", "world_builder"} or not task_text:
            continue
        result.append(_task(str(agent), task_text))
    return result

