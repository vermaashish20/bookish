"""LangGraph-native tools exposed to Bookish agent nodes."""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from app.agent.utils.context_schema import BookishContext
from app.agent.utils.memory import recall_memory_from_store, remember_note_in_store
from app.knowledge.tools import execute_knowledge_tool


class SearchProjectInput(BaseModel):
    query: str = Field(description="Semantic search query.")
    scopes: List[str] = Field(
        default_factory=lambda: ["assets", "narrative", "characters", "world", "continuity", "style"],
        description="Knowledge scopes to search.",
    )
    max_results: int = Field(default=5, ge=1, le=10)


class ReadProjectInput(BaseModel):
    resource: Literal["sources", "chapters", "characters", "world", "artifacts", "project"] = Field(
        description="Mongo resource surface to read.",
    )
    operation: Literal["list", "read"] = Field(default="list")
    id: Optional[str] = Field(default=None, description="Record id for read operations.")
    number: Optional[int] = Field(default=None, description="Chapter number for chapter reads.")
    name: Optional[str] = Field(default=None, description="Record name for read operations.")
    max_chars: int = Field(default=12000, ge=500, le=20000)


class RecallMemoryInput(BaseModel):
    query: str = Field(default="", description="Optional semantic query.")
    category: Literal["episodic", "callbacks", "narrative"] = Field(default="episodic")


class RememberNoteInput(BaseModel):
    content: str = Field(description="Short note to remember.")
    category: Literal["callback", "note"] = Field(default="note")


def _tool_decorator(name: str, *, args_schema: type[BaseModel]):
    try:
        from langchain.tools import tool, ToolRuntime
    except ModuleNotFoundError:
        from langchain_core.tools import tool
        from langchain.tools import ToolRuntime
    return tool(name, args_schema=args_schema), ToolRuntime


_search_decorator, ToolRuntime = _tool_decorator("search_project", args_schema=SearchProjectInput)


@_search_decorator
def search_project(
    query: str,
    scopes: Optional[List[str]] = None,
    max_results: int = 5,
    runtime: ToolRuntime[BookishContext] | None = None,
) -> str:
    """Semantic search over indexed project knowledge (Chroma)."""
    ctx = runtime.context if runtime else None
    if not ctx:
        return "[search_project] Missing runtime context."
    return execute_knowledge_tool(
        ctx.project_id,
        "search_project",
        {
            "query": query,
            "scopes": scopes or ["assets", "narrative", "characters", "world", "continuity", "style"],
            "maxResults": max_results,
        },
        run_id=getattr(getattr(runtime, "state", None), "agentRunId", None) if runtime else None,
        agent="agent",
    )


_read_decorator, _ = _tool_decorator("read_project", args_schema=ReadProjectInput)


@_read_decorator
def read_project(
    resource: str,
    operation: str = "list",
    id: Optional[str] = None,
    number: Optional[int] = None,
    name: Optional[str] = None,
    max_chars: int = 12000,
    runtime: ToolRuntime[BookishContext] | None = None,
) -> str:
    """Exact read from Mongo project records."""
    ctx = runtime.context if runtime else None
    if not ctx:
        return "[read_project] Missing runtime context."
    return execute_knowledge_tool(
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


_recall_decorator, _ = _tool_decorator("recall_memory", args_schema=RecallMemoryInput)


@_recall_decorator
def recall_memory(
    query: str = "",
    category: str = "episodic",
    runtime: ToolRuntime[BookishContext] | None = None,
) -> str:
    """Recall cross-thread agentic memory from the LangGraph store."""
    ctx = runtime.context if runtime else None
    if not ctx or runtime.store is None:
        return "No agentic memory store available."
    return recall_memory_from_store(
        runtime.store,
        ctx.project_id,
        query=query,
        category=category,
    )


_remember_decorator, _ = _tool_decorator("remember_note", args_schema=RememberNoteInput)


@_remember_decorator
def remember_note(
    content: str,
    category: str = "note",
    runtime: ToolRuntime[BookishContext] | None = None,
) -> str:
    """Store a short agentic note or callback in the LangGraph store."""
    ctx = runtime.context if runtime else None
    if not ctx or runtime.store is None:
        return "No agentic memory store available."
    return remember_note_in_store(
        runtime.store,
        ctx.project_id,
        content=content,
        category=category,
    )


READ_TOOLS = [search_project, read_project]
MEMORY_TOOLS = [recall_memory, remember_note]
PLANNER_TOOLS = READ_TOOLS + MEMORY_TOOLS
BOOKISH_TOOLS = READ_TOOLS


def run_bookish_tool(tool_name: str, args: Dict[str, Any]) -> str:
    """Execute a Bookish tool through LangGraph's ToolNode."""
    try:
        from langchain_core.messages import AIMessage
        from langgraph.prebuilt import ToolNode

        all_tools = {tool.name: tool for tool in PLANNER_TOOLS}
        tool_node = ToolNode(list(all_tools.values()))
        tool_call_id = f"call_{uuid4().hex}"
        result = tool_node.invoke(
            {
                "messages": [
                    AIMessage(
                        content="",
                        tool_calls=[
                            {
                                "name": tool_name,
                                "args": args,
                                "id": tool_call_id,
                                "type": "tool_call",
                            }
                        ],
                    )
                ]
            }
        )
        messages = result.get("messages", []) if isinstance(result, dict) else []
        return str(messages[-1].content) if messages else ""
    except Exception:
        tool_by_name = {tool.name: tool for tool in PLANNER_TOOLS}
        return str(tool_by_name[tool_name].invoke(args))
