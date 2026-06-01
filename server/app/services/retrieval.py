"""
Agent-facing retrieval — semantic search over Chroma collections.
"""
from typing import List

from app.infrastructure.vector.store import query_documents


def agentic_retrieve(
    project_id: str,
    queries: List[str],
    collection: str,
    limit: int = 5,
) -> str:
    """
    Run one or more semantic queries against a Chroma collection.
    Deduplicates by document id and formats context for the LLM.
    """
    all_results = []
    seen_ids: set[str] = set()

    for query in queries:
        q = (query or "").strip() if isinstance(query, str) else str(query).strip()
        if not q:
            continue
        for r in query_documents(collection, q, project_id, limit=limit):
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                all_results.append(r)

    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    cap = limit * max(len(queries), 1)
    final_results = all_results[:cap]

    if not final_results:
        return f"No context found in {collection} for queries: {', '.join(str(q) for q in queries)}."

    formatted = f"--- DATABASE CONTEXT: {collection.upper()} ---\n"
    formatted += f"Found {len(final_results)} unique results.\n\n"

    for idx, r in enumerate(final_results, 1):
        source_name = r["metadata"].get("sourceName", f"Document_{idx}")
        formatted += f"[{idx}] Source: {source_name} (score: {r.get('score', 0):.2f})\n"
        formatted += f"{r['document']}\n\n"

    formatted += "--- END DATABASE CONTEXT ---\n"
    return formatted
