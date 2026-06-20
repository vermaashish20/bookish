"""World-builder agent node."""
from __future__ import annotations

from typing import Any

from app.agent.nodes.agent_runner import run_agent_node
from app.agent.utils.state import BookishAgentState
from app.prompts.world_builder import PROMPT as WORLD_BUILDER_PROMPT


def world_builder_node(state: BookishAgentState) -> dict[str, Any]:
    source_text = state.get("researchNotes") or ""
    return run_agent_node(
        state,
        agent="world_builder",
        model_key="plannerModel",
        fallback_keys=["writerModel"],
        artifact_type="world_building",
        output_state_key="worldBuildingNotes",
        system_prompt=WORLD_BUILDER_PROMPT,
        source_label="RESEARCH AND PROJECT CONTEXT",
        source_text=source_text,
        default_fallback="# World Building Notes\n\nNo model output was produced.",
    )
