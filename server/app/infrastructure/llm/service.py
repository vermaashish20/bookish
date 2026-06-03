"""
LLM Service — Central gateway for all Large Language Model interactions.
Supports OpenAI, Anthropic/Claude, Ollama, NVIDIA, OpenRouter, Sarvam, and custom OpenAI-compatible endpoints.
Supports real-time streaming to the active request queue via contextvars.
"""
import httpx
import json
import logging
import time

from app.core.telemetry import (
    langfuse_observation,
    preview_text,
    prompt_payload,
    update_observation,
)
from app.agents.streaming import (
    publish_stream_token,
    stream_queue_var,
)

logger = logging.getLogger(__name__)

class LLMService: 
    @staticmethod
    def call(
        provider: str,
        model_name: str,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        default_fallback: str,
        base_url: str = "",
    ) -> str:
        if not api_key:
            logger.warning("[LLMService] No API key for provider '%s' — returning fallback.", provider)
            return default_fallback

        provider_lower = provider.lower()
        try:
            if provider_lower == "openai":
                return LLMService._call_openai(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower in ("claude", "anthropic"):
                return LLMService._call_anthropic(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "ollama":
                return LLMService._call_ollama(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "nvidia":
                return LLMService._call_nvidia(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "openrouter":
                return LLMService._call_openrouter(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "sarvam":
                return LLMService._call_sarvam(model_name, api_key, system_prompt, user_prompt)
            elif provider_lower == "custom":
                return LLMService._call_custom(model_name, api_key, system_prompt, user_prompt, base_url)
            else:
                logger.warning("[LLMService] Unknown provider '%s' — returning fallback.", provider)
        except Exception as exc:
            logger.error("[LLMService] Error calling %s (%s): %s", provider, model_name, exc)

        return default_fallback

    # ──────────────────────────────────────────────────────────────
    # Provider implementations
    # ──────────────────────────────────────────────────────────────

    @staticmethod
    def _stream_openai_compat(url: str, payload: dict, headers: dict) -> str:
        """Shared streaming loop for OpenAI-compatible APIs."""
        q = stream_queue_var.get()
        payload["stream"] = True
        full_content = ""
        with httpx.stream("POST", url, json=payload, headers=headers, timeout=60.0) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if isinstance(line, bytes):
                    line = line.decode("utf-8", errors="replace")
                line = line.strip()
                if not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    token = json.loads(data_str)["choices"][0]["delta"].get("content", "")
                    if token:
                        full_content += token
                        publish_stream_token(token)
                except Exception:
                    pass
        logger.debug("[LLMService] Stream complete: %d chars", len(full_content))
        return full_content

    @staticmethod
    def _call_openai(model: str, api_key: str, system: str, user: str) -> str:
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.3,
        }
        q = stream_queue_var.get()
        if q is not None:
            return LLMService._stream_openai_compat(
                "https://api.openai.com/v1/chat/completions", payload, headers
            )
        res = httpx.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=30.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]

    @staticmethod
    def _call_anthropic(model: str, api_key: str, system: str, user: str) -> str:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "max_tokens": 4000,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
        q = stream_queue_var.get()
        if q is not None:
            payload["stream"] = True
            full_content = ""
            with httpx.stream("POST", "https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=60.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        line = line.decode("utf-8", errors="replace")
                    line = line.strip()
                    if not line.startswith("data: "):
                        continue
                    try:
                        chunk = json.loads(line[6:])
                        if chunk.get("type") == "content_block_delta":
                            token = chunk["delta"].get("text", "")
                            if token:
                                full_content += token
                                publish_stream_token(token)
                    except Exception:
                        pass
            return full_content
        res = httpx.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=30.0)
        res.raise_for_status()
        return res.json()["content"][0]["text"]

    @staticmethod
    def _call_ollama(model: str, base_url_or_key: str, system: str, user: str) -> str:
        url = base_url_or_key if base_url_or_key.startswith("http") else "http://localhost:11434"
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        q = stream_queue_var.get()
        if q is not None:
            payload["stream"] = True
            full_content = ""
            with httpx.stream("POST", f"{url}/api/chat", json=payload, timeout=60.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        line = line.decode("utf-8", errors="replace")
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        token = json.loads(line).get("message", {}).get("content", "")
                        if token:
                            full_content += token
                            publish_stream_token(token)
                    except Exception:
                        pass
            return full_content
        payload["stream"] = False
        res = httpx.post(f"{url}/api/chat", json=payload, timeout=60.0)
        res.raise_for_status()
        return res.json()["message"]["content"]

    @staticmethod
    def _call_nvidia(model: str, api_key: str, system: str, user: str) -> str:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or "mistralai/mistral-large-3-675b-instruct-2512",
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": 2048,
            "temperature": 0.15,
            "top_p": 1.00,
        }
        q = stream_queue_var.get()
        if q is not None:
            return LLMService._stream_openai_compat(
                "https://integrate.api.nvidia.com/v1/chat/completions", payload, headers
            )
        payload["stream"] = False
        res = httpx.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            json=payload, headers=headers, timeout=60.0,
        )
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]

    @staticmethod
    def _call_custom(model: str, api_key: str, system: str, user: str, base_url: str) -> str:
        endpoint = base_url.rstrip("/") if base_url else api_key
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.3,
        }
        q = stream_queue_var.get()
        if q is not None:
            return LLMService._stream_openai_compat(
                f"{endpoint}/chat/completions", payload, headers
            )
        payload["stream"] = False
        res = httpx.post(f"{endpoint}/chat/completions", json=payload, headers=headers, timeout=60.0)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]

    @staticmethod
    def _call_openrouter(model: str, api_key: str, system: str, user: str) -> str:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-OpenRouter-Title": "Bookish",
        }
        payload = {
            "model": model or "openai/gpt-4o-mini",
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.3,
        }
        q = stream_queue_var.get()
        if q is not None:
            return LLMService._stream_openai_compat(
                "https://openrouter.ai/api/v1/chat/completions", payload, headers
            )
        payload["stream"] = False
        res = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=60.0,
        )
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]

    @staticmethod
    def _call_sarvam(model: str, api_key: str, system: str, user: str) -> str:
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model or "sarvam-105b",
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.3,
        }
        q = stream_queue_var.get()
        if q is not None:
            return LLMService._stream_openai_compat(
                "https://api.sarvam.ai/v1/chat/completions", payload, headers
            )
        payload["stream"] = False
        res = httpx.post(
            "https://api.sarvam.ai/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=60.0,
        )
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]


