"""
Researcher Node - Gather and summarize information
"""
from agents.orchestration_state import AgentOrchestrationState
from repository.artifacts import create_artifact
from repository.agent_runs import add_agent_execution, update_agent_execution
from db.chroma import query_vector_assets, add_vector_asset
from services.llm_service import stream_queue_var
from datetime import datetime


def researcher_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Researcher agent node
    - Gathers information from project DB, user assets, and context
    - Returns research notes for other agents
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]
    
    if current_task_idx >= len(state["tasks"]):
        return state
    
    current_task = state["tasks"][current_task_idx]
    
    if current_task["agent"] != "researcher":
        return state
    
    thinking = f"[Researcher] Starting research task: {current_task['task']}\n"
    
    q = stream_queue_var.get()
    if q:
        q.put({"event": "agent_status", "text": "🔍 Researcher is gathering context..."})
    
    # Update task status
    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()
    
    # Add execution to agent_runs
    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="researcher",
        task_input=current_task["task"],
        status="running"
    )
    
    # Query semantic assets
    thinking += "[Researcher] Querying semantic database...\n"
    
    semantic_results = query_vector_assets(
        collection_name="semantic_assets",
        query_text=current_task["task"],
        project_id=project_id,
        limit=5
    )
    
    # Build research notes
    research_notes = f"# Research Notes\n\n"
    research_notes += f"Query: {current_task['task']}\n\n"
    research_notes += f"## Findings\n\n"
    
    if semantic_results:
        for idx, result in enumerate(semantic_results, 1):
            source_name = result['metadata'].get('sourceName', 'Unknown')
            asset_type = result['metadata'].get('assetType', 'Reference')
            content = result['document']
            
            research_notes += f"### Source {idx}: {source_name} ({asset_type})\n\n"
            research_notes += f"{content}\n\n"
            
            thinking += f"[Researcher] Found relevant content from: {source_name}\n"
    else:
        research_notes += "No directly relevant sources found in the project database.\n\n"
        thinking += "[Researcher] No semantic matches found.\n"
    
    research_notes += f"## Summary\n\n"
    research_notes += f"Research completed for: {current_task['task']}\n"
    research_notes += f"Sources reviewed: {len(semantic_results)}\n"
    
    # Create artifact
    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="researcher",
        artifact_type="research_notes",
        content=research_notes,
        metadata={
            "sourcesCount": len(semantic_results),
            "query": current_task["task"]
        }
    )
    
    # Index artifact in ChromaDB for other agents
    add_vector_asset(
        collection_name="semantic_assets",
        doc_id=artifact_id,
        document=research_notes,
        metadata={
            "type": "agent_artifact",
            "projectId": project_id,
            "agentName": "researcher",
            "artifactType": "research_notes"
        }
    )
    
    thinking += f"[Researcher] Research notes created (artifact: {artifact_id})\n"
    
    # Update state
    state["researchNotes"] = research_notes
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["status"] = "completed"
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)
    state["cost"] += 0.01
    state["tokens"] += 500
    
    # Update agent execution
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id
    )
    
    return state
