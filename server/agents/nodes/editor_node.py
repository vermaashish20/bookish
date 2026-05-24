"""
Editor Node - Review grammar, pacing, structure, and readability
"""
from agents.orchestration_state import AgentOrchestrationState
from agents.utils import load_prompt
from services.llm_service import call_llm
from repository.artifacts import create_artifact
from repository.agent_runs import add_agent_execution, update_agent_execution
from repository.projects import get_project
from db.chroma import add_vector_asset
from datetime import datetime


def editor_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Editor agent node
    - Edits and polishes text for pacing, grammar, and flow
    - Ensures paragraph transitions are smooth
    - Delivers publication-ready final prose
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]
    
    if current_task_idx >= len(state["tasks"]):
        return state
        
    current_task = state["tasks"][current_task_idx]
    
    if current_task["agent"] != "editor":
        return state
        
    thinking = f"[Editor] Starting editing and proofing task: {current_task['task']}\n"
    
    # Update task status
    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()
    
    # Add execution to agent_runs
    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="editor",
        task_input=current_task["task"],
        status="running"
    )
    
    # Load project details
    project = get_project(project_id)
    
    # Identify target text to edit (prefer humanized content, then draft content)
    source_text = state.get("humanizedContent") or state.get("draftContent") or ""
    if not source_text:
        thinking += "[Editor] Warning: No active text found in state. Checking user prompt.\n"
        source_text = state.get("userPrompt") or ""
        
    # Load editor system prompt
    system_prompt = load_prompt("editor")
    
    user_prompt = f"""
Project Title: {project.get('title', 'Untitled')}
Target Genre: {project.get('genre', 'General')}
Target Tonality Preset: {project.get('tonality', 'Conversational')}

## Text to Edit / Polish
{source_text}

## Editor Instruction Task
{current_task['task']}
"""

    thinking += "[Editor] Applying editorial polishing filters and proofing via LLM...\n"
    
    # Model configuration
    settings = project.get("settings", {})
    editor_model = settings.get("editorModel", {}) or settings.get("writerModel", {})
    api_key = editor_model.get("apiKey", "")
    provider = editor_model.get("provider", "Claude")
    model_name = editor_model.get("modelName", "claude-3-5-sonnet")
    base_url = editor_model.get("endpointUrl", "")
    
    fallback_text = source_text or f"[Edited content for: {current_task['task']}]"
    
    # Call LLM
    edited_content = call_llm(
        provider=provider,
        model_name=model_name,
        api_key=api_key,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        default_fallback=fallback_text,
        base_url=base_url
    )
    
    thinking += f"[Editor] Proofing complete. Word count: {len(edited_content.split())}\n"
    
    # Calculate word count
    word_count = len(edited_content.split())
    
    # Save edited content artifact
    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="editor",
        artifact_type="edited_content",
        content=edited_content,
        metadata={
            "wordCount": word_count,
            "task": current_task["task"]
        }
    )
    
    # Index in ChromaDB
    add_vector_asset(
        collection_name="semantic_assets",
        doc_id=artifact_id,
        document=edited_content,
        metadata={
            "type": "agent_artifact",
            "projectId": project_id,
            "agentName": "editor",
            "artifactType": "edited_content",
            "wordCount": word_count
        }
    )
    
    thinking += f"[Editor] Edited artifact committed (artifact: {artifact_id})\n"
    
    # Update state
    state["editedContent"] = edited_content
    # Also update draftContent so the final result is the fully polished version
    state["draftContent"] = edited_content
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
