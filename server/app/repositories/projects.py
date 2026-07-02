from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor
from bson import ObjectId
from app.infrastructure.database.mongo import get_db
from app.infrastructure.vector.store import delete_project_vectors

from app.repositories.assets import get_project_assets, get_project_brief
from app.repositories.chapters import get_project_chapters, get_chapter_summaries
from app.repositories.characters import get_project_characters
from app.repositories.entities import get_project_entities
from app.repositories.artifacts import get_project_artifacts


def _format_character_for_memory(character: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": character.get("_id") or character.get("id"),
        "name": character.get("name", "Unnamed Character"),
        "role": character.get("role", ""),
        "arc": character.get("arc", ""),
        "activeChapters": character.get("activeChapters", []),
        "attributes": character.get("attributes", {}),
        "status": character.get("status", "draft"),
    }


def _format_entity_for_memory(entity: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": entity.get("_id") or entity.get("id"),
        "name": entity.get("name", "Unnamed Entity"),
        "type": entity.get("type", "concept"),
        "description": entity.get("description", ""),
        "attributes": entity.get("attributes", {}),
        "status": entity.get("status", "draft"),
    }


def build_project_memory_payload(project: Dict[str, Any], characters: List[Dict[str, Any]], entities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Structured memory block for the workspace Memory tab."""
    return {
        "projectVoice": {
            "genre": project.get("genre", ""),
            "tonality": project.get("tonality", "Conversational"),
            "bookSummary": project.get("bookSummary", ""),
            "readerProfile": project.get("readerProfile", ""),
            "targetWordCount": project.get("targetWordCount"),
            "forbiddenPhrases": project.get("forbiddenPhrases", []),
        },
        "characters": [_format_character_for_memory(c) for c in characters],
        "worldEntities": [_format_entity_for_memory(e) for e in entities],
    }


DEFAULT_PROJECT_SETTINGS: Dict[str, Any] = {
    "plannerModel": {"provider": "Nvidia", "modelName": "mistralai/mistral-large-3-675b-instruct-2512"},
    "writerModel": {"provider": "Nvidia", "modelName": "mistralai/mistral-large-3-675b-instruct-2512"},
    "worldBuilderModel": {"provider": "Nvidia", "modelName": "mistralai/mistral-large-3-675b-instruct-2512"},
}


def get_project_settings(project_id: str) -> Dict[str, Any]:
    db = get_db()
    project = db.projects.find_one({"_id": project_id}, {"settings": 1})
    if not project:
        return {}
    return project.get("settings", {})


def update_project_settings(project_id: str, settings: Dict[str, Any]) -> None:
    db = get_db()
    db.projects.update_one(
        {"_id": project_id},
        {"$set": {"settings": settings}},
    )


def _shell_memory(project: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "projectVoice": {
            "genre": project.get("genre", ""),
            "tonality": project.get("tonality", "Conversational"),
            "bookSummary": project.get("bookSummary", ""),
            "readerProfile": project.get("readerProfile", ""),
            "targetWordCount": project.get("targetWordCount"),
            "forbiddenPhrases": project.get("forbiddenPhrases", []),
        },
        "characters": [],
        "worldEntities": [],
    }


def get_project_shell(
    project_id: str,
    project: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Minimal project record for workspace open (header + agent shell).
    One Mongo read — no chapters, assets, characters, or artifacts.
    """
    p = project or get_project(project_id)
    if not p:
        return None
    return {
        "id": p["_id"],
        "title": p["title"],
        "subtitle": p.get("subtitle", ""),
        "genre": p.get("genre", ""),
        "tonality": p.get("tonality", "Conversational"),
        "readerProfile": p.get("readerProfile", ""),
        "targetWordCount": p.get("targetWordCount"),
        "bookSummary": p.get("bookSummary", ""),
        "status": "Planning",
        "createdAt": p["createdAt"],
        "brief": "",
        "chapters": [],
        "assets": [],
        "artifacts": [],
        "settings": p.get("settings", {}),
        "memory": _shell_memory(p),
    }


def get_project_book_section(project_id: str) -> Dict[str, Any]:
    """Chapter summaries for the Book tab (no manuscript bodies)."""
    chapters = get_chapter_summaries(project_id)
    has_published = any(c.get("status") in {"published", "completed"} for c in chapters)
    return {
        "chapters": chapters,
        "status": "Reviewing" if has_published else "Planning",
    }


def get_project_memory_section(
    project_id: str,
    project: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Sources + canon for the Memory tab."""
    p = project or get_project(project_id)
    if not p:
        return {}

    def load_characters():
        return get_project_characters(project_id)

    def load_entities():
        return get_project_entities(project_id)

    def load_assets():
        return get_project_assets(project_id, include_content=False)

    def load_brief():
        return get_project_brief(project_id)

    with ThreadPoolExecutor(max_workers=4) as pool:
        characters = pool.submit(load_characters).result()
        entities = pool.submit(load_entities).result()
        assets = pool.submit(load_assets).result()
        brief = pool.submit(load_brief).result()

    return {
        "brief": brief,
        "assets": assets,
        "memory": build_project_memory_payload(p, characters, entities),
    }


def _build_project_payload(
    project: Dict[str, Any],
    *,
    chapters: List[Dict[str, Any]],
    characters: List[Dict[str, Any]],
    entities: List[Dict[str, Any]],
    assets: List[Dict[str, Any]],
    artifacts: List[Dict[str, Any]],
    brief: str,
) -> Dict[str, Any]:
    has_published = any(c.get("status") in {"published", "completed"} for c in chapters)
    return {
        "id": project["_id"],
        "title": project["title"],
        "subtitle": project.get("subtitle", ""),
        "genre": project.get("genre", ""),
        "brief": brief,
        "tonality": project["tonality"],
        "readerProfile": project.get("readerProfile", ""),
        "targetWordCount": project.get("targetWordCount"),
        "status": "Reviewing" if has_published else "Planning",
        "createdAt": project["createdAt"],
        "bookSummary": project.get("bookSummary", ""),
        "chapters": chapters,
        "assets": assets,
        "artifacts": artifacts,
        "settings": project.get("settings", {}),
        "memory": build_project_memory_payload(project, characters, entities),
    }


def _load_project_related(
    project_id: str,
    *,
    include_chapter_content: bool,
    include_asset_content: bool,
) -> Dict[str, Any]:
    def load_chapters():
        if include_chapter_content:
            return get_project_chapters(project_id)
        return get_chapter_summaries(project_id)

    def load_characters():
        return get_project_characters(project_id)

    def load_entities():
        return get_project_entities(project_id)

    def load_assets():
        return get_project_assets(project_id, include_content=include_asset_content)

    def load_artifacts():
        return get_project_artifacts(project_id, include_content=False)

    def load_brief():
        if include_asset_content:
            assets = get_project_assets(project_id, include_content=True)
            return assets[0]["content"] if assets else ""
        return get_project_brief(project_id)

    with ThreadPoolExecutor(max_workers=5) as pool:
        chapters_f = pool.submit(load_chapters)
        characters_f = pool.submit(load_characters)
        entities_f = pool.submit(load_entities)
        assets_f = pool.submit(load_assets)
        artifacts_f = pool.submit(load_artifacts)
        brief_f = pool.submit(load_brief)
        return {
            "chapters": chapters_f.result(),
            "characters": characters_f.result(),
            "entities": entities_f.result(),
            "assets": assets_f.result(),
            "artifacts": artifacts_f.result(),
            "brief": brief_f.result(),
        }


def get_workspace_project_payload(
    project_id: str,
    project: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Fast workspace shell payload — chapter summaries and asset metadata only.
    Full bodies are loaded on demand via chapter/asset detail endpoints.
    """
    p = project or get_project(project_id)
    if not p:
        return None

    related = _load_project_related(
        project_id,
        include_chapter_content=False,
        include_asset_content=False,
    )
    return _build_project_payload(p, **related)


def get_unified_project_payload(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Full project payload including chapter and asset bodies.
    Used after mutations that need a complete client refresh.
    """
    p = get_project(project_id)
    if not p:
        return None

    related = _load_project_related(
        project_id,
        include_chapter_content=True,
        include_asset_content=True,
    )
    return _build_project_payload(p, **related)


def list_project_summaries(user_id: str) -> List[Dict[str, Any]]:
    """
    Batch-fetch lightweight project rows for list views.
    Uses three Mongo round-trips regardless of project count.
    """
    db = get_db()
    projects = list(
        db.projects.find(
            {"userId": user_id},
            {
                "title": 1,
                "subtitle": 1,
                "genre": 1,
                "tonality": 1,
                "createdAt": 1,
            },
        ).sort("createdAt", -1)
    )
    if not projects:
        return []

    project_ids = [p["_id"] for p in projects]

    chapter_stats: Dict[str, Dict[str, int]] = {}
    for row in db.chapters.aggregate(
        [
            {"$match": {"projectId": {"$in": project_ids}}},
            {
                "$group": {
                    "_id": "$projectId",
                    "chapterCount": {"$sum": 1},
                    "publishedChapterCount": {
                        "$sum": {
                            "$cond": [
                                {"$in": ["$status", ["published", "completed"]]},
                                1,
                                0,
                            ]
                        }
                    },
                }
            },
        ]
    ):
        chapter_stats[row["_id"]] = row

    asset_stats: Dict[str, Dict[str, Any]] = {}
    for row in db.user_assets.aggregate(
        [
            {"$match": {"projectId": {"$in": project_ids}}},
            {"$sort": {"addedAt": 1}},
            {
                "$group": {
                    "_id": "$projectId",
                    "assetCount": {"$sum": 1},
                    "brief": {"$first": "$content"},
                }
            },
        ]
    ):
        asset_stats[row["_id"]] = row

    result: List[Dict[str, Any]] = []
    for p in projects:
        pid = p["_id"]
        chapters = chapter_stats.get(pid, {})
        assets = asset_stats.get(pid, {})
        published = chapters.get("publishedChapterCount", 0)
        result.append(
            {
                "id": pid,
                "title": p["title"],
                "subtitle": p.get("subtitle", ""),
                "genre": p.get("genre", ""),
                "brief": str(assets.get("brief") or ""),
                "tonality": p.get("tonality", "Conversational"),
                "status": "Reviewing" if published else "Ready",
                "createdAt": p["createdAt"],
                "assets": [],
                "assetCount": assets.get("assetCount", 0),
                "chapterCount": chapters.get("chapterCount", 0),
                "publishedChapterCount": published,
            }
        )
    return result


def get_project_summary(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Lightweight project summary for list views.
    Only fetches essential metadata — no chapter content, no characters.
    """
    db = get_db()
    p = db.projects.find_one({"_id": project_id})
    if not p:
        return None

    asset_count = db.user_assets.count_documents({"projectId": project_id})
    chapter_count = db.chapters.count_documents({"projectId": project_id})
    published_chapter_count = db.chapters.count_documents(
        {"projectId": project_id, "status": {"$in": ["published", "completed"]}}
    )
    first_asset = db.user_assets.find_one(
        {"projectId": project_id},
        sort=[("addedAt", 1)],
    )
    brief = first_asset.get("content", "") if first_asset else ""

    assets = list(db.user_assets.find(
        {"projectId": project_id},
        {"_id": 1, "name": 1, "type": 1, "size": 1, "addedAt": 1},
    ).sort("addedAt", -1))

    formatted_assets = [
        {
            "id":      str(a["_id"]),
            "name":    a.get("name", ""),
            "type":    a.get("type", ""),
            "size":    a.get("size", ""),
            "addedAt": a.get("addedAt", ""),
        }
        for a in assets
    ]

    return {
        "id":         p["_id"],
        "title":      p["title"],
        "subtitle":   p.get("subtitle", ""),
        "genre":      p.get("genre", ""),
        "brief":      brief,
        "tonality":   p.get("tonality", "Conversational"),
        "status":     "Ready",
        "createdAt":  p["createdAt"],
        "assets":     formatted_assets,
        "assetCount": asset_count,
        "chapterCount": chapter_count,
        "publishedChapterCount": published_chapter_count,
    }


def create_project(
    title: str,
    subtitle: str,
    genre: str,
    tonality: str,
    created_at: str,
    settings: Dict[str, Any],
    user_id: str = "",
) -> str:
    db = get_db()
    project_id = f"project_{ObjectId()}"
    db.projects.insert_one({
        "_id":        project_id,
        "userId":     user_id,
        "title":      title,
        "subtitle":   subtitle,
        "genre":      genre,
        "tonality":   tonality,
        "createdAt":  created_at,
        "bookSummary": "",
        "settings":   settings,
    })
    return project_id


def delete_project(project_id: str) -> None:
    """Hard-delete a project and all related documents."""
    db = get_db()
    db.projects.delete_one({"_id": project_id})
    db.chapters.delete_many({"projectId": project_id})
    db.user_assets.delete_many({"projectId": project_id})
    db.character_bible.delete_many({"projectId": project_id})
    db.entity_bible.delete_many({"projectId": project_id})
    db.agent_runs.delete_many({"projectId": project_id})
    db.artifacts.delete_many({"projectId": project_id})
    db.chat_messages.delete_many({"projectId": project_id})
    delete_project_vectors(project_id)


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    return db.projects.find_one({"_id": project_id})


def get_all_projects(user_id: str = "") -> List[Dict[str, Any]]:
    db = get_db()
    query: Dict[str, Any] = {"userId": user_id} if user_id else {}
    return list(db.projects.find(query).sort("createdAt", -1))


def get_book_summary(project_id: str) -> str:
    """Return the rolling book summary stored on the project document."""
    db = get_db()
    project = db.projects.find_one({"_id": project_id}, {"bookSummary": 1})
    if not project:
        return ""
    return project.get("bookSummary", "")


def update_book_summary(project_id: str, summary: str) -> None:
    """
    Persist the rolling book summary (≤ ~400 words) back to the project document.
    Called by the editor node after every chapter is published.
    """
    db = get_db()
    db.projects.update_one(
        {"_id": project_id},
        {"$set": {"bookSummary": summary}},
    )
