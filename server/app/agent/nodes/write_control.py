"""Approval and commit nodes for durable Bookish writes."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from langgraph.types import interrupt

from app.agent.utils.state import BookishAgentState, PendingWrite
from app.agent.utils.streaming import emit_custom
from app.repositories.chapters import add_chapter, update_chapter_content
from app.repositories.characters import add_character, update_character
from app.repositories.entities import add_entity, update_entity


def approve_write_node(state: BookishAgentState) -> dict[str, Any]:
    pending_write = state.get("pendingWrite")
    if not pending_write:
        return {"status": "running"}

    emit_custom(
        "write_proposed",
        runId=state["agentRunId"],
        projectId=state["projectId"],
        pendingWrite=pending_write,
    )
    response = interrupt(
        {
            "kind": "write_approval",
            "runId": state["agentRunId"],
            "projectId": state["projectId"],
            "threadId": state["threadId"],
            "summary": _approval_summary(pending_write),
            "pendingWrite": _safe_pending_write(pending_write),
            "prompt": "Approve this durable project write?",
        }
    )
    approved = _is_approved(response)
    next_write: PendingWrite = {
        **pending_write,
        "status": "approved" if approved else "rejected",
        "response": response,
    }
    emit_custom(
        "write_approved" if approved else "write_rejected",
        runId=state["agentRunId"],
        projectId=state["projectId"],
        pendingWrite=_safe_pending_write(next_write),
    )
    return {
        "pendingWrite": next_write,
        "status": "running",
    }


def commit_write_node(state: BookishAgentState) -> dict[str, Any]:
    pending_write = state.get("pendingWrite")
    if not pending_write or pending_write.get("status") != "approved":
        return {"pendingWrite": None, "status": "running"}

    kind = pending_write.get("kind")
    payload = pending_write.get("payload") or {}
    updates: dict[str, Any] = {"pendingWrite": None, "status": "running"}
    tasks = list(state.get("tasks", []))
    task_index = pending_write.get("taskIndex")

    if kind == "chapter_create":
        chapter_id = add_chapter(
            project_id=state["projectId"],
            number=int(payload["number"]),
            title=str(payload["title"]),
            content=str(payload.get("content") or ""),
            word_count=int(payload.get("wordCount") or 0),
            status=str(payload.get("status") or "draft"),
            summary=payload.get("summary"),
        )
        _set_task_chapter_id(tasks, task_index, chapter_id)
        updates["tasks"] = tasks
        emit_custom(
            "chapter_upserted",
            runId=state["agentRunId"],
            chapterId=chapter_id,
        )
    elif kind == "chapter_update":
        chapter_id = str(pending_write.get("targetId") or payload.get("chapterId") or "")
        if chapter_id:
            update_chapter_content(
                chapter_id=chapter_id,
                content=str(payload.get("content") or ""),
                word_count=int(payload.get("wordCount") or 0),
                status=str(payload.get("status") or "completed"),
                summary=payload.get("summary"),
            )
            emit_custom(
                "chapter_upserted",
                runId=state["agentRunId"],
                chapterId=chapter_id,
            )
    elif kind == "character_create":
        character_id = add_character(
            project_id=state["projectId"],
            name=str(payload.get("name") or "Unnamed Character"),
            role=str(payload.get("role") or "supporting"),
            arc=str(payload.get("arc") or payload.get("description") or ""),
            active_chapters=_as_int_list(payload.get("activeChapters")),
            attributes=_as_dict(payload.get("attributes")),
            status=str(payload.get("status") or "draft"),
        )
        emit_custom("memory_upserted", runId=state["agentRunId"], memoryId=character_id)
    elif kind == "character_update":
        character_id = str(pending_write.get("targetId") or payload.get("characterId") or "")
        if character_id:
            update_character(
                character_id=character_id,
                name=_optional_str(payload.get("name")),
                role=_optional_str(payload.get("role")),
                arc=_optional_str(payload.get("arc") or payload.get("description")),
                active_chapters=_as_int_list(payload.get("activeChapters")) if "activeChapters" in payload else None,
                attributes=_as_dict(payload.get("attributes")) if "attributes" in payload else None,
                status=_optional_str(payload.get("status")),
            )
            emit_custom("memory_upserted", runId=state["agentRunId"], memoryId=character_id)
    elif kind == "entity_create":
        entity_id = add_entity(
            project_id=state["projectId"],
            name=str(payload.get("name") or "Unnamed Entity"),
            entity_type=str(payload.get("type") or payload.get("entityType") or "concept"),
            description=str(payload.get("description") or ""),
            attributes=_as_dict(payload.get("attributes")),
            status=str(payload.get("status") or "draft"),
        )
        emit_custom("memory_upserted", runId=state["agentRunId"], memoryId=entity_id)
    elif kind == "entity_update":
        entity_id = str(pending_write.get("targetId") or payload.get("entityId") or "")
        if entity_id:
            update_entity(
                entity_id=entity_id,
                name=_optional_str(payload.get("name")),
                description=_optional_str(payload.get("description")),
                attributes=_as_dict(payload.get("attributes")) if "attributes" in payload else None,
                status=_optional_str(payload.get("status")),
            )
            emit_custom("memory_upserted", runId=state["agentRunId"], memoryId=entity_id)

    emit_custom(
        "write_committed",
        runId=state["agentRunId"],
        projectId=state["projectId"],
        pendingWrite=_safe_pending_write({**pending_write, "status": "committed"}),
    )
    return updates


def _set_task_chapter_id(tasks: list[dict[str, Any]], task_index: object, chapter_id: str) -> None:
    if isinstance(task_index, int) and 0 <= task_index < len(tasks):
        tasks[task_index] = {**tasks[task_index], "chapterId": chapter_id}


def _is_approved(response: Any) -> bool:
    if isinstance(response, dict):
        value = response.get("approved", response.get("decision", response.get("response")))
    else:
        value = response
    return str(value).strip().lower() in {"approve", "approved", "yes", "y", "true", "continue"}


def _optional_str(value: object) -> str | None:
    return None if value is None else str(value)


def _as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_int_list(value: object) -> list[int]:
    if not isinstance(value, list):
        return []
    result: list[int] = []
    for item in value:
        try:
            result.append(int(item))
        except (TypeError, ValueError):
            continue
    return result


def _approval_summary(pending_write: PendingWrite) -> str:
    payload = pending_write.get("payload") or {}
    label = payload.get("title") or payload.get("name") or pending_write.get("kind") or "project write"
    return f"{pending_write.get('operation', 'write')} {pending_write.get('targetCollection', 'project data')}: {label}"


def _safe_pending_write(pending_write: PendingWrite) -> dict[str, Any]:
    payload = dict(pending_write.get("payload") or {})
    if "content" in payload:
        content = str(payload["content"])
        payload["contentPreview"] = content[:1200] + ("..." if len(content) > 1200 else "")
        payload.pop("content", None)
    return {
        **pending_write,
        "payload": payload,
        "preview": pending_write.get("preview", "")[:1200],
        "requestedAt": datetime.utcnow().isoformat(),
    }
