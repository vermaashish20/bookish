"""Agent-facing Knowledge Base tools.

These are business-level tools. Agents call these instead of raw Mongo/Chroma.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.infrastructure.database.mongo import get_db
from app.knowledge.service import format_knowledge_result, search_knowledge


def _coerce_query(args: Dict[str, Any]) -> str:
    query = args.get("query")
    if query:
        return str(query)
    return ""


def _coerce_limit(args: Dict[str, Any], default: int = 5) -> int:
    try:
        return max(1, min(int(args.get("maxResults") or args.get("limit") or default), 10))
    except (TypeError, ValueError):
        return default


def _coerce_max_chars(value: object, default: int = 8000) -> int:
    try:
        return max(500, min(int(value or default), 20000))
    except (TypeError, ValueError):
        return default


def _format_doc(title: str, doc: Optional[Dict[str, Any]], fields: List[str]) -> str:
    if not doc:
        return f"[{title}] Not found."
    lines = [f"--- {title} (PERSISTENT MONGO READ) ---"]
    lines.append("Storage: Mongo source-of-truth record.")
    for field in fields:
        value = doc.get(field)
        if value not in (None, "", [], {}):
            lines.append(f"{field}: {value}")
    lines.append(f"id: {doc.get('_id') or doc.get('id')}")
    lines.append(f"--- END {title} ---")
    return "\n".join(lines)


def _format_list(title: str, docs: List[Dict[str, Any]], fields: List[str]) -> str:
    if not docs:
        return f"[{title}] No records found."
    lines = [
        f"--- {title} LIST (PERSISTENT MONGO READ) ---",
        "Storage: Mongo source-of-truth records. Use read_* tools for full record content.",
    ]
    for idx, doc in enumerate(docs, 1):
        item_lines = [f"[{idx}] id: {doc.get('_id') or doc.get('id')}"]
        for field in fields:
            value = doc.get(field)
            if value not in (None, "", [], {}):
                item_lines.append(f"{field}: {value}")
        lines.append("\n".join(item_lines))
    lines.append(f"--- END {title} LIST ---")
    return "\n\n".join(lines)


def _search(
    *,
    project_id: str,
    args: Dict[str, Any],
    default_scopes: List[str],
    run_id: Optional[str],
    agent: Optional[str],
    task: Optional[str],
    intent: str,
) -> str:
    result = search_knowledge(
        project_id=project_id,
        query=_coerce_query(args),
        scopes=args.get("scopes") or default_scopes,
        intent=args.get("intent") or intent,
        max_results=_coerce_limit(args),
        run_id=run_id,
        agent=agent,
        task=task,
    )
    return format_knowledge_result(result)


def list_chapters(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    limit = _coerce_limit(args, 10)
    chapters = list(
        db.chapters.find(
            {"projectId": project_id},
            {"_id": 1, "number": 1, "title": 1, "status": 1, "summary": 1, "wordCount": 1},
        ).sort("number", 1).limit(limit)
    )
    return _format_list(
        "CHAPTERS",
        chapters,
        ["number", "title", "status", "summary", "wordCount"],
    )


def read_chapter(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    query: Dict[str, Any] = {"projectId": project_id}
    chapter_id = args.get("chapter_id") or args.get("chapterId")
    chapter_number = args.get("chapter_number") or args.get("number")
    if chapter_id:
        query["_id"] = str(chapter_id)
    elif chapter_number is not None:
        query["number"] = int(chapter_number)
    else:
        return "[read_chapter] Error: provide chapter_id or chapter_number."

    max_chars = _coerce_max_chars(args.get("max_chars"), 8000)
    doc = db.chapters.find_one(query)
    if not doc:
        return "[read_chapter] Chapter not found."
    content = doc.get("content") or ""
    if len(content) > max_chars:
        content = content[:max_chars] + "\n...(truncated)"
    return _format_doc(
        "CHAPTER",
        {**doc, "content": content},
        ["number", "title", "status", "summary", "content"],
    )


def list_characters(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    limit = _coerce_limit(args, 10)
    characters = list(
        db.character_bible.find(
            {"projectId": project_id},
            {"_id": 1, "name": 1, "role": 1, "arc": 1, "status": 1},
        ).sort("name", 1).limit(limit)
    )
    return _format_list("CHARACTERS", characters, ["name", "role", "arc", "status"])


def read_character(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    char_id = args.get("character_id") or args.get("characterId") or args.get("id")
    name = args.get("name")
    query: Dict[str, Any] = {"projectId": project_id}
    if char_id:
        query["_id"] = str(char_id)
    elif name:
        query["name"] = {"$regex": f"^{str(name)}$", "$options": "i"}
    else:
        return "[read_character] Error: provide character_id or name."
    return _format_doc(
        "CHARACTER",
        db.character_bible.find_one(query),
        ["name", "role", "arc", "activeChapters", "attributes", "status"],
    )


def list_world_entities(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    limit = _coerce_limit(args, 10)
    entity_type = args.get("type") or args.get("entity_type") or args.get("entityType")
    query: Dict[str, Any] = {"projectId": project_id}
    if entity_type:
        query["type"] = str(entity_type)
    entities = list(
        db.entity_bible.find(
            query,
            {"_id": 1, "name": 1, "type": 1, "description": 1, "status": 1},
        ).sort("name", 1).limit(limit)
    )
    return _format_list("WORLD ENTITIES", entities, ["name", "type", "description", "status"])


def read_world_entity(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    entity_id = args.get("entity_id") or args.get("entityId") or args.get("id")
    name = args.get("name")
    query: Dict[str, Any] = {"projectId": project_id}
    if entity_id:
        query["_id"] = str(entity_id)
    elif name:
        query["name"] = {"$regex": f"^{str(name)}$", "$options": "i"}
    else:
        return "[read_world_entity] Error: provide entity_id or name."
    return _format_doc(
        "WORLD ENTITY",
        db.entity_bible.find_one(query),
        ["name", "type", "description", "attributes", "status"],
    )


def read_formal_memory(project_id: str, args: Dict[str, Any]) -> str:
    """Read promoted character and world bible records from persistent Mongo."""
    db = get_db()
    limit = _coerce_limit(args, 10)
    characters = list(
        db.character_bible.find(
            {"projectId": project_id},
            {"_id": 1, "name": 1, "role": 1, "arc": 1, "attributes": 1, "status": 1},
        ).sort("name", 1).limit(limit)
    )
    entities = list(
        db.entity_bible.find(
            {"projectId": project_id},
            {"_id": 1, "name": 1, "type": 1, "description": 1, "attributes": 1, "status": 1},
        ).sort("name", 1).limit(limit)
    )
    lines = [
        "--- FORMAL MEMORY (PERSISTENT MONGO READ) ---",
        "Storage: Mongo character_bible and entity_bible. These are promoted canon records only.",
        "",
        _format_list("CHARACTERS", characters, ["name", "role", "arc", "attributes", "status"]),
        "",
        _format_list("WORLD ENTITIES", entities, ["name", "type", "description", "attributes", "status"]),
        "--- END FORMAL MEMORY ---",
    ]
    return "\n".join(lines)


def list_user_assets(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    limit = _coerce_limit(args, 10)
    assets = list(
        db.user_assets.find(
            {"projectId": project_id},
            {"_id": 1, "name": 1, "type": 1, "size": 1, "addedAt": 1, "content": 1},
        ).sort("addedAt", 1).limit(limit)
    )
    if not assets:
        return "[list_user_assets] No user assets are attached to this project."

    lines = [
        "--- USER ASSETS LIST (PERSISTENT MONGO READ) ---",
        "Storage: Mongo user_assets. Use read_project_sources/read_user_asset for exact contents.",
    ]
    for idx, asset in enumerate(assets, 1):
        content = (asset.get("content") or "").strip()
        preview = content[:350] + ("..." if len(content) > 350 else "")
        lines.append(
            f"[{idx}] id: {asset.get('_id')}\n"
            f"name: {asset.get('name', '')}\n"
            f"type: {asset.get('type', '')}\n"
            f"size: {asset.get('size', '')}\n"
            f"addedAt: {asset.get('addedAt', '')}\n"
            f"preview: {preview}"
        )
    lines.append("--- END USER ASSETS LIST ---")
    return "\n\n".join(lines)


def read_user_asset(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    asset_id = args.get("asset_id") or args.get("assetId") or args.get("id")
    name = args.get("name")
    query: Dict[str, Any] = {"projectId": project_id}
    if asset_id:
        query["_id"] = str(asset_id)
    elif name:
        query["name"] = {"$regex": f"^{str(name)}$", "$options": "i"}
    else:
        return "[read_user_asset] Error: provide asset_id or name."

    max_chars = _coerce_max_chars(args.get("max_chars"), 12000)
    doc = db.user_assets.find_one(query)
    if not doc:
        return "[read_user_asset] User asset not found."
    content = doc.get("content") or ""
    if len(content) > max_chars:
        content = content[:max_chars] + "\n...(truncated)"
    return _format_doc(
        "USER ASSET",
        {**doc, "content": content},
        ["name", "type", "size", "addedAt", "content"],
    )


def read_project_sources(project_id: str, args: Dict[str, Any]) -> str:
    """Read source assets from persistent Mongo for source-of-truth grounding."""
    db = get_db()
    limit = _coerce_limit(args, 5)
    max_chars_per_asset = _coerce_max_chars(args.get("max_chars_per_asset"), 8000)
    total_budget = _coerce_max_chars(args.get("max_chars") or args.get("total_max_chars"), 20000)
    names = args.get("names")
    asset_ids = args.get("asset_ids") or args.get("assetIds")

    query: Dict[str, Any] = {"projectId": project_id}
    if asset_ids:
        ids = asset_ids if isinstance(asset_ids, list) else [asset_ids]
        query["_id"] = {"$in": [str(asset_id) for asset_id in ids]}
    elif names:
        raw_names = names if isinstance(names, list) else [names]
        query["name"] = {
            "$in": [str(name) for name in raw_names],
        }

    assets = list(
        db.user_assets.find(
            query,
            {"_id": 1, "name": 1, "type": 1, "size": 1, "addedAt": 1, "content": 1},
        ).sort("addedAt", 1).limit(limit)
    )
    if not assets:
        return "[read_project_sources] No matching source assets are attached to this project."

    lines = [
        "--- PROJECT SOURCE ASSETS (PERSISTENT READ) ---",
        "Source: Mongo user_assets. Use this for exact user-provided brief, plot, character, outline, and rule text.",
    ]
    used_chars = 0
    for idx, asset in enumerate(assets, 1):
        content = (asset.get("content") or "").strip()
        remaining = max(0, total_budget - used_chars)
        if remaining <= 0:
            lines.append("[truncated: total source read budget reached]")
            break
        allowed = min(max_chars_per_asset, remaining)
        clipped = content[:allowed]
        if len(content) > allowed:
            clipped += "\n...(truncated)"
        used_chars += len(clipped)
        lines.append(
            f"\n[{idx}] id: {asset.get('_id')}\n"
            f"name: {asset.get('name', '')}\n"
            f"type: {asset.get('type', '')}\n"
            f"size: {asset.get('size', '')}\n"
            f"addedAt: {asset.get('addedAt', '')}\n"
            f"content:\n{clipped}"
        )
    lines.append("--- END PROJECT SOURCE ASSETS ---")
    return "\n".join(lines)


def list_artifacts(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    limit = _coerce_limit(args, 10)
    query: Dict[str, Any] = {"projectId": project_id}
    agent_name = args.get("agent") or args.get("agentName")
    artifact_type = args.get("artifact_type") or args.get("artifactType") or args.get("type")
    if agent_name:
        query["agentName"] = str(agent_name)
    if artifact_type:
        query["artifactType"] = str(artifact_type)
    artifacts = list(
        db.artifacts.find(
            query,
            {"_id": 1, "agentName": 1, "artifactType": 1, "metadata": 1, "createdAt": 1, "content": 1},
        ).sort("createdAt", -1).limit(limit)
    )
    for artifact in artifacts:
        content = (artifact.get("content") or "").strip()
        artifact["preview"] = content[:300] + ("..." if len(content) > 300 else "")
        artifact.pop("content", None)
    return _format_list(
        "ARTIFACTS",
        artifacts,
        ["agentName", "artifactType", "createdAt", "metadata", "preview"],
    )


def read_artifact(project_id: str, args: Dict[str, Any]) -> str:
    db = get_db()
    artifact_id = args.get("artifact_id") or args.get("artifactId") or args.get("id")
    if not artifact_id:
        return "[read_artifact] Error: provide artifact_id."
    max_chars = _coerce_max_chars(args.get("max_chars"), 12000)
    doc = db.artifacts.find_one({"_id": str(artifact_id), "projectId": project_id})
    if not doc:
        return "[read_artifact] Artifact not found."
    content = doc.get("content") or ""
    if len(content) > max_chars:
        content = content[:max_chars] + "\n...(truncated)"
    return _format_doc(
        "ARTIFACT",
        {**doc, "content": content},
        ["agentName", "artifactType", "createdAt", "metadata", "relatedChapterId", "content"],
    )


def retrieve_knowledge(
    project_id: str,
    args: Dict[str, Any],
    *,
    run_id: Optional[str],
    agent: Optional[str],
    task: Optional[str],
) -> str:
    """Unified KB router for agents: persistent Mongo reads or RAG search."""
    mode = str(args.get("mode") or "").strip().lower()
    surface = str(args.get("surface") or args.get("scope") or "").strip().lower()
    operation = str(args.get("operation") or args.get("op") or "").strip().lower()

    if mode in {"rag", "semantic", "chroma", "search"}:
        scopes = args.get("scopes") or ([surface] if surface else None)
        return _search(
            project_id=project_id,
            args={**args, "scopes": scopes},
            default_scopes=["assets", "narrative", "characters", "world", "continuity", "style"],
            run_id=run_id,
            agent=agent,
            task=task,
            intent=args.get("intent") or "retrieve_knowledge_rag",
        )

    if mode not in {"persistent", "mongo", "exact", "source"}:
        return (
            "[retrieve_knowledge] Error: provide mode='persistent' for exact Mongo reads "
            "or mode='rag' for Chroma semantic search."
        )

    if surface in {"source_assets", "sources", "assets", "user_assets"}:
        if operation == "list":
            return list_user_assets(project_id, args)
        return read_project_sources(project_id, args)
    if surface in {"chapter", "chapters", "narrative"}:
        if operation == "list" or not (args.get("chapter_id") or args.get("chapterId") or args.get("chapter_number") or args.get("number")):
            return list_chapters(project_id, args)
        return read_chapter(project_id, args)
    if surface in {"character", "characters"}:
        if operation == "list" or not (args.get("character_id") or args.get("characterId") or args.get("id") or args.get("name")):
            return list_characters(project_id, args)
        return read_character(project_id, args)
    if surface in {"world", "entity", "entities", "world_entities"}:
        if operation == "list" or not (args.get("entity_id") or args.get("entityId") or args.get("id") or args.get("name")):
            return list_world_entities(project_id, args)
        return read_world_entity(project_id, args)
    if surface in {"formal_memory", "memory", "bible"}:
        return read_formal_memory(project_id, args)
    if surface in {"artifact", "artifacts"}:
        if operation == "list" or not (args.get("artifact_id") or args.get("artifactId") or args.get("id")):
            return list_artifacts(project_id, args)
        return read_artifact(project_id, args)

    return (
        "[retrieve_knowledge] Error: unknown persistent surface. Use one of: "
        "source_assets, chapters, characters, world, formal_memory, artifacts."
    )


def describe_knowledge_tools() -> str:
    return """
