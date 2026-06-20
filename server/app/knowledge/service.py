"""Business-level Knowledge Base retrieval service."""

from __future__ import annotations

from typing import List, Optional

from app.core.telemetry import langfuse_observation, update_observation
from app.infrastructure.vector.store import query_documents
from app.knowledge.schemas import KnowledgeHit, KnowledgeSearchResult
from app.knowledge.scopes import collections_for_scopes, metadata_filter_for_scopes, normalize_scopes


def _score_to_coverage(score: float, result_count: int) -> str:
    if result_count == 0:
        return "none"
    if score >= 0.72:
        return "strong"
    if score >= 0.45:
        return "partial"
    return "weak"


def _suggest_query(query: str, scopes: List[str]) -> Optional[str]:
    if not query:
        return None
    scope_hint = ", ".join(scopes[:3])
    return f"{query} {scope_hint}".strip()


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
        relevance = final_hits[0]["score"] if final_hits else 0.0
        coverage = _score_to_coverage(relevance, len(final_hits))
        should_retrieve_again = coverage in {"none", "weak"}
        result: KnowledgeSearchResult = {
            "query": clean_query,
            "scopes": normalized_scopes,
            "intent": intent,
            "results": final_hits,
            "relevance": relevance,
            "coverage": coverage,
            "missing": [] if final_hits else ["No matching project knowledge was found."],
            "shouldRetrieveAgain": should_retrieve_again,
            "suggestedQuery": _suggest_query(clean_query, normalized_scopes) if should_retrieve_again else None,
        }

        update_observation(
            observation,
            output={
                "coverage": coverage,
                "relevance": relevance,
                "resultCount": len(final_hits),
                "resultIds": [hit["id"] for hit in final_hits],
                "scores": [hit["score"] for hit in final_hits],
                "shouldRetrieveAgain": should_retrieve_again,
            },
            metadata={
                "projectId": project_id,
                "runId": run_id,
                "agent": agent,
                "coverage": coverage,
                "resultCount": len(final_hits),
            },
        )

        return result


def format_knowledge_result(result: KnowledgeSearchResult) -> str:
    """Format retrieval results for LLM context."""
    lines = [
        "--- KNOWLEDGE BASE CONTEXT (RAG / CHROMA SEMANTIC SEARCH) ---",
        "Storage: Chroma child chunks in project_knowledge, filtered by projectId/sourceKind.",
        "Use RAG for targeted lookup. Use persistent Mongo tools for full parent records.",
        f"Query: {result['query']}",
        f"Scopes: {', '.join(result['scopes'])}",
        f"Coverage: {result['coverage']} | relevance: {result['relevance']:.2f}",
    ]
    if result["shouldRetrieveAgain"] and result["suggestedQuery"]:
        lines.append(f"Suggested follow-up query: {result['suggestedQuery']}")

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
            f"parent={parent_id} chunk={chunk_label} score={hit['score']:.2f}"
        )
        lines.append(hit["document"])
        parent_preview = hit["metadata"].get("parentPreview")
        if parent_preview and parent_preview != hit["document"]:
            lines.append(f"\nParent context preview:\n{parent_preview}")

    lines.append("--- END KNOWLEDGE BASE CONTEXT ---")
    return "\n".join(lines)
