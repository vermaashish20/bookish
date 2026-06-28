"""Human-in-the-loop helpers for write approval."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, Optional

from langgraph.runtime import Runtime

from app.agent.utils.context_schema import BookishContext
from app.agent.utils.memory import persist_episode, update_narrative_after_write
from app.agent.utils.streaming import emit_custom
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.artifacts import create_artifact, get_artifact, attach_pending_write, get_agent_run_artifacts
from app.repositories.characters import add_character
from app.repositories.chapters import add_chapter, get_project_chapters, update_chapter_content
from app.repositories.entities import add_entity

_REVISION_RE = re.compile(
    r"\b(edit|revise|revision|rewrite|polish|update|proofread|copyedit)\b",
    re.IGNORECASE,
)
_CHAPTER_RE = re.compile(r"\bchapter\s+(\d+)\b", re.IGNORECASE)
_CHAPTER_TASK_RE = re.compile(
    r"\b(write|draft|compose|revise|polish|proofread|rewrite|update)\b.*\b(chapter|scene)\b"
    r"|\b(chapter|scene)\b.*\b(write|draft|compose|revise|polish|proofread|rewrite|update)\b",
    re.IGNORECASE,
)
_NAME_IN_QUOTES_RE = re.compile(r"['\"]([^'\"]{2,80})['\"]")
_NAME_FIELD_RE = re.compile(r"(?:^|\n)\s*(?:\*\*)?(?:name|character)\s*(?:\*\*)?\s*:\s*(.+?)\s*(?:\n|$)", re.IGNORECASE)
_HEADING_RE = re.compile(r"^#+\s*(.+?)\s*$", re.MULTILINE)

_WORLD_BUILDING_MARKERS = (
    "character profile",
    "character concept",
    "character bible",
    "## character",
    "# character",
    "world-building",
    "world building",
    "location:",
    "faction",
    "magic system",
    "lore entry",
    "entity profile",
    "identity",
    "backstory & origin",
    "backstory and origin",
)

_CHARACTER_MARKERS = (
    "character profile",
    "character concept",
    "character bible",
    "## character",
    "# character",
)

_WORLD_OVERVIEW_MARKERS = (
    "world-building overview",
    "world building overview",
    "world overview",
    "setting overview",
    "geographic & urban",
    "geographic and urban",
    "technological landscape",
    "social & cultural",
    "key world-building elements",
)

_SECTION_NUMBER_HEADING_RE = re.compile(r"^\d+\.\s", re.IGNORECASE)

_ENTITY_TYPE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(location|city|place|region|geography|harbor|capital)\b", re.I), "location"),
    (re.compile(r"\b(faction|organization|guild|council|empire|kingdom|pantheon)\b", re.I), "organization"),
    (re.compile(r"\b(magic|spell|artifact|relic|object|weapon)\b", re.I), "object"),
    (re.compile(r"\b(concept|rule|system|history|timeline|religion)\b", re.I), "concept"),
]


def is_approved(response: Any) -> bool:
    if isinstance(response, dict):
        value = response.get("approved", response.get("decision", response.get("response")))
    else:
        value = response
    return str(value).strip().lower() in {"approve", "approved", "yes", "y", "true", "continue"}


def safe_preview(content: str, limit: int = 1200) -> str:
    """Short snippet for approval cards — not the full preview panel."""
    return content[:limit] + ("..." if len(content) > limit else "")


def _looks_like_world_overview(notes: str, task: str) -> bool:
    combined = f"{task}\n{notes}".lower()
    if any(marker in combined for marker in _WORLD_OVERVIEW_MARKERS):
        return True
    if len(re.findall(r"^#{2,3}\s*\d+\.", notes, re.MULTILINE)) >= 2:
        return True
    if re.search(r"\|\s*element\s*\|", notes, re.IGNORECASE):
        return True
    task_lower = task.lower()
    if re.search(r"\b(build|create|develop|expand)\b.*\b(world|setting|lore)\b", task_lower):
        return True
    if re.search(r"\bchapter\s+\d+\s+world\b", task_lower):
        return True
    return False


def _extract_world_overview_name(notes: str, task: str) -> str:
    for line in notes.splitlines():
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("##"):
            title = stripped.lstrip("#").strip().strip("*")
            if title:
                return title[:80]
    ch_match = _CHAPTER_RE.search(task)
    if ch_match:
        return f"Chapter {ch_match.group(1)} World"
    cleaned_task = task.strip()
    if cleaned_task:
        return cleaned_task[:80]
    return "World Overview"


def looks_like_world_building(draft: str, task: str = "") -> bool:
    """True when content is a bible/profile, not narrative chapter prose."""
    combined = f"{task}\n{draft}".lower()
    if not any(marker in combined for marker in _WORLD_BUILDING_MARKERS):
        return False
    if _CHAPTER_TASK_RE.search(task):
        return False
    return True


def looks_like_chapter_task(task: str) -> bool:
    return bool(_CHAPTER_TASK_RE.search(task) or _CHAPTER_RE.search(task))


def _extract_record_name(notes: str, task: str, *, default: str) -> str:
    for pattern in (_NAME_IN_QUOTES_RE, _NAME_FIELD_RE):
        match = pattern.search(notes) or pattern.search(task)
        if match:
            name = match.group(1).strip().strip("*").strip()
            if name and len(name) <= 80:
                return name

    for line in notes.splitlines():
        stripped = line.strip()
        if not stripped.startswith("#"):
            continue
        heading = stripped.lstrip("#").strip()
        lowered = heading.lower()
        if lowered.startswith("chapter "):
            continue
        for prefix in ("character concept", "character profile", "character:", "character –", "character -"):
            if lowered.startswith(prefix):
                remainder = heading[len(prefix) :].strip(" –-:'\"")
                if remainder:
                    return remainder[:80]
        if _SECTION_NUMBER_HEADING_RE.match(heading):
            continue
        if "character" not in lowered and len(heading) <= 80:
            return heading

    return default


def _infer_character_role(notes: str) -> str:
    lower = notes.lower()
    if "protagonist" in lower or "main character" in lower:
        return "protagonist"
    if "antagonist" in lower or "villain" in lower:
        return "antagonist"
    if "minor character" in lower:
        return "minor"
    return "supporting"


def _infer_entity_type(notes: str, task: str) -> str:
    combined = f"{task}\n{notes}"
    for pattern, entity_type in _ENTITY_TYPE_PATTERNS:
        if pattern.search(combined):
            return entity_type
    return "concept"


def _is_character_content(notes: str, task: str) -> bool:
    if _looks_like_world_overview(notes, task):
        return False
    combined = f"{task}\n{notes}".lower()
    if any(marker in combined for marker in _CHARACTER_MARKERS):
        return True
    if _NAME_FIELD_RE.search(notes):
        return True
    # Single-character profile: short doc with biographical fields, not a multi-section overview.
    if len(notes) > 4000:
        return False
    profile_terms = ("backstory", "personality", "appearance", "motivation", "physical description")
    return sum(1 for term in profile_terms if term in combined) >= 2


def parse_world_builder_record(notes: str, task: str) -> dict[str, Any]:
    """Classify world-builder output and extract fields for Mongo commit."""
    if _is_character_content(notes, task):
        name = _extract_record_name(notes, task, default="Unnamed Character")
        return {
            "recordType": "character",
            "name": name,
            "role": _infer_character_role(notes),
            "arc": "",
            "attributes": {"profile": notes, "sourceTask": task},
        }

    if _looks_like_world_overview(notes, task):
        name = _extract_world_overview_name(notes, task)
    else:
        name = _extract_record_name(notes, task, default="Unnamed Entity")
    return {
        "recordType": "entity",
        "name": name,
        "entityType": _infer_entity_type(notes, task),
        "description": notes,
        "attributes": {"sourceTask": task},
    }


def build_writer_pending_write(
    project_id: str,
    run_id: str,
    task: str,
    draft: str,
    artifact_id: str,
) -> dict[str, Any]:
    if looks_like_world_building(draft, task):
        pending = build_world_pending_write(run_id, task, draft, artifact_id)
        pending["agent"] = "writer"
        pending["misroutedFrom"] = "writer"
        return pending

    if not looks_like_chapter_task(task):
        return {
            "kind": "invalid_writer_output",
            "agent": "writer",
            "task": task,
            "artifactId": artifact_id,
            "content": draft,
            "preview": safe_preview(draft),
            "status": "pending",
            "requestedAt": datetime.utcnow().isoformat(),
            "message": (
                "This output does not look like a chapter draft. "
                "Ask the world builder to create character or lore profiles, "
                "or ask the writer to draft a specific chapter or scene."
            ),
        }

    existing_chapters = get_project_chapters(project_id)
    target_chapter: Optional[Dict[str, Any]] = None
    ch_match = _CHAPTER_RE.search(task)
    if ch_match:
        number = int(ch_match.group(1))
        for ch in existing_chapters:
            if int(ch.get("number") or 0) == number:
                target_chapter = ch
                break
    if not target_chapter and _REVISION_RE.search(task) and len(existing_chapters) == 1:
        target_chapter = existing_chapters[0]
    revision = bool(target_chapter and (_REVISION_RE.search(task) or ch_match))
    word_count = len(draft.split())

    if revision and target_chapter:
        chapter_id = str(target_chapter.get("_id") or target_chapter.get("id") or "")
        return {
            "kind": "chapter_update",
            "agent": "writer",
            "task": task,
            "artifactId": artifact_id,
            "targetCollection": "chapters",
            "operation": "update",
            "targetId": chapter_id,
            "payload": {
                "chapterId": chapter_id,
                "content": draft,
                "wordCount": word_count,
                "status": "completed",
            },
            "content": draft,
            "preview": safe_preview(draft),
            "status": "pending",
            "requestedAt": datetime.utcnow().isoformat(),
        }

    next_number = len(existing_chapters) + 1
    ch_num_match = _CHAPTER_RE.search(task)
    if ch_num_match:
        next_number = int(ch_num_match.group(1))

    lines = draft.splitlines()
    first_line = lines[0].replace("#", "").replace("*", "").strip() if lines else ""
    if first_line.lower().startswith("chapter") and looks_like_chapter_task(task):
        title = first_line
    elif ch_num_match:
        title = f"Chapter {next_number}"
    else:
        title = f"Chapter {next_number}"

    return {
        "kind": "chapter_create",
        "agent": "writer",
        "task": task,
        "artifactId": artifact_id,
        "targetCollection": "chapters",
        "operation": "insert",
        "payload": {
            "number": next_number,
            "title": title,
            "content": draft,
            "wordCount": word_count,
        },
        "content": draft,
        "preview": safe_preview(draft),
        "status": "pending",
        "requestedAt": datetime.utcnow().isoformat(),
    }


def build_world_pending_write(
    run_id: str,
    task: str,
    notes: str,
    artifact_id: str,
) -> dict[str, Any]:
    record = parse_world_builder_record(notes, task)
    if record["recordType"] == "character":
        kind = "character_create"
        target_collection = "character_bible"
        payload = {
            "name": record["name"],
            "role": record["role"],
            "arc": record["arc"],
            "activeChapters": [],
            "attributes": record["attributes"],
            "notes": notes,
        }
    else:
        kind = "entity_create"
        target_collection = "entity_bible"
        payload = {
            "name": record["name"],
            "entityType": record["entityType"],
            "description": record["description"],
            "attributes": record["attributes"],
            "notes": notes,
        }

    return {
        "kind": kind,
        "agent": "world_builder",
        "task": task,
        "artifactId": artifact_id,
        "targetCollection": target_collection,
        "operation": "insert",
        "payload": payload,
        "content": notes,
        "preview": safe_preview(notes),
        "status": "pending",
        "requestedAt": datetime.utcnow().isoformat(),
    }


def resolve_pending_write(
    state: dict[str, Any],
    pending_write: dict[str, Any],
    *,
    project_id: str = "",
) -> dict[str, Any]:
    """Recover pending write from artifact metadata when checkpoint state is missing it."""
    if pending_write.get("kind"):
        return pending_write

    artifact_id = str(pending_write.get("artifactId") or "")
    if not artifact_id:
        artifact_ids = state.get("artifactIds") or []
        if artifact_ids:
            artifact_id = str(artifact_ids[-1])
    if not artifact_id:
        run_id = str(state.get("agentRunId") or "")
        if run_id:
            run_artifacts = get_agent_run_artifacts(run_id)
            if run_artifacts:
                artifact_id = str(run_artifacts[-1].get("_id") or run_artifacts[-1].get("id") or "")
    if not artifact_id:
        return pending_write

    artifact = get_artifact(artifact_id)
    if not artifact:
        return pending_write

    metadata = artifact.get("metadata") or {}
    stored = metadata.get("pendingWrite")
    if isinstance(stored, dict) and stored.get("kind"):
        resolved = dict(stored)
        if not resolved.get("content") and artifact.get("content"):
            resolved["content"] = artifact["content"]
        resolved.setdefault("artifactId", artifact_id)
        return resolved

    content = str(artifact.get("content") or "")
    task = str(metadata.get("task") or state.get("userPrompt") or "")
    run_id = str(state.get("agentRunId") or "")
    agent_name = str(artifact.get("agentName") or state.get("routedAgent") or "world_builder")
    if agent_name == "world_builder":
        return build_world_pending_write(run_id, task, content, artifact_id)
    if agent_name == "writer" and project_id:
        return build_writer_pending_write(project_id, run_id, task, content, artifact_id)
    return pending_write


def commit_pending_write(
    pending_write: dict[str, Any],
    *,
    runtime: Runtime[BookishContext],
    run_id: str,
    exec_idx: int,
    artifact_id: str,
) -> str:
    ctx = runtime.context
    store = runtime.store
    agent = str(pending_write.get("agent") or "writer")
    task = str(pending_write.get("task") or "")
    kind = pending_write.get("kind")

    if kind == "invalid_writer_output":
        return str(
            pending_write.get("message")
            or "Output was not saved because it is not a chapter draft."
        )

    if kind == "chapter_update":
        payload = pending_write["payload"]
        chapter_id = str(payload.get("chapterId") or pending_write.get("targetId") or "")
        update_chapter_content(
            chapter_id=chapter_id,
            content=str(payload.get("content") or ""),
            word_count=int(payload.get("wordCount") or 0),
            status="completed",
        )
        update_narrative_after_write(store, ctx.project_id, kind="chapter_update", payload={**payload})
        emit_custom("chapter_upserted", runId=run_id, chapterId=chapter_id)
        result_msg = f"Chapter saved ({payload.get('wordCount', 0)} words)."
    elif kind == "chapter_create":
        payload = pending_write["payload"]
        chapter_id = add_chapter(
            project_id=ctx.project_id,
            number=int(payload["number"]),
            title=str(payload["title"]),
            content=str(payload["content"]),
            word_count=int(payload.get("wordCount") or 0),
            status="published",
        )
        update_narrative_after_write(
            store,
            ctx.project_id,
            kind="chapter_create",
            payload={**payload, "chapterId": chapter_id, "id": chapter_id},
        )
        emit_custom("chapter_upserted", runId=run_id, chapterId=chapter_id)
        result_msg = f"Chapter saved ({payload.get('wordCount', 0)} words)."
    elif kind == "character_create":
        payload = pending_write["payload"]
        character_id = add_character(
            project_id=ctx.project_id,
            name=str(payload.get("name") or "Unnamed Character"),
            role=str(payload.get("role") or "supporting"),
            arc=str(payload.get("arc") or ""),
            active_chapters=list(payload.get("activeChapters") or []),
            attributes=dict(payload.get("attributes") or {}),
            status="published",
        )
        emit_custom(
            "memory_upserted",
            runId=run_id,
            recordId=character_id,
            collection="character_bible",
            name=payload.get("name"),
        )
        result_msg = f"Character '{payload.get('name')}' saved to the character bible."
    elif kind == "entity_create":
        payload = pending_write["payload"]
        entity_id = add_entity(
            project_id=ctx.project_id,
            name=str(payload.get("name") or "Unnamed Entity"),
            entity_type=str(payload.get("entityType") or "concept"),
            description=str(payload.get("description") or payload.get("notes") or ""),
            attributes=dict(payload.get("attributes") or {}),
            status="published",
        )
        emit_custom(
            "memory_upserted",
            runId=run_id,
            recordId=entity_id,
            collection="entity_bible",
            name=payload.get("name"),
        )
        result_msg = f"World entry '{payload.get('name')}' saved to the entity bible."
    else:
        result_msg = "Nothing was saved — unrecognized pending write type."

    update_agent_execution(
        run_id=run_id,
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id,
    )
    emit_custom(
        "task_completed",
        runId=run_id,
        agent=agent,
        task={"agent": agent, "task": task, "status": "completed"},
    )
    persist_episode(store, ctx.project_id, agent=agent, task=task, run_id=run_id)

    from app.repositories.projects import get_unified_project_payload

    project_state = get_unified_project_payload(ctx.project_id)
    if project_state:
        emit_custom("project_updated", runId=run_id, projectState=project_state)

    return result_msg


def create_specialist_artifact(
    *,
    runtime: Runtime[BookishContext],
    agent: str,
    task: str,
    content: str,
    artifact_type: str,
    metadata: Optional[dict[str, Any]] = None,
) -> str:
    ctx = runtime.context
    artifact_id = create_artifact(
        project_id=ctx.project_id,
        agent_run_id=ctx.agent_run_id,
        agent_name=agent,
        artifact_type=artifact_type,
        content=content,
        metadata=metadata or {},
    )
    emit_custom(
        "artifact_created",
        runId=ctx.agent_run_id,
        artifactId=artifact_id,
        agent=agent,
        artifactType=artifact_type,
        contentPreview=content[:6000],
    )
    return artifact_id


def start_specialist_execution(*, runtime: Runtime[BookishContext], agent: str, task: str) -> int:
    run_id = runtime.context.agent_run_id
    emit_custom(
        "task_started",
        runId=run_id,
        agent=agent,
        task={"agent": agent, "task": task, "status": "running"},
    )
    return add_agent_execution(run_id=run_id, agent=agent, task_input=task, status="running")
