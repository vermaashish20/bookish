"""
Pydantic models for the chapters collection.

MongoDB collection: chapters
ID pattern:         chapter_{ObjectId}
"""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class Chapter(BaseModel):
    """
    One chapter document stored in MongoDB.
    Full prose content lives here but is excluded from lightweight queries
    (get_chapter_summaries uses a MongoDB projection to omit the content field).

    Recommended indexes:
        db.chapters.create_index([("projectId", 1), ("number", 1)], unique=True)
    """
    id: str = Field(..., alias="_id", description="chapter_{ObjectId}")
    projectId: str
    number: int = Field(..., ge=1, description="1-indexed chapter number, unique per project")
    title: str

    # Full prose — excluded from lightweight context queries
    content: Optional[str] = None

    # One-paragraph synopsis (50-80 words).
    # Written by the editor agent after the chapter is published.
    summary: str = ""

    wordCount: int = 0
    status: Literal["draft", "published"] = "draft"

    model_config = ConfigDict(populate_by_name=True)


class ChapterSummary(BaseModel):
    """
    Lightweight chapter projection — no full content.
    Returned by get_chapter_summaries() for safe embedding in agent context.
    """
    id: str = Field(..., alias="_id")
    projectId: str
    number: int
    title: str
    summary: str = ""
    wordCount: int = 0
    status: Literal["draft", "published"] = "draft"

    model_config = ConfigDict(populate_by_name=True)
