from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.deps import get_current_user, require_owned_project
from app.repositories.assets import add_user_asset, get_user_asset
from app.repositories.chapters import get_chapter_by_id
from app.repositories.projects import (
    DEFAULT_PROJECT_SETTINGS,
    create_project,
    delete_project,
    get_project,
    get_project_book_section,
    get_project_memory_section,
    get_project_settings,
    get_project_shell,
    get_project_summary,
    get_unified_project_payload,
    list_project_summaries,
    update_project_settings,
)
from app.repositories.artifacts import get_artifact
from app.api.api import AssetUploadPayload, CreateProjectPayload
from app.models import UpdateSettingsPayload
from app.services.assets import parse_asset_file
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
def fetch_projects(user_id: str = Depends(get_current_user)):
    """Fetch all projects for the authenticated user (list-optimized)."""
    return list_project_summaries(user_id)


@router.post("")
def register_project(payload: CreateProjectPayload, user_id: str = Depends(get_current_user)):
    """
    Create a new book project owned by the authenticated user.
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
        user_id=user_id,
    )
    if payload.brief.strip():
        add_user_asset(
            project_id=project_id,
            name="Project Initial Brief",
            asset_type="Prompt",
            size=f"{max(round(len(payload.brief) / 1024, 1), 0.1)} KB",
            added_at=created_at,
            content=payload.brief.strip(),
        )
    return get_unified_project_payload(project_id)


@router.get("/{id}")
def fetch_project_details(id: str, user_id: str = Depends(get_current_user)):
    """Workspace shell — title/metadata only. Tab data is loaded on demand."""
    project = require_owned_project(id, user_id)
    result = get_project_shell(id, project)
    if not result:
        raise HTTPException(status_code=404, detail="Book project not found.")
    return result


@router.get("/{id}/book")
def fetch_project_book(id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    return get_project_book_section(id)


@router.get("/{id}/memory")
def fetch_project_memory(id: str, user_id: str = Depends(get_current_user)):
    project = require_owned_project(id, user_id)
    return get_project_memory_section(id, project)


@router.get("/{id}/chapters/{chapter_id}")
def fetch_chapter(id: str, chapter_id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    chapter = get_chapter_by_id(id, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")
    return chapter


@router.get("/{id}/assets/{asset_id}")
def fetch_asset(id: str, asset_id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    asset = get_user_asset(asset_id)
    if not asset or asset.get("projectId") != id:
        raise HTTPException(status_code=404, detail="Asset not found.")
    return asset


@router.get("/{id}/artifacts/{artifact_id}")
def fetch_project_artifact(id: str, artifact_id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    artifact = get_artifact(artifact_id)
    if not artifact or artifact.get("projectId") != id:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return artifact


@router.get("/{id}/settings")
def fetch_settings(id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    return get_project_settings(id)


@router.post("/{id}/settings")
def save_settings(id: str, payload: UpdateSettingsPayload, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    settings = payload.settings.model_dump()
    update_project_settings(id, settings)
    return {
        "message": "Model routing configs committed successfully.",
        "settings": settings,
    }


@router.delete("/{id}")
def remove_project(id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    delete_project(id)
    return {"message": f"Project {id} deleted successfully."}


@router.post("/{id}/assets")
async def register_asset(id: str, request: Request, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)

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
def fetch_chat_threads(id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    return list_chat_threads(id)


@router.post("/{id}/chat-threads")
def register_chat_thread(id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    return create_chat_thread(id)


@router.get("/{id}/messages")
def fetch_project_messages(id: str, thread_id: str | None = None, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    if not thread_id:
        threads = list_chat_threads(id)
        thread_id = threads[0]["threadId"] if threads else None
    if not thread_id:
        return []
    return get_project_chat_messages(id, thread_id)


@router.delete("/{id}/chat-threads/{thread_id}/messages")
def clear_chat_thread_messages(id: str, thread_id: str, user_id: str = Depends(get_current_user)):
    require_owned_project(id, user_id)
    deleted = clear_chat_thread(id, thread_id)
    return {"status": "ok", "threadId": thread_id, "deleted": deleted}
