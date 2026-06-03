"""Knowledge scopes exposed to agents.

Scopes are domain concepts. They intentionally hide the current physical
Mongo/Chroma layout so storage can evolve without changing agent prompts.
"""

from __future__ import annotations

from typing import Dict, List


SCOPE_TO_CHROMA_COLLECTIONS: Dict[str, List[str]] = {
    "narrative": ["chapters"],
    "chapters": ["chapters"],
    "chapter_summaries": ["chapters"],
    "scenes": ["chapters"],
    "characters": ["characters"],
    "character_voice": ["characters", "book_style_guide"],
    "world": ["world_system"],
    "entities": ["world_system"],
    "locations": ["world_system"],
    "organizations": ["world_system"],
    "objects": ["world_system"],
    "timeline": ["world_system"],
    "plot": ["world_system", "chapters"],
    "continuity": ["world_system", "chapters", "characters"],
    "style": ["book_style_guide"],
    "assets": ["world_system", "book_style_guide"],
    "artifacts": ["world_system", "chapters", "characters"],
    "research": ["world_system"],
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
