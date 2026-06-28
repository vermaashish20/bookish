"""Model-call helpers for the LangGraph-native agent slice."""
from __future__ import annotations

from typing import Any

from app.core.model_config import load_model_config
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

# OpenAI-compatible providers routed through init_chat_model(..., model_provider="openai")
_DEFAULT_BASE_URLS = {
    "openrouter": "https://openrouter.ai/api/v1",
    "nvidia": "https://integrate.api.nvidia.com/v1",
    "sarvam": "https://api.sarvam.ai/v1",
}


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
    raw_provider = model["provider"].lower()
    if model["base_url"]:
        kwargs["base_url"] = model["base_url"]
    elif provider == "openai" and raw_provider in _DEFAULT_BASE_URLS:
        kwargs["base_url"] = _DEFAULT_BASE_URLS[raw_provider]

    return init_chat_model(model_provider=provider, **kwargs)
