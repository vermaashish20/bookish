"""
Index MongoDB documents into the project knowledge vector store.
"""
from __future__ import annotations

import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, TypedDict

from app.infrastructure.database.mongo import get_db
from app.config import PROJECT_KNOWLEDGE_COLLECTION
from app.infrastructure.vector.store import (
    COLLECTION_NAMES,
    delete_document,
    delete_document_chunks,
    upsert_document,
)

logger = logging.getLogger(__name__)

_INDEX_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="chroma-index")

CHILD_CHUNK_TOKENS = 260
CHILD_CHUNK_OVERLAP = 50
PARENT_CHUNK_TOKENS = 1200
PARENT_PREVIEW_CHARS = 3000


class IndexedChunk(TypedDict):
    chunk_id: str
    parent_id: str
    parent_index: int
    child_index: int
    chunk_index: int
    chunk_count: int
    text: str
    parent_preview: str
    heading_path: str
    start: int
    end: int


def _submit_index_job(job_name: str, fn, *args, **kwargs) -> None:
    """Run Chroma indexing off the request/agent path."""
    def runner() -> None:
        try:
            fn(*args, **kwargs)
        except Exception:
            logger.exception("[Indexing] %s failed", job_name)

    _INDEX_EXECUTOR.submit(runner)


def _attrs_text(attrs: Dict[str, Any], limit: int = 400) -> str:
    if not attrs:
        return ""
    text = json.dumps(attrs, ensure_ascii=False)
    return text[:limit] + ("..." if len(text) > limit else "")


def _word_count(text: str) -> int:
    return len(re.findall(r"\S+", text or ""))


def _split_paragraphs(text: str) -> List[str]:
    return [part.strip() for part in re.split(r"\n\s*\n+", text or "") if part.strip()]


def _split_sentences(text: str) -> List[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text or "") if part.strip()]


def _split_large_unit(text: str, max_tokens: int) -> List[str]:
    if _word_count(text) <= max_tokens:
        return [text.strip()]
    sentences = _split_sentences(text)
    if len(sentences) <= 1:
        words = text.split()
        return [" ".join(words[i:i + max_tokens]) for i in range(0, len(words), max_tokens)]

    chunks: List[str] = []
    current: List[str] = []
    current_tokens = 0
    for sentence in sentences:
        sentence_tokens = _word_count(sentence)
        if current and current_tokens + sentence_tokens > max_tokens:
            chunks.append(" ".join(current).strip())
            current = []
            current_tokens = 0
        current.append(sentence)
        current_tokens += sentence_tokens
    if current:
        chunks.append(" ".join(current).strip())
    return chunks


def _split_parent_sections(text: str, max_tokens: int = PARENT_CHUNK_TOKENS) -> List[Dict[str, Any]]:
    """Build larger parent chunks using headings, scene breaks, paragraphs, then sentences."""
    clean = (text or "").strip()
    if not clean:
        return []

    blocks: List[tuple[str, str]] = []
    heading = ""
    buffer: List[str] = []

    def flush() -> None:
        if buffer:
            blocks.append((heading, "\n\n".join(buffer).strip()))
            buffer.clear()

    for raw_line in clean.splitlines():
        line = raw_line.strip()
        if re.match(r"^#{1,4}\s+", line):
            flush()
            heading = re.sub(r"^#{1,4}\s+", "", line).strip()
            buffer.append(raw_line)
        elif re.match(r"^(\*\s*){3,}$|^-{3,}$", line):
            flush()
            heading = heading or "Scene break"
        else:
            buffer.append(raw_line)
    flush()

    if not blocks:
        blocks = [("", clean)]

    parents: List[Dict[str, Any]] = []
    cursor = 0
    for heading_path, block in blocks:
        paragraphs = _split_paragraphs(block) or [block]
        current: List[str] = []
        current_tokens = 0
        for paragraph in paragraphs:
            paragraph_tokens = _word_count(paragraph)
            paragraph_parts = _split_large_unit(paragraph, max_tokens) if paragraph_tokens > max_tokens else [paragraph]
            for part in paragraph_parts:
                part_tokens = _word_count(part)
                if current and current_tokens + part_tokens > max_tokens:
                    parent_text = "\n\n".join(current).strip()
                    start = clean.find(parent_text[:80], cursor)
                    start = cursor if start < 0 else start
                    end = start + len(parent_text)
                    parents.append({
                        "text": parent_text,
                        "headingPath": heading_path,
                        "start": start,
                        "end": end,
                    })
                    cursor = end
                    current = []
                    current_tokens = 0
                current.append(part)
                current_tokens += part_tokens
        if current:
            parent_text = "\n\n".join(current).strip()
            start = clean.find(parent_text[:80], cursor)
            start = cursor if start < 0 else start
            end = start + len(parent_text)
            parents.append({
                "text": parent_text,
                "headingPath": heading_path,
                "start": start,
                "end": end,
            })
            cursor = end

    return parents


