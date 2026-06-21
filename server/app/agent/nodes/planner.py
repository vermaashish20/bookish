"""Supervisor / planner node — routes requests via tool calls."""
from __future__ import annotations

from typing import Any

from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.nodes.agent_runner import call_agent
from app.agent.utils.context_schema import BookishContext, context_header
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.agent.utils.tools import ALL_SUPERVISOR_TOOLS
from app.prompts.planner import PROMPT as SUPERVISOR_PROMPT
from app.core.telemetry import langfuse_observation, observe, preview_text, update_observation
from app.repositories.agent_runs import update_agent_run_planner_decision


@observe(name="plan-node", capture_input=False, capture_output=False)
def plan_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    config: RunnableConfig,
) -> dict[str, Any]:
    """Run the supervisor LLM with all tools; return final text as finalResponse."""
    user_prompt = _build_user_prompt(state, runtime)

    emit_custom("plan_started", runId=state["agentRunId"], projectId=runtime.context.project_id)

    with langfuse_observation(
        name="supervisor-plan",
        as_type="chain",
        input={
            "userPromptPreview": preview_text(state["userPrompt"]),
            "projectId": runtime.context.project_id,
            "runId": state["agentRunId"],
        },
    ) as observation:
        response = call_agent(
            runtime.context.project_id,
            "plannerModel",
            fallback_keys=["writerModel"],
            tools=ALL_SUPERVISOR_TOOLS,
            system_prompt=SUPERVISOR_PROMPT,
            user_prompt=user_prompt,
            config=config,
            context=runtime.context,
            store=runtime.store,
        )
        update_observation(
            observation,
            output={"responsePreview": preview_text(response), "responseChars": len(response)},
        )

    update_agent_run_planner_decision(
        state["agentRunId"],
        {"intent": "supervisor_response", "summary": response},
    )
    emit_custom("plan_created", runId=state["agentRunId"], summary=response)
    return {"finalResponse": response, "status": "running"}


def _build_user_prompt(state: BookishAgentState, runtime: Runtime[BookishContext]) -> str:
    memory = state.get("memoryBrief") or "No cross-thread memory loaded."
    return (
        f"USER REQUEST:\n{state['userPrompt']}\n\n"
        f"{context_header(runtime.context)}\n\n"
        f"MEMORY BRIEF:\n{memory}\n\n"
        "Use tools when you need project facts or when content must be written. "
        "Respond in plain text when done. Never mention tools or internal workflow in your reply."
    )
