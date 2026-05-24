"""
Writer Node - Create new book content
"""
from agents.orchestration_state import AgentOrchestrationState
from agents.utils import load_prompt
from services.llm_service import call_llm, stream_queue_var, stream_event_type_var
from repository.artifacts import create_artifact
from repository.agent_runs import add_agent_execution, update_agent_execution
from repository.projects import get_project
from repository.characters import get_project_characters
from db.chroma import add_vector_asset
from datetime import datetime


def writer_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Writer agent node
    - Creates new book content (scenes, chapters, dialogue, descriptions)
    - Follows project voice, genre, POV, tense
    - Uses research notes when available
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]
    
    if current_task_idx >= len(state["tasks"]):
        return state
    
    current_task = state["tasks"][current_task_idx]
    
    if current_task["agent"] != "writer":
        return state
    
    thinking = f"[Writer] Starting writing task: {current_task['task']}\n"
    
    q = stream_queue_var.get()
    if q:
        q.put({"event": "agent_status", "text": f"✍️ Writer is generating content..."})
    
    # Update task status
    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()
    
    # Add execution to agent_runs
    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="writer",
        task_input=current_task["task"],
        status="running"
    )
    
    # Load project context
    project = get_project(project_id)
    characters = get_project_characters(project_id)
    
    # Build character context
    char_context = ""
    if characters:
        char_context = "\n\n## Characters\n\n"
        for char in characters[:10]:  # Limit to 10 characters
            char_context += f"**{char['name']}** ({char['role']})\n"
            char_context += f"Arc: {char.get('arc', 'N/A')}\n\n"
    
    # Get research notes if available
    research_context = ""
    if state.get("researchNotes"):
        research_context = f"\n\n## Research Context\n\n{state['researchNotes']}\n"
        thinking += "[Writer] Using research notes from Researcher\n"
    
    # Build writer prompt
    system_prompt = load_prompt("writer")
    
    user_writer_prompt = f"""
Project: {project.get('title', 'Untitled')}
Genre: {project.get('genre', 'General')}
Tonality: {project.get('tonality', 'Conversational')}

{char_context}

{research_context}

Task: {current_task['task']}

Write the content following the project's voice and style. Be creative and engaging.
Target: 500-1000 words.
"""
    
    thinking += "[Writer] Generating content with LLM...\n"
    
    # Get writer model settings
    settings = project.get("settings", {})
    writer_model = settings.get("writerModel", {})
    api_key = writer_model.get("apiKey", "")
    provider = writer_model.get("provider", "Claude")
    model_name = writer_model.get("modelName", "claude-3-5-sonnet")
    base_url = writer_model.get("endpointUrl", "")
    
    # Fallback content
    fallback_content = f"[Draft content for: {current_task['task']}]\n\nThis is a placeholder draft. Please configure your Writer model API key to generate actual content."
    
    # Call LLM
    token = stream_event_type_var.set("document_stream")
    try:
        draft_content = call_llm(
            provider=provider,
            model_name=model_name,
            api_key=api_key,
            system_prompt=system_prompt,
            user_prompt=user_writer_prompt,
            default_fallback=fallback_content,
            base_url=base_url
        )
    finally:
        stream_event_type_var.reset(token)
    
    thinking += f"[Writer] Generated {len(draft_content.split())} words\n"
    
    # Calculate word count
    word_count = len(draft_content.split())
    
    # Create artifact
    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="writer",
        artifact_type="draft",
        content=draft_content,
        metadata={
            "wordCount": word_count,
            "task": current_task["task"]
        }
    )
    
    # Index artifact in ChromaDB
    add_vector_asset(
        collection_name="semantic_assets",
        doc_id=artifact_id,
        document=draft_content,
        metadata={
            "type": "agent_artifact",
            "projectId": project_id,
            "agentName": "writer",
            "artifactType": "draft",
            "wordCount": word_count
        }
    )
    
    thinking += f"[Writer] Draft created (artifact: {artifact_id})\n"
    
    # Save draft as chapter in MongoDB with status="draft"
    from repository.chapters import add_chapter, get_project_chapters
    existing_chapters = get_project_chapters(project_id)
    next_number = len(existing_chapters) + 1
    
    # Extract title from first line or use default
    title = f"Chapter {next_number}"
    first_line = draft_content.split('\n')[0].strip()
    if first_line.startswith('**Chapter') or first_line.startswith('Chapter') or first_line.startswith('#'):
        title = first_line.replace('*', '').replace('#', '').strip()
    
    chapter_id = add_chapter(
        project_id=project_id,
        number=next_number,
        title=title,
        content=draft_content,
        word_count=word_count,
        status="draft"
    )
    
    thinking += f"[Writer] Draft saved as Chapter {next_number} (status: draft, id: {chapter_id})\n"
    
    # Store chapter_id in task metadata for editor to reference
    state["tasks"][current_task_idx]["chapterId"] = chapter_id
    
    # Update state
    state["draftContent"] = draft_content
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["status"] = "completed"
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)
    state["cost"] += 0.05
    state["tokens"] += 4000
    
    # Update agent execution
    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id
    )
    
    return state
