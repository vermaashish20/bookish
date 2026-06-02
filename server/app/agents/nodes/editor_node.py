"""
Editor Node - Polish, proofread, and finalize prose.
Reads humanizedContent (preferred) or draftContent from state; writes editedContent to state.
"""
from datetime import datetime

from app.agents.orchestration_state import AgentOrchestrationState
from app.core.model_config import load_model_config
from app.prompts.editor import PROMPT as EDITOR_PROMPT
from app.infrastructure.llm.service import call_llm
from app.agents.streaming import publish_status, stream_event_type_var
from app.repositories.artifacts import create_artifact
from app.repositories.agent_runs import add_agent_execution, update_agent_execution
from app.repositories.projects import get_project, get_book_summary, update_book_summary
from app.repositories.chapters import update_chapter_content, update_chapter_summary
from app.core.telemetry import observe


@observe()
def editor_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    """
    Editor agent node.
    - Edits for grammar, pacing, structure, and readability
    - Prefers humanizedContent, falls back to draftContent
    - Guards: skips gracefully if neither exists
    - Updates the chapter in MongoDB to 'published' on completion
    """
    project_id = state["projectId"]
    current_task_idx = state["currentTaskIndex"]

    if current_task_idx >= len(state["tasks"]):
        return state

    current_task = state["tasks"][current_task_idx]

    if current_task["agent"] != "editor":
        return state

    thinking = f"[Editor] Starting task: {current_task['task']}\n"

    publish_status("Editor is polishing the draft...")

    state["tasks"][current_task_idx]["status"] = "running"
    state["tasks"][current_task_idx]["startedAt"] = datetime.utcnow().isoformat()

    exec_idx = add_agent_execution(
        run_id=state["agentRunId"],
        agent="editor",
        task_input=current_task["task"],
        status="running",
    )

    # Source text: prefer humanized version, then draft
    # NOTE: humanizedContent takes priority as it is the most refined version
    source_text = state.get("humanizedContent") or state.get("draftContent") or ""
    if not source_text:
        thinking += "[Editor] No source text in state (neither humanizedContent nor draftContent) — skipping.\n"
        state["tasks"][current_task_idx]["status"] = "failed"
        state["tasks"][current_task_idx]["error"] = "No content to edit."
        state["tasks"][current_task_idx]["completedAt"] = datetime.utcnow().isoformat()
        state["currentTaskIndex"] += 1
        state["thinking_logs"].append(thinking)
        update_agent_execution(
            run_id=state["agentRunId"],
            execution_index=exec_idx,
            status="failed",
        )
        return state

    source_label = "humanized" if state.get("humanizedContent") else "draft"
    thinking += f"[Editor] Using {source_label} content as input.\n"

    project = get_project(project_id)
    model = load_model_config(
        project, "editorModel", fallback_keys=["writerModel"]
    )
    project_ctx = state["projectContext"]

    context_block = f"""
TASK:
{current_task['task']}

BOOK CONTEXT:
  Title:  {project_ctx.get('title', 'Untitled')}
  Genre:  {project_ctx.get('genre', 'Unknown')}
  Tone:   {project_ctx.get('tonality', 'Unknown')}

TEXT TO EDIT:
{source_text}
""".strip()

    token = stream_event_type_var.set("document_stream")
    try:
        edited_content = call_llm(
            provider=model["provider"],
            model_name=model["model_name"],
            api_key=model["api_key"],
            system_prompt=EDITOR_PROMPT,
            user_prompt=context_block,
            default_fallback=source_text,  # safe fallback: return source unchanged
            base_url=model["base_url"],
        )
    finally:
        stream_event_type_var.reset(token)

    word_count = len(edited_content.split())
    thinking += f"[Editor] Complete. Word count: {word_count}\n"

    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="editor",
        artifact_type="edited_content",
        content=edited_content,
        metadata={"wordCount": word_count, "task": current_task["task"]},
    )

    thinking += f"[Editor] Artifact saved: {artifact_id}\n"

    # Update the chapter to 'published'. Use the nearest preceding writer task so
    # multi-chapter plans do not repeatedly publish the first generated chapter.
    chapter_id = None
    for task in reversed(state["tasks"][:current_task_idx]):
        if task.get("agent") == "writer" and task.get("chapterId"):
            chapter_id = task["chapterId"]
            break
    if not chapter_id:
        for task in reversed(state["tasks"]):
            if task.get("agent") == "writer" and task.get("chapterId"):
                chapter_id = task["chapterId"]
                break

    if chapter_id:
        # Generate a one-paragraph chapter summary for lightweight context
        summary_prompt = (
            f"Write a single concise paragraph (50-80 words) summarising what happens in this chapter. "
            f"Focus on plot events and character actions only. No style commentary.\n\n{edited_content[:3000]}"
        )
        token2 = stream_event_type_var.set("hidden_stream")
        try:
            chapter_summary = call_llm(
                provider=model["provider"],
                model_name=model["model_name"],
                api_key=model["api_key"],
                system_prompt="You are a precise literary summariser. Output only the summary paragraph, nothing else.",
                user_prompt=summary_prompt,
                default_fallback="Chapter published.",
                base_url=model["base_url"],
            )
        finally:
            stream_event_type_var.reset(token2)
        chapter_summary = chapter_summary.strip()[:500]  # hard cap

        update_chapter_content(
            chapter_id=chapter_id,
            content=edited_content,
            word_count=word_count,
            status="published",
            summary=chapter_summary,
        )
        thinking += f"[Editor] Chapter {chapter_id} updated to 'published' with summary.\n"

        # Update rolling book summary
        existing_summary = get_book_summary(project_id)
        book_summary_prompt = (
            "You maintain a rolling ≤400-word 'story so far' summary for a book author. "
            "Given the existing summary and the new chapter summary, produce an updated summary. "
            "Be concise. Cover all key plot events, character arcs, and unresolved threads. "
            "Output ONLY the updated summary paragraph, nothing else.\n\n"
            f"EXISTING SUMMARY:\n{existing_summary or 'The story has just begun.'}\n\n"
            f"NEW CHAPTER SUMMARY:\n{chapter_summary}"
        )
        token3 = stream_event_type_var.set("hidden_stream")
        try:
            updated_book_summary = call_llm(
                provider=model["provider"],
                model_name=model["model_name"],
                api_key=model["api_key"],
                system_prompt="You are a precise literary summariser. Output only the updated summary, nothing else.",
                user_prompt=book_summary_prompt,
                default_fallback=existing_summary or chapter_summary,
                base_url=model["base_url"],
            )
        finally:
            stream_event_type_var.reset(token3)
        updated_book_summary = updated_book_summary.strip()[:2000]  # hard cap ~400 words
        update_book_summary(project_id, updated_book_summary)
        thinking += f"[Editor] Book summary updated ({len(updated_book_summary.split())} words).\n"
    else:
        update_chapter_content(
            chapter_id=chapter_id,
            content=edited_content,
            word_count=word_count,
            status="published",
        ) if chapter_id else None
        thinking += "[Editor] Warning: no chapterId found from writer task; chapter not updated.\n"

    # editedContent is the canonical final output; draftContent is updated for finalize_node
    state["editedContent"] = edited_content
    state["draftContent"] = edited_content
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

    publish_status("Editorial polish complete. Review the final draft in the Agent Flow trace.")

    return state
