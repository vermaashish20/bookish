"""Shared FastAPI dependencies."""
from fastapi import HTTPException

from app.repositories.projects import get_project


def require_project(project_id: str) -> dict:
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project
