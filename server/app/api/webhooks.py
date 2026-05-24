"""Clerk webhook handler — syncs users and provisions a default project on signup."""
import logging
import os
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException, Request
from svix.webhooks import Webhook, WebhookVerificationError

from app.repositories.assets import add_user_asset
from app.repositories.projects import DEFAULT_PROJECT_SETTINGS, create_project, get_all_projects
from app.repositories.users import delete_user, upsert_from_clerk_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")

DEFAULT_BOOK_TITLE = "My First Book"
DEFAULT_BOOK_BRIEF = (
    "A journey of ideas waiting to be written. "
    "Use the workspace to outline chapters, build characters, and let the AI agents help craft your story."
)


def _provision_default_project(user_id: str) -> None:
    """Create a starter project if the user has none yet."""
    if get_all_projects(user_id):
        return

    created_at = datetime.utcnow().isoformat()
    project_id = create_project(
        title=DEFAULT_BOOK_TITLE,
        subtitle="",
        genre="Fiction / Novella",
        tonality="Storyteller",
        created_at=created_at,
        settings=DEFAULT_PROJECT_SETTINGS.copy(),
        user_id=user_id,
    )
    add_user_asset(
        project_id=project_id,
        name="Project Initial Brief",
        asset_type="Prompt",
        size=f"{max(round(len(DEFAULT_BOOK_BRIEF) / 1024, 1), 0.1)} KB",
        added_at=created_at,
        content=DEFAULT_BOOK_BRIEF,
    )


@router.post("")
@router.post("/")
@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    svix_id: str | None = Header(None, alias="svix-id"),
    svix_timestamp: str | None = Header(None, alias="svix-timestamp"),
    svix_signature: str | None = Header(None, alias="svix-signature"),
):
    """
    Receives Clerk webhook events.
    Handles: user.created, user.updated, user.deleted
    """
    if not WEBHOOK_SECRET:
        logger.warning("CLERK_WEBHOOK_SECRET not set — skipping webhook verification.")
        raise HTTPException(status_code=500, detail="Webhook secret not configured.")

    payload = await request.body()

    try:
        wh = Webhook(WEBHOOK_SECRET)
        event = wh.verify(
            payload,
            {
                "svix-id": svix_id or "",
                "svix-timestamp": svix_timestamp or "",
                "svix-signature": svix_signature or "",
            },
        )
    except WebhookVerificationError as exc:
        logger.warning("Clerk webhook verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid webhook signature.") from exc

    event_type: str = event.get("type", "")
    data: dict = event.get("data", {})

    if event_type in ("user.created", "user.updated"):
        user_id: str = data.get("id", "")
        if not user_id:
            raise HTTPException(status_code=400, detail="Webhook payload missing user id.")

        upsert_from_clerk_webhook(data)

        if event_type == "user.created":
            _provision_default_project(user_id)

    elif event_type == "user.deleted":
        user_id = data.get("id", "")
        if user_id:
            delete_user(user_id)

    return {"status": "ok", "event": event_type}
