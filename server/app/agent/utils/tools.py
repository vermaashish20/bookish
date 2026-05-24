"""LangGraph-native tools shared by all Bookish agents (RAG, Mongo, memory)."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

try:
    from langchain.tools import tool
except ImportError:
    from langchain_core.tools import tool  # type: ignore[no-redef]

from langgraph.prebuilt import ToolRuntime

from app.knowledge.tools import execute_mongo_tool, execute_rag_tool

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


class ReadProjectInput(BaseModel):
    resource: Literal[
        "sources", "chapters", "characters", "world", "artifacts", "project", "formal_memory"
    ] = Field(
        description=(
            "Which Mongo collection to read (source of truth for full records). "
            "sources — uploaded user assets; chapters — saved narrative; "
            "characters — character bible; world — lore entities; "
            "artifacts — prior agent outputs; project — book metadata; "
            "formal_memory — promoted canon."
        ),
    )
    operation: Literal["list", "read"] = Field(
        default="list",
        description="list — summaries/ids; read — one full record (requires id, number, or name).",
    )
    id: Optional[str] = Field(default=None, description="Mongo record id.")
    number: Optional[int] = Field(default=None, description="Chapter number for chapters resource.")
    name: Optional[str] = Field(default=None, description="Record name for sources, characters, or world.")
    max_chars: int = Field(default=12000, ge=500, le=20000, description="Max chars for read operations.")


class RecallMemoryInput(BaseModel):
    query: str = Field(default="", description="Optional search text to filter memories.")
    category: Literal["episodic", "callbacks", "narrative"] = Field(
        default="episodic",
        description="episodic — session notes; callbacks — open threads; narrative — plot summary.",
    )


class RememberNoteInput(BaseModel):
    content: str = Field(description="Short note to persist for future sessions.")
    category: Literal["callback", "note"] = Field(
        default="note",
        description="callback — open thread; note — general episodic memory.",
    )


@tool("search_project", args_schema=SearchProjectInput)
def search_project(
    query: str,
    scopes: Optional[List[str]] = None,
    max_results: int = 5,
    runtime: ToolRuntime = None,
) -> str:
    """Semantic (RAG) search over indexed project knowledge in Chroma."""
    ctx = runtime.context if runtime else None
    if not ctx:
        return "[search_project] Missing runtime context."
    if not str(query or "").strip():
        return "[search_project] Query must be a non-empty search string."
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
    """Exact read from Mongo — source of truth for full project records."""
    ctx = runtime.context if runtime else None
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


@tool("recall_memory", args_schema=RecallMemoryInput)
def recall_memory(
    query: str = "",
    category: str = "episodic",
    runtime: ToolRuntime = None,
) -> str:
    """Recall cross-thread agentic memory from the LangGraph store."""
    ctx = runtime.context if runtime else None
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
    """Store a short note in the LangGraph memory store for future sessions."""
    ctx = runtime.context if runtime else None
    if not ctx or runtime is None or runtime.store is None:
        return "No agentic memory store available."
    from app.agent.utils.memory import remember_note_in_store

    return remember_note_in_store(runtime.store, ctx.project_id, content=content, category=category)


AGENT_TOOLS = [search_project, read_project, recall_memory, remember_note]
