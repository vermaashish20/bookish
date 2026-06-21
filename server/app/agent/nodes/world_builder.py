"""World-builder agent node."""
from __future__ import annotations

from typing import Any

from langgraph.runtime import Runtime
from langgraph.types import RunnableConfig

from app.agent.nodes.agent_runner import run_agent_node
from app.agent.utils.context_schema import BookishContext
from app.agent.utils.state import BookishAgentState
from app.prompts.world_builder import PROMPT as WORLD_BUILDER_PROMPT


def world_builder_node(
    state: BookishAgentState,
    runtime: Runtime[BookishContext],
    config: RunnableConfig,
) -> dict[str, Any]:
    return run_agent_node(
        state,
        runtime,
        config,
        agent="world_builder",
        model_key="worldBuilderModel",
        fallback_keys=["plannerModel", "writerModel"],
        artifact_type="world_building",
        system_prompt=WORLD_BUILDER_PROMPT,
        source_label="PROJECT CONTEXT",
        source_text="Use read_project and search_project to gather source assets, formal memory, and lore before proposing changes.",
        default_fallback="# World Building Notes\n\nNo model output was produced.",
    )
