"""State schema for the LangGraph-native Bookish agent."""
from __future__ import annotations

from typing import Annotated, Any, List, Literal, Optional, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

RunStatusName = Literal["pending", "running", "awaiting_approval", "completed", "failed", "rejected"]
RoutedAgent = Literal["", "planner", "writer", "world_builder"]


class BookishAgentState(TypedDict, total=False):
    userMessageId: str
    userPrompt: str
    agentRunId: str

    memoryBrief: str
    routedAgent: RoutedAgent

    messages: Annotated[list[AnyMessage], add_messages]
    agentDraft: str
    agentExecIdx: int

    pendingWrite: dict[str, Any]
    approvalDecision: Any

    artifactIds: List[str]
    finalResponse: str
    finalMessageId: Optional[str]
    status: RunStatusName
    error: Optional[str]
    startedAt: str
    completedAt: Optional[str]
