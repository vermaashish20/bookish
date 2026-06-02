"""
Writer Node - Create narrative drafts and persist as chapters.
"""
from app.core.telemetry import observe

from app.agents.orchestration_state import AgentOrchestrationState
from app.agents.runtime import (
    begin_task,
    complete_task_and_advance,
    get_current_task,
    resolve_task_context,
    run_react_loop,
)
from app.core.model_config import load_model_config
from app.prompts.writer import PROMPT as WRITER_PROMPT
from app.repositories.artifacts import create_artifact
from app.repositories.chapters import add_chapter, get_project_chapters
from app.repositories.characters import get_project_characters
from app.repositories.projects import get_project
from app.infrastructure.llm.service import call_llm
from app.agents.streaming import publish_status, stream_event_type_var


@observe()
def writer_node(state: AgentOrchestrationState) -> AgentOrchestrationState:
    match = get_current_task(state, "writer")
    if not match:
        return state

    task_idx, current_task = match
    project_id = state["projectId"]
    thinking = f"[Writer] Starting task: {current_task['task']}\n"

    publish_status("Writer is generating content...")

    task_idx, exec_idx = begin_task(state, "writer", current_task["task"])

    project = get_project(project_id)
    model = load_model_config(project, "writerModel")
    project_ctx = state["projectContext"]

    task_lower = current_task["task"].lower()
    needs_characters = any(
        kw in task_lower
        for kw in ["character", "dialogue", "scene", "protagonist", "antagonist", "person"]
    )
    char_block = ""
    if needs_characters:
        characters = get_project_characters(project_id)
        if characters:
            char_lines = [
                f"  - {c['name']} ({c['role']}): {c.get('arc', '')}"
                for c in characters[:10]
            ]
            char_block = "CHARACTERS:\n" + "\n".join(char_lines)

    research_block = ""
    if state.get("researchNotes"):
        notes = state["researchNotes"]
        trimmed = notes[:2000] + ("..." if len(notes) > 2000 else "")
        research_block = f"RESEARCH NOTES:\n{trimmed}"

    fact_block = ""
    if state.get("factCheckReport"):
        report = state["factCheckReport"]
        trimmed = report[:1500] + ("..." if len(report) > 1500 else "")
        fact_block = f"FACT-CHECK FEEDBACK (address in draft):\n{trimmed}"

    prior_context = resolve_task_context(state, current_task)

    context_block = f"""
TASK:
{current_task['task']}

BOOK CONTEXT:
  Title:  {project_ctx.get('title', 'Untitled')}
  Genre:  {project_ctx.get('genre', 'Unknown')}
  Tone:   {project_ctx.get('tonality', 'Unknown')}

{char_block}

{research_block}

{fact_block}

{prior_context}

Write engaging prose. Target 500–1000 words. Follow the project's voice, genre, and tone.
""".strip()

    fallback_content = (
        f"[Draft for: {current_task['task']}]\n\n"
        "Placeholder draft. Configure Writer model API key to generate actual content."
    )

    token = stream_event_type_var.set("document_stream")
    try:
        react = run_react_loop(
            project_id=project_id,
            system_prompt=WRITER_PROMPT,
            base_user_prompt=context_block + (
                "\n\nOutput final prose as Markdown (not JSON) when done."
            ),
            call_llm=call_llm,
            llm_kwargs={
                "provider": model["provider"],
                "model_name": model["model_name"],
                "api_key": model["api_key"],
                "default_fallback": fallback_content,
                "base_url": model["base_url"],
            },
            fallback_content=fallback_content,
            thinking_prefix="[Writer] ",
        )
    finally:
        stream_event_type_var.reset(token)

    thinking += react.thinking
    draft_content = react.content or fallback_content
    word_count = len(draft_content.split())

    artifact_id = create_artifact(
        project_id=project_id,
        agent_run_id=state["agentRunId"],
        agent_name="writer",
        artifact_type="draft",
        content=draft_content,
        metadata={"wordCount": word_count, "task": current_task["task"]},
    )

    existing_chapters = get_project_chapters(project_id)
    next_number = len(existing_chapters) + 1
    title = f"Chapter {next_number}"
    first_line = draft_content.split("\n")[0].strip()
    if first_line.startswith(("**Chapter", "Chapter", "#")):
        title = first_line.replace("*", "").replace("#", "").strip()

    chapter_id = add_chapter(
        project_id=project_id,
        number=next_number,
        title=title,
        content=draft_content,
        word_count=word_count,
        status="draft",
    )

    state["tasks"][task_idx]["chapterId"] = chapter_id
    state["draftContent"] = draft_content
    state["artifactIds"].append(artifact_id)
    state["thinking_logs"].append(thinking)
    complete_task_and_advance(state, task_idx, exec_idx, artifact_id)

    return state
