"""
Index MongoDB documents into Chroma — single place for embedding writes.
"""
from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, Optional

from app.infrastructure.database.mongo import get_db
from app.infrastructure.vector.store import COLLECTION_NAMES, delete_document, upsert_document

logger = logging.getLogger(__name__)

_INDEX_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="chroma-index")


def _submit_index_job(job_name: str, fn, *args, **kwargs) -> None:
    """Run Chroma indexing off the request/agent path."""
    def runner() -> None:
        start = time.perf_counter()
        try:
            fn(*args, **kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.info("[Indexing] %s completed in %.1fms", job_name, elapsed_ms)
        except Exception:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception("[Indexing] %s failed after %.1fms", job_name, elapsed_ms)

    _INDEX_EXECUTOR.submit(runner)


def _attrs_text(attrs: Dict[str, Any], limit: int = 400) -> str:
    if not attrs:
        return ""
    text = json.dumps(attrs, ensure_ascii=False)
    return text[:limit] + ("..." if len(text) > limit else "")


def chapter_to_text(doc: Dict[str, Any]) -> str:
    parts = [
        f"Chapter {doc.get('number', '?')}: {doc.get('title', '')}",
    ]
    summary = (doc.get("summary") or "").strip()
    content = (doc.get("content") or "").strip()
    if summary:
        parts.append(summary)
    if content:
        if len(content) > 6000:
            content = content[:6000] + "\n...(truncated)"
        parts.append(content)
    return "\n\n".join(parts)


def character_to_text(doc: Dict[str, Any]) -> str:
    lines = [
        f"{doc.get('name', '')} ({doc.get('role', '')})",
        f"Arc: {doc.get('arc', '')}",
    ]
    attrs = _attrs_text(doc.get("attributes") or {})
    if attrs:
        lines.append(f"Attributes: {attrs}")
    return "\n".join(lines)


def entity_to_text(doc: Dict[str, Any]) -> str:
    lines = [
        f"{doc.get('name', '')} [{doc.get('type', '')}]",
        (doc.get("description") or "").strip(),
    ]
    attrs = _attrs_text(doc.get("attributes") or {})
    if attrs:
        lines.append(f"Attributes: {attrs}")
    return "\n".join(lines)


def asset_to_text(doc: Dict[str, Any]) -> str:
    name = doc.get("name", "")
    content = (doc.get("content") or "").strip()
    if len(content) > 8000:
        content = content[:8000] + "\n...(truncated)"
    return f"{name}\n{content}" if name else content


def collection_for_asset(asset_type: str) -> str:
    if asset_type in {"Text Guidelines", "Prompt"}:
        return "book_style_guide"
    return "world_system"


def collection_for_artifact(artifact_type: str, agent_name: str = "") -> str:
    if artifact_type in {"draft", "edited_content", "humanized_content"}:
        return "chapters"
    if "character" in artifact_type:
        return "characters"
    if artifact_type in {"research_notes", "fact_check_report"}:
        return "world_system"
    if agent_name == "world_builder":
        return "characters" if "character" in artifact_type else "world_system"
    return "world_system"


def index_text(
    collection_name: str,
    doc_id: str,
    project_id: str,
    text: str,
    *,
    source_name: str = "",
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> None:
    if collection_name not in COLLECTION_NAMES:
        logger.warning("index_text: unknown collection %s", collection_name)
        return
    meta = {"projectId": project_id, "sourceName": source_name or doc_id}
    if extra_metadata:
        meta.update(extra_metadata)
    upsert_document(collection_name, doc_id, text, meta)


def index_chapter(project_id: str, chapter_id: str) -> None:
    doc = get_db().chapters.find_one({"_id": chapter_id, "projectId": project_id})
    if not doc:
        return
    source = doc.get("title") or f"Chapter {doc.get('number', '')}"
    index_text(
        "chapters",
        chapter_id,
        project_id,
        chapter_to_text(doc),
        source_name=source,
        extra_metadata={"mongoCollection": "chapters", "status": doc.get("status", "")},
    )


def enqueue_index_chapter(project_id: str, chapter_id: str) -> None:
    _submit_index_job("chapter:%s" % chapter_id, index_chapter, project_id, chapter_id)


def index_character(project_id: str, character_id: str) -> None:
    doc = get_db().character_bible.find_one({"_id": character_id, "projectId": project_id})
    if not doc:
        return
    index_text(
        "characters",
        character_id,
        project_id,
        character_to_text(doc),
        source_name=doc.get("name", character_id),
        extra_metadata={"mongoCollection": "character_bible", "role": doc.get("role", "")},
    )


def enqueue_index_character(project_id: str, character_id: str) -> None:
    _submit_index_job("character:%s" % character_id, index_character, project_id, character_id)


def index_entity(project_id: str, entity_id: str) -> None:
    doc = get_db().entity_bible.find_one({"_id": entity_id, "projectId": project_id})
    if not doc:
        return
    index_text(
        "world_system",
        entity_id,
        project_id,
        entity_to_text(doc),
        source_name=doc.get("name", entity_id),
        extra_metadata={"mongoCollection": "entity_bible", "entityType": doc.get("type", "")},
    )


def enqueue_index_entity(project_id: str, entity_id: str) -> None:
    _submit_index_job("entity:%s" % entity_id, index_entity, project_id, entity_id)


def index_user_asset(project_id: str, asset_id: str, asset_type: str) -> None:
    doc = get_db().user_assets.find_one({"_id": asset_id, "projectId": project_id})
    if not doc:
        return
    coll = collection_for_asset(asset_type)
    index_text(
        coll,
        asset_id,
        project_id,
        asset_to_text(doc),
        source_name=doc.get("name", asset_id),
        extra_metadata={"mongoCollection": "user_assets", "assetType": asset_type},
    )


def enqueue_index_user_asset(project_id: str, asset_id: str, asset_type: str) -> None:
    _submit_index_job("asset:%s" % asset_id, index_user_asset, project_id, asset_id, asset_type)


def index_artifact(artifact_id: str) -> None:
    doc = get_db().artifacts.find_one({"_id": artifact_id})
    if not doc:
        return
    project_id = doc["projectId"]
    artifact_type = doc.get("artifactType", "")
    coll = collection_for_artifact(artifact_type, doc.get("agentName", ""))
    index_text(
        coll,
        artifact_id,
        project_id,
        doc.get("content", ""),
        source_name=f"{doc.get('agentName', '')}:{artifact_type}",
        extra_metadata={
            "mongoCollection": "artifacts",
            "artifactType": artifact_type,
            "agentName": doc.get("agentName", ""),
        },
    )


def enqueue_index_artifact(artifact_id: str) -> None:
    _submit_index_job("artifact:%s" % artifact_id, index_artifact, artifact_id)


def unindex(doc_id: str, collection_name: str) -> None:
    delete_document(collection_name, doc_id)


def reindex_project(project_id: str) -> None:
    """Rebuild all Chroma vectors for a project from Mongo (migration / repair)."""
    db = get_db()
    for doc in db.chapters.find({"projectId": project_id}):
        index_chapter(project_id, doc["_id"])
    for doc in db.character_bible.find({"projectId": project_id}):
        index_character(project_id, doc["_id"])
    for doc in db.entity_bible.find({"projectId": project_id}):
        index_entity(project_id, doc["_id"])
    for doc in db.user_assets.find({"projectId": project_id}):
        index_user_asset(project_id, doc["_id"], doc.get("type", ""))
    for doc in db.artifacts.find({"projectId": project_id}):
        index_artifact(doc["_id"])
    logger.info("Reindexed project %s into Chroma", project_id)
