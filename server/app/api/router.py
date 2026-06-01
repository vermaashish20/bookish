"""Aggregate API routers."""
from fastapi import APIRouter

from app.api.routes import messages, projects, settings

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(settings.router)
api_router.include_router(messages.router)
