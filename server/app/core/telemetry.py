"""Langfuse integration with safe fallbacks.

The app should run normally without Langfuse credentials. When credentials are
present, these helpers create readable traces for agent runs, LLM calls, tools,
and retrieval without leaking API keys or entire function argument objects.
"""
from __future__ import annotations

from contextlib import contextmanager, nullcontext
import os
from typing import Any, Callable, Iterator, TypeVar

F = TypeVar("F", bound=Callable[..., Any])
CAPTURE_FULL_PROMPTS = os.getenv("BOOKISH_LANGFUSE_CAPTURE_PROMPTS") == "1"
PREVIEW_CHARS = int(os.getenv("BOOKISH_LANGFUSE_PREVIEW_CHARS", "1200"))

try:
    from langfuse import observe as _observe
    from langfuse import get_client as _get_client
    from langfuse import propagate_attributes as _propagate_attributes
except ImportError:  # pragma: no cover
    _observe = None
    _get_client = None
    _propagate_attributes = None


class _NoopContext:
    def update_current_trace(self, **_kwargs: Any) -> None:
        pass

    def update_current_observation(self, **_kwargs: Any) -> None:
        pass


langfuse_context = _NoopContext()


def observe(*args: Any, **kwargs: Any) -> Callable[[F], F] | F:
    kwargs.setdefault("capture_input", False)
    kwargs.setdefault("capture_output", False)
    if _observe is None:
        if args and callable(args[0]):
            return args[0]  # type: ignore[return-value]
        def decorator(fn: F) -> F:
            return fn
        return decorator  # type: ignore[return-value]
    return _observe(*args, **kwargs)  # type: ignore[return-value]


def preview_text(text: Any, *, max_chars: int = PREVIEW_CHARS) -> str:
    value = "" if text is None else str(text)
    if CAPTURE_FULL_PROMPTS or len(value) <= max_chars:
        return value
    return value[:max_chars] + f"\n...(truncated {len(value) - max_chars} chars)"


def prompt_payload(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    return {
        "systemPreview": preview_text(system_prompt),
        "userPreview": preview_text(user_prompt),
        "systemChars": len(system_prompt or ""),
        "userChars": len(user_prompt or ""),
        "fullPromptCapture": CAPTURE_FULL_PROMPTS,
    }


def get_langfuse_client() -> Any:
    if _get_client is None:
        return None
    try:
        return _get_client()
    except Exception:
        return None


@contextmanager
def langfuse_attributes(
    *,
    session_id: str | None = None,
    user_id: str | None = None,
    trace_name: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, str] | None = None,
) -> Iterator[None]:
    if _propagate_attributes is None:
        yield
        return
    try:
        with _propagate_attributes(
            session_id=session_id,
            user_id=user_id,
            trace_name=trace_name,
            tags=tags,
            metadata=metadata,
        ):
            yield
    except Exception:
        yield


@contextmanager
def langfuse_observation(
    *,
    name: str,
    as_type: str = "span",
    input: Any = None,
    output: Any = None,
    metadata: Any = None,
    model: str | None = None,
    model_parameters: dict[str, Any] | None = None,
    level: str | None = None,
    status_message: str | None = None,
) -> Iterator[Any]:
    client = get_langfuse_client()
    if client is None:
        yield None
        return
    try:
        with client.start_as_current_observation(
            name=name,
            as_type=as_type,  # type: ignore[arg-type]
            input=input,
            output=output,
            metadata=metadata,
            model=model,
            model_parameters=model_parameters,
            level=level,  # type: ignore[arg-type]
            status_message=status_message,
        ) as observation:
            yield observation
    except Exception:
        with nullcontext(None) as observation:
            yield observation


def update_observation(observation: Any, **kwargs: Any) -> None:
    if observation is None:
        return
    try:
        observation.update(**kwargs)
    except Exception:
        pass


def score_observation(observation: Any, *, name: str, value: float | str, comment: str | None = None) -> None:
    if observation is None:
        return
    try:
        observation.score(name=name, value=value, comment=comment)
    except Exception:
        pass


def flush_langfuse() -> None:
    client = get_langfuse_client()
    if client is None:
        return
    try:
        client.flush()
    except Exception:
        pass
