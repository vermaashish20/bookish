from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from app.repositories.assets import add_user_asset
from app.repositories.projects import (
    DEFAULT_PROJECT_SETTINGS,
    create_project,
    delete_project,
    get_all_projects,
    get_project,
    get_project_settings,
    get_project_summary,
    get_unified_project_payload,
    update_project_settings,
)
from app.repositories.artifacts import get_artifact
from app.schemas import AssetUploadPayload, CreateProjectPayload, UpdateSettingsPayload
from app.repositories.chat_messages import (
    clear_chat_thread,
    create_chat_thread,
    get_project_chat_messages,
    list_chat_threads,
)

router = APIRouter(
    prefix="/api/projects",
    tags=["projects"],
)


@router.get("")
def fetch_projects():
    """
    Fetch all projects with lightweight summaries.
    Optimized for list view - doesn't fetch chapters, characters, logs, etc.
    """
    projects = get_all_projects()
    result = []
    for project in projects:
        summary = get_project_summary(project["_id"])
        if summary:
            result.append(summary)
    return result


@router.post("")
def register_project(payload: CreateProjectPayload):
    """
    Create a new book project.

    Project creation only persists the project and initial brief asset. Agent
    work starts from the workspace through the LangGraph `/api/agent` routes.
    """
    created_at = datetime.utcnow().isoformat()
    settings_dict = DEFAULT_PROJECT_SETTINGS.copy()

    genre_lower = (payload.genre or "").lower()
    if "fiction" in genre_lower:
        tonality_val = "Storyteller"
    elif "academic" in genre_lower or "textbook" in genre_lower:
        tonality_val = "Academic"
    elif "business" in genre_lower or "leadership" in genre_lower:
        tonality_val = "Motivational"
    else:
        tonality_val = "Conversational"

    project_id = create_project(
        title=payload.title,
        subtitle=payload.subtitle or "",
        genre=payload.genre or "",
        tonality=tonality_val,
        created_at=created_at,
        settings=settings_dict,
    )
    add_user_asset(
        project_id=project_id,
        name="Project Initial Brief",
        asset_type="Prompt",
        size=f"{max(round(len(payload.brief) / 1024, 1), 0.1)} KB",
        added_at=created_at,
        content=payload.brief,
    )
    return get_unified_project_payload(project_id)


@router.get("/{id}")
def fetch_project_details(id: str):
    project = get_unified_project_payload(id)
    if not project:
        raise HTTPException(status_code=404, detail="Book project not found.")
    return project


@router.get("/{id}/artifacts/{artifact_id}")
def fetch_project_artifact(id: str, artifact_id: str):
    artifact = get_artifact(artifact_id)
    if not artifact or artifact.get("projectId") != id:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return artifact


@router.get("/{id}/settings")
def fetch_settings(id: str):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return get_project_settings(id)


@router.post("/{id}/settings")
def save_settings(id: str, payload: UpdateSettingsPayload):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    settings = payload.settings.model_dump()
    update_project_settings(id, settings)
    return {
        "message": "Model routing configs committed successfully.",
        "settings": settings,
    }


@router.delete("/{id}")
def remove_project(id: str):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    delete_project(id)
    return {"message": f"Project {id} deleted successfully."}


@router.post("/{id}/assets")
async def register_asset(id: str, request: Request):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        name = str(form.get("name") or getattr(upload, "filename", "") or "").strip()

        if not upload or not getattr(upload, "filename", None):
            raise HTTPException(status_code=400, detail="Please attach a Markdown or text file.")

        data = await upload.read()
        if not data:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        try:
            parsed_content, detected_type = parse_asset_file(upload.filename, data)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        asset_name = name or upload.filename
        asset_type = detected_type
        size_val = f"{max(round(len(data) / 1024, 1), 0.1)} KB"
    else:
        try:
            payload = AssetUploadPayload(**(await request.json()))
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid asset payload.") from exc

        asset_name = payload.name.strip()
        asset_type = payload.type.strip()
        parsed_content = payload.content.strip()
        if not asset_name:
            raise HTTPException(status_code=400, detail="Asset name is required.")
        if asset_type not in {"Markdown File", "Text Guidelines", "Prompt"}:
            raise HTTPException(
                status_code=400,
                detail="Asset type must be Markdown File, Text Guidelines, or Prompt.",
            )
        if not parsed_content:
            raise HTTPException(status_code=400, detail="Asset content is required.")
        size_val = f"{max(round(len(parsed_content.encode('utf-8')) / 1024, 1), 0.1)} KB"

    added_at = datetime.utcnow().isoformat()
    add_user_asset(
        project_id=id,
        name=asset_name,
        asset_type=asset_type,
        size=size_val,
        added_at=added_at,
        content=parsed_content,
    )
    return get_unified_project_payload(id)


@router.get("/{id}/chat-threads")
def fetch_chat_threads(id: str):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return list_chat_threads(id)


@router.post("/{id}/chat-threads")
def register_chat_thread(id: str):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return create_chat_thread(id)


@router.get("/{id}/messages")
def fetch_project_messages(id: str, thread_id: str | None = None):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if not thread_id:
        threads = list_chat_threads(id)
        thread_id = threads[0]["threadId"] if threads else None
    if not thread_id:
        return []
    return get_project_chat_messages(id, thread_id)


@router.delete("/{id}/chat-threads/{thread_id}/messages")
def clear_chat_thread_messages(id: str, thread_id: str):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    deleted = clear_chat_thread(id, thread_id)
    return {"status": "ok", "threadId": thread_id, "deleted": deleted}
