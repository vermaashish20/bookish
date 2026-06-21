"""LangGraph-native tools for Bookish agents.

Each @tool wrapper exposes full capability docs (docstring + Pydantic Field descriptions)
to the model at bind_tools time. Implementations delegate to app.knowledge.tools or sub-agents.

QA tools — RAG: search_project; Mongo: read_project; Memory: recall/remember.
Specialist tools (write_content, build_world) — invoked by the supervisor to delegate creative work.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, Field

try:
    from langchain.tools import tool
except ImportError:
    from langchain_core.tools import tool  # type: ignore[no-redef]

from langgraph.prebuilt import ToolRuntime

from app.agent.utils.context_schema import BookishContext, context_header
from app.knowledge.tools import execute_mongo_tool, execute_rag_tool


# ── RAG input schemas (Chroma semantic search) ────────────────────────────────

_SEARCH_SCOPES = (
    "assets — uploaded source files and briefs; "
    "narrative — chapter/scene text chunks; "
    "characters — character profiles and mentions; "
    "world — locations, factions, lore entities; "
    "continuity — plot threads and established facts; "
    "style — tone/voice references; "
    "artifacts — prior agent drafts and world-building outputs"
)


class SearchProjectInput(BaseModel):
    query: str = Field(
        description=(
            "Natural-language search query. Be specific (character name, place, event, theme). "
            "Returns relevant text chunks from the vector index — not full documents."
        ),
    )
    scopes: List[str] = Field(
        default_factory=lambda: ["assets", "narrative", "characters", "world", "continuity", "style"],
        description=f"Limit search to these knowledge areas. Options: {_SEARCH_SCOPES}",
    )
    max_results: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Number of matching chunks to return (1–10).",
    )


# ── Mongo input schemas (persistent exact reads) ──────────────────────────────

class ReadProjectInput(BaseModel):
    resource: Literal[
        "sources", "chapters", "characters", "world", "artifacts", "project", "formal_memory"
    ] = Field(
        description=(
            "Which Mongo collection to read (source of truth for full records). "
            "sources — uploaded user assets (briefs, outlines, reference docs); "
            "chapters — saved chapter drafts and full scene text; "
            "characters — character bible entries; "
            "world — locations, organizations, lore entities; "
            "artifacts — prior agent outputs (drafts, world-building notes); "
            "project — book metadata (title, genre, tonality); "
            "formal_memory — promoted canon from character_bible and entity_bible."
        ),
    )
    operation: Literal["list", "read"] = Field(
        default="list",
        description=(
            "list — return summaries/ids for all records in that resource (use first to discover ids). "
            "read — return one full record; requires id, number, or name depending on resource."
        ),
    )
    id: Optional[str] = Field(
        default=None,
        description="Mongo record id. Use for sources, characters, world, artifacts, or chapters.",
    )
    number: Optional[int] = Field(
        default=None,
        description="Chapter number (e.g. 2 for chapter 2). Use with resource='chapters' and operation='read'.",
    )
    name: Optional[str] = Field(
        default=None,
        description="Record name for sources, characters, or world entities when id is unknown.",
    )
    max_chars: int = Field(
        default=12000,
        ge=500,
        le=20000,
        description="Max characters returned for read operations (long chapters/sources may truncate).",
    )


# ── Memory input schemas (LangGraph store) ────────────────────────────────────

class RecallMemoryInput(BaseModel):
    query: str = Field(
        default="",
        description=(
            "Optional search text to filter memories. Leave empty to fetch recent items. "
            "Use for 'what did we decide', callbacks, or prior-session notes."
        ),
    )
    category: Literal["episodic", "callbacks", "narrative"] = Field(
        default="episodic",
        description=(
            "episodic — general session notes; "
            "callbacks — open threads and reminders to resolve later; "
            "narrative — rolling plot/state summary maintained across runs."
        ),
    )


class RememberNoteInput(BaseModel):
    content: str = Field(
        description="Short note to persist for future sessions (decision, callback, or user preference).",
    )
    category: Literal["callback", "note"] = Field(
        default="note",
        description="callback — open thread to revisit; note — general episodic memory.",
    )


# ── Specialist input schemas ──────────────────────────────────────────────────

class WriteContentInput(BaseModel):
    request: str = Field(
        description=(
            "Clear, self-contained writing task for the Writer sub-agent. "
            "Include chapter number, scene goal, revision scope, or polish instructions. "
            "The writer will search/read project canon first, then draft Markdown prose. "
            "User approval is required before changes are saved to chapters."
        ),
    )


class BuildWorldInput(BaseModel):
    request: str = Field(
        description=(
            "Clear, self-contained world-building task for the World Builder sub-agent. "
            "Describe characters, locations, factions, magic rules, or lore to create or extend. "
            "The sub-agent will verify existing canon before proposing additions. "
            "User approval is required before lore is committed to the project."
        ),
    )


def _resolve_tool_runtime(runtime: Optional[ToolRuntime] = None) -> Optional[ToolRuntime]:
    """Resolve ToolRuntime from injection or LangGraph config.

    Langfuse may log full ToolNode kwargs (including runtime) even when LangChain
    strips the arg before the Python function runs — use config as a fallback.
    """
    if runtime is not None:
        return runtime
    try:
        from langgraph.config import get_config

        pregel = (get_config().get("configurable") or {}).get("__pregel_runtime")
        if pregel is not None:
            return pregel
    except Exception:
        pass
    return None


def _bookish_context(runtime: Optional[ToolRuntime] = None) -> Tuple[Optional[ToolRuntime], Optional[BookishContext]]:
    resolved = _resolve_tool_runtime(runtime)
    ctx = getattr(resolved, "context", None) if resolved else None
    return resolved, ctx


# ── RAG tools (Chroma) ────────────────────────────────────────────────────────

@tool("search_project", args_schema=SearchProjectInput)
def search_project(
    query: str,
    scopes: Optional[List[str]] = None,
    max_results: int = 5,
    runtime: ToolRuntime = None,
) -> str:
    """Semantic (RAG) search over indexed project knowledge in Chroma.

    Use when you need to FIND relevant passages but not necessarily a whole document.
    Returns small text chunks with metadata — not the full Mongo record.

    When to use:
    - Locate where a character, place, or event is mentioned.
    - Find continuity details, tone references, or plot threads.
    - Discover which chapters/sources exist before a full read.

    When NOT enough alone:
    - User asks for a full chapter, complete source file, or exact record → follow up with read_project (Mongo).
    - User asks what exists in uploaded docs → read_project(resource='sources', operation='list') first.

    Pair with read_project: RAG to locate passages, Mongo to get source-of-truth full text."""
    runtime, ctx = _bookish_context(runtime)
    if not ctx:
        return "[search_project] Missing runtime context."
    if not str(query or "").strip():
        return (
            "[search_project] Query must be a non-empty search string "
            "(e.g. character name, place, plot thread)."
        )
    return execute_rag_tool(
        ctx.project_id,
        "search_project",
        {
            "query": query,
            "scopes": scopes or ["assets", "narrative", "characters", "world", "continuity", "style"],
            "maxResults": max_results,
        },
        run_id=ctx.agent_run_id or None,
        agent="agent",
    )


# ── Mongo tools (persistent reads) ────────────────────────────────────────────

@tool("read_project", args_schema=ReadProjectInput)
def read_project(
    resource: str,
    operation: str = "list",
    id: Optional[str] = None,
    number: Optional[int] = None,
    name: Optional[str] = None,
    max_chars: int = 12000,
    runtime: ToolRuntime = None,
) -> str:
    """Exact read from Mongo — source of truth for full project records (not RAG chunks).

    Pick resource + operation:

    sources — uploaded user assets (briefs, outlines, reference docs):
      list: asset names, ids, types | read: full text (id, name, or all sources)

    chapters — saved narrative:
      list: chapter numbers, titles, summaries | read: full chapter (number or id)

    characters — character bible:
      list: all entries | read: one profile (id or name)

    world — locations, factions, lore entities:
      list: all entities | read: one entry (id or name)

    artifacts — prior agent outputs (drafts, world-building notes):
      list: recent with previews | read: full content (id)

    project — book metadata (title, genre, tonality).

    formal_memory — promoted canon (character_bible + entity_bible records).

    Typical flow: operation='list' to discover ids, then operation='read'."""
    runtime, ctx = _bookish_context(runtime)
    if not ctx:
        return "[read_project] Missing runtime context."
    return execute_mongo_tool(
        ctx.project_id,
        "read_project",
        {
            "resource": resource,
            "operation": operation,
            "id": id,
            "number": number,
            "name": name,
            "max_chars": max_chars,
        },
        run_id=None,
        agent="agent",
    )


# ── Memory tools (LangGraph store) ────────────────────────────────────────────

@tool("recall_memory", args_schema=RecallMemoryInput)
def recall_memory(
    query: str = "",
    category: str = "episodic",
    runtime: ToolRuntime = None,
) -> str:
    """Recall cross-thread agentic memory from the LangGraph store (not Mongo/Chroma).

    Use alongside search_project/read_project for continuity questions:
    - episodic — notes from prior writing sessions
    - callbacks — open threads flagged for later (unresolved plot points, TODOs)
    - narrative — rolling plot/state summary updated after chapter writes

    Does not replace project reads — use for session decisions and reminders."""
    runtime, ctx = _bookish_context(runtime)
    if not ctx or runtime is None or runtime.store is None:
        return "No agentic memory store available."
    from app.agent.utils.memory import recall_memory_from_store
    return recall_memory_from_store(runtime.store, ctx.project_id, query=query, category=category)


@tool("remember_note", args_schema=RememberNoteInput)
def remember_note(
    content: str,
    category: str = "note",
    runtime: ToolRuntime = None,
) -> str:
    """Store a short note in the LangGraph memory store for future sessions.

    Use only when the user explicitly asks to remember something, or when saving
    an open callback/plot thread to revisit later.
    - note → general episodic memory
    - callback → flagged thread to resolve in a future session"""
    runtime, ctx = _bookish_context(runtime)
    if not ctx or runtime is None or runtime.store is None:
        return "No agentic memory store available."
    from app.agent.utils.memory import remember_note_in_store
    return remember_note_in_store(runtime.store, ctx.project_id, content=content, category=category)


# ── Specialist tools ──────────────────────────────────────────────────────────

_REVISION_RE = re.compile(
    r"\b(edit|revise|revision|rewrite|polish|update|proofread|copyedit)\b",
    re.IGNORECASE,
)
_CHAPTER_RE = re.compile(r"\bchapter\s+(\d+)\b", re.IGNORECASE)


def _is_approved(response: Any) -> bool:
    if isinstance(response, dict):
        value = response.get("approved", response.get("decision", response.get("response")))
    else:
        value = response
    return str(value).strip().lower() in {"approve", "approved", "yes", "y", "true", "continue"}


def _safe_preview(content: str, limit: int = 1200) -> str:
    return content[:limit] + ("..." if len(content) > limit else "")


@tool("write_content", args_schema=WriteContentInput)
def write_content(
    request: str,
    runtime: ToolRuntime = None,
) -> str:
    """Delegate narrative writing to the Writer sub-agent (supervisor only).

    Handles: new chapters/scenes, revisions, polish, proofreading.
    The writer uses search_project + read_project internally, then produces Markdown prose.
    Triggers human-in-the-loop approval before saving to chapters.
    Returns a status message — not the draft itself (draft becomes an artifact for review)."""
    from langgraph.config import get_config
    from langgraph.types import interrupt

    from app.agent.nodes.agent_runner import call_agent
    from app.agent.utils.memory import load_memory_brief, persist_episode, update_narrative_after_write
    from app.agent.utils.streaming import emit_custom
    from app.prompts.writer import PROMPT as WRITER_PROMPT
    from app.repositories.agent_runs import add_agent_execution, update_agent_execution
    from app.repositories.artifacts import create_artifact
    from app.repositories.chapters import add_chapter, get_project_chapters, update_chapter_content

    runtime, ctx = _bookish_context(runtime)
    if not ctx:
        return "[write_content] Missing runtime context."

    config = get_config()
    run_id = ctx.agent_run_id
    store = runtime.store if runtime else None

    emit_custom("task_started", runId=run_id, agent="writer", task={"agent": "writer", "task": request, "status": "running"})
    exec_idx = add_agent_execution(run_id=run_id, agent="writer", task_input=request, status="running")

    # Detect revision vs new chapter
    existing_chapters = get_project_chapters(ctx.project_id)
    target_chapter: Optional[Dict[str, Any]] = None
    ch_match = _CHAPTER_RE.search(request)
    if ch_match:
        number = int(ch_match.group(1))
        for ch in existing_chapters:
            if int(ch.get("number") or 0) == number:
                target_chapter = ch
                break
    if not target_chapter and _REVISION_RE.search(request) and len(existing_chapters) == 1:
        target_chapter = existing_chapters[0]
    revision = bool(target_chapter and (_REVISION_RE.search(request) or ch_match))

    memory_brief = load_memory_brief(store, ctx.project_id)
    user_prompt = (
        f"TASK:\n{request}\n\n"
        f"{context_header(ctx)}\n\n"
        f"MEMORY BRIEF:\n{memory_brief or 'No cross-thread memory loaded.'}\n\n"
        + ("Revise the existing chapter. Read it with read_project first, preserve plot events, and polish prose."
           if revision else
           "Write the requested content as Markdown. Target 500-1000 words for a scene or chapter.")
        + " Do not mention tools or internal workflow in the output."
    )

    draft = call_agent(
        ctx.project_id, "writerModel",
        fallback_keys=["plannerModel"],
        tools=[search_project, read_project],
        system_prompt=WRITER_PROMPT,
        user_prompt=user_prompt,
        config=config,
        context=ctx,
        store=store,
    )

    word_count = len(draft.split())
    artifact_type = "edited_content" if revision else "draft"
    artifact_id = create_artifact(
        project_id=ctx.project_id,
        agent_run_id=run_id,
        agent_name="writer",
        artifact_type=artifact_type,
        content=draft,
        metadata={"task": request, "wordCount": word_count, "revision": revision},
    )
    emit_custom(
        "artifact_created",
        runId=run_id,
        artifactId=artifact_id,
        agent="writer",
        artifactType=artifact_type,
        contentPreview=draft[:6000],
    )

    # Build pending write for HITL approval
    if revision and target_chapter:
        chapter_id = str(target_chapter.get("_id") or target_chapter.get("id") or "")
        pending_write: Dict[str, Any] = {
            "kind": "chapter_update",
            "agent": "writer",
            "task": request,
            "artifactId": artifact_id,
            "targetCollection": "chapters",
            "operation": "update",
            "targetId": chapter_id,
            "payload": {"chapterId": chapter_id, "content": draft, "wordCount": word_count, "status": "completed"},
            "preview": _safe_preview(draft),
            "status": "pending",
            "requestedAt": datetime.utcnow().isoformat(),
        }
    else:
        next_number = len(existing_chapters) + 1
        lines = draft.splitlines()
        first_line = lines[0].replace("#", "").replace("*", "").strip() if lines else ""
        title = first_line if first_line.lower().startswith("chapter") else f"Chapter {next_number}"
        pending_write = {
            "kind": "chapter_create",
            "agent": "writer",
            "task": request,
            "artifactId": artifact_id,
            "targetCollection": "chapters",
            "operation": "insert",
            "payload": {"number": next_number, "title": title, "content": draft, "wordCount": word_count, "status": "draft"},
            "preview": _safe_preview(draft),
            "status": "pending",
            "requestedAt": datetime.utcnow().isoformat(),
        }

    emit_custom("write_proposed", runId=run_id, projectId=ctx.project_id, pendingWrite=pending_write)
    response = interrupt({
        "kind": "write_approval",
        "runId": run_id,
        "projectId": ctx.project_id,
        "pendingWrite": pending_write,
        "prompt": "Approve this chapter write?",
    })

    committed_chapter_id = ""
    if _is_approved(response):
        payload = pending_write["payload"]
        if revision and target_chapter:
            committed_chapter_id = str(target_chapter.get("_id") or target_chapter.get("id") or "")
            update_chapter_content(
                chapter_id=committed_chapter_id,
                content=draft,
                word_count=word_count,
                status="completed",
            )
            update_narrative_after_write(store, ctx.project_id, kind="chapter_update", payload={**payload})
        else:
            committed_chapter_id = add_chapter(
                project_id=ctx.project_id,
                number=int(payload["number"]),
                title=str(payload["title"]),
                content=draft,
                word_count=word_count,
                status="draft",
            )
            update_narrative_after_write(
                store, ctx.project_id, kind="chapter_create",
                payload={**payload, "chapterId": committed_chapter_id, "id": committed_chapter_id},
            )
        emit_custom("chapter_upserted", runId=run_id, chapterId=committed_chapter_id)
        result_msg = f"Chapter saved ({word_count} words)."
    else:
        result_msg = "Write rejected by user. Draft preserved as artifact."

    update_agent_execution(run_id=run_id, execution_index=exec_idx, status="completed", output_artifact_id=artifact_id)
    emit_custom("task_completed", runId=run_id, agent="writer", task={"agent": "writer", "task": request, "status": "completed"})
    persist_episode(store, ctx.project_id, agent="writer", task=request, run_id=run_id)
    return result_msg


@tool("build_world", args_schema=BuildWorldInput)
def build_world(
    request: str,
    runtime: ToolRuntime = None,
) -> str:
    """Delegate world-building to the World Builder sub-agent (supervisor only).

    Handles: character profiles, locations, factions, magic systems, history, canon notes.
    Output is reference-style Markdown — not narrative chapters.
    The sub-agent verifies existing canon via search_project + read_project first.
    Triggers human-in-the-loop approval before lore is committed to the project.
    Returns a status message — not the notes themselves (notes become an artifact for review)."""
    from langgraph.config import get_config
    from langgraph.types import interrupt

    from app.agent.nodes.agent_runner import call_agent
    from app.agent.utils.memory import load_memory_brief, persist_episode
    from app.agent.utils.streaming import emit_custom
    from app.prompts.world_builder import PROMPT as WORLD_BUILDER_PROMPT
    from app.repositories.agent_runs import add_agent_execution, update_agent_execution
    from app.repositories.artifacts import create_artifact

    runtime, ctx = _bookish_context(runtime)
    if not ctx:
        return "[build_world] Missing runtime context."

    config = get_config()
    run_id = ctx.agent_run_id
    store = runtime.store if runtime else None

    emit_custom("task_started", runId=run_id, agent="world_builder", task={"agent": "world_builder", "task": request, "status": "running"})
    exec_idx = add_agent_execution(run_id=run_id, agent="world_builder", task_input=request, status="running")

    memory_brief = load_memory_brief(store, ctx.project_id)
    user_prompt = (
        f"TASK:\n{request}\n\n"
        f"{context_header(ctx)}\n\n"
        f"MEMORY BRIEF:\n{memory_brief or 'No cross-thread memory loaded.'}\n\n"
        "Use read_project and search_project to verify existing canon before inventing new lore. "
        "Output Markdown world-building notes when finished. "
        "Do not mention tools or internal workflow in the output."
    )

    notes = call_agent(
        ctx.project_id, "worldBuilderModel",
        fallback_keys=["plannerModel", "writerModel"],
        tools=[search_project, read_project],
        system_prompt=WORLD_BUILDER_PROMPT,
        user_prompt=user_prompt,
        config=config,
        context=ctx,
        store=store,
    )

    artifact_id = create_artifact(
        project_id=ctx.project_id,
        agent_run_id=run_id,
        agent_name="world_builder",
        artifact_type="world_building",
        content=notes,
        metadata={"task": request},
    )
    emit_custom(
        "artifact_created",
        runId=run_id,
        artifactId=artifact_id,
        agent="world_builder",
        artifactType="world_building",
        contentPreview=notes[:6000],
    )

    pending_write: Dict[str, Any] = {
        "kind": "entity_create",
        "agent": "world_builder",
        "task": request,
        "artifactId": artifact_id,
        "targetCollection": "world",
        "operation": "insert",
        "payload": {"notes": notes},
        "preview": _safe_preview(notes),
        "status": "pending",
        "requestedAt": datetime.utcnow().isoformat(),
    }
    emit_custom("write_proposed", runId=run_id, projectId=ctx.project_id, pendingWrite=pending_write)
    response = interrupt({
        "kind": "write_approval",
        "runId": run_id,
        "projectId": ctx.project_id,
        "pendingWrite": pending_write,
        "prompt": "Save these world-building notes to the project?",
    })

    if _is_approved(response):
        result_msg = "World-building notes saved to project."
    else:
        result_msg = "World-building rejected by user. Notes preserved as artifact."

    update_agent_execution(run_id=run_id, execution_index=exec_idx, status="completed", output_artifact_id=artifact_id)
    emit_custom("task_completed", runId=run_id, agent="world_builder", task={"agent": "world_builder", "task": request, "status": "completed"})
    persist_episode(store, ctx.project_id, agent="world_builder", task=request, run_id=run_id)
    return result_msg


# ── Tool sets ─────────────────────────────────────────────────────────────────

RAG_TOOLS = [search_project]
MONGO_TOOLS = [read_project]
READ_TOOLS = [*RAG_TOOLS, *MONGO_TOOLS]
MEMORY_TOOLS = [recall_memory, remember_note]
SPECIALIST_TOOLS = [write_content, build_world]
ALL_SUPERVISOR_TOOLS = [*READ_TOOLS, *MEMORY_TOOLS, *SPECIALIST_TOOLS]
