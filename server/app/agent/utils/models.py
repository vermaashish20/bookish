"""Model-call helpers for the LangGraph-native agent slice."""
from __future__ import annotations

from typing import Any

from app.core.model_config import load_model_config
from app.infrastructure.llm.service import call_llm
from app.repositories.projects import get_project

_PROVIDER_MAP = {
    "openai": "openai",
    "claude": "anthropic",
    "anthropic": "anthropic",
    "ollama": "ollama",
    "nvidia": "openai",
    "openrouter": "openai",
    "sarvam": "openai",
    "custom": "openai",
}


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


def build_tool_chat_model(
    project_id: str,
    model_key: str,
    *,
    fallback_keys: list[str] | None = None,
) -> Any | None:
    """Build a LangChain chat model with tool-calling support."""
    project = get_project(project_id) or {}
    model = load_model_config(project, model_key, fallback_keys=fallback_keys)
    if not model["api_key"]:
        return None

    try:
        from langchain.chat_models import init_chat_model
    except ImportError:
        return None

    provider = _PROVIDER_MAP.get(model["provider"].lower(), "openai")
    kwargs: dict[str, Any] = {
        "model": model["model_name"],
        "api_key": model["api_key"],
        "temperature": 0.3,
    }
    if model["base_url"]:
        kwargs["base_url"] = model["base_url"]
    elif provider == "openai" and model["provider"].lower() == "openrouter":
        kwargs["base_url"] = "https://openrouter.ai/api/v1"
    elif provider == "openai" and model["provider"].lower() == "nvidia":
        kwargs["base_url"] = "https://integrate.api.nvidia.com/v1"

    return init_chat_model(model_provider=provider, **kwargs)

