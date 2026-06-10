"""
Vector store — semantic search with real embeddings.

Prototype uses one logical collection:
  project_knowledge

MongoDB remains source of truth; vectors are indexed on write via services.indexing.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.api.models.Collection import Collection

from app.config import CHROMA_DIR, PROJECT_KNOWLEDGE_COLLECTION
from app.infrastructure.vector.embeddings import get_embedding_function

logger = logging.getLogger(__name__)

COLLECTION_NAMES = frozenset({PROJECT_KNOWLEDGE_COLLECTION})

_client: Optional[chromadb.PersistentClient] = None
_collections: Dict[str, Collection] = {}


def get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
        logger.info("Chroma persistent client at %s", CHROMA_DIR)
    return _client


def get_collection(name: str) -> Collection:
    if name not in COLLECTION_NAMES:
        raise ValueError(f"Unknown collection '{name}'. Allowed: {sorted(COLLECTION_NAMES)}")
    if name not in _collections:
        _collections[name] = get_client().get_or_create_collection(
            name=name,
            embedding_function=get_embedding_function(),
            metadata={"hnsw:space": "cosine"},
        )
    return _collections[name]


def _sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Chroma metadata values must be str | int | float | bool."""
    clean: Dict[str, Any] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            clean[key] = value
        else:
            clean[key] = str(value)[:500]
    return clean


def _distance_to_score(distance: float) -> float:
    """Convert Chroma distance to a 0–1 relevance score (higher = better)."""
    if distance is None:
        return 0.0
    return max(0.0, 1.0 - float(distance))


def upsert_document(
    collection_name: str,
    doc_id: str,
    document: str,
    metadata: Dict[str, Any],
) -> None:
    """Insert or update one embedded document."""
    text = (document or "").strip()
    if not text:
        logger.debug("Skip empty vector upsert for %s", doc_id)
        return

    project_id = metadata.get("projectId")
    if not project_id:
        raise ValueError("metadata must include projectId")

    meta = _sanitize_metadata({
        **metadata,
        "projectId": str(project_id),
    })

    logger.info(
        "[VectorIngestion] received collection=%s doc_id=%s project_id=%s sourceKind=%s chars=%s",
        collection_name,
        doc_id,
        project_id,
        meta.get("sourceKind", "unknown"),
        len(text),
    )
    start = time.perf_counter()
    try:
        get_collection(collection_name).upsert(
            ids=[str(doc_id)],
            documents=[text],
            metadatas=[meta],
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "[VectorIngestion] completed collection=%s doc_id=%s project_id=%s elapsed_ms=%.1f",
            collection_name,
            doc_id,
            project_id,
            elapsed_ms,
        )
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "[VectorIngestion] failed collection=%s doc_id=%s project_id=%s elapsed_ms=%.1f error=%s",
            collection_name,
            doc_id,
            project_id,
            elapsed_ms,
            exc,
        )


def delete_document(collection_name: str, doc_id: str) -> None:
    try:
        get_collection(collection_name).delete(ids=[str(doc_id)])
    except Exception as exc:
        logger.warning("Vector delete failed (%s/%s): %s", collection_name, doc_id, exc)


def query_documents(
    collection_name: str,
    query_text: str,
    project_id: str,
    limit: int = 5,
    metadata_filter: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Semantic search within a project.

    Returns: [{"id", "document", "metadata", "score"}, ...]
    """
    query_text = (query_text or "").strip()
    if not query_text or collection_name not in COLLECTION_NAMES:
        return []

    where_filter: Dict[str, Any] = {"projectId": str(project_id)}
    if metadata_filter:
        where_filter = {"$and": [where_filter, metadata_filter]}

    try:
        raw = get_collection(collection_name).query(
            query_texts=[query_text],
            n_results=limit,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        logger.error("Vector query failed (%s): %s", collection_name, exc)
        return []

    ids = (raw.get("ids") or [[]])[0]
    documents = (raw.get("documents") or [[]])[0]
    metadatas = (raw.get("metadatas") or [[]])[0]
    distances = (raw.get("distances") or [[]])[0]

    results: List[Dict[str, Any]] = []
    for i, doc_id in enumerate(ids):
        results.append({
            "id": doc_id,
            "document": documents[i] if i < len(documents) else "",
            "metadata": metadatas[i] if i < len(metadatas) else {},
            "score": _distance_to_score(distances[i] if i < len(distances) else 1.0),
        })
    return results


def delete_project_vectors(project_id: str) -> None:
    """Remove all vectors for a project across collections."""
    pid = str(project_id)
    for name in COLLECTION_NAMES:
        try:
            get_collection(name).delete(where={"projectId": pid})
        except Exception as exc:
            logger.warning("delete_project_vectors %s: %s", name, exc)


def delete_document_chunks(collection_name: str, project_id: str, root_id: str) -> None:
    """Remove all vector chunks for one Mongo/source document."""
    if collection_name not in COLLECTION_NAMES:
        return
    try:
        get_collection(collection_name).delete(
            where={
                "$and": [
                    {"projectId": str(project_id)},
                    {"rootId": str(root_id)},
                ]
            }
        )
    except Exception as exc:
        logger.warning("delete_document_chunks %s/%s: %s", collection_name, root_id, exc)