def _child_chunks(parent_text: str, target_tokens: int = CHILD_CHUNK_TOKENS, overlap_tokens: int = CHILD_CHUNK_OVERLAP) -> List[str]:
    words = parent_text.split()
    if not words:
        return []
    if len(words) <= target_tokens:
        return [parent_text.strip()]

    chunks: List[str] = []
    step = max(1, target_tokens - overlap_tokens)
    for start in range(0, len(words), step):
        piece = " ".join(words[start:start + target_tokens]).strip()
        if piece:
            chunks.append(piece)
        if start + target_tokens >= len(words):
            break
    return chunks


def build_index_chunks(root_id: str, text: str) -> List[IndexedChunk]:
    parents = _split_parent_sections(text)
    chunks: List[IndexedChunk] = []
    for parent_index, parent in enumerate(parents):
        parent_id = f"{root_id}::parent_{parent_index:03d}"
        child_texts = _child_chunks(parent["text"])
        for child_index, child_text in enumerate(child_texts):
            chunk_index = len(chunks)
            chunks.append({
                "chunk_id": f"{root_id}::chunk_{chunk_index:03d}",
                "parent_id": parent_id,
                "parent_index": parent_index,
                "child_index": child_index,
                "chunk_index": chunk_index,
                "chunk_count": 0,
                "text": child_text,
                "parent_preview": parent["text"][:PARENT_PREVIEW_CHARS],
                "heading_path": parent.get("headingPath", ""),
                "start": int(parent.get("start", 0)),
                "end": int(parent.get("end", 0)),
            })

    total = len(chunks)
    for chunk in chunks:
        chunk["chunk_count"] = total
    return chunks


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
    return PROJECT_KNOWLEDGE_COLLECTION


def collection_for_artifact(artifact_type: str, agent_name: str = "") -> str:
    return PROJECT_KNOWLEDGE_COLLECTION


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
    clean_text = (text or "").strip()
    if not clean_text:
        return

    delete_document(collection_name, doc_id)
    delete_document_chunks(collection_name, project_id, doc_id)
    chunks = build_index_chunks(doc_id, clean_text)
    for chunk in chunks:
        upsert_document(
            collection_name,
            chunk["chunk_id"],
            chunk["text"],
            {
                **meta,
                "rootId": doc_id,
                "parentId": chunk["parent_id"],
                "chunkIndex": chunk["chunk_index"],
                "chunkCount": chunk["chunk_count"],
                "parentIndex": chunk["parent_index"],
                "childIndex": chunk["child_index"],
                "chunkStart": chunk["start"],
                "chunkEnd": chunk["end"],
                "headingPath": chunk["heading_path"],
                "parentPreview": chunk["parent_preview"],
                "chunkingStrategy": "structure_recursive_parent_child_v1",
            },
        )


def index_chapter(project_id: str, chapter_id: str) -> None:
    doc = get_db().chapters.find_one({"_id": chapter_id, "projectId": project_id})
    if not doc:
        return
    source = doc.get("title") or f"Chapter {doc.get('number', '')}"
    index_text(
        PROJECT_KNOWLEDGE_COLLECTION,
        chapter_id,
        project_id,
        chapter_to_text(doc),
        source_name=source,
        extra_metadata={
            "mongoCollection": "chapters",
            "sourceKind": "chapter",
            "number": doc.get("number", ""),
            "status": doc.get("status", ""),
        },
    )


def enqueue_index_chapter(project_id: str, chapter_id: str) -> None:
    _submit_index_job("chapter:%s" % chapter_id, index_chapter, project_id, chapter_id)


def index_character(project_id: str, character_id: str) -> None:
    doc = get_db().character_bible.find_one({"_id": character_id, "projectId": project_id})
    if not doc:
        return
    index_text(
        PROJECT_KNOWLEDGE_COLLECTION,
        character_id,
        project_id,
        character_to_text(doc),
        source_name=doc.get("name", character_id),
        extra_metadata={
            "mongoCollection": "character_bible",
            "sourceKind": "character",
            "role": doc.get("role", ""),
        },
    )


def enqueue_index_character(project_id: str, character_id: str) -> None:
    _submit_index_job("character:%s" % character_id, index_character, project_id, character_id)


def index_entity(project_id: str, entity_id: str) -> None:
    doc = get_db().entity_bible.find_one({"_id": entity_id, "projectId": project_id})
    if not doc:
        return
    index_text(
        PROJECT_KNOWLEDGE_COLLECTION,
        entity_id,
        project_id,
        entity_to_text(doc),
        source_name=doc.get("name", entity_id),
        extra_metadata={
            "mongoCollection": "entity_bible",
            "sourceKind": "world",
            "entityType": doc.get("type", ""),
        },
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
        extra_metadata={
            "mongoCollection": "user_assets",
            "sourceKind": "asset",
            "assetType": asset_type,
        },
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
            "sourceKind": "artifact",
            "artifactType": artifact_type,
            "agentName": doc.get("agentName", ""),
        },
    )


def enqueue_index_artifact(artifact_id: str) -> None:
    _submit_index_job("artifact:%s" % artifact_id, index_artifact, artifact_id)


def unindex(doc_id: str, collection_name: str) -> None:
    delete_document(PROJECT_KNOWLEDGE_COLLECTION, doc_id)


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
