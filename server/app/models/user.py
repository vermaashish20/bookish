"""
Pydantic models for the users collection.

MongoDB collection: users
ID pattern:         Clerk user id (e.g. user_2abc...)
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class User(BaseModel):
    """
    Bookish user mirrored from Clerk.

    ``_id`` is the Clerk user id and is the foreign key on projects.userId.
    """
    id: str = Field(..., alias="_id", description="Clerk user id (user_...)")
    email: str = ""
    username: str = ""
    firstName: str = ""
    lastName: str = ""
    imageUrl: str = ""
    createdAt: str = Field(..., description="ISO 8601 UTC — first seen in Bookish")
    updatedAt: str = Field(..., description="ISO 8601 UTC — profile or session touch")
    lastSeenAt: str = Field(..., description="ISO 8601 UTC — last authenticated request")

    model_config = ConfigDict(populate_by_name=True)


class UserPublic(BaseModel):
    """Safe user shape for API responses."""
    id: str
    email: str = ""
    username: str = ""
    firstName: str = ""
    lastName: str = ""
    imageUrl: str = ""

    model_config = ConfigDict(populate_by_name=True)
