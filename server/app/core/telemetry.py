"""
Langfuse integration with safe fallbacks when context APIs are unavailable.
"""
from __future__ import annotations

from typing import Any, Callable, TypeVar

F = TypeVar("F", bound=Callable[..., Any])

try:
    from langfuse import observe as _observe
except ImportError:  # pragma: no cover
    _observe = None


class _NoopContext:
    def update_current_trace(self, **_kwargs: Any) -> None:
        pass

    def update_current_observation(self, **_kwargs: Any) -> None:
        pass


langfuse_context = _NoopContext()


def observe(*args: Any, **kwargs: Any) -> Callable[[F], F] | F:
    if _observe is None:
        if args and callable(args[0]):
            return args[0]  # type: ignore[return-value]
        def decorator(fn: F) -> F:
            return fn
        return decorator  # type: ignore[return-value]
    return _observe(*args, **kwargs)  # type: ignore[return-value]
