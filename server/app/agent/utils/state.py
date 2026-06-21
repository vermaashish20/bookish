"""State schema for the LangGraph-native Bookish agent."""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict


TaskAgent = Literal[
    "writer",
    "world_builder",
]
TaskStatusName = Literal["pending", "running", "completed", "failed", "rejected"]
RunStatusName = Literal["pending", "running", "awaiting_approval", "completed", "failed", "rejected"]
PendingWriteKind = Literal[
    "chapter_create",
    "chapter_update",
    "character_create",
    "character_update",
    "entity_create",
    "entity_update",
]


class AgentTask(TypedDict, total=False):
    agent: TaskAgent
    task: str
    status: TaskStatusName
    startedAt: Optional[str]
    completedAt: Optional[str]
    outputArtifactId: Optional[str]
    error: Optional[str]
    chapterId: Optional[str]


class PendingWrite(TypedDict, total=False):
    kind: PendingWriteKind
    agent: TaskAgent
    task: str
    taskIndex: int
    artifactId: str
    targetCollection: str
    operation: Literal["insert", "update"]
    targetId: Optional[str]
    payload: Dict[str, Any]
    preview: str
    status: Literal["pending", "approved", "rejected", "committed"]
    response: Any


class BookishAgentState(TypedDict, total=False):
    userMessageId: str
    userPrompt: str
    agentRunId: str

    memoryBrief: str
    planSummary: str
    tasks: List[AgentTask]
    currentTaskIndex: int
    pendingWrite: Optional[PendingWrite]

    artifactIds: List[str]
    finalResponse: str
    finalMessageId: Optional[str]
    status: RunStatusName
    error: Optional[str]
    startedAt: str
    completedAt: Optional[str]
