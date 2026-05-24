"""
LLM Service - Central gateway for all Large Language Model interactions.
Provides robust support for OpenAI, Anthropic/Claude, Ollama, NVIDIA, and Custom OpenAI-compatible endpoints.
Supports real-time streaming to active request queues using contextvars.
"""
import httpx
import contextvars
import queue
import json
from typing import Dict, Any, Optional

# Context variable to hold the active request's queue
stream_queue_var = contextvars.ContextVar("stream_queue_var", default=None)

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
        
        q = stream_queue_var.get()
        if q is not None:
            # Streaming mode
            print(f"[DEBUG OPENAI] Streaming mode enabled, queue: {q}")
            payload["stream"] = True
            full_content = ""
            with httpx.stream("POST", "https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=30.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        try:
                            line = line.decode("utf-8")
                        except Exception:
                            continue
                    line_stripped = line.strip()
                    if line_stripped.startswith("data: "):
                        data_str = line_stripped[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            token = chunk_data["choices"][0]["delta"].get("content", "")
                            if token:
                                full_content += token
                                q.put({"event": "token", "text": token})
                                print(f"[DEBUG OPENAI] Token queued: {token[:20]}...")
                        except Exception as e:
                            print(f"[DEBUG OPENAI] Parse error: {e}")
                            pass
            print(f"[DEBUG OPENAI] Streaming complete, total length: {len(full_content)}")
            return full_content
        else:
            # Legacy non-streaming mode
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
        
        q = stream_queue_var.get()
        if q is not None:
            # Streaming mode
            print(f"[DEBUG CLAUDE] Streaming mode enabled, queue: {q}")
            payload["stream"] = True
            full_content = ""
            with httpx.stream("POST", "https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=30.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        try:
                            line = line.decode("utf-8")
                        except Exception:
                            continue
                    line_stripped = line.strip()
                    if line_stripped.startswith("data: "):
                        data_str = line_stripped[6:].strip()
                        try:
                            chunk_data = json.loads(data_str)
                            if chunk_data.get("type") == "content_block_delta":
                                token = chunk_data["delta"].get("text", "")
                                if token:
                                    full_content += token
                                    q.put({"event": "token", "text": token})
                                    print(f"[DEBUG CLAUDE] Token queued: {token[:20]}...")
                        except Exception as e:
                            print(f"[DEBUG CLAUDE] Parse error: {e}")
                            pass
            print(f"[DEBUG CLAUDE] Streaming complete, total length: {len(full_content)}")
            return full_content
        else:
            # Legacy non-streaming mode
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
            ]
        }
        
        q = stream_queue_var.get()
        if q is not None:
            # Streaming mode
            payload["stream"] = True
            full_content = ""
            with httpx.stream("POST", f"{url}/api/chat", json=payload, timeout=30.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        try:
                            line = line.decode("utf-8")
                        except Exception:
                            continue
                    line_stripped = line.strip()
                    if line_stripped:
                        try:
                            chunk_data = json.loads(line_stripped)
                            token = chunk_data.get("message", {}).get("content", "")
                            if token:
                                full_content += token
                                q.put({"event": "token", "text": token})
                        except Exception:
                            pass
            return full_content
        else:
            # Legacy non-streaming mode
            payload["stream"] = False
            res = httpx.post(f"{url}/api/chat", json=payload, timeout=30.0)
            res.raise_for_status()
            return res.json()["message"]["content"]

    @staticmethod
    def _call_nvidia(model: str, api_key: str, system: str, user: str) -> str:
        print("=" * 80)
        print("[DEBUG NVIDIA] Starting NVIDIA LLM call")
        print(f"[DEBUG NVIDIA] Model: {model or 'mistralai/mistral-large-3-675b-instruct-2512'}")
        print(f"[DEBUG NVIDIA] System prompt length: {len(system)} chars")
        print(f"[DEBUG NVIDIA] User prompt length: {len(user)} chars")
        
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
            "top_p": 1.00
        }
        
        q = stream_queue_var.get()
        print(f"[DEBUG NVIDIA] Stream queue from context: {q}")
        
        if q is not None:
            # Streaming mode
            print("[DEBUG NVIDIA] ✅ STREAMING MODE ENABLED")
            print(f"[DEBUG NVIDIA] Queue object: {type(q)}, ID: {id(q)}")
            payload["stream"] = True
            full_content = ""
            token_count = 0
            
            print("[DEBUG NVIDIA] Opening streaming connection to NVIDIA API...")
            with httpx.stream("POST", "https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=60.0) as response:
                print(f"[DEBUG NVIDIA] Response status: {response.status_code}")
                response.raise_for_status()
                print("[DEBUG NVIDIA] Starting to read stream lines...")
                
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        try:
                            line = line.decode("utf-8")
                        except Exception as e:
                            print(f"[DEBUG NVIDIA] ⚠️ Decode error: {e}")
                            continue
                    
                    line_stripped = line.strip()
                    if line_stripped.startswith("data: "):
                        data_str = line_stripped[6:].strip()
                        
                        if data_str == "[DONE]":
                            print("[DEBUG NVIDIA] Received [DONE] signal")
                            break
                        
                        try:
                            chunk_data = json.loads(data_str)
                            token = chunk_data["choices"][0]["delta"].get("content", "")
                            
                            if token:
                                token_count += 1
                                full_content += token
                                
                                # Put token in queue
                                q.put({"event": "token", "text": token})
                                
                                # Print every 10th token to avoid spam
                                if token_count % 10 == 0:
                                    print(f"[DEBUG NVIDIA] ✅ Token #{token_count} queued: '{token[:30]}...'")
                                
                        except json.JSONDecodeError as e:
                            print(f"[DEBUG NVIDIA] ⚠️ JSON parse error: {e}")
                            print(f"[DEBUG NVIDIA] Raw data: {data_str[:100]}")
                        except Exception as e:
                            print(f"[DEBUG NVIDIA] ⚠️ Token extraction error: {e}")
            
            print("=" * 80)
            print(f"[DEBUG NVIDIA] ✅ STREAMING COMPLETE")
            print(f"[DEBUG NVIDIA] Total tokens: {token_count}")
            print(f"[DEBUG NVIDIA] Total characters: {len(full_content)}")
            print(f"[DEBUG NVIDIA] First 100 chars: {full_content[:100]}")
            print("=" * 80)
            return full_content
        else:
            # Legacy non-streaming mode
            print("[DEBUG NVIDIA] ⚠️ NON-STREAMING MODE (queue is None)")
            payload["stream"] = False
            res = httpx.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=60.0)
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            print(f"[DEBUG NVIDIA] Non-streaming response length: {len(content)}")
            return content

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
            "temperature": 0.3
        }
        
        q = stream_queue_var.get()
        if q is not None:
            # Streaming mode
            payload["stream"] = True
            full_content = ""
            with httpx.stream("POST", f"{endpoint}/chat/completions", json=payload, headers=headers, timeout=60.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if isinstance(line, bytes):
                        try:
                            line = line.decode("utf-8")
                        except Exception:
                            continue
                    line_stripped = line.strip()
                    if line_stripped.startswith("data: "):
                        data_str = line_stripped[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            token = chunk_data["choices"][0]["delta"].get("content", "")
                            if token:
                                full_content += token
                                q.put({"event": "token", "text": token})
                        except Exception:
                            pass
            return full_content
        else:
            # Legacy non-streaming mode
            payload["stream"] = False
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
