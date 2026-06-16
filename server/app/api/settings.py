from fastapi import APIRouter, HTTPException

from app.repositories.projects import get_project
from app.repositories.settings import get_project_settings, update_project_settings
from app.schemas import UpdateSettingsPayload

router = APIRouter(
    prefix="/api/projects/{id}/settings",
    tags=["settings"],
)


@router.post("")
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


@router.get("")
def fetch_settings(id: str):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return get_project_settings(id)
