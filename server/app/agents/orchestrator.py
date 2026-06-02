"""
Orchestrator - Entry point for all agent orchestrations.
Loads a bounded project context and initialises the LangGraph state.
"""
from typing import Dict, Any
from app.agents.orchestration_state import AgentOrchestrationState, ProjectContext
from app.repositories.projects import get_project, get_book_summary
from app.repositories.chapters import get_chapter_summaries
from app.repositories.chat_messages import add_chat_message
from app.repositories.agent_runs import create_agent_run
from datetime import datetime
from bson import ObjectId


def load_project_context(project_id: str) -> ProjectContext:
    """
    Build a bounded ProjectContext for the orchestration state.

    What we load (and why):
      - project doc   → title, genre, tonality (scalar fields only)
      - character count  → DB count query, no document fetch
      - chapter summaries → lightweight projection (no content field)
      - bookSummary    → single field from project doc, ≤400 words

    What we deliberately do NOT load:
      - Full chapter content  (can be MBs of text)
      - Full character bibles (agents fetch what they need via RAG)
      - Raw memory entries    (superseded by rolling bookSummary)
    """
    from app.infrastructure.database.mongo import get_db
    db = get_db()

    project = get_project(project_id)
    if not project:
        project = {}

    # Count persisted memory entries without fetching full documents.
    character_count = (
        db.character_bible.count_documents({"projectId": project_id})
        + db.entity_bible.count_documents({"projectId": project_id})
    )

    # Lightweight chapter index — no content field
    chapter_summaries = get_chapter_summaries(project_id)

    # Rolling story-so-far summary (set by editor, empty on new projects)
    book_summary = get_book_summary(project_id)

    return ProjectContext(
        projectId=project_id,
        title=project.get("title", ""),
        genre=project.get("genre", ""),
        tonality=project.get("tonality", ""),
        characterCount=character_count,
        chapterCount=len(chapter_summaries),
        bookSummary=book_summary,
        chapterSummaries=chapter_summaries,
    )



def initialize_orchestration_state(
    project_id: str,
    user_prompt: str,
    *,
    skip_hitl: bool = False,
) -> AgentOrchestrationState:
    """
    Initialize the orchestration state for a new request
    This is the entry point for all agent orchestrations
    """
    # Create user message
    user_message_id = add_chat_message(
        project_id=project_id,
        role="user",
        content=user_prompt
    )
    
    # Create agent run record
    agent_run_id = create_agent_run(
        project_id=project_id,
        user_message_id=user_message_id,
        user_prompt=user_prompt
    )
    
    # Load project context
    project_context = load_project_context(project_id)
    
    # Initialize state
    state = AgentOrchestrationState(
        # Input
        projectId=project_id,
        userMessageId=user_message_id,
        userPrompt=user_prompt,
        
        # Context
        projectContext=project_context,
        
        # Planner
        plannerOutput=None,
        
        # Tasks
        tasks=[],
        currentTaskIndex=0,
        
        # Agent content handoff
        researchNotes=None,
        factCheckReport=None,
        draftContent=None,
        humanizedContent=None,
        editedContent=None,
        worldBuilderDraft=None,
        
        # Artifacts
        artifactIds=[],
        
        # Output
        finalResponse="",
        finalMessageId=None,
        
        # Execution metadata
        agentRunId=agent_run_id,
        status="running",
        startedAt=datetime.utcnow().isoformat(),
        completedAt=None,
        error=None,
        
        # Bootstrap / HITL
        skipHitl=skip_hitl,

        # Observability
        thinking_logs=[]
    )
    
    return state
