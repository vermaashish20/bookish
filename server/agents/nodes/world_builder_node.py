"""
World Builder Node - Create and manage characters, locations, objects, and other world entities
"""
from agents.orchestration_state import AgentOrchestrationState
from agents.utils import load_prompt
from services.llm_service import call_llm, stream_queue_var, stream_event_type_var
from repository.artifacts import create_artifact
from repository.agent_runs import add_agent_execution, update_agent_execution
from repository.projects import get_project
from repository.characters import add_character, update_character
from repository.entities import add_entity, update_entity
from db.chroma import add_vector_asset
from datetime import datetime
import json
import re


def world_builder_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    World Builder agent node
    - Creates characters with detailed bibles
    - Creates locations, objects, organizations, and other world entities
    - Asks for user confirmation before finalizing to database
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]
    
    if current_task_idx >= len(state["tasks"]):
        return state
    
    current_task = state["tasks"][current_task_idx]
    
    if current_task["agent"] != "world_builder":
        return state
    
    thinking = f"[World Builder] Starting world building task: {current_task['task']}\n"
    
    q = stream_queue_var.get()
    if q:
        q.put({"event": "agent_status", "text": f"🌍 World Builder is creating world elements..."})
    
    # Update task status
    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()
    
    # Add execution to agent_runs
    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="world_builder",
        task_input=current_task["task"],
        status="running"
    )
    
    # Load project context
    project = get_project(project_id)
    
    # Determine what type of entity to create based on task
    task_lower = current_task["task"].lower()
    entity_type = "character"  # default
    
    if any(word in task_lower for word in ["location", "place", "city", "town", "world", "setting"]):
        entity_type = "location"
    elif any(word in task_lower for word in ["object", "item", "artifact", "weapon", "tool"]):
        entity_type = "object"
    elif any(word in task_lower for word in ["organization", "faction", "group", "guild"]):
        entity_type = "organization"
    elif any(word in task_lower for word in ["character", "protagonist", "antagonist", "person"]):
        entity_type = "character"
    
    thinking += f"[World Builder] Detected entity type: {entity_type}\n"
    
    # Build system prompt based on entity type
    if entity_type == "character":
        system_prompt = """You are a character development expert for fiction writing.
Create detailed, compelling characters with rich backstories, motivations, and arcs.

Return your response in this JSON format:
{
  "name": "Character Name",
  "role": "protagonist/antagonist/supporting",
  "arc": "Brief character arc description",
  "attributes": {
    "age": "Age or age range",
    "appearance": "Physical description",
    "personality": "Personality traits",
    "backstory": "Brief backstory",
    "motivation": "What drives them",
    "strengths": "Key strengths",
    "weaknesses": "Key weaknesses",
    "relationships": "Key relationships"
  }
}"""
    else:
        system_prompt = f"""You are a world-building expert for fiction writing.
Create detailed, immersive {entity_type}s that enrich the story world.

Return your response in this JSON format:
{{
  "name": "Entity Name",
  "description": "Detailed description (2-3 paragraphs)",
  "attributes": {{
    "significance": "Why this matters to the story",
    "history": "Background/history",
    "details": "Specific details that make it memorable",
    "connections": "How it connects to other story elements"
  }}
}}"""
    
    user_prompt = f"""
Project: {project.get('title', 'Untitled')}
Genre: {project.get('genre', 'General')}
Tonality: {project.get('tonality', 'Conversational')}

Task: {current_task['task']}

Create a detailed {entity_type} bible entry that fits this project.
"""
    
    thinking += "[World Builder] Generating entity with LLM...\n"
    
    # Get model settings
    import os
    settings = project.get("settings", {})
    planner_model = settings.get("plannerModel", {})
    api_key = planner_model.get("apiKey", "")
    provider = planner_model.get("provider", "NVIDIA")
    model_name = planner_model.get("modelName", "mistralai/mistral-large-3-675b-instruct-2512")
    base_url = planner_model.get("endpointUrl", "")
    
    # Fallback to environment variables
    if not api_key:
        if provider.lower() == "nvidia":
            api_key = os.getenv("NVIDIA_API_KEY", "")
        elif provider.lower() in ("claude", "anthropic"):
            api_key = os.getenv("ANTHROPIC_API_KEY", "")
        elif provider.lower() == "openai":
            api_key = os.getenv("OPENAI_API_KEY", "")
    
    fallback_content = f"{{\"name\": \"Placeholder\", \"description\": \"Please configure API key\"}}"
    
    # Call LLM
    token = stream_event_type_var.set("document_stream")
    try:
        entity_json = call_llm(
            provider=provider,
            model_name=model_name,
            api_key=api_key,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            default_fallback=fallback_content,
            base_url=base_url
        )
    finally:
        stream_event_type_var.reset(token)
    
    thinking += f"[World Builder] Generated entity data: {len(entity_json)} characters\n"
    
    # Parse JSON response
    try:
        # Extract JSON from markdown code blocks if present
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', entity_json, re.DOTALL)
        if json_match:
            entity_json = json_match.group(1)
        
        entity_data = json.loads(entity_json)
    except json.JSONDecodeError as e:
        thinking += f"[World Builder] Warning: Failed to parse JSON: {e}\n"
        entity_data = {
            "name": "Unnamed Entity",
            "description": entity_json,
            "attributes": {}
        }
    
    # Create artifact for tracking
    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="world_builder",
        artifact_type=f"{entity_type}_draft",
        content=json.dumps(entity_data, indent=2),
        metadata={
            "entityType": entity_type,
            "entityName": entity_data.get("name", "Unknown")
        }
    )
    
    thinking += f"[World Builder] Draft created (artifact: {artifact_id})\n"
    
    # Store in state for HITL confirmation
    state["worldBuilderDraft"] = {
        "entityType": entity_type,
        "entityData": entity_data,
        "artifactId": artifact_id
    }
    
    # Ask for user confirmation before saving to database
    from agents.hitl_state import create_hitl_event, get_hitl_response
    
    if q:
        confirmation_text = f"I've created a {entity_type} bible entry for '{entity_data.get('name', 'Unknown')}'. Review the artifact and approve to save to database?"
        q.put({
            "event": "user_confirmation",
            "text": confirmation_text,
            "run_id": state["agentRunId"]
        })
    
    thinking += "[World Builder] Waiting for user confirmation...\n"
    event = create_hitl_event(state["agentRunId"])
    event.wait()
    
    response = get_hitl_response(state["agentRunId"])
    thinking += f"[World Builder] User responded: {response}\n"
    
    if str(response).lower() in ['no', 'reject', 'false']:
        thinking += "[World Builder] User rejected. Not saving to database.\n"
        state["tasks"][current_task_idx]["status"] = "rejected"
    else:
        # User approved - save to database
        if entity_type == "character":
            char_id = add_character(
                project_id=project_id,
                name=entity_data.get("name", "Unnamed Character"),
                role=entity_data.get("role", "supporting"),
                arc=entity_data.get("arc", ""),
                active_chapters=[],
                attributes=entity_data.get("attributes", {}),
                status="draft"
            )
            thinking += f"[World Builder] Character saved to database (id: {char_id}, status: draft)\n"
            state["tasks"][current_task_idx]["characterId"] = char_id
        else:
            entity_id = add_entity(
                project_id=project_id,
                name=entity_data.get("name", "Unnamed Entity"),
                entity_type=entity_type,
                description=entity_data.get("description", ""),
                attributes=entity_data.get("attributes", {}),
                status="draft"
            )
            thinking += f"[World Builder] Entity saved to database (id: {entity_id}, status: draft)\n"
            state["tasks"][current_task_idx]["entityId"] = entity_id
        
        # Index in ChromaDB for semantic search
        add_vector_asset(
            collection_name="semantic_assets",
            doc_id=artifact_id,
            document=json.dumps(entity_data, indent=2),
            metadata={
                "type": "world_bible",
                "projectId": project_id,
                "entityType": entity_type,
                "entityName": entity_data.get("name", "Unknown")
            }
        )
        
        state["tasks"][current_task_idx]["status"] = "completed"
    
    # Update state
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)
    state["cost"] += 0.03
    state["tokens"] += 2000
    
    # Update agent execution
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id
    )
    
    return state
