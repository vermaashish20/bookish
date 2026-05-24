"""
LLM Service - Central gateway for all Large Language Model interactions.
Provides robust support for OpenAI, Anthropic/Claude, Ollama, NVIDIA, and Custom OpenAI-compatible endpoints.
"""
import httpx
from typing import Dict, Any, Optional

class LLMService:
    @staticmethod
    def call(
        provider: str,
        model_name: str,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        default_fallback: str,
        base_url: str = ""
    ) -> str:
        """
        Executes a call to the specified LLM provider with custom system and user prompts.
        """
        if not api_key:
            return default_fallback

        provider_lower = provider.lower()
        try:
            if provider_lower in ("openai",):
                return LLMService._call_openai(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower in ("claude", "anthropic"):
                return LLMService._call_anthropic(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "ollama":
                return LLMService._call_ollama(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "nvidia":
                return LLMService._call_nvidia(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "custom":
                return LLMService._call_custom(model_name, api_key, system_prompt, user_prompt, base_url)
        except Exception as e:
            print(f"[LLMService] Error invoking {provider} ({model_name}): {e}")

        return default_fallback

    @staticmethod
    def _call_openai(model: str, api_key: str, system: str, user: str) -> str:
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "temperature": 0.3
        }
        res = httpx.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=30.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]

    @staticmethod
    def _call_anthropic(model: str, api_key: str, system: str, user: str) -> str:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "max_tokens": 4000,
            "system": system,
            "messages": [{"role": "user", "content": user}]
        }
        res = httpx.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=30.0)
        res.raise_for_status()
        return res.json()["content"][0]["text"]

    @staticmethod
    def _call_ollama(model: str, base_url_or_key: str, system: str, user: str) -> str:
        url = base_url_or_key if base_url_or_key.startswith("http") else "http://localhost:11434"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "stream": False
        }
        res = httpx.post(f"{url}/api/chat", json=payload, timeout=30.0)
        res.raise_for_status()
        return res.json()["message"]["content"]

    @staticmethod
    def _call_nvidia(model: str, api_key: str, system: str, user: str) -> str:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model or "mistralai/mistral-large-3-675b-instruct-2512",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "max_tokens": 2048,
            "temperature": 0.15,
            "top_p": 1.00,
            "stream": False
        }
        res = httpx.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=60.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]

    @staticmethod
    def _call_custom(model: str, api_key: str, system: str, user: str, base_url: str) -> str:
        endpoint = base_url.rstrip("/") if base_url else api_key
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "temperature": 0.3,
            "stream": False
        }
        res = httpx.post(f"{endpoint}/chat/completions", json=payload, headers=headers, timeout=60.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]

def call_llm(
    provider: str,
    model_name: str,
    api_key: str,
    system_prompt: str,
    user_prompt: str,
    default_fallback: str,
    base_url: str = ""
) -> str:
    """Wrapper to invoke LLMService.call to match legacy functional interface."""
    return LLMService.call(
        provider=provider,
        model_name=model_name,
        api_key=api_key,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        default_fallback=default_fallback,
        base_url=base_url
    )
