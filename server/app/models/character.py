"""
Pydantic models for the character_bible collection.

MongoDB collection: character_bible
ID pattern:         character_{ObjectId}
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal
from pydantic import BaseModel, ConfigDict, Field


class Character(BaseModel):
    """
    One character document in the world bible.
    Populated by the world_builder agent; approved via HITL before DB write.

    Recommended indexes:
        db.character_bible.create_index("projectId")
    """
    id: str = Field(..., alias="_id", description="character_{ObjectId}")
    projectId: str
    name: str
    role: Literal["protagonist", "antagonist", "supporting", "minor"] = "supporting"
    arc: str = Field(default="", description="Character arc description")

    # Chapter numbers (1-indexed) this character actively appears in
    activeChapters: List[int] = Field(default_factory=list)

    # Free-form LLM-generated character bible fields.
    # Common keys: age, appearance, motivation, backstory, speech_patterns, fears
    attributes: Dict[str, Any] = Field(default_factory=dict)

    status: Literal["draft", "published"] = "draft"

    model_config = ConfigDict(populate_by_name=True)
