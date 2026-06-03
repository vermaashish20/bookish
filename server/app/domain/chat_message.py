"""
Pydantic models for the chat_messages collection.

MongoDB collection: chat_messages
ID pattern:         msg_{ObjectId}

Messages are scoped by project and chat session.
"""
from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """
    One chat message in the project's conversation history.

    Recommended indexes:
        db.chat_messages.create_index([("projectId", 1), ("createdAt", 1)])
    """
    id: str = Field(..., alias="_id", description="msg_{ObjectId}")
    projectId: str
    sessionId: str = "default"
    role: Literal["user", "assistant", "system"]
    content: str

    # Present on assistant messages produced by a run; None for user messages
    agentRunId: Optional[str] = None   # FK → agent_runs._id

    # Artifact IDs referenced in this message (for Agent Flow trace display)
    artifactReferences: List[str] = Field(default_factory=list)

    createdAt: str = Field(..., description="ISO 8601 UTC datetime (from ObjectId generation time)")

    class Config:
        populate_by_name = True
