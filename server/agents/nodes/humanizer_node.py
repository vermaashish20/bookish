"""
Humanizer Node - Naturalize drafts and style content according to tonality parameters
"""
from agents.orchestration_state import AgentOrchestrationState
from agents.utils import load_prompt
from services.llm_service import call_llm, stream_queue_var, stream_event_type_var
from repository.artifacts import create_artifact
from repository.agent_runs import add_agent_execution, update_agent_execution
from repository.projects import get_project
from db.chroma import add_vector_asset
from datetime import datetime


def humanizer_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Humanizer agent node
    - Removes AI tells and clunky phrases
    - Implements target tonality metric guidelines
    - Returns natural, human-grade prose
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]
    
    if current_task_idx >= len(state["tasks"]):
        return state
        
    current_task = state["tasks"][current_task_idx]
    
    if current_task["agent"] != "humanizer":
        return state
        
    thinking = f"[Humanizer] Starting styling and humanization task: {current_task['task']}\n"
    
    q = stream_queue_var.get()
    if q:
        q.put({"event": "agent_status", "text": "🎨 Humanizer is adjusting tonality..."})
    
    # Update task status
    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()
    
    # Add execution to agent_runs
    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="humanizer",
        task_input=current_task["task"],
        status="running"
    )
    
    # Load project details
    project = get_project(project_id)
    
    # Identify target text to humanize
    source_text = state.get("draftContent") or ""
    if not source_text:
        thinking += "[Humanizer] Warning: No active draft content found in state. Checking user prompt.\n"
        source_text = state.get("userPrompt") or ""
        
    # Load humanizer system prompt
    system_prompt = load_prompt("humanizer")
    
    user_prompt = f"""
Project Title: {project.get('title', 'Untitled')}
Target Genre: {project.get('genre', 'General')}
Target Tonality Preset: {project.get('tonality', 'Conversational')}

## Text to Refine / Humanize
{source_text}

## Humanizer Refinement Task
{current_task['task']}
"""

    thinking += "[Humanizer] Applying styling presets and dynamic filters via LLM...\n"
    
    # Model configuration
    settings = project.get("settings", {})
    humanizer_model = settings.get("humanizerModel", {}) or settings.get("writerModel", {})
    api_key = humanizer_model.get("apiKey", "")
    provider = humanizer_model.get("provider", "Claude")
    model_name = humanizer_model.get("modelName", "claude-3-5-sonnet")
    base_url = humanizer_model.get("endpointUrl", "")
    
    fallback_text = source_text or f"[Humanized content for: {current_task['task']}]"
    
    # Call LLM
    token = stream_event_type_var.set("document_stream")
    try:
        humanized_content = call_llm(
            provider=provider,
            model_name=model_name,
            api_key=api_key,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            default_fallback=fallback_text,
            base_url=base_url
        )
    finally:
        stream_event_type_var.reset(token)
    
    thinking += f"[Humanizer] Humanization complete. Word count: {len(humanized_content.split())}\n"
    
    # Calculate word count
    word_count = len(humanized_content.split())
    
    # Save humanized content artifact
    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="humanizer",
        artifact_type="humanized_content",
        content=humanized_content,
        metadata={
            "wordCount": word_count,
            "task": current_task["task"]
        }
    )
    
    # Index in ChromaDB
    add_vector_asset(
        collection_name="semantic_assets",
        doc_id=artifact_id,
        document=humanized_content,
        metadata={
            "type": "agent_artifact",
            "projectId": project_id,
            "agentName": "humanizer",
            "artifactType": "humanized_content",
            "wordCount": word_count
        }
    )
    
    thinking += f"[Humanizer] Humanized artifact committed (artifact: {artifact_id})\n"
    
    # Update state
    state["humanizedContent"] = humanized_content
    # Also update draftContent so downstream editors/finalizers receive the styled text
    state["draftContent"] = humanized_content
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["status"] = "completed"
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)
    state["cost"] += 0.05
    state["tokens"] += 4500
    
    # Update agent execution in database
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id
    )
    
    return state
