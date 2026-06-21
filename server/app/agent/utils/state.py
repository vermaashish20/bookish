"""State schema for the LangGraph-native Bookish agent."""
from __future__ import annotations

from typing import Any, List, Literal, Optional, TypedDict


RunStatusName = Literal["pending", "running", "awaiting_approval", "completed", "failed", "rejected"]


class BookishAgentState(TypedDict, total=False):
    userMessageId: str
    userPrompt: str
    agentRunId: str

    memoryBrief: str

    artifactIds: List[str]
    finalResponse: str
    finalMessageId: Optional[str]
    status: RunStatusName
    error: Optional[str]
    startedAt: str
    completedAt: Optional[str]
