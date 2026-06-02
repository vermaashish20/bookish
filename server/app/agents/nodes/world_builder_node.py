"""
World Builder Node - Create characters, locations, objects, and organizations.
Writes worldBuilderDraft to state; saves to DB after HITL confirmation.
"""
import json
import re
from datetime import datetime

from app.agents.orchestration_state import AgentOrchestrationState
from app.core.model_config import load_model_config
from app.prompts.world_builder import CHARACTER_PROMPT, ENTITY_PROMPT
from app.infrastructure.llm.service import call_llm
from app.agents.streaming import publish_status, stream_event_type_var
from app.repositories.artifacts import create_artifact
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.projects import get_project
from app.repositories.characters import add_character
from app.repositories.entities import add_entity
from app.core.telemetry import observe


# Maps task keywords → entity type
_ENTITY_TYPE_KEYWORDS = {
    "location": ["location", "place", "city", "town", "world", "setting", "region", "map"],
    "object":   ["object", "item", "artifact", "weapon", "tool", "relic"],
    "organization": ["organization", "faction", "group", "guild", "order", "clan"],
}


def _detect_entity_type(task: str) -> str:
    task_lower = task.lower()
    for entity_type, keywords in _ENTITY_TYPE_KEYWORDS.items():
        if any(kw in task_lower for kw in keywords):
            return entity_type
    return "character"  # default


@observe()
def world_builder_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    World Builder agent node.
    - Creates entity bible entries (characters, locations, objects, organizations)
    - Requests HITL confirmation before persisting to DB
    - Stores worldBuilderDraft in state during HITL staging
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]

    if current_task_idx >= len(state["tasks"]):
        return state

    current_task = state["tasks"][current_task_idx]

    if current_task["agent"] != "world_builder":
        return state

    thinking = f"[World Builder] Starting task: {current_task['task']}\n"

    publish_status("World Builder is creating world elements...")

    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="world_builder",
        task_input=current_task["task"],
        status="running",
    )

    project = get_project(project_id)
    model = load_model_config(
        project, "worldBuilderModel", fallback_keys=["plannerModel", "writerModel"]
    )
    project_ctx = state["projectContext"]

    entity_type = _detect_entity_type(current_task["task"])
    thinking += f"[World Builder] Detected entity type: {entity_type}\n"

    system_prompt = (
        CHARACTER_PROMPT if entity_type == "character"
        else ENTITY_PROMPT.format(entity_type=entity_type)
    )

    context_block = f"""
TASK:
{current_task['task']}

BOOK CONTEXT:
  Title:      {project_ctx.get('title', 'Untitled')}
  Genre:      {project_ctx.get('genre', 'Unknown')}
  Tone:       {project_ctx.get('tonality', 'Unknown')}
  Characters: {project_ctx.get('characterCount', 0)} existing
  Chapters:   {project_ctx.get('chapterCount', 0)}

Create a detailed {entity_type} bible entry that fits this project. Output valid JSON only.
""".strip()

    fallback_content = json.dumps({"name": "Placeholder", "description": "Configure API key."})

    token = stream_event_type_var.set("document_stream")
    try:
        entity_json_raw = call_llm(
            provider=model["provider"],
            model_name=model["model_name"],
            api_key=model["api_key"],
            system_prompt=system_prompt,
            user_prompt=context_block,
            default_fallback=fallback_content,
            base_url=model["base_url"],
        )
    finally:
        stream_event_type_var.reset(token)

    thinking += f"[World Builder] LLM response received ({len(entity_json_raw)} chars).\n"

    # Parse JSON — strip markdown code fences if present
    try:
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", entity_json_raw, re.DOTALL)
        entity_data = json.loads(json_match.group(1) if json_match else entity_json_raw)
    except (json.JSONDecodeError, AttributeError) as e:
        thinking += f"[World Builder] JSON parse failed ({e}); using raw text as description.\n"
        entity_data = {"name": "Unnamed Entity", "description": entity_json_raw, "attributes": {}}

    # Draft artifact (before HITL)
    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="world_builder",
        artifact_type=f"{entity_type}_draft",
        content=json.dumps(entity_data, indent=2),
        metadata={
            "entityType": entity_type,
            "entityName": entity_data.get("name", "Unknown"),
        },
    )

    thinking += f"[World Builder] Draft artifact: {artifact_id}\n"

    # Stage in state for HITL
    state["worldBuilderDraft"] = {
        "entityType": entity_type,
        "entityData": entity_data,
        "artifactId": artifact_id,
    }

    from app.agents.runtime import wait_for_hitl

    summary = (
        f"I've created a **{entity_type}** bible for "
        f"**{entity_data.get('name', 'Unknown')}**. "
        "Approve to save to the project database."
    )
    thinking += "[World Builder] Waiting for user confirmation...\n"
    hitl_response = wait_for_hitl(
        state,
        summary_text=summary,
        prompt_text="Save this world-building entry to the database?",
    )
    thinking += f"[World Builder] User responded: {hitl_response}\n"

    task_status = "completed"
    exec_status = "completed"
    if str(hitl_response).lower() in ["no", "reject", "false"]:
        thinking += "[World Builder] User rejected — not saving to database.\n"
        task_status = "rejected"
        exec_status = "failed"
    else:
        # Persist to DB
        if entity_type == "character":
            char_id = add_character(
                project_id=project_id,
                name=entity_data.get("name", "Unnamed Character"),
                role=entity_data.get("role", "supporting"),
                arc=entity_data.get("arc", ""),
                active_chapters=[],
                attributes=entity_data.get("attributes", {}),
                status="draft",
            )
            thinking += f"[World Builder] Character saved (id: {char_id})\n"
            state["tasks"][current_task_idx]["characterId"] = char_id
        else:
            entity_id = add_entity(
                project_id=project_id,
                name=entity_data.get("name", "Unnamed Entity"),
                entity_type=entity_type,
                description=entity_data.get("description", ""),
                attributes=entity_data.get("attributes", {}),
                status="draft",
            )
            thinking += f"[World Builder] Entity saved (id: {entity_id})\n"
            state["tasks"][current_task_idx]["entityId"] = entity_id

    state["tasks"][current_task_idx]["status"] = task_status  # type: ignore[assignment]

    state["worldBuilderDraft"] = None  # Clear staging after HITL
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)

    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status=exec_status,
        output_artifact_id=artifact_id,
    )

    return state
