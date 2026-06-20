"""LangGraph-native tools exposed to Bookish agent nodes."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from app.knowledge.tools import execute_knowledge_tool


class RetrieveKnowledgeInput(BaseModel):
    """Input schema for semantic and exact project knowledge retrieval."""

    project_id: str = Field(description="Bookish project id.")
    mode: str = Field(
        default="rag",
        description="Use 'rag' for Chroma semantic search or 'persistent' for exact Mongo reads.",
    )
    surface: Optional[str] = Field(
        default=None,
        description="Persistent surface: source_assets, chapters, characters, world, formal_memory, artifacts.",
    )
    operation: Optional[str] = Field(default=None, description="Persistent read operation, usually list or read.")
    query: Optional[str] = Field(default=None, description="Specific question or fact to retrieve.")
    scopes: Optional[List[str]] = Field(
        default=None,
        description="Knowledge scopes to search, e.g. assets, narrative, characters, world, style.",
    )
    max_results: int = Field(default=5, ge=1, le=10, description="Maximum semantic hits to return.")
    max_chars: int = Field(default=12000, ge=500, le=20000, description="Maximum exact-read characters.")
    id: Optional[str] = Field(default=None, description="Optional source record id for exact reads.")
    name: Optional[str] = Field(default=None, description="Optional source record name for exact reads.")
    names: Optional[List[str]] = Field(default=None, description="Optional source record names for exact reads.")
    asset_ids: Optional[List[str]] = Field(default=None, description="Optional source asset ids for exact reads.")
    chapter_id: Optional[str] = Field(default=None, description="Optional chapter id for exact reads.")
    chapter_number: Optional[int] = Field(default=None, description="Optional chapter number for exact reads.")
    character_id: Optional[str] = Field(default=None, description="Optional character id for exact reads.")
    entity_id: Optional[str] = Field(default=None, description="Optional world entity id for exact reads.")
    artifact_id: Optional[str] = Field(default=None, description="Optional artifact id for exact reads.")
    run_id: Optional[str] = Field(default=None, description="Current agent run id for retrieval logging.")
    agent: Optional[str] = Field(default=None, description="Current specialist agent name.")
    task: Optional[str] = Field(default=None, description="Current specialist task.")


def _tool_decorator(name: str, *, args_schema: type[BaseModel]):
    """Import LangChain's tool decorator lazily to keep module import lightweight."""
    try:
        from langchain.tools import tool
    except ModuleNotFoundError:
        from langchain_core.tools import tool
    return tool(name, args_schema=args_schema)


@_tool_decorator("retrieve_knowledge", args_schema=RetrieveKnowledgeInput)
def _retrieve_knowledge(
    project_id: str,
    mode: str = "rag",
    surface: Optional[str] = None,
    operation: Optional[str] = None,
    query: Optional[str] = None,
    scopes: Optional[List[str]] = None,
    max_results: int = 5,
    max_chars: int = 12000,
    id: Optional[str] = None,
    name: Optional[str] = None,
    names: Optional[List[str]] = None,
    asset_ids: Optional[List[str]] = None,
    chapter_id: Optional[str] = None,
    chapter_number: Optional[int] = None,
    character_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    artifact_id: Optional[str] = None,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
) -> str:
    """Search Chroma or read exact Mongo project knowledge through one safe read-only tool."""
    args: Dict[str, Any] = {
        "mode": mode,
        "surface": surface,
        "operation": operation,
        "query": query,
        "scopes": scopes or ["assets", "narrative", "characters", "world", "style"],
        "maxResults": max_results,
        "max_chars": max_chars,
        "id": id,
        "name": name,
        "names": names,
        "asset_ids": asset_ids,
        "chapter_id": chapter_id,
        "chapter_number": chapter_number,
        "character_id": character_id,
        "entity_id": entity_id,
        "artifact_id": artifact_id,
    }
    return execute_knowledge_tool(
        project_id,
        "retrieve_knowledge",
        args,
        run_id=run_id,
        agent=agent,
        task=task,
    )


BOOKISH_TOOLS = [_retrieve_knowledge]


def run_bookish_tool(tool_name: str, args: Dict[str, Any]) -> str:
    """Execute a Bookish tool through LangGraph's ToolNode."""
    try:
        from langchain_core.messages import AIMessage
        from langgraph.prebuilt import ToolNode

        tool_node = ToolNode(BOOKISH_TOOLS)
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
        tool_by_name = {tool.name: tool for tool in BOOKISH_TOOLS}
        return str(tool_by_name[tool_name].invoke(args))


def retrieve_project_knowledge(
    project_id: str,
    *,
    query: str,
    scopes: Optional[List[str]] = None,
    max_results: int = 5,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
) -> str:
    """Search Bookish project knowledge through the LangGraph tool layer."""
    return run_bookish_tool(
        "retrieve_knowledge",
        {
            "project_id": project_id,
            "mode": "rag",
            "query": query,
            "scopes": scopes or ["assets", "narrative", "characters", "world", "style"],
            "max_results": max_results,
            "run_id": run_id,
            "agent": agent,
            "task": task,
        },
    )


def read_project_sources(
    project_id: str,
    *,
    max_chars: int = 12000,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
) -> str:
    """Read exact user-provided source assets through the LangGraph tool layer."""
    return run_bookish_tool(
        "retrieve_knowledge",
        {
            "project_id": project_id,
            "mode": "persistent",
            "surface": "source_assets",
            "operation": "read",
            "max_chars": max_chars,
            "run_id": run_id,
            "agent": agent,
            "task": task,
        },
    )

