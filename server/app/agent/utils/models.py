"""Model-call helpers for the LangGraph-native agent slice."""
from __future__ import annotations

from app.core.model_config import load_model_config
from app.infrastructure.llm.service import call_llm
from app.repositories.projects import get_project


def call_project_model(
    project_id: str,
    model_key: str,
    *,
    system_prompt: str,
    user_prompt: str,
    default_fallback: str,
    fallback_keys: list[str] | None = None,
) -> str:
    """Call the model configured on the project for one graph node."""
    project = get_project(project_id) or {}
    model = load_model_config(project, model_key, fallback_keys=fallback_keys)
    return call_llm(
        provider=model["provider"],
        model_name=model["model_name"],
        api_key=model["api_key"],
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        default_fallback=default_fallback,
        base_url=model["base_url"],
    )

