"""LangGraph runtime context for Bookish agents."""
from __future__ import annotations

from dataclasses import dataclass

from app.repositories.projects import get_project


@dataclass
class BookishContext:
    """Static per-invocation project metadata (not checkpointed in graph state)."""

    project_id: str
    title: str
    genre: str
    tonality: str


def build_bookish_context(project_id: str) -> BookishContext:
    project = get_project(project_id) or {}
    return BookishContext(
        project_id=project_id,
        title=str(project.get("title") or "Untitled"),
        genre=str(project.get("genre") or ""),
        tonality=str(project.get("tonality") or ""),
    )


def context_header(ctx: BookishContext) -> str:
    return (
        f"Book: {ctx.title}\n"
        f"Genre: {ctx.genre or 'Unknown'}\n"
        f"Tone: {ctx.tonality or 'Unknown'}"
    )
