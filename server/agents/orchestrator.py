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
        print(f"[DEBUG ORCHESTRATOR] Classified as 'agent_task' (keyword match)")
        return "agent_task"
    
    # Default to general chat for questions and simple queries
    print(f"[DEBUG ORCHESTRATOR] Classified as 'general_chat' (default)")
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
    Handle general chat queries using LLM with streaming support
    """
    project_id = state["projectId"]
    user_prompt = state["userPrompt"]
    
    print(f"[DEBUG ORCHESTRATOR] handle_general_chat called")
    print(f"[DEBUG ORCHESTRATOR] User prompt: {user_prompt}")
    
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
    
    # Build context for LLM
    project_context = f"""
Project: {project.get('title', 'Untitled')}
Genre: {project.get('genre', 'General')}
Characters: {len(characters)}
Chapters: {len(chapters)}
"""
    
    if context_snippets:
        project_context += f"\n\nRelevant Context:\n" + "\n".join(context_snippets[:2])
    
    # Build system prompt
    system_prompt = """You are a helpful AI assistant for a book writing project. 
Answer questions about the project, provide guidance, and engage in friendly conversation.
Keep responses concise and helpful."""
    
    # Build user prompt with context
    full_user_prompt = f"""{project_context}

User Question: {user_prompt}

Provide a helpful, conversational response."""
    
    print(f"[DEBUG ORCHESTRATOR] Calling LLM for general chat response...")
    
    # Get model settings
    settings = project.get("settings", {})
    planner_model = settings.get("plannerModel", {})
    api_key = planner_model.get("apiKey", "")
    provider = planner_model.get("provider", "Claude")
    model_name = planner_model.get("modelName", "claude-3-5-sonnet")
    base_url = planner_model.get("endpointUrl", "")
    
    # Fallback response
    fallback_response = f"Hello! I'm here to help with your book project '{project.get('title', 'Untitled')}'. How can I assist you today?"
    
    # Call LLM with streaming support
    from services.llm_service import call_llm, stream_event_type_var
    token = stream_event_type_var.set("chat_message")
    try:
        response = call_llm(
            provider=provider,
            model_name=model_name,
            api_key=api_key,
            system_prompt=system_prompt,
            user_prompt=full_user_prompt,
            default_fallback=fallback_response,
            base_url=base_url
        )
    finally:
        stream_event_type_var.reset(token)
    
    print(f"[DEBUG ORCHESTRATOR] LLM response length: {len(response)}")
    
    # Update state
    state["finalResponse"] = response
    state["status"] = "completed"
    state["completedAt"] = datetime.utcnow().isoformat()
    
    # Add thinking log
    state["thinking_logs"].append(
        f"[Orchestrator] Classified as general_chat\n"
        f"[Orchestrator] Called LLM for conversational response\n"
        f"[Orchestrator] Response generated: {len(response)} characters"
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
