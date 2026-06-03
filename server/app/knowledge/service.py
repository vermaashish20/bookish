"""Business-level Knowledge Base retrieval service."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from app.core.telemetry import langfuse_observation, update_observation
from app.infrastructure.database.mongo import get_db
from app.infrastructure.vector.store import query_documents
from app.knowledge.schemas import KnowledgeHit, KnowledgeSearchResult
from app.knowledge.scopes import collections_for_scopes, normalize_scopes


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


def _log_retrieval(
    *,
    project_id: str,
    run_id: Optional[str],
    agent: Optional[str],
    task: Optional[str],
    tool_name: str,
    result: KnowledgeSearchResult,
) -> None:
    db = get_db()
    db.retrieval_logs.insert_one({
        "projectId": project_id,
        "runId": run_id,
        "agent": agent,
        "task": task,
        "toolName": tool_name,
        "scopes": result["scopes"],
        "query": result["query"],
        "intent": result["intent"],
        "resultIds": [hit["id"] for hit in result["results"]],
        "scores": [hit["score"] for hit in result["results"]],
        "relevance": result["relevance"],
        "coverage": result["coverage"],
        "shouldRetrieveAgain": result["shouldRetrieveAgain"],
        "createdAt": datetime.utcnow().isoformat(),
    })


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
    clean_query = (query or "").strip()
    with langfuse_observation(
        name="kb-search-knowledge",
        as_type="retriever",
        input={
            "query": clean_query,
            "scopes": normalized_scopes,
            "collections": collections,
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
                for raw in query_documents(collection, clean_query, project_id, limit=per_collection_limit):
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

        if log:
            _log_retrieval(
                project_id=project_id,
                run_id=run_id,
                agent=agent,
                task=task,
                tool_name="search_knowledge",
                result=result,
            )

        return result


def format_knowledge_result(result: KnowledgeSearchResult) -> str:
    """Format retrieval results for LLM context."""
    lines = [
        "--- KNOWLEDGE BASE CONTEXT (RAG / CHROMA SEMANTIC SEARCH) ---",
        "Storage: Chroma indexed chunks. Use for targeted lookup, not full source-of-truth reads.",
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
        lines.append(
            f"\n[{idx}] scope={hit['scope']} collection={hit['collection']} "
            f"source={source} mongo={mongo_collection} score={hit['score']:.2f}"
        )
        lines.append(hit["document"])

    lines.append("--- END KNOWLEDGE BASE CONTEXT ---")
    return "\n".join(lines)
