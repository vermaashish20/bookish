"""Business-level Knowledge Base retrieval service."""

from __future__ import annotations

from typing import List, Optional

from app.core.telemetry import langfuse_observation, update_observation
from app.infrastructure.vector.store import query_documents
from app.knowledge.schemas import KnowledgeHit, KnowledgeSearchResult
from app.knowledge.scopes import collections_for_scopes, metadata_filter_for_scopes, normalize_scopes


def search_knowledge(
    *,
    project_id: str,
    query: str,
    scopes: object = None,
    intent: str = "",
    max_results: int = 5,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
    log: bool = True,
) -> KnowledgeSearchResult:
    """Search semantic knowledge by domain scope, not storage collection."""
    normalized_scopes = normalize_scopes(scopes)
    collections = collections_for_scopes(normalized_scopes)
    metadata_filter = metadata_filter_for_scopes(normalized_scopes)
    clean_query = (query or "").strip()
    with langfuse_observation(
        name="kb-search-knowledge",
        as_type="retriever",
        input={
            "query": clean_query,
            "scopes": normalized_scopes,
            "collections": collections,
            "metadataFilter": metadata_filter,
            "intent": intent,
            "maxResults": max_results,
        },
        metadata={"projectId": project_id, "runId": run_id, "agent": agent, "task": task},
    ) as observation:
        hits: List[KnowledgeHit] = []
        seen: set[tuple[str, str]] = set()
        per_collection_limit = max(1, min(int(max_results or 5), 10))

        if clean_query:
            for collection in collections:
                for raw in query_documents(
                    collection,
                    clean_query,
                    project_id,
                    limit=per_collection_limit,
                    metadata_filter=metadata_filter,
                ):
                    key = (collection, raw["id"])
                    if key in seen:
                        continue
                    seen.add(key)
                    metadata = raw.get("metadata", {})
                    hit_scope = next(
                        (scope for scope in normalized_scopes if collection in collections_for_scopes([scope])),
                        normalized_scopes[0],
                    )
                    hits.append({
                        "id": raw["id"],
                        "scope": hit_scope,
                        "collection": collection,
                        "document": raw.get("document", ""),
                        "metadata": metadata,
                        "score": float(raw.get("score", 0.0)),
                    })

        hits.sort(key=lambda item: item["score"], reverse=True)
        final_hits = hits[:per_collection_limit]
        result: KnowledgeSearchResult = {
            "query": clean_query,
            "scopes": normalized_scopes,
            "intent": intent,
            "results": final_hits,
            "missing": [] if final_hits else ["No matching project knowledge was found."],
        }

        update_observation(
            observation,
            output={
                "resultCount": len(final_hits),
                "resultIds": [hit["id"] for hit in final_hits],
            },
            metadata={
                "projectId": project_id,
                "runId": run_id,
                "agent": agent,
                "resultCount": len(final_hits),
            },
        )

        return result


def format_knowledge_result(result: KnowledgeSearchResult) -> str:
    """Format retrieval results for LLM context."""
    lines = [
        "--- KNOWLEDGE BASE CONTEXT (SEMANTIC SEARCH) ---",
        "Use persistent Mongo reads for full parent records when excerpts are insufficient.",
        f"Query: {result['query']}",
        f"Scopes: {', '.join(result['scopes'])}",
    ]

    if not result["results"]:
        lines.extend(result["missing"])
        lines.append("--- END KNOWLEDGE BASE CONTEXT ---")
        return "\n".join(lines)

    for idx, hit in enumerate(result["results"], 1):
        source = hit["metadata"].get("sourceName", hit["id"])
        mongo_collection = hit["metadata"].get("mongoCollection", "unknown")
        source_kind = hit["metadata"].get("sourceKind", "unknown")
        parent_id = hit["metadata"].get("parentId") or hit["metadata"].get("rootId") or hit["id"]
        chunk_label = hit["metadata"].get("chunkIndex", "?")
        lines.append(
            f"\n[{idx}] scope={hit['scope']} collection={hit['collection']} "
            f"source={source} sourceKind={source_kind} mongo={mongo_collection} "
            f"parent={parent_id} chunk={chunk_label}"
        )
        lines.append(hit["document"])
        parent_preview = hit["metadata"].get("parentPreview")
        if parent_preview and parent_preview != hit["document"]:
            lines.append(f"\nParent context preview:\n{parent_preview}")

    lines.append("--- END KNOWLEDGE BASE CONTEXT ---")
    return "\n".join(lines)
