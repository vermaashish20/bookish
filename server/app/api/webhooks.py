"""Clerk webhook handler — creates a default project on user.created."""
import json
import logging
import os
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException, Request
from svix.webhooks import Webhook, WebhookVerificationError

from app.repositories.assets import add_user_asset
from app.repositories.projects import DEFAULT_PROJECT_SETTINGS, create_project

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")

DEFAULT_BOOK_TITLE = "My First Book"
DEFAULT_BOOK_BRIEF = (
    "A journey of ideas waiting to be written. "
    "Use the workspace to outline chapters, build characters, and let the AI agents help craft your story."
)


def _provision_default_project(user_id: str, username: str | None = None) -> None:
    """Create a starter project so the workspace is never empty after signup."""
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
    logger.info("Created default project %s for user %s", project_id, user_id)


@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    svix_id: str | None = Header(None, alias="svix-id"),
    svix_timestamp: str | None = Header(None, alias="svix-timestamp"),
    svix_signature: str | None = Header(None, alias="svix-signature"),
):
    """
    Receives Clerk webhook events.
    Currently handles: user.created → provision a default project.
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

    logger.info("Clerk webhook received: %s", event_type)

    if event_type == "user.created":
        user_id: str = data.get("id", "")
        if not user_id:
            raise HTTPException(status_code=400, detail="Webhook payload missing user id.")

        username: str | None = data.get("username") or None
        _provision_default_project(user_id, username)

    return {"status": "ok", "event": event_type}
