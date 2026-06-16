"""Context loading for the LangGraph-native Bookish agent."""
from __future__ import annotations

from app.agent.utils.state import ProjectContext
from app.infrastructure.database.mongo import get_db
from app.repositories.chapters import get_chapter_summaries
from app.repositories.projects import get_book_summary, get_project


def load_project_context(project_id: str) -> ProjectContext:
    """Load bounded project context for graph state."""
    db = get_db()
    project = get_project(project_id) or {}

    character_count = (
        db.character_bible.count_documents({"projectId": project_id})
        + db.entity_bible.count_documents({"projectId": project_id})
    )
    asset_count = db.user_assets.count_documents({"projectId": project_id})
    asset_summaries = list(
        db.user_assets.find(
            {"projectId": project_id},
            {"_id": 1, "name": 1, "type": 1, "size": 1, "addedAt": 1},
        )
        .sort("addedAt", 1)
        .limit(10)
    )
    for asset in asset_summaries:
        asset["id"] = asset.get("_id")

    chapter_summaries = get_chapter_summaries(project_id)

    return ProjectContext(
        projectId=project_id,
        title=project.get("title", ""),
        genre=project.get("genre", ""),
        tonality=project.get("tonality", ""),
        assetCount=asset_count,
        assetSummaries=asset_summaries,
        characterCount=character_count,
        chapterCount=len(chapter_summaries),
        bookSummary=get_book_summary(project_id),
        chapterSummaries=chapter_summaries,
    )

