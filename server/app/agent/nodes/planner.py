"""Planner and approval nodes."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from langgraph.types import interrupt

from app.agent.utils.state import AgentTask, BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.repositories.agent_runs import update_agent_run_planner_decision


WRITING_KEYWORDS = (
    "write",
    "draft",
    "chapter",
    "scene",
    "prose",
    "story",
    "novel",
    "book",
)
WORLD_BUILDING_KEYWORDS = (
    "world",
    "lore",
    "character",
    "setting",
    "location",
    "faction",
    "organization",
    "magic",
    "bible",
)
FACT_CHECK_KEYWORDS = ("fact", "continuity", "verify", "audit", "consistent", "inconsistency")
HUMANIZE_KEYWORDS = ("humanize", "humanise", "natural", "organic", "less ai", "ai-sounding")
EDITOR_KEYWORDS = ("edit", "polish", "grammar", "proofread", "revise", "line edit")


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


def _build_tasks(prompt: str) -> list[AgentTask]:
    prompt_lower = prompt.lower()
    if any(keyword in prompt_lower for keyword in WORLD_BUILDING_KEYWORDS):
        return [
            _task("researcher", f"Gather canon and source context for: {prompt}"),
            _task("world_builder", prompt),
            _task("fact_checker", f"Check the proposed lore for continuity: {prompt}"),
        ]

    if any(keyword in prompt_lower for keyword in FACT_CHECK_KEYWORDS):
        return [
            _task("researcher", f"Retrieve project facts needed to verify: {prompt}"),
            _task("fact_checker", prompt),
        ]

    if any(keyword in prompt_lower for keyword in HUMANIZE_KEYWORDS):
        return [
            _task("researcher", f"Retrieve style and voice context for: {prompt}"),
            _task("humanizer", prompt),
            _task("editor", f"Perform final polish after humanizing: {prompt}"),
        ]

    if any(keyword in prompt_lower for keyword in EDITOR_KEYWORDS):
        return [
            _task("researcher", f"Retrieve style and continuity context for: {prompt}"),
            _task("editor", prompt),
        ]

    if any(keyword in prompt_lower for keyword in WRITING_KEYWORDS):
        return [
            _task("researcher", f"Gather project context needed for: {prompt}"),
            _task("writer", prompt),
            _task("fact_checker", f"Audit the draft for continuity and canon issues: {prompt}"),
            _task("humanizer", f"Humanize the draft while preserving meaning: {prompt}"),
            _task("editor", f"Final polish and publish-ready edit: {prompt}"),
        ]

    return [
        _task("researcher", prompt)
    ]


def plan_node(state: BookishAgentState) -> dict[str, Any]:
    """Create an explicit execution plan before any side-effectful agent work."""
    tasks = _build_tasks(state["userPrompt"])
    agent_chain = " → ".join(task["agent"] for task in tasks)
    summary = f"I will run this through: {agent_chain}."
    planner_decision = {
        "intent": "bookish_agent_run",
        "needsAgents": True,
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
        "status": "awaiting_approval",
    }


def approval_node(state: BookishAgentState) -> dict[str, Any]:
    """Pause with a durable LangGraph interrupt until the user approves the plan."""
    response = interrupt(
        {
            "kind": "plan_approval",
            "runId": state["agentRunId"],
            "projectId": state["projectId"],
            "threadId": state["threadId"],
            "summary": state.get("planSummary", "Approve this run?"),
            "tasks": state.get("tasks", []),
            "prompt": "Review the execution plan. Approve to continue?",
        }
    )
    approved = _is_approved(response)
    emit_custom(
        "plan_approval_resolved",
        runId=state["agentRunId"],
        approved=approved,
        response=response,
    )
    return {
        "approval": {"approved": approved, "response": response},
        "status": "running" if approved else "rejected",
    }


def _is_approved(response: Any) -> bool:
    if isinstance(response, dict):
        value = response.get("approved", response.get("decision", response.get("response")))
    else:
        value = response
    return str(value).strip().lower() in {"approve", "approved", "yes", "y", "true", "continue"}


def rejected_node(state: BookishAgentState) -> dict[str, Any]:
    """Mark pending work as rejected before finalization."""
    now = datetime.utcnow().isoformat()
    tasks = []
    for task in state.get("tasks", []):
        tasks.append({**task, "status": "rejected", "completedAt": now})
    return {
        "tasks": tasks,
        "status": "rejected",
        "finalResponse": "Run cancelled. The proposed plan was not approved.",
    }