def call_llm(
    provider: str,
    model_name: str,
    api_key: str,
    system_prompt: str,
    user_prompt: str,
    default_fallback: str,
    base_url: str = "",
) -> str:
    """Thin wrapper around LLMService.call with Langfuse observation."""
    start = time.perf_counter()
    metadata = {
        "provider": provider,
        "endpointUrlConfigured": bool(base_url),
        "hasApiKey": bool(api_key),
        "systemChars": len(system_prompt or ""),
        "userChars": len(user_prompt or ""),
    }
    with langfuse_observation(
        name=f"llm-call-{provider.lower()}",
        as_type="generation",
        input=prompt_payload(system_prompt, user_prompt),
        model=model_name,
        model_parameters={"provider": provider},
        metadata=metadata,
    ) as observation:
        try:
            response = LLMService.call(
                provider=provider,
                model_name=model_name,
                api_key=api_key,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                default_fallback=default_fallback,
                base_url=base_url,
            )
            return response
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000
            output = locals().get("response", "")
            logger.info(
                "[LLM] provider=%s model=%s elapsed=%.1fms prompt_chars=%d response_chars=%d",
                provider,
                model_name,
                elapsed_ms,
                len(system_prompt) + len(user_prompt),
                len(output or ""),
            )
            if "response" in locals():
                update_observation(
                    observation,
                    output={
                        "preview": preview_text(response),
                        "responseChars": len(response or ""),
                    },
                    metadata={**metadata, "elapsedMs": round(elapsed_ms, 1)},
                    usage_details={
                        "input": max(1, (len(system_prompt or "") + len(user_prompt or "")) // 4),
                        "output": max(1, len(response or "") // 4),
                    },
                )
