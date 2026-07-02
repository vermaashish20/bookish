"""
Pydantic models for the user_assets collection.

MongoDB collection: user_assets
ID pattern:         asset_{ObjectId}

User-uploaded reference documents (briefs, style guides, source material).
The first asset's content is used as the project brief in API responses.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UserAsset(BaseModel):
    """
    One user-uploaded asset document.

    Recommended indexes:
        db.user_assets.create_index([("projectId", 1), ("addedAt", -1)])
    """
    id: str = Field(..., alias="_id", description="asset_{ObjectId}")
    projectId: str
    name: str    # Display filename
    type: str    # e.g. "text/plain", "application/pdf", "brief"
    size: str    # Human-readable size string e.g. "12 KB"
    addedAt: str = Field(..., description="ISO 8601 UTC datetime")
    content: str = Field(..., description="Full text content of the uploaded file")

    model_config = ConfigDict(populate_by_name=True)
