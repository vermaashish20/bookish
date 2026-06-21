"""LangGraph Store-backed agentic memory for Bookish."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from langgraph.runtime import Runtime

from app.agent.utils.context_schema import BookishContext, context_header


NARRATIVE_KEY = "state"


def narrative_namespace(project_id: str) -> tuple[str, str]:
    return (project_id, "narrative")


def episodic_namespace(project_id: str) -> tuple[str, str]:
    return (project_id, "episodic")


def callbacks_namespace(project_id: str) -> tuple[str, str]:
    return (project_id, "callbacks")


def _store_get_sync(store: Any, namespace: tuple[str, ...], key: str) -> dict[str, Any] | None:
    if store is None:
        return None
    getter = getattr(store, "get", None)
    if not callable(getter):
        return None
    item = getter(namespace, key)
    if item is None:
        return None
    value = getattr(item, "value", None)
    return value if isinstance(value, dict) else None


def _store_search_sync(store: Any, namespace: tuple[str, ...], *, limit: int = 5) -> list[dict[str, Any]]:
    if store is None:
        return []
    searcher = getattr(store, "search", None)
    if not callable(searcher):
        return []
    try:
        items = searcher(namespace, limit=limit)
    except TypeError:
        items = searcher(namespace)
    results: list[dict[str, Any]] = []
    for item in items or []:
        value = getattr(item, "value", None)
        if isinstance(value, dict):
            results.append(value)
    return results


def _store_put_sync(store: Any, namespace: tuple[str, ...], key: str, value: dict[str, Any]) -> None:
    if store is None:
        return
    putter = getattr(store, "put", None)
    if callable(putter):
        putter(namespace, key, value)


def load_memory_brief(store: Any, project_id: str) -> str:
    lines: list[str] = []
    narrative = _store_get_sync(store, narrative_namespace(project_id), NARRATIVE_KEY)
    if narrative:
        parts = []
        if narrative.get("currentChapterNumber") is not None:
            parts.append(f"current chapter {narrative['currentChapterNumber']}")
        if narrative.get("bookSummary"):
            parts.append(f"summary: {str(narrative['bookSummary'])[:400]}")
        if narrative.get("openArcs"):
            parts.append(f"open arcs: {', '.join(map(str, narrative['openArcs'][:5]))}")
        if parts:
            lines.append("Narrative: " + "; ".join(parts))

    episodic = _store_search_sync(store, episodic_namespace(project_id), limit=5)
    if episodic:
        lines.append("Recent runs:")
        for item in episodic[-3:]:
            summary = str(item.get("summary") or "").strip()
            if summary:
                lines.append(f"- {summary[:200]}")

    callbacks = _store_search_sync(store, callbacks_namespace(project_id), limit=5)
    open_callbacks = [c for c in callbacks if c.get("status") != "resolved"]
    if open_callbacks:
        lines.append("Open callbacks:")
        for item in open_callbacks[:3]:
            lines.append(f"- {str(item.get('setup') or '')[:160]}")

    return "\n".join(lines).strip()


def load_store_memory_node(state: Any, runtime: Runtime[BookishContext]) -> dict[str, Any]:
    brief = load_memory_brief(runtime.store, runtime.context.project_id)
    return {"memoryBrief": brief}


def persist_episode(
    store: Any,
    project_id: str,
    *,
    agent: str,
    task: str,
    run_id: str = "",
) -> None:
    """Write a single episodic memory entry to the store. Called by specialist tools."""
    summary = f"{agent} completed: {task[:240]}"
    _store_put_sync(
        store,
        episodic_namespace(project_id),
        str(uuid.uuid4()),
        {
            "summary": summary,
            "agent": agent,
            "runId": run_id,
            "task": task,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


def update_narrative_after_write(
    store: Any,
    project_id: str,
    *,
    kind: str,
    payload: dict[str, Any],
) -> None:
    namespace = narrative_namespace(project_id)
    current = _store_get_sync(store, namespace, NARRATIVE_KEY) or {}
    updated = dict(current)

    if kind in {"chapter_create", "chapter_update"}:
        number = payload.get("number")
        chapter_id = payload.get("chapterId") or payload.get("id")
        if number is not None:
            updated["currentChapterNumber"] = int(number)
        if chapter_id:
            updated["currentChapterId"] = str(chapter_id)
        if payload.get("summary"):
            updated["bookSummary"] = str(payload["summary"])[:2000]
        updated["lastApprovedChapterId"] = str(chapter_id or updated.get("lastApprovedChapterId") or "")

    _store_put_sync(store, namespace, NARRATIVE_KEY, updated)


def recall_memory_from_store(
    store: Any,
    project_id: str,
    *,
    query: str = "",
    category: str = "episodic",
) -> str:
    if category == "narrative":
        narrative = _store_get_sync(store, narrative_namespace(project_id), NARRATIVE_KEY)
        return str(narrative or "No narrative memory stored yet.")

    namespace = episodic_namespace(project_id)
    if category == "callbacks":
        namespace = callbacks_namespace(project_id)

    if query.strip() and hasattr(store, "search"):
        try:
            items = store.search(namespace, query=query.strip(), limit=5)
        except TypeError:
            items = store.search(namespace, limit=5)
        values = [getattr(item, "value", item) for item in items or []]
        return str(values) if values else "No matching memories found."
    items = _store_search_sync(store, namespace, limit=5)
    return str(items) if items else "No memories stored yet."


def remember_note_in_store(
    store: Any,
    project_id: str,
    *,
    content: str,
    category: str = "note",
) -> str:
    namespace = callbacks_namespace(project_id) if category == "callback" else episodic_namespace(project_id)
    key = str(uuid.uuid4())
    _store_put_sync(
        store,
        namespace,
        key,
        {
            "content": content,
            "category": category,
            "status": "open" if category == "callback" else "note",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
    return f"Stored {category} memory."
