"""Nodes used inside each agent subgraph."""
from __future__ import annotations

from typing import Any, Literal

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig, interrupt

from app.agent.utils.context_schema import BookishContext, context_header
from app.agent.utils.hitl import (
    build_world_pending_write,
    build_writer_pending_write,
    commit_pending_write,
    create_specialist_artifact,
    is_approved,
    resolve_pending_write,
    start_specialist_execution,
)
from app.repositories.artifacts import attach_pending_write
from app.agent.utils.memory import load_memory_brief
from app.agent.utils.models import build_tool_chat_model
from app.agent.utils.state import BookishAgentState
from app.agent.utils.streaming import emit_custom
from app.agent.utils.tools import AGENT_TOOLS
from app.core.telemetry import langfuse_observation, preview_text, update_observation, with_langfuse_callbacks
from app.repositories.agent_runs import update_agent_execution, update_agent_run_planner_decision

AgentName = Literal["planner", "writer", "world_builder"]
MAX_TOOL_ROUNDS = 8


def _chunk_text_delta(chunk: Any) -> str:
    """Extract plain-text delta from a streaming AIMessageChunk."""
    content = getattr(chunk, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
        return "".join(parts)
    return ""


def _stream_model_response(
    bound: Any,
    messages: list,
    trace_config: dict,
    *,
    run_id: str,
    agent: AgentName,
) -> AIMessage:
    """Stream model output, emit text_delta events, return assembled AIMessage."""
    from langchain_core.messages import AIMessageChunk

    gathered: AIMessageChunk | None = None
    stream_target = "chat" if agent == "planner" else "preview"

    for chunk in bound.stream(messages, config=trace_config):
        gathered = chunk if gathered is None else gathered + chunk
        delta = _chunk_text_delta(chunk)
        if delta:
            emit_custom(
                "text_delta",
                runId=run_id,
                agent=agent,
                target=stream_target,
                delta=delta,
            )

    if gathered is None:
        return AIMessage(content="")

    return AIMessage(
        content=gathered.content if gathered.content is not None else "",
        tool_calls=list(getattr(gathered, "tool_calls", None) or []),
        invalid_tool_calls=list(getattr(gathered, "invalid_tool_calls", None) or []),
    )


def _last_ai_message(state: BookishAgentState) -> AIMessage | None:
    for message in reversed(state.get("messages") or []):
        if isinstance(message, AIMessage):
            return message
    return None


def _user_content(state: BookishAgentState, runtime: Runtime[BookishContext]) -> str:
    memory = state.get("memoryBrief") or "No cross-thread memory loaded."
    memory_brief = load_memory_brief(runtime.store, runtime.context.project_id)
    combined_memory = memory_brief or memory
    return (
        f"USER REQUEST:\n{state['userPrompt']}\n\n"
        f"{context_header(runtime.context)}\n\n"
        f"MEMORY BRIEF:\n{combined_memory}\n\n"
        "Use tools when you need project facts. Respond in plain text when done. "
        "Never mention tools or internal workflow in your reply."
    )


def build_init_node(*, agent: AgentName):
    def init_node(state: BookishAgentState, runtime: Runtime[BookishContext]) -> dict[str, Any]:
        exec_idx = start_specialist_execution(
            runtime=runtime,
            agent=agent,
            task=state["userPrompt"],
        )
        return {
            "messages": [HumanMessage(content=_user_content(state, runtime))],
            "agentExecIdx": exec_idx,
        }

    return init_node


def build_model_node(*, agent: AgentName, model_key: str, fallback_keys: list[str], system_prompt: str):
    def model_node(
        state: BookishAgentState,
        runtime: Runtime[BookishContext],
        config: RunnableConfig,
    ) -> dict[str, Any]:
        model = build_tool_chat_model(
            runtime.context.project_id,
            model_key,
            fallback_keys=fallback_keys,
        )
        if model is None:
            return {
                "messages": [AIMessage(content=f"No model configured for {model_key}.")],
            }

        bound = model.bind_tools(AGENT_TOOLS)
        messages = [SystemMessage(content=system_prompt), *(state.get("messages") or [])]
        trace_config = with_langfuse_callbacks(dict(config))

        with langfuse_observation(
            name=f"agent-{agent}",
            as_type="chain",
            input={"messageCount": len(messages), "runId": state["agentRunId"]},
        ) as observation:
            response = _stream_model_response(
                bound,
                messages,
                trace_config,
                run_id=state["agentRunId"],
                agent=agent,
            )
            update_observation(
                observation,
                output={
                    "responsePreview": preview_text(str(response.content or "")),
                    "toolCalls": len(getattr(response, "tool_calls", None) or []),
                },
            )

        return {"messages": [response]}

    return model_node


def route_after_model(state: BookishAgentState) -> str:
    messages = state.get("messages") or []
    if len(messages) > MAX_TOOL_ROUNDS * 4:
        return "prepare_output"

    last = _last_ai_message(state)
    if last is None:
        return "prepare_output"

    tool_calls = getattr(last, "tool_calls", None) or []
    if tool_calls:
        return "qa_tools"
    return "prepare_output"


def build_qa_tools_node():
    from langgraph.prebuilt import ToolNode

    tool_node = ToolNode(AGENT_TOOLS)

    def qa_tools_node(
        state: BookishAgentState,
        runtime: Runtime[BookishContext],
        config: RunnableConfig,
    ) -> dict[str, Any]:
        last = _last_ai_message(state)
        if last is None:
            return {}
        result = tool_node.invoke(
            {"messages": [last]},
            config=config,
            runtime=runtime,
        )
        tool_msgs = result.get("messages", []) if isinstance(result, dict) else []
        return {"messages": list(tool_msgs)}

    return qa_tools_node


def build_prepare_output_node(*, agent: AgentName, requires_approval: bool):
    def prepare_output_node(
        state: BookishAgentState,
        runtime: Runtime[BookishContext],
    ) -> dict[str, Any]:
        last = _last_ai_message(state)
        draft = str(last.content or "").strip() if last else ""
        if not draft:
            draft = "No output was produced."

        updates: dict[str, Any] = {"agentDraft": draft}

        if not requires_approval:
            return updates

        task = state["userPrompt"]
        run_id = state["agentRunId"]

        if agent == "writer":
            artifact_id = create_specialist_artifact(
                runtime=runtime,
                agent="writer",
                task=task,
                content=draft,
                artifact_type="draft",
                metadata={"task": task, "wordCount": len(draft.split())},
            )
            pending_write = build_writer_pending_write(
                runtime.context.project_id,
                run_id,
                task,
                draft,
                artifact_id,
            )
        else:
            artifact_id = create_specialist_artifact(
                runtime=runtime,
                agent="world_builder",
                task=task,
                content=draft,
                artifact_type="world_building",
                metadata={"task": task},
            )
            pending_write = build_world_pending_write(run_id, task, draft, artifact_id)

        attach_pending_write(artifact_id, pending_write)

        emit_custom(
            "write_proposed",
            runId=run_id,
            projectId=runtime.context.project_id,
            pendingWrite=pending_write,
        )
        updates.update({
            "pendingWrite": pending_write,
            "artifactIds": [*(state.get("artifactIds") or []), artifact_id],
            "status": "awaiting_approval",
        })
        return updates

    return prepare_output_node


def approval_node(state: BookishAgentState, runtime: Runtime[BookishContext]) -> dict[str, Any]:
    pending_write = resolve_pending_write(
        dict(state),
        dict(state.get("pendingWrite") or {}),
        project_id=runtime.context.project_id,
    )
    agent = str(pending_write.get("agent") or state.get("routedAgent") or "writer")
    prompt = (
        "Approve this chapter write?"
        if agent == "writer"
        else "Save these world-building notes to the project?"
    )
    response = interrupt(
        {
            "kind": "write_approval",
            "runId": state["agentRunId"],
            "projectId": runtime.context.project_id,
            "pendingWrite": pending_write,
            "prompt": prompt,
        }
    )
    return {"approvalDecision": response, "pendingWrite": pending_write}


def process_approval_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
) -> dict[str, Any]:
    pending_write = resolve_pending_write(
        dict(state),
        dict(state.get("pendingWrite") or {}),
        project_id=runtime.context.project_id,
    )
    agent = str(pending_write.get("agent") or state.get("routedAgent") or "writer")
    task = str(pending_write.get("task") or state["userPrompt"])
    artifact_id = str(pending_write.get("artifactId") or "")
    exec_idx = int(state.get("agentExecIdx") or 0)
    approved = is_approved(state.get("approvalDecision"))

    if approved:
        if pending_write.get("kind"):
            result_msg = commit_pending_write(
                pending_write,
                runtime=runtime,
                run_id=state["agentRunId"],
                exec_idx=exec_idx,
                artifact_id=artifact_id,
            )
            return {
                "finalResponse": result_msg,
                "pendingWrite": {},
                "status": "running",
            }
        result_msg = "Approved, but the pending save could not be recovered. Try running the request again."
        return {
            "finalResponse": result_msg,
            "pendingWrite": {},
            "status": "running",
        }

    result_msg = (
        "Write rejected by user. Draft preserved as artifact."
        if agent == "writer"
        else "World-building rejected by user. Notes preserved as artifact."
    )
    if exec_idx:
        update_agent_execution(
            run_id=state["agentRunId"],
            execution_index=exec_idx,
            status="completed",
            output_artifact_id=artifact_id or None,
        )
    emit_custom(
        "task_completed",
        runId=state["agentRunId"],
        agent=agent,
        task={"agent": agent, "task": task, "status": "completed"},
    )
    return {
        "finalResponse": result_msg,
        "pendingWrite": {},
        "status": "rejected",
    }


def build_finalize_node(*, agent: AgentName, requires_approval: bool):
    def finalize_node(state: BookishAgentState) -> dict[str, Any]:
        if requires_approval and state.get("finalResponse"):
            response = str(state["finalResponse"])
        else:
            draft = state.get("agentDraft") or ""
            last = _last_ai_message(state)
            response = draft or (str(last.content or "").strip() if last else "") or "Done."

        if agent == "planner":
            update_agent_run_planner_decision(
                state["agentRunId"],
                {"intent": "planner_response", "summary": response},
            )
            emit_custom("plan_created", runId=state["agentRunId"], summary=response)
            emit_custom(
                "task_completed",
                runId=state["agentRunId"],
                agent=agent,
                task={"agent": agent, "task": state["userPrompt"], "status": "completed"},
            )

        return {"finalResponse": response, "status": "running"}

    return finalize_node