--- KNOWLEDGE TOOL CATALOG ---
Use the Knowledge Base layer, not raw databases.

1) Persistent Mongo exact reads
Use when you need source-of-truth records, whole documents, lists, ids, full chapter text, uploaded assets, formal bibles, or saved artifacts.
Preferred tool:
{"tool_call":"retrieve_knowledge","arguments":{"mode":"persistent","surface":"source_assets|chapters|characters|world|formal_memory|artifacts","operation":"list|read","maxResults":5,"max_chars":20000}}

Specialized persistent tools:
list_user_assets, read_project_sources, read_user_asset,
list_chapters, read_chapter,
list_characters, read_character,
list_world_entities, read_world_entity,
read_formal_memory,
list_artifacts, read_artifact

2) RAG / Chroma semantic search
Use when you need small relevant chunks, semantic lookup, or a targeted passage.
Preferred tool:
{"tool_call":"retrieve_knowledge","arguments":{"mode":"rag","query":"specific thing to find","scopes":["assets","narrative","characters","world","plot","continuity","style","artifacts"],"maxResults":5}}

Specialized RAG tools:
search_knowledge, search_assets, search_narrative, search_characters, search_world,
search_plot, search_continuity, search_style, search_artifacts

Rule: RAG is not the source of truth for whole records. If the user asks what exists in uploaded docs, chapters, or formal memory, use persistent mode first.
--- END KNOWLEDGE TOOL CATALOG ---
""".strip()


def execute_knowledge_tool(
    project_id: str,
    tool_name: str,
    args: Dict[str, Any],
    *,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
) -> str:
    """Execute an agent-facing KB tool and return formatted LLM context."""
    args = args or {}
    normalized = tool_name.strip()

    if normalized in {"describe_knowledge_tools", "knowledge_tool_catalog"}:
        return describe_knowledge_tools()

    if normalized == "retrieve_knowledge":
        return retrieve_knowledge(
            project_id,
            args,
            run_id=run_id,
            agent=agent,
            task=task,
        )

    if normalized == "search_knowledge":
        return _search(
            project_id=project_id,
            args=args,
            default_scopes=["assets", "narrative", "characters", "world", "continuity", "style"],
            run_id=run_id,
            agent=agent,
            task=task,
            intent="general_knowledge",
        )

    scope_tools = {
        "search_narrative": ["narrative"],
        "search_chapters": ["narrative"],
        "search_characters": ["characters"],
        "search_character_voice": ["character_voice"],
        "search_world": ["world"],
        "search_entities": ["entities"],
        "search_locations": ["locations"],
        "search_organizations": ["organizations"],
        "search_objects": ["objects"],
        "search_timeline": ["timeline"],
        "search_plot": ["plot"],
        "search_plot_threads": ["plot"],
        "search_continuity": ["continuity"],
        "search_style": ["style"],
        "search_assets": ["assets"],
        "search_artifacts": ["artifacts"],
    }
    if normalized in scope_tools:
        return _search(
            project_id=project_id,
            args=args,
            default_scopes=scope_tools[normalized],
            run_id=run_id,
            agent=agent,
            task=task,
            intent=normalized,
        )

    if normalized == "list_chapters":
        return list_chapters(project_id, args)
    if normalized == "read_chapter":
        return read_chapter(project_id, args)
    if normalized == "list_characters":
        return list_characters(project_id, args)
    if normalized == "read_character":
        return read_character(project_id, args)
    if normalized in {"list_world_entities", "list_entities"}:
        return list_world_entities(project_id, args)
    if normalized == "read_world_entity":
        return read_world_entity(project_id, args)
    if normalized == "read_formal_memory":
        return read_formal_memory(project_id, args)
    if normalized == "list_user_assets":
        return list_user_assets(project_id, args)
    if normalized == "read_user_asset":
        return read_user_asset(project_id, args)
    if normalized == "read_project_sources":
        return read_project_sources(project_id, args)
    if normalized == "list_artifacts":
        return list_artifacts(project_id, args)
    if normalized == "read_artifact":
        return read_artifact(project_id, args)
    if normalized == "read_scene":
        return "[read_scene] Scenes are not split into a dedicated collection yet. Use search_narrative or read_chapter."
    if normalized in {"read_plot_threads", "read_continuity_facts", "read_style_guide"}:
        scope = {
            "read_plot_threads": ["plot"],
            "read_continuity_facts": ["continuity"],
            "read_style_guide": ["style"],
        }[normalized]
        return _search(
            project_id=project_id,
            args=args,
            default_scopes=scope,
            run_id=run_id,
            agent=agent,
            task=task,
            intent=normalized,
        )
    if normalized == "search_web":
        query = _coerce_query(args)
        return f"[search_web] No live web search configured for '{query}'. Use Knowledge Base tools for project knowledge."

    return f"[Knowledge Tool: {tool_name}] Unknown tool."
