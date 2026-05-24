"""
Pydantic models for the entity_bible collection.

MongoDB collection: entity_bible
ID pattern:         entity_{ObjectId}
"""
from __future__ import annotations

from typing import Any, Dict, Literal
from pydantic import BaseModel, ConfigDict, Field


EntityType = Literal["location", "object", "organization", "concept"]


class Entity(BaseModel):
    """
    One world entity document (location, object, organization, concept, etc.).
    Populated by the world_builder agent for non-character entities.
    Approved via HITL before DB write.

    Recommended indexes:
        db.entity_bible.create_index([("projectId", 1), ("type", 1)])
    """
    id: str = Field(..., alias="_id", description="entity_{ObjectId}")
    projectId: str
    name: str

    # Discriminator for entity kind
    type: str = Field(
        ...,
        description="'location' | 'object' | 'organization' | 'concept' | <custom>",
    )

    description: str = ""

    # Free-form LLM-generated bible fields.
    attributes: Dict[str, Any] = Field(default_factory=dict)

    status: Literal["draft", "published"] = "draft"

    model_config = ConfigDict(populate_by_name=True)
