"""State schema for the LangGraph-native Bookish agent."""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict


TaskAgent = Literal[
    "researcher",
    "writer",
    "editor",
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


class ProjectContext(TypedDict, total=False):
    projectId: str
    title: str
    genre: str
    tonality: str
    assetCount: int
    assetSummaries: List[Dict[str, Any]]
    characterCount: int
    chapterCount: int
    bookSummary: str
    chapterSummaries: List[Dict[str, Any]]


class AgentTask(TypedDict, total=False):
    agent: TaskAgent
    task: str
    status: TaskStatusName
    startedAt: Optional[str]
    completedAt: Optional[str]
    outputArtifactId: Optional[str]
    error: Optional[str]
    chapterId: Optional[str]


class PlanApproval(TypedDict, total=False):
    approved: bool
    response: Any


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
    projectId: str
    chatSessionId: str
    userMessageId: str
    userPrompt: str
    agentRunId: str
    threadId: str

    projectContext: ProjectContext
    planSummary: str
    tasks: List[AgentTask]
    currentTaskIndex: int
    approval: Optional[PlanApproval]
    pendingWrite: Optional[PendingWrite]

    researchNotes: Optional[str]
    draftContent: Optional[str]
    editedContent: Optional[str]
    worldBuildingNotes: Optional[str]
    artifactIds: List[str]

    finalResponse: str
    finalMessageId: Optional[str]
    status: RunStatusName
    error: Optional[str]
    startedAt: str
    completedAt: Optional[str]

