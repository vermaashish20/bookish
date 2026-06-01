"""
Pydantic models for the artifacts collection.

MongoDB collection: artifacts
ID pattern:         artifact_{ObjectId}
"""
from __future__ import annotations

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


ArtifactType = Literal[
    "research_notes",
    "draft",
    "humanized_content",
    "edited_content",
    "fact_check_report",
    "character_draft",
    "location_draft",
    "object_draft",
    "organization_draft",
]

AgentName = Literal[
    "researcher",
    "writer",
    "humanizer",
    "editor",
    "fact_checker",
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

    # Agent-specific metadata:
    #   writer/humanizer/editor : {"wordCount": int, "task": str}
    #   researcher              : {"sourcesCount": int, "query": str}
    #   fact_checker            : {"groundingSourcesCount": int, "task": str}
    #   world_builder           : {"entityType": str, "entityName": str}
    metadata: Dict[str, Any] = Field(default_factory=dict)

    relatedChapterId: Optional[str] = None  # FK → chapters._id
    createdAt: str = Field(..., description="ISO 8601 UTC datetime")

    class Config:
        populate_by_name = True
