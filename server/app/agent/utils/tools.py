"""LangGraph-native tools exposed to Bookish agent nodes."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from app.knowledge.tools import execute_knowledge_tool


class RetrieveKnowledgeInput(BaseModel):
    """Input schema for semantic and exact project knowledge retrieval."""

    project_id: str = Field(description="Bookish project id.")
    query: str = Field(description="Specific question or fact to retrieve.")
    scopes: Optional[List[str]] = Field(
        default=None,
        description="Knowledge scopes to search, e.g. assets, narrative, characters, world, style.",
    )
    max_results: int = Field(default=5, ge=1, le=10, description="Maximum semantic hits to return.")
    run_id: Optional[str] = Field(default=None, description="Current agent run id for retrieval logging.")
    agent: Optional[str] = Field(default=None, description="Current specialist agent name.")
    task: Optional[str] = Field(default=None, description="Current specialist task.")


class ReadProjectSourcesInput(BaseModel):
    """Input schema for exact reads from user-provided project source assets."""

    project_id: str = Field(description="Bookish project id.")
    max_chars: int = Field(default=12000, ge=500, le=20000, description="Maximum source text to return.")
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
    query: str,
    scopes: Optional[List[str]] = None,
    max_results: int = 5,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
) -> str:
    """Search project knowledge through Chroma RAG and return formatted evidence."""
    args: Dict[str, Any] = {
        "mode": "rag",
        "query": query,
        "scopes": scopes or ["assets", "narrative", "characters", "world", "style"],
        "maxResults": max_results,
    }
    return execute_knowledge_tool(
        project_id,
        "retrieve_knowledge",
        args,
        run_id=run_id,
        agent=agent,
        task=task,
    )


@_tool_decorator("read_project_sources", args_schema=ReadProjectSourcesInput)
def _read_project_sources(
    project_id: str,
    max_chars: int = 12000,
    run_id: Optional[str] = None,
    agent: Optional[str] = None,
    task: Optional[str] = None,
) -> str:
    """Read exact user-provided source assets from MongoDB for source-of-truth context."""
    return execute_knowledge_tool(
        project_id,
        "retrieve_knowledge",
        {
            "mode": "persistent",
            "surface": "source_assets",
            "operation": "read",
            "max_chars": max_chars,
        },
        run_id=run_id,
        agent=agent,
        task=task,
    )


BOOKISH_TOOLS = [_retrieve_knowledge, _read_project_sources]


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
        "read_project_sources",
        {
            "project_id": project_id,
            "max_chars": max_chars,
            "run_id": run_id,
            "agent": agent,
            "task": task,
        },
    )

