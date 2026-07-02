"""
Pydantic models for the projects collection.

MongoDB collection: projects
ID pattern:         project_{ObjectId}
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class ModelConfig(BaseModel):
    """Settings for a single LLM agent model."""
    provider: str = "NVIDIA"
    modelName: str = "mistralai/mistral-large-3-675b-instruct-2512"
    apiKey: str = ""
    endpointUrl: str = ""


class ProjectSettings(BaseModel):
    """Per-project model configuration for every agent role."""
    plannerModel:      ModelConfig = Field(default_factory=ModelConfig)
    writerModel:       ModelConfig = Field(default_factory=ModelConfig)
    worldBuilderModel: ModelConfig = Field(default_factory=ModelConfig)

    model_config = {"extra": "ignore"}


class UpdateSettingsPayload(BaseModel):
    settings: ProjectSettings


class Project(BaseModel):
    """
    Represents a single book project document stored in MongoDB.

    Recommended indexes:
        db.projects.create_index("createdAt")
    """
    id: str = Field(..., alias="_id", description="project_{ObjectId}")
    userId: str = ""
    title: str
    subtitle: str = ""
    genre: str = ""
    tonality: str = ""
    createdAt: str = Field(..., description="ISO 8601 UTC datetime")

    # Rolling ≤400-word story synopsis, updated by editor after each chapter publish.
    bookSummary: str = ""

    settings: ProjectSettings = Field(default_factory=ProjectSettings)

    model_config = ConfigDict(populate_by_name=True)
