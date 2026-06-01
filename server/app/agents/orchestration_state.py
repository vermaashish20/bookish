"""
LangGraph State Schema for Agent Orchestration
"""
from typing import TypedDict, List, Dict, Optional, Literal, Any


class TaskStatus(TypedDict):
    """Individual task status within an agent run"""
    agent: Literal["planner", "researcher", "fact_checker", "writer", "humanizer", "editor", "world_builder"]
    task: str
    # Name of the state field from the prior agent to include as extra context
    # e.g. "researchNotes", "draftContent". None for the first task.
    contextFromPrevious: Optional[str]
    status: Literal["pending", "running", "completed", "failed", "rejected"]
    startedAt: Optional[str]    # ISO datetime string
    completedAt: Optional[str]  # ISO datetime string
    outputArtifactId: Optional[str]
    error: Optional[str]
    # Set by writer — used by editor to update chapter to "published"
    chapterId: Optional[str]
    # Set by world_builder on save
    characterId: Optional[str]
    entityId: Optional[str]


class PlannerOutput(TypedDict):
    """Planner decision output"""
    intent: str
    decision: str
    needsAgents: bool           # True → delegate to specialist agents; False → planner answers directly
    agentsNeeded: List[str]
    tasks: List[Dict[str, Any]]
    directResponse: Optional[str]  # Populated when needsAgents=False
    memoryUpdates: List[str]
    userVisibleSummary: str


class ProjectContext(TypedDict):
    """
    Lightweight project context loaded once at orchestration start.
    Deliberately bounded — no full chapter content, no raw character data.
    """
    projectId: str
    title: str
    genre: str
    tonality: str
    characterCount: int
    chapterCount: int
    # Rolling ≤400-word synopsis of the story so far (updated by editor after each publish)
    bookSummary: str
    # Lightweight chapter index: number, title, summary, wordCount, status — no full content
    chapterSummaries: List[Dict[str, Any]]


class AgentOrchestrationState(TypedDict):
    """
    Main LangGraph state for agent orchestration.
    This state flows through the entire agent graph execution.

    Content handoff convention:
      researchNotes    → written by researcher, read by writer / fact_checker
      draftContent     → written by writer (and updated by humanizer, editor)
      humanizedContent → written by humanizer, read by editor
      editedContent    → final polished output from editor
      worldBuilderDraft→ temporary staging dict written by world_builder before HITL
    """
    # ── Input ─────────────────────────────────────────────────────────────────
    projectId: str
    userMessageId: str
    userPrompt: str

    # ── Project context (loaded once at orchestration start) ──────────────────
    projectContext: ProjectContext

    # ── Planner output ────────────────────────────────────────────────────────
    plannerOutput: Optional[PlannerOutput]

    # ── Task execution tracking ───────────────────────────────────────────────
    tasks: List[TaskStatus]
    currentTaskIndex: int

    # ── Agent content handoff (accumulated during execution) ──────────────────
    researchNotes: Optional[str]    # researcher → writer / fact_checker
    factCheckReport: Optional[str]  # fact_checker → writer (revision hints)
    draftContent: Optional[str]     # writer → humanizer → editor (each overwrites)
    humanizedContent: Optional[str] # humanizer → editor
    editedContent: Optional[str]    # editor (final polished prose)

    # ── World builder staging (cleared after HITL save) ───────────────────────
    worldBuilderDraft: Optional[Dict[str, Any]]

    # ── Artifact tracking ─────────────────────────────────────────────────────
    artifactIds: List[str]

    # ── Final output ──────────────────────────────────────────────────────────
    finalResponse: str
    finalMessageId: Optional[str]

    # ── Execution metadata ────────────────────────────────────────────────────
    agentRunId: str
    status: Literal["pending", "running", "completed", "failed"]
    startedAt: str              # ISO datetime string
    completedAt: Optional[str]  # ISO datetime string
    error: Optional[str]

    # ── HITL / bootstrap ──────────────────────────────────────────────────────
    skipHitl: bool  # True for project bootstrap — auto-approve planner/world HITL

    # ── Debug / observability ─────────────────────────────────────────────────
    thinking_logs: List[str]
