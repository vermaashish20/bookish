"""
Planner Node - Main brain for book-related work
Understands intent, reads memories, creates execution plans, assigns tasks
"""
from typing import Dict, Any
from agents.orchestration_state import AgentOrchestrationState, PlannerOutput, TaskStatus
from agents.utils import load_prompt, extract_json
from services.llm_service import call_llm, stream_queue_var, stream_event_type_var
from repository.projects import get_project
from repository.project_memory import get_project_memories
from repository.agent_runs import update_agent_run_planner_decision
from db.chroma import query_vector_assets
import json
from datetime import datetime


def planner_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Planner agent node
    - Understands user intent
    - Reads project memories
    - Decides what needs to happen
    - Creates execution plan
    - Assigns tasks to specialist agents
    """
    project_id = state["projectId"]
    user_prompt = state["userPrompt"]
    project_context = state["projectContext"]
    
    thinking = "[Planner] Analyzing user request...\n"
    
    q = stream_queue_var.get()
    if q:
        q.put({"event": "agent_status", "text": "🧠 Planner is organizing the workflow..."})
    
    # Load project and memories
    project = get_project(project_id)
    memories = get_project_memories(project_id, limit=10)
    
    # Query ChromaDB for relevant context
    semantic_results = query_vector_assets(
        collection_name="semantic_assets",
        query_text=user_prompt,
        project_id=project_id,
        limit=5
    )
    
    # Build context for planner
    memory_context = "\n".join([f"- {m['content']}" for m in memories]) if memories else "No previous memories."
    
    context_snippets = []
    for r in semantic_results:
        source_name = r['metadata'].get('sourceName', 'Reference')
        context_snippets.append(f"[{source_name}]: {r['document'][:300]}")
    
    rag_context = "\n\n".join(context_snippets) if context_snippets else "No relevant context found."
    
    # Build planner prompt
    system_prompt = load_prompt("planner")
    
    user_planner_prompt = f"""
Project: {project_context['title']}
Genre: {project_context['genre']}
Tonality: {project_context['tonality']}
Characters: {project_context['characterCount']}
Chapters: {project_context['chapterCount']}

Recent Memories:
{memory_context}

Relevant Context:
{rag_context}

User Request:
{user_prompt}

Analyze this request and create an execution plan. Return a JSON object with:
{{
  "intent": "what the user wants (e.g., write_chapter, research_topic, edit_content)",
  "decision": "what you decided to do",
  "agentsNeeded": ["list of agents: researcher, fact_checker, writer, humanizer, editor"],
  "tasks": [
    {{"agent": "agent_name", "task": "specific task description", "order": 1}}
  ],
  "memoryUpdates": ["any important decisions or constraints to remember"],
  "userVisibleSummary": "short explanation for the user"
}}
"""
    
    thinking += "[Planner] Consulting LLM for execution plan...\n"
    
    # Get planner model settings
    import os
    settings = project.get("settings", {})
    planner_model = settings.get("plannerModel", {})
    api_key = planner_model.get("apiKey", "")
    provider = planner_model.get("provider", "NVIDIA")
    model_name = planner_model.get("modelName", "mistralai/mistral-large-3-675b-instruct-2512")
    base_url = planner_model.get("endpointUrl", "")
    
    # Fallback to environment variables if not in project settings
    if not api_key:
        if provider.lower() == "nvidia":
            api_key = os.getenv("NVIDIA_API_KEY", "")
        elif provider.lower() in ("claude", "anthropic"):
            api_key = os.getenv("ANTHROPIC_API_KEY", "")
        elif provider.lower() == "openai":
            api_key = os.getenv("OPENAI_API_KEY", "")
    
    print(f"[DEBUG PLANNER] Provider: {provider}, Model: {model_name}")
    print(f"[DEBUG PLANNER] API Key present: {bool(api_key)}")
    
    # Fallback plan
    fallback_json = json.dumps({
        "intent": "general_task",
        "decision": "Execute user request with available agents",
        "agentsNeeded": ["writer"],
        "tasks": [
            {"agent": "writer", "task": user_prompt, "order": 1}
        ],
        "memoryUpdates": [],
        "userVisibleSummary": "I'll work on your request."
    })
    
    # Call LLM
    token = stream_event_type_var.set("hidden_stream")
    try:
        response = call_llm(
            provider=provider,
            model_name=model_name,
            api_key=api_key,
            system_prompt=system_prompt,
            user_prompt=user_planner_prompt,
            default_fallback=fallback_json,
            base_url=base_url
        )
    finally:
        stream_event_type_var.reset(token)
    
    # Parse planner output
    try:
        json_str = extract_json(response)
        planner_data = json.loads(json_str)
        thinking += "[Planner] Successfully parsed execution plan.\n"
    except Exception as e:
        thinking += f"[Planner] JSON parsing failed: {e}. Using fallback.\n"
        planner_data = json.loads(fallback_json)
    
    # Create PlannerOutput
    planner_output = PlannerOutput(
        intent=planner_data.get("intent", "general_task"),
        decision=planner_data.get("decision", "Execute request"),
        agentsNeeded=planner_data.get("agentsNeeded", []),
        tasks=planner_data.get("tasks", []),
        memoryUpdates=planner_data.get("memoryUpdates", []),
        userVisibleSummary=planner_data.get("userVisibleSummary", "Working on your request.")
    )
    
    # Create task statuses
    tasks = []
    for task_def in planner_output["tasks"]:
        task_status = TaskStatus(
            agent=task_def["agent"],
            task=task_def["task"],
            status="pending",
            startedAt=None,
            completedAt=None,
            outputArtifactId=None,
            error=None
        )
        tasks.append(task_status)
    
    thinking += f"[Planner] Plan: {planner_output['decision']}\n"
    thinking += f"[Planner] Agents needed: {', '.join(planner_output['agentsNeeded'])}\n"
    
    # Update state
    state["plannerOutput"] = planner_output
    state["tasks"] = tasks
    state["currentTaskIndex"] = 0
    state["thinking_logs"].append(thinking)
    state["cost"] += 0.02
    state["tokens"] += 2000
    
    # Save planner decision to DB
    update_agent_run_planner_decision(
        run_id=state["agentRunId"],
        planner_decision=dict(planner_output)
    )
    
    # Pause for HITL confirmation
    from agents.hitl_state import create_hitl_event, get_hitl_response
    q = stream_queue_var.get()
    if q:
        # Show the plan before asking for confirmation
        plan_text = f"**Planner Analysis:** {planner_output.get('userVisibleSummary', 'I have created an execution plan.')}\n\n**Proposed Tasks:**\n"
        for idx, t in enumerate(planner_output.get('tasks', []), 1):
            plan_text += f"{idx}. **{t['agent'].capitalize()}:** {t['task']}\n"
            
        q.put({
            "event": "chat_message",
            "text": plan_text
        })
        
        q.put({
            "event": "user_confirmation",
            "text": "I have created an execution plan. Do you approve?",
            "run_id": state["agentRunId"]
        })
    
    thinking += "[Planner] Waiting for user confirmation...\n"
    event = create_hitl_event(state["agentRunId"])
    event.wait()
    
    response = get_hitl_response(state["agentRunId"])
    thinking += f"[Planner] User responded: {response}\n"
    
    if str(response).lower() in ['no', 'reject', 'false']:
        raise Exception("Run aborted by user.")
        
    return state
