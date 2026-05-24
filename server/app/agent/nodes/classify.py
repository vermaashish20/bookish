"""Intent classification node — routes user query to planner, writer, or world_builder."""
from __future__ import annotations

from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig
from pydantic import BaseModel, Field

from app.agent.utils.context_schema import BookishContext
from app.agent.utils.models import build_tool_chat_model
from app.agent.utils.state import BookishAgentState, RoutedAgent
from app.core.telemetry import langfuse_observation, preview_text, update_observation, with_langfuse_callbacks
from app.prompts.classifier import PROMPT as CLASSIFIER_PROMPT

_VALID_AGENTS: frozenset[str] = frozenset({"planner", "writer", "world_builder"})


class IntentClassification(BaseModel):
    agent: Literal["planner", "writer", "world_builder"] = Field(
        description="The agent best suited to handle the user message.",
    )


def classify_intent_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    config: RunnableConfig,
) -> dict[str, Any]:
    """Classify user intent and set routedAgent."""
    model = build_tool_chat_model(
        runtime.context.project_id,
        "plannerModel",
        fallback_keys=["writerModel"],
    )
    if model is None:
        routed: RoutedAgent = "planner"
    else:
        structured = model.with_structured_output(IntentClassification)
        messages = [
            SystemMessage(content=CLASSIFIER_PROMPT),
            HumanMessage(content=f"USER MESSAGE:\n{state['userPrompt']}"),
        ]
        trace_config = with_langfuse_callbacks(dict(config))

        with langfuse_observation(
            name="classify-intent",
            as_type="chain",
            input={"userPromptPreview": preview_text(state["userPrompt"])},
        ) as observation:
            try:
                result = structured.invoke(messages, config=trace_config)
                agent = getattr(result, "agent", None) or (result.get("agent") if isinstance(result, dict) else None)
                routed = agent if agent in _VALID_AGENTS else "planner"
            except Exception:
                routed = _fallback_classify(state["userPrompt"])
            update_observation(observation, output={"routedAgent": routed})

    return {
        "routedAgent": routed,
        "status": "running",
        "agentDraft": "",
        "pendingWrite": {},
        "agentExecIdx": 0,
    }


def _fallback_classify(user_prompt: str) -> RoutedAgent:
    text = user_prompt.lower()
    write_signals = ("draft chapter", "write chapter", "draft scene", "write scene", "revise chapter", "polish chapter")
    world_signals = (
        "character profile",
        "character concept",
        "character should",
        "how should our character",
        "how should the character",
        "build character",
        "flesh out",
        "world",
        "lore",
        "location",
        "faction",
        "magic",
        "entity",
        "canon",
    )
    if any(s in text for s in world_signals):
        return "world_builder"
    if any(s in text for s in write_signals) or (
        any(w in text for w in ("draft", "write", "revise", "polish", "rewrite"))
        and "chapter" in text
    ):
        return "writer"
    return "planner"


def route_by_intent(state: BookishAgentState) -> str:
    agent = state.get("routedAgent") or "planner"
    if agent not in _VALID_AGENTS:
        return "planner_agent"
    return f"{agent}_agent"
