"""
Pydantic models for the artifacts collection.

MongoDB collection: artifacts
ID pattern:         artifact_{ObjectId}
"""
from __future__ import annotations

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


ArtifactType = Literal[
    "research_notes",
    "world_building",
    "draft",
    "edited_content",
    "character_draft",
    "location_draft",
    "object_draft",
    "organization_draft",
]

AgentName = Literal[
    "researcher",
    "writer",
    "editor",
    "world_builder",
]


class Artifact(BaseModel):
    """
    Agent-generated content blob.
    Created by each agent node after successful generation.

    Recommended indexes:
        db.artifacts.create_index([("projectId", 1), ("createdAt", -1)])
        db.artifacts.create_index("agentRunId")
    """
    id: str = Field(..., alias="_id", description="artifact_{ObjectId}")
    projectId: str
    agentRunId: str    # FK → agent_runs._id
    agentName: str     # AgentName literal
    artifactType: str  # ArtifactType literal
    content: str       # Full text or JSON string of the generated artifact

    metadata: Dict[str, Any] = Field(default_factory=dict)

    relatedChapterId: Optional[str] = None  # FK → chapters._id
    createdAt: str = Field(..., description="ISO 8601 UTC datetime")

    model_config = ConfigDict(populate_by_name=True)
