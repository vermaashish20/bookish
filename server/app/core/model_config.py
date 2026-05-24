import os
from typing import Any, Dict, List

_ENV_KEY_MAP = {
    "nvidia": "NVIDIA_API_KEY",
    "sarvam": "SARVAM_API_KEY",
}


def load_model_config(
    project: Dict[str, Any],
    model_key: str,
    fallback_keys: List[str] | None = None,
) -> Dict[str, Any]:
    """Resolve provider, model, API key, and base URL from project settings."""
    settings = project.get("settings", {})
    model_cfg = settings.get(model_key, {})

    if not model_cfg and fallback_keys:
        for fk in fallback_keys:
            model_cfg = settings.get(fk, {})
            if model_cfg:
                break

    provider = model_cfg.get("provider", "NVIDIA")
    model_name = model_cfg.get("modelName", "mistralai/mistral-large-3-675b-instruct-2512")
    api_key = model_cfg.get("apiKey", "")
    base_url = model_cfg.get("endpointUrl", "")

    if not api_key:
        env_var = _ENV_KEY_MAP.get(provider.lower(), "")
        if env_var:
            api_key = os.getenv(env_var, "")

    return {
        "provider": provider,
        "model_name": model_name,
        "api_key": api_key,
        "base_url": base_url,
    }
