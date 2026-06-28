"""Knowledge scopes exposed to agents.

Scopes are domain concepts. They intentionally hide the current physical
Mongo/Chroma layout so storage can evolve without changing agent prompts.
"""

from __future__ import annotations

from typing import Dict, List

from app.config import PROJECT_KNOWLEDGE_COLLECTION


SCOPE_TO_CHROMA_COLLECTIONS: Dict[str, List[str]] = {
    "narrative": [PROJECT_KNOWLEDGE_COLLECTION],
    "chapters": [PROJECT_KNOWLEDGE_COLLECTION],
    "chapter_summaries": [PROJECT_KNOWLEDGE_COLLECTION],
    "scenes": [PROJECT_KNOWLEDGE_COLLECTION],
    "characters": [PROJECT_KNOWLEDGE_COLLECTION],
    "character_voice": [PROJECT_KNOWLEDGE_COLLECTION],
    "world": [PROJECT_KNOWLEDGE_COLLECTION],
    "entities": [PROJECT_KNOWLEDGE_COLLECTION],
    "locations": [PROJECT_KNOWLEDGE_COLLECTION],
    "organizations": [PROJECT_KNOWLEDGE_COLLECTION],
    "objects": [PROJECT_KNOWLEDGE_COLLECTION],
    "timeline": [PROJECT_KNOWLEDGE_COLLECTION],
    "plot": [PROJECT_KNOWLEDGE_COLLECTION],
    "continuity": [PROJECT_KNOWLEDGE_COLLECTION],
    "style": [PROJECT_KNOWLEDGE_COLLECTION],
    "assets": [PROJECT_KNOWLEDGE_COLLECTION],
    "artifacts": [PROJECT_KNOWLEDGE_COLLECTION],
    "research": [PROJECT_KNOWLEDGE_COLLECTION],
    "callbacks": [PROJECT_KNOWLEDGE_COLLECTION],
}

SCOPE_TO_SOURCE_KINDS: Dict[str, List[str]] = {
    "narrative": ["chapter"],
    "chapters": ["chapter"],
    "chapter_summaries": ["chapter"],
    "scenes": ["chapter"],
    "characters": ["character", "asset"],
    "character_voice": ["character", "asset", "chapter"],
    "world": ["world", "asset"],
    "entities": ["world"],
    "locations": ["world", "asset"],
    "organizations": ["world", "asset"],
    "objects": ["world", "asset"],
    "timeline": ["world", "chapter", "asset"],
    "plot": ["chapter", "asset", "artifact"],
    "continuity": ["chapter", "character", "world", "asset", "artifact", "callback"],
    "style": ["asset", "artifact"],
    "assets": ["asset"],
    "artifacts": ["artifact"],
    "research": ["artifact", "asset"],
    "callbacks": ["callback", "chapter", "artifact"],
}

DEFAULT_SCOPES = ["narrative", "characters", "world", "continuity", "style"]


def normalize_scopes(scopes: object) -> List[str]:
    if not scopes:
        return DEFAULT_SCOPES
    if isinstance(scopes, str):
        raw_scopes = [scopes]
    elif isinstance(scopes, list):
        raw_scopes = [str(scope) for scope in scopes]
    else:
        raw_scopes = [str(scopes)]

    normalized = []
    for scope in raw_scopes:
        key = scope.strip().lower().replace("-", "_").replace(" ", "_")
        if key in SCOPE_TO_CHROMA_COLLECTIONS and key not in normalized:
            normalized.append(key)
    return normalized or DEFAULT_SCOPES


def collections_for_scopes(scopes: List[str]) -> List[str]:
    collections: List[str] = []
    for scope in scopes:
        for collection in SCOPE_TO_CHROMA_COLLECTIONS.get(scope, []):
            if collection not in collections:
                collections.append(collection)
    return collections


def source_kinds_for_scopes(scopes: List[str]) -> List[str]:
    source_kinds: List[str] = []
    for scope in scopes:
        for source_kind in SCOPE_TO_SOURCE_KINDS.get(scope, []):
            if source_kind not in source_kinds:
                source_kinds.append(source_kind)
    return source_kinds


def metadata_filter_for_scopes(scopes: List[str]) -> Dict[str, object]:
    source_kinds = source_kinds_for_scopes(scopes)
    if not source_kinds:
        return {}
    if len(source_kinds) == 1:
        return {"sourceKind": source_kinds[0]}
    return {"sourceKind": {"$in": source_kinds}}
