"""Core agent execution helper — lean model + ToolNode loop."""
from __future__ import annotations

from typing import Any, Sequence

from langgraph.types import RunnableConfig

from app.agent.utils.models import build_tool_chat_model
from app.core.telemetry import langfuse_observation, preview_text, prompt_payload, update_observation, with_langfuse_callbacks


MAX_TOOL_ROUNDS = 4


def call_agent(
    project_id: str,
    model_key: str,
    *,
    fallback_keys: list[str],
    tools: Sequence[Any],
    system_prompt: str,
    user_prompt: str,
    config: RunnableConfig,
    context: Any = None,
    store: Any = None,
) -> str:
    """Invoke a model + ToolNode loop until the model stops calling tools, then return text.

    Decoupled from Runtime so it can be called from both graph nodes and @tool functions.
    Raises RuntimeError if no model is configured; callers decide how to handle that.
    """
    from langchain_core.messages import HumanMessage, SystemMessage
    from langgraph.prebuilt import ToolNode
    from langgraph.runtime import Runtime

    model = build_tool_chat_model(project_id, model_key, fallback_keys=fallback_keys)
    if model is None:
        raise RuntimeError(f"No tool-capable model configured for '{model_key}'")

    bound = model.bind_tools(list(tools))
    tool_node = ToolNode(list(tools))
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    trace_config = with_langfuse_callbacks(dict(config))

    invoke_kw: dict[str, Any] = {}
    if context is not None or store is not None:
        graph_runtime = Runtime(context=context, store=store)
        invoke_kw["runtime"] = graph_runtime
        configurable = dict(trace_config.get("configurable") or {})
        configurable.setdefault("__pregel_runtime", graph_runtime)
        trace_config["configurable"] = configurable

    with langfuse_observation(
        name=f"call-agent-{model_key}",
        as_type="agent",
        input={
            "modelKey": model_key,
            "toolCount": len(tools),
            **prompt_payload(system_prompt, user_prompt),
        },
        metadata={"projectId": project_id},
    ) as observation:
        for _ in range(MAX_TOOL_ROUNDS):
            response = bound.invoke(messages, config=trace_config)
            if not getattr(response, "tool_calls", None):
                result = str(response.content or "").strip()
                update_observation(
                    observation,
                    output={"responsePreview": preview_text(result), "responseChars": len(result)},
                )
                return result
            result = tool_node.invoke({"messages": [response]}, config=trace_config, **invoke_kw)
            tool_msgs = result.get("messages", []) if isinstance(result, dict) else []
            messages.extend([response, *tool_msgs])

        result = str(bound.invoke(messages, config=trace_config).content or "").strip()
        update_observation(
            observation,
            output={"responsePreview": preview_text(result), "responseChars": len(result), "maxToolRounds": True},
        )
        return result
