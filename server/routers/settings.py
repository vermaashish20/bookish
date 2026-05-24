from fastapi import APIRouter, HTTPException
from repository.projects import get_project
from repository.settings import get_project_settings, update_project_settings
from models.schemas import UpdateSettingsPayload

router = APIRouter(
    prefix="/api/projects/{id}/settings",
    tags=["settings"]
)

@router.post("")
def save_settings(id: str, payload: UpdateSettingsPayload):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    update_project_settings(id, payload.settings.dict())
    return {"message": "Model routing configs committed successfully."}

@router.get("")
def fetch_settings(id: str):
    project = get_project(id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return get_project_settings(id)
