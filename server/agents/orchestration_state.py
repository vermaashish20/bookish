"""
LangGraph State Schema for Agent Orchestration
Based on Agent_Orchest.md specification
"""
from typing import TypedDict, List, Dict, Optional, Literal, Any
from datetime import datetime


class TaskStatus(TypedDict):
    """Individual task status within an agent run"""
    agent: Literal["planner", "researcher", "fact_checker", "writer", "humanizer", "editor"]
    task: str
    status: Literal["pending", "running", "completed", "failed"]
    startedAt: Optional[str]  # ISO datetime string
    completedAt: Optional[str]  # ISO datetime string
    outputArtifactId: Optional[str]
    error: Optional[str]


class PlannerOutput(TypedDict):
    """Planner decision output"""
    intent: str
    decision: str
    needsAgents: bool  # True if specialist agents needed, False if planner handles directly
    agentsNeeded: List[str]
    tasks: List[Dict[str, Any]]
    directResponse: Optional[str]  # If planner handles directly, response is here
    memoryUpdates: List[str]
    userVisibleSummary: str


class ProjectContext(TypedDict):
    """Project context loaded at orchestration start"""
    projectId: str
    title: str
    genre: str
    tonality: str
    characterCount: int
    chapterCount: int
    recentMemories: List[str]


class AgentOrchestrationState(TypedDict):
    """
    Main LangGraph state for agent orchestration.
    This state flows through the entire agent graph execution.
    """
    # Input
    projectId: str
    userMessageId: str
    userPrompt: str
    
    # Orchestrator classification
    route: Literal["general_chat", "agent_task"]
    
    # Project context (loaded at start)
    projectContext: ProjectContext
    
    # Planner output
    plannerOutput: Optional[PlannerOutput]
    
    # Task tracking
    tasks: List[TaskStatus]
    currentTaskIndex: int
    
    # Agent outputs (accumulated during execution)
    researchNotes: Optional[str]
    factCheckReport: Optional[str]
    draftContent: Optional[str]
    humanizedContent: Optional[str]
    editedContent: Optional[str]
    
    # Artifact IDs (for DB references)
    artifactIds: List[str]
    
    # Final output
    finalResponse: str
    finalMessageId: Optional[str]
    
    # Execution metadata
    agentRunId: str
    status: Literal["pending", "running", "completed", "failed"]
    startedAt: str  # ISO datetime string
    completedAt: Optional[str]  # ISO datetime string
    error: Optional[str]
    
    # Legacy fields for backward compatibility (optional)
    cost: float
    tokens: int
    thinking_logs: List[str]
