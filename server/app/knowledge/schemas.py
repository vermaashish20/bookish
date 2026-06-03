"""Typed contracts for Knowledge Base retrieval."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict


class KnowledgeHit(TypedDict):
    id: str
    scope: str
    collection: str
    document: str
    metadata: Dict[str, Any]
    score: float


class KnowledgeSearchResult(TypedDict):
    query: str
    scopes: List[str]
    intent: str
    results: List[KnowledgeHit]
    relevance: float
    coverage: str
    missing: List[str]
    shouldRetrieveAgain: bool
    suggestedQuery: Optional[str]


class RetrievalLog(TypedDict, total=False):
    projectId: str
    runId: Optional[str]
    agent: Optional[str]
    task: Optional[str]
    toolName: str
    scopes: List[str]
    query: str
    intent: str
    resultIds: List[str]
    scores: List[float]
    relevance: float
    coverage: str
    shouldRetrieveAgain: bool
    createdAt: str
