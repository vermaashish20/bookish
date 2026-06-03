"""Knowledge Base layer for agent-facing retrieval and memory access."""

from app.knowledge.service import search_knowledge
from app.knowledge.tools import execute_knowledge_tool

__all__ = ["execute_knowledge_tool", "search_knowledge"]
