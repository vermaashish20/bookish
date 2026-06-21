"""Shared execution helpers for agent nodes."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Sequence

from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.utils.context_schema import BookishContext, context_header
from app.agent.utils.models import build_tool_chat_model, call_project_model
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.agent.utils.tools import BOOKISH_TOOLS, MEMORY_TOOLS, READ_TOOLS
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.artifacts import create_artifact


MAX_TOOL_ROUNDS = 4


def run_agent_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    config: RunnableConfig,
    *,
    agent: str,
    model_key: str,
    fallback_keys: list[str],
    artifact_type: str,
    system_prompt: str,
    source_label: str,
    source_text: str,
    default_fallback: str,
    tools: Sequence[Any] | None = None,
) -> dict[str, Any]:
    idx = state.get("currentTaskIndex", 0)
    tasks = list(state.get("tasks", []))
    if idx >= len(tasks) or tasks[idx].get("agent") != agent:
        return {}

    task = {**tasks[idx]}
    now = datetime.utcnow().isoformat()
    task["status"] = "running"
    task["startedAt"] = now
    tasks[idx] = task

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent=agent,
        task_input=task["task"],
        status="running",
    )
    emit_custom("task_started", runId=state["agentRunId"], agent=agent, task=task)

    user_prompt = _build_context(state, runtime, task["task"], source_label, source_text)
    selected_tools = list(tools or BOOKISH_TOOLS)
    output = run_tool_loop(
        runtime,
        config=config,
        model_key=model_key,
        fallback_keys=fallback_keys,
        tools=selected_tools,
        system_prompt=_tool_system_prompt(system_prompt),
        user_prompt=user_prompt,
        default_fallback=default_fallback,
    )

    artifact_id = create_artifact(
        project_id=runtime.context.project_id,
        agent_run_id=state["agentRunId"],
        agent_name=agent,
        artifact_type=artifact_type,
        content=output,
        metadata={"task": task["task"]},
        related_chapter_id=latest_chapter_id(tasks),
    )
    completed_at = datetime.utcnow().isoformat()
    task.update(
        status="completed",
        completedAt=completed_at,
        outputArtifactId=artifact_id,
    )
    tasks[idx] = task
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id,
    )
    emit_custom(
        "artifact_created",
        runId=state["agentRunId"],
        artifactId=artifact_id,
        agent=agent,
        artifactType=artifact_type,
    )
    emit_custom("task_completed", runId=state["agentRunId"], agent=agent, task=task)

    return {
        "tasks": tasks,
        "currentTaskIndex": idx + 1,
        "artifactIds": [*state.get("artifactIds", []), artifact_id],
    }


def run_tool_loop(
    runtime: Runtime[BookishContext],
    *,
    config: RunnableConfig,
    model_key: str,
    fallback_keys: list[str],
    tools: Sequence[Any],
    system_prompt: str,
    user_prompt: str,
    default_fallback: str | None = "",
) -> str:
    """Run a bounded model + ToolNode loop for specialist agents."""
    use_fallback = default_fallback is not None

    def _final_content(content: object) -> str:
        text = str(content or "").strip()
        if text or not use_fallback:
            return text
        return default_fallback or ""

    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from langgraph.prebuilt import ToolNode

        model = build_tool_chat_model(
            runtime.context.project_id,
            model_key,
            fallback_keys=fallback_keys,
        )
        if model is None:
            raise RuntimeError("Tool-capable model unavailable")

        bound = model.bind_tools(list(tools))
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        tool_node = ToolNode(list(tools))

        for _ in range(MAX_TOOL_ROUNDS):
            response = bound.invoke(messages)
            tool_calls = getattr(response, "tool_calls", None) or []
            if not tool_calls:
                return _final_content(getattr(response, "content", ""))

            invoke_kwargs: dict[str, Any] = {"context": runtime.context}
            if runtime.store is not None:
                invoke_kwargs["store"] = runtime.store
            tool_result = tool_node.invoke({"messages": [response]}, config=config, **invoke_kwargs)
            tool_messages = tool_result.get("messages", []) if isinstance(tool_result, dict) else []
            messages.extend([response, *tool_messages])

        final = bound.invoke(messages)
        return _final_content(getattr(final, "content", ""))
    except Exception:
        if not use_fallback:
            raise
        return call_project_model(
            runtime.context.project_id,
            model_key,
            fallback_keys=fallback_keys,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            default_fallback=default_fallback or "",
        )


def tools_for_agent(agent: str) -> list[Any]:
    if agent == "planner":
        return [*READ_TOOLS, *MEMORY_TOOLS]
    return list(READ_TOOLS)


def _tool_system_prompt(prompt: str) -> str:
    return f"""{prompt}

Use `search_project` for semantic lookup and `read_project` for exact Mongo records
before asserting project canon. Call tools when the supplied context is insufficient.
When finished researching, output the requested artifact directly (not JSON tool calls).
""".strip()


def _build_context(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    task: str,
    source_label: str,
    source_text: str,
) -> str:
    ctx = runtime.context
    memory_brief = state.get("memoryBrief") or "No cross-thread memory loaded."
    return f"""
TASK:
{task}

{context_header(ctx)}

MEMORY BRIEF:
{memory_brief}

{source_label}:
{source_text or "No prior agent output is available."}
""".strip()


def latest_chapter_id(tasks: list[dict[str, Any]]) -> str | None:
    for task in reversed(tasks):
        chapter_id = task.get("chapterId")
        if chapter_id:
            return str(chapter_id)
    return None
