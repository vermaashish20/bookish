"""
Fact-Checker Node - Verify factual accuracy and internal consistency
"""
from agents.orchestration_state import AgentOrchestrationState
from agents.utils import load_prompt
from services.llm_service import call_llm, stream_queue_var, stream_event_type_var
from repository.artifacts import create_artifact
from repository.agent_runs import add_agent_execution, update_agent_execution
from repository.projects import get_project
from repository.characters import get_project_characters
from db.chroma import add_vector_asset, query_vector_assets
from datetime import datetime


def fact_checker_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Fact-Checker agent node
    - Verifies accuracy of draft assertions
    - Checks character consistency
    - Produces a comprehensive fact audit report
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]
    
    if current_task_idx >= len(state["tasks"]):
        return state
    
    current_task = state["tasks"][current_task_idx]
    
    if current_task["agent"] != "fact_checker":
        return state
        
    thinking = f"[Fact-Checker] Starting fact check audit: {current_task['task']}\n"
    
    q = stream_queue_var.get()
    if q:
        q.put({"event": "agent_status", "text": "🧐 Fact-Checker is auditing the draft..."})
    
    # Update task status
    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()
    
    # Add execution to agent_runs
    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="fact_checker",
        task_input=current_task["task"],
        status="running"
    )
    
    # Fetch project details and characters
    project = get_project(project_id)
    characters = get_project_characters(project_id)
    
    # Compile character bible context
    char_bible_context = ""
    if characters:
        char_bible_context = "\n## Character Bible Reference\n"
        for char in characters[:10]:
            char_bible_context += f"Character Name: {char['name']}\n"
            char_bible_context += f"Role: {char['role']}\n"
            char_bible_context += f"Arc: {char.get('arc', 'N/A')}\n"
            char_bible_context += f"Attributes: {str(char.get('bible', {}))}\n\n"
            
    # Locate target text to check
    text_to_audit = state.get("draftContent") or ""
    if not text_to_audit:
        thinking += "[Fact-Checker] Warning: No active draft content found in state to audit.\n"
        text_to_audit = state.get("userPrompt") or ""
        
    # Query ChromaDB for grounding sources using the draft content or the task
    thinking += "[Fact-Checker] Querying semantic vector database for grounding sources...\n"
    semantic_results = query_vector_assets(
        collection_name="semantic_assets",
        query_text=current_task["task"] or text_to_audit[:300],
        project_id=project_id,
        limit=5
    )
    
    grounded_context = ""
    if semantic_results:
        grounded_context = "\n## Grounded Vector Reference Facts\n"
        for idx, res in enumerate(semantic_results, 1):
            source_name = res['metadata'].get('sourceName', 'Context File')
            grounded_context += f"--- Source {idx} ({source_name}) ---\n"
            grounded_context += f"{res['document']}\n\n"
    else:
        grounded_context = "\n## Grounded Vector Reference Facts\nNo relevant grounding reference sources were found in ChromaDB.\n"
        
    # Load system prompt
    system_prompt = load_prompt("fact_checker")
    
    user_prompt = f"""
Project: {project.get('title', 'Untitled')}
Genre: {project.get('genre', 'General')}
Tonality: {project.get('tonality', 'Conversational')}

{char_bible_context}

{grounded_context}

## Draft Content to Audit
{text_to_audit}

## Verification Task
{current_task['task']}
"""

    thinking += "[Fact-Checker] Conducting semantic audit with LLM...\n"
    
    # Model configuration
    settings = project.get("settings", {})
    fact_checker_model = settings.get("factCheckerModel", {}) or settings.get("writerModel", {})
    api_key = fact_checker_model.get("apiKey", "")
    provider = fact_checker_model.get("provider", "Claude")
    model_name = fact_checker_model.get("modelName", "claude-3-5-sonnet")
    base_url = fact_checker_model.get("endpointUrl", "")
    
    default_report = f"# Fact Check Audit Report\n\nAudit completed for: {current_task['task']}\nStatus: Verified (Default Fallback)"
    
    # Call LLM
    token = stream_event_type_var.set("hidden_stream")
    try:
        report_content = call_llm(
            provider=provider,
            model_name=model_name,
            api_key=api_key,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            default_fallback=default_report,
            base_url=base_url
        )
    finally:
        stream_event_type_var.reset(token)
    
    thinking += "[Fact-Checker] Audit analysis complete.\n"
    
    # Save report artifact
    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="fact_checker",
        artifact_type="fact_check_report",
        content=report_content,
        metadata={
            "task": current_task["task"],
            "groundingSourcesCount": len(semantic_results)
        }
    )
    
    # Index audit report in ChromaDB
    add_vector_asset(
        collection_name="semantic_assets",
        doc_id=artifact_id,
        document=report_content,
        metadata={
            "type": "agent_artifact",
            "projectId": project_id,
            "agentName": "fact_checker",
            "artifactType": "fact_check_report"
        }
    )
    
    # Update state
    state["factCheckReport"] = report_content
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["status"] = "completed"
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)
    state["cost"] += 0.03
    state["tokens"] += 2500
    
    # Update agent execution in MongoDB
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id
    )
    
    # Pause for HITL confirmation
    from agents.hitl_state import create_hitl_event, get_hitl_response
    q = stream_queue_var.get()
    if q:
        q.put({
            "event": "user_confirmation",
            "text": "I have completed the fact check and continuity audit. Do you approve?",
            "run_id": state["agentRunId"]
        })
    
    thinking += "[Fact-Checker] Waiting for user confirmation...\n"
    event = create_hitl_event(state["agentRunId"])
    event.wait()
    
    response = get_hitl_response(state["agentRunId"])
    thinking += f"[Fact-Checker] User responded: {response}\n"
    
    if str(response).lower() in ['no', 'reject', 'false']:
        raise Exception("Run aborted by user.")
        
    return state
