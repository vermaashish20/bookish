"""
Domain document schemas (Pydantic).

Repositories use MongoDB dicts at runtime; these models document collection shapes
and support future validation. Not required on the hot path.
"""

from app.domain.project import Project, ProjectSettings, ModelConfig
from app.domain.chapter import Chapter, ChapterSummary
from app.domain.character import Character
from app.domain.entity import Entity
from app.domain.agent_run import AgentRun, AgentExecution, PlannerDecision
from app.domain.artifact import Artifact
from app.domain.chat_message import ChatMessage
from app.domain.user_asset import UserAsset

__all__ = [
    "Project",
    "ProjectSettings",
    "ModelConfig",
    "Chapter",
    "ChapterSummary",
    "Character",
    "Entity",
    "AgentRun",
    "AgentExecution",
    "PlannerDecision",
    "Artifact",
    "ChatMessage",
    "UserAsset",
]
