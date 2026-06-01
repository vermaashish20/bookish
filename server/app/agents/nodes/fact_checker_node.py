"""
Fact-Checker Node - Verify factual accuracy and internal consistency.
Reads draftContent from state; writes factCheckReport to state.
"""
from datetime import datetime

from app.agents.orchestration_state import AgentOrchestrationState
from app.core.model_config import load_model_config
from app.prompts.fact_checker import PROMPT as FACT_CHECKER_PROMPT
from app.infrastructure.llm.service import call_llm, stream_queue_var, stream_event_type_var
from app.repositories.artifacts import create_artifact
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.projects import get_project
from app.repositories.characters import get_project_characters
from app.infrastructure.vector.store import query_documents
from app.core.telemetry import observe


@observe()
def fact_checker_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Fact-Checker agent node.
    - Verifies assertions in draftContent against the character bible and world knowledge
    - Produces a structured fact-check report
    - Guards: skips gracefully if no draftContent exists in state
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]

    if current_task_idx >= len(state["tasks"]):
        return state

    current_task = state["tasks"][current_task_idx]

    if current_task["agent"] != "fact_checker":
        return state

    thinking = f"[Fact-Checker] Starting audit: {current_task['task']}\n"

    q = stream_queue_var.get()
    if q:
        q.put({"event": "agent_status", "text": "🧐 Fact-Checker is auditing the draft..."})

    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="fact_checker",
        task_input=current_task["task"],
        status="running",
    )

    # Guard: fact_checker requires draftContent
    text_to_audit = state.get("draftContent") or ""
    if not text_to_audit:
        thinking += "[Fact-Checker] No draftContent in state — skipping audit.\n"
        state["tasks"][current_task_idx]["status"] = "failed"
        state["tasks"][current_task_idx]["error"] = "No draft content to audit."
        state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
        state["currentTaskIndex"] += 1
        state["thinking_logs"].append(thinking)
        update_agent_execution(
            run_id=state["agentRunId"],
            execution_index=exec_idx,
            status="failed",
        )
        return state

    project = get_project(project_id)
    model = load_model_config(
        project, "factCheckerModel", fallback_keys=["writerModel", "plannerModel"]
    )
    project_ctx = state["projectContext"]

    # Character bible — include full attributes for consistency checks
    characters = get_project_characters(project_id)
    char_bible_block = ""
    if characters:
        lines = ["CHARACTER BIBLE:"]
        for char in characters[:10]:
            lines.append(f"  Name:   {char['name']}")
            lines.append(f"  Role:   {char['role']}")
            lines.append(f"  Arc:    {char.get('arc', 'N/A')}")
            attrs = char.get("attributes") or char.get("bible") or {}
            if attrs:
                lines.append(f"  Attrs:  {str(attrs)[:200]}")
            lines.append("")
        char_bible_block = "\n".join(lines)

    # Semantic grounding from vector DB
    semantic_results = query_documents(
        collection_name="world_system",
        query_text=current_task["task"] or text_to_audit[:300],
        project_id=project_id,
        limit=5,
    )
    grounding_block = ""
    if semantic_results:
        lines = ["WORLD KNOWLEDGE (from RAG):"]
        for idx, res in enumerate(semantic_results, 1):
            source = res["metadata"].get("sourceName", "Context")
            lines.append(f"  [{idx}] {source}:\n  {res['document'][:300]}")
        grounding_block = "\n".join(lines)
    else:
        grounding_block = "WORLD KNOWLEDGE: No matching records found in vector DB."

    thinking += f"[Fact-Checker] Grounding sources: {len(semantic_results)}\n"

    context_block = f"""
TASK:
{current_task['task']}

BOOK CONTEXT:
  Title:    {project_ctx.get('title', 'Untitled')}
  Genre:    {project_ctx.get('genre', 'Unknown')}
  Chapters: {project_ctx.get('chapterCount', 0)}

{char_bible_block}

{grounding_block}

DRAFT TO AUDIT:
{text_to_audit}
""".strip()

    default_report = (
        f"# Fact Check Audit Report\n\nAudit for: {current_task['task']}\nStatus: Verified (Fallback)"
    )

    token = stream_event_type_var.set("hidden_stream")
    try:
        report_content = call_llm(
            provider=model["provider"],
            model_name=model["model_name"],
            api_key=model["api_key"],
            system_prompt=FACT_CHECKER_PROMPT,
            user_prompt=context_block,
            default_fallback=default_report,
            base_url=model["base_url"],
        )
    finally:
        stream_event_type_var.reset(token)

    thinking += "[Fact-Checker] Audit complete.\n"

    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="fact_checker",
        artifact_type="fact_check_report",
        content=report_content,
        metadata={
            "task": current_task["task"],
            "groundingSourcesCount": len(semantic_results),
        },
    )

    thinking += f"[Fact-Checker] Report saved: {artifact_id}\n"

    # Surface result to user via stream (non-blocking)
    if q:
        q.put({
            "event": "agent_status",
            "text": "✅ Fact-check audit complete. Review the artifact in the Agent Flow trace.",
        })

    state["factCheckReport"] = report_content
    state["artifactIds"].append(artifact_id)
    state["tasks"][current_task_idx]["status"] = "completed"
    state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
    state["tasks"][current_task_idx]["outputArtifactId"] = artifact_id
    state["currentTaskIndex"] += 1
    state["thinking_logs"].append(thinking)

    update_agent_execution(
        run_id=state["agentRunId"],
        execution_index=exec_idx,
        status="completed",
        output_artifact_id=artifact_id,
    )

    return state
