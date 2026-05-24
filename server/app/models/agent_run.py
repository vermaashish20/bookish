"""
Pydantic models for the agent_runs collection.

MongoDB collection: agent_runs
ID pattern:         run_{ObjectId}
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class AgentExecution(BaseModel):
    """One agent's execution record within an agent run."""
    agent: str = Field(..., description="Agent name: planner | world_builder | writer")
    taskInput: str = Field(..., description="Task instruction passed to the agent")
    status: Literal["pending", "running", "completed", "failed"] = "pending"
    startedAt: Optional[str] = None    # ISO 8601
    completedAt: Optional[str] = None  # ISO 8601
    outputArtifactId: Optional[str] = None  # FK → artifacts._id
    stateUpdates: Dict[str, Any] = Field(default_factory=dict)


class PlannerDecision(BaseModel):
    """Planner output stored inside an agent run document."""
    intent: str = ""
    decision: str = ""
    needsAgents: bool = True
    agentsNeeded: List[str] = Field(default_factory=list)
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    directResponse: Optional[str] = None   # populated when needsAgents=False
    memoryUpdates: List[str] = Field(default_factory=list)
    userVisibleSummary: str = ""


class AgentRun(BaseModel):
    """
    Full orchestration run record.
    One document per user message that triggers agent execution.

    Recommended indexes:
        db.agent_runs.create_index([("projectId", 1), ("startedAt", -1)])
        db.agent_runs.create_index("userMessageId")
    """
    id: str = Field(..., alias="_id", description="run_{ObjectId}")
    projectId: str
    threadId: str
    userMessageId: str   # FK → chat_messages._id
    userPrompt: str

    plannerDecision: Optional[PlannerDecision] = None

    # Appended one entry at a time as each agent executes
    agentExecutions: List[AgentExecution] = Field(default_factory=list)

    finalOutputMessageId: Optional[str] = None  # FK → chat_messages._id
    status: Literal["pending", "running", "completed", "failed"] = "pending"
    startedAt: str = Field(..., description="ISO 8601 UTC datetime")
    completedAt: Optional[str] = None  # ISO 8601

    model_config = ConfigDict(populate_by_name=True)
