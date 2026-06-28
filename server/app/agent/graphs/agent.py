"""Unified agent subgraph factory — ReAct loop with optional HITL approval."""
from __future__ import annotations

from typing import Literal

from langgraph.graph import END, StateGraph

from app.agent.nodes.agent_nodes import (
    AgentName,
    approval_node,
    build_finalize_node,
    build_init_node,
    build_model_node,
    build_prepare_output_node,
    build_qa_tools_node,
    process_approval_node,
    route_after_model,
)
from app.agent.utils.context_schema import BookishContext
from app.agent.utils.state import BookishAgentState
from app.prompts.planner import PROMPT as PLANNER_PROMPT
from app.prompts.world_builder import PROMPT as WORLD_BUILDER_PROMPT
from app.prompts.writer import PROMPT as WRITER_PROMPT

_AGENT_CONFIG: dict[AgentName, dict] = {
    "planner": {
        "model_key": "plannerModel",
        "fallback_keys": ["writerModel"],
        "system_prompt": PLANNER_PROMPT,
        "requires_approval": False,
    },
    "writer": {
        "model_key": "writerModel",
        "fallback_keys": ["plannerModel"],
        "system_prompt": WRITER_PROMPT,
        "requires_approval": True,
    },
    "world_builder": {
        "model_key": "worldBuilderModel",
        "fallback_keys": ["plannerModel", "writerModel"],
        "system_prompt": WORLD_BUILDER_PROMPT,
        "requires_approval": True,
    },
}


def build_agent_graph(agent: AgentName):
    cfg = _AGENT_CONFIG[agent]
    requires_approval: bool = cfg["requires_approval"]

    workflow = StateGraph(BookishAgentState, context_schema=BookishContext)

    workflow.add_node("init", build_init_node(agent=agent))
    workflow.add_node(
        "model",
        build_model_node(
            agent=agent,
            model_key=cfg["model_key"],
            fallback_keys=cfg["fallback_keys"],
            system_prompt=cfg["system_prompt"],
        ),
    )
    workflow.add_node("qa_tools", build_qa_tools_node())
    workflow.add_node(
        "prepare_output",
        build_prepare_output_node(agent=agent, requires_approval=requires_approval),
    )
    workflow.add_node("finalize", build_finalize_node(agent=agent, requires_approval=requires_approval))

    workflow.set_entry_point("init")
    workflow.add_edge("init", "model")
    workflow.add_conditional_edges(
        "model",
        route_after_model,
        {"qa_tools": "qa_tools", "prepare_output": "prepare_output"},
    )
    workflow.add_edge("qa_tools", "model")

    if requires_approval:
        workflow.add_node("approval", approval_node)
        workflow.add_node("process_approval", process_approval_node)
        workflow.add_edge("prepare_output", "approval")
        workflow.add_edge("approval", "process_approval")
        workflow.add_edge("process_approval", "finalize")
    else:
        workflow.add_edge("prepare_output", "finalize")

    workflow.add_edge("finalize", END)
    return workflow.compile()


planner_agent = build_agent_graph("planner")
writer_agent = build_agent_graph("writer")
world_builder_agent = build_agent_graph("world_builder")
