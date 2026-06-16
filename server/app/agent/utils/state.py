"""State schema for the LangGraph-native Bookish agent."""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict


TaskAgent = Literal[
    "researcher",
    "writer",
    "fact_checker",
    "humanizer",
    "editor",
    "world_builder",
]
TaskStatusName = Literal["pending", "running", "completed", "failed", "rejected"]
RunStatusName = Literal["pending", "running", "awaiting_approval", "completed", "failed", "rejected"]


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

    researchNotes: Optional[str]
    factCheckReport: Optional[str]
    draftContent: Optional[str]
    humanizedContent: Optional[str]
    editedContent: Optional[str]
    worldBuildingNotes: Optional[str]
    artifactIds: List[str]

    finalResponse: str
    finalMessageId: Optional[str]
    status: RunStatusName
    error: Optional[str]
    startedAt: str
    completedAt: Optional[str]

