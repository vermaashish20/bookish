"""
Orchestrator - First decision layer for routing requests
Classifies requests as general_chat or agent_task
"""
from typing import Dict, Any
from agents.orchestration_state import AgentOrchestrationState, ProjectContext
from repository.projects import get_project
from repository.characters import get_project_characters
from repository.chapters import get_project_chapters
from repository.project_memory import get_recent_memories
from repository.chat_messages import add_chat_message, get_recent_chat_messages
from repository.agent_runs import create_agent_run
from db.chroma import query_vector_assets
from datetime import datetime
from bson import ObjectId


def classify_request(user_prompt: str) -> str:
    """
    Classify user request as general_chat or agent_task
    
    General chat: Simple Q&A, project data retrieval
    Agent task: Planning, writing, editing, research, fact-checking
    """
    prompt_lower = user_prompt.lower()
    
    # Agent task keywords
    agent_keywords = [
        "plan", "write", "draft", "edit", "improve", "rewrite",
        "research", "check", "verify", "fact", "humanize",
        "create chapter", "generate", "outline", "develop",
        "add scene", "update chapter", "revise"
    ]
    
    # Check if any agent keyword is present
    if any(keyword in prompt_lower for keyword in agent_keywords):
        return "agent_task"
    
    # Default to general chat for questions and simple queries
    return "general_chat"


def load_project_context(project_id: str) -> ProjectContext:
    """Load project context for orchestration"""
    project = get_project(project_id)
    characters = get_project_characters(project_id)
    chapters = get_project_chapters(project_id)
    recent_memories = get_recent_memories(project_id, count=5)
    
    return ProjectContext(
        projectId=project_id,
        title=project.get("title", ""),
        genre=project.get("genre", ""),
        tonality=project.get("tonality", ""),
        characterCount=len(characters),
        chapterCount=len(chapters),
        recentMemories=recent_memories
    )


def handle_general_chat(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Handle general chat queries directly without agents
    Retrieve project data and answer questions
    """
    project_id = state["projectId"]
    user_prompt = state["userPrompt"]
    
    # Query ChromaDB for relevant context
    semantic_results = query_vector_assets(
        collection_name="semantic_assets",
        query_text=user_prompt,
        project_id=project_id,
        limit=3
    )
    
    # Build context from semantic search
    context_snippets = []
    for r in semantic_results:
        source_name = r['metadata'].get('sourceName', 'Reference')
        context_snippets.append(f"[{source_name}]: {r['document'][:200]}...")
    
    # Get project data
    project = get_project(project_id)
    characters = get_project_characters(project_id)
    chapters = get_project_chapters(project_id)
    
    # Simple response generation based on query type
    prompt_lower = user_prompt.lower()
    
    if "title" in prompt_lower:
        response = f"The book title is '{project.get('title', 'Untitled')}'."
    elif "character" in prompt_lower:
        if characters:
            char_list = ", ".join([c["name"] for c in characters[:5]])
            response = f"The project has {len(characters)} character(s): {char_list}."
        else:
            response = "No characters have been created yet."
    elif "chapter" in prompt_lower:
        if chapters:
            response = f"The project has {len(chapters)} chapter(s). "
            if len(chapters) <= 5:
                chapter_list = ", ".join([f"Ch{c['number']}: {c['title']}" for c in chapters])
                response += f"Chapters: {chapter_list}."
        else:
            response = "No chapters have been created yet."
    elif "outline" in prompt_lower or "summary" in prompt_lower:
        if chapters:
            outline = "\n".join([f"Chapter {c['number']}: {c['title']}" for c in chapters[:10]])
            response = f"Current outline:\n{outline}"
        else:
            response = "No outline has been created yet."
    else:
        # Generic response with context
        if context_snippets:
            response = f"Based on the project context:\n\n" + "\n".join(context_snippets[:2])
        else:
            response = "I can help you with questions about your project. Try asking about the title, characters, chapters, or outline."
    
    # Update state
    state["finalResponse"] = response
    state["status"] = "completed"
    state["completedAt"] = datetime.utcnow().isoformat()
    
    # Add thinking log
    state["thinking_logs"].append(
        f"[Orchestrator] Classified as general_chat\n"
        f"[Orchestrator] Retrieved project context and answered directly"
    )
    
    return state


def initialize_orchestration_state(
    project_id: str,
    user_prompt: str
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
    
    # Classify the request
    route = classify_request(user_prompt)
    
    # Create agent run record
    agent_run_id = create_agent_run(
        project_id=project_id,
        user_message_id=user_message_id,
        route=route,
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
        
        # Classification
        route=route,
        
        # Context
        projectContext=project_context,
        
        # Planner
        plannerOutput=None,
        
        # Tasks
        tasks=[],
        currentTaskIndex=0,
        
        # Agent outputs
        researchNotes=None,
        factCheckReport=None,
        draftContent=None,
        humanizedContent=None,
        editedContent=None,
        
        # Artifacts
        artifactIds=[],
        
        # Output
        finalResponse="",
        finalMessageId=None,
        
        # Metadata
        agentRunId=agent_run_id,
        status="running",
        startedAt=datetime.utcnow().isoformat(),
        completedAt=None,
        error=None,
        
        # Legacy
        cost=0.0,
        tokens=0,
        thinking_logs=[]
    )
    
    return state
