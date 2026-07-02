"""User persistence — Clerk is identity source; MongoDB is the app user record."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.infrastructure.clerk.client import fetch_clerk_user
from app.infrastructure.database.mongo import get_db

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _primary_email(data: Dict[str, Any]) -> str:
    emails = data.get("email_addresses") or []
    primary_id = data.get("primary_email_address_id")
    for entry in emails:
        if entry.get("id") == primary_id:
            return str(entry.get("email_address") or "")
    if emails:
        return str(emails[0].get("email_address") or "")
    return ""


def _format_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(doc)
    out["id"] = out["_id"]
    return out


def _profile_from_clerk_data(data: Dict[str, Any]) -> Dict[str, str]:
    return {
        "email": _primary_email(data),
        "username": str(data.get("username") or ""),
        "firstName": str(data.get("first_name") or ""),
        "lastName": str(data.get("last_name") or ""),
        "imageUrl": str(data.get("image_url") or ""),
    }


def _needs_profile_sync(doc: Optional[Dict[str, Any]]) -> bool:
    """True when the Mongo row has no profile fields (webhook missed or JWT-only upsert)."""
    if not doc:
        return True
    return not any(
        doc.get(field)
        for field in ("email", "username", "firstName", "lastName", "imageUrl")
    )


def sync_user_from_clerk(clerk_id: str) -> Optional[Dict[str, Any]]:
    """Fetch profile from Clerk Backend API and persist to MongoDB."""
    clerk_data = fetch_clerk_user(clerk_id)
    if not clerk_data:
        return None
    return upsert_from_clerk_webhook(clerk_data)


def get_user(clerk_id: str, *, sync_if_empty: bool = False) -> Optional[Dict[str, Any]]:
    db = get_db()
    doc = db.users.find_one({"_id": clerk_id})
    formatted = _format_user(doc) if doc else None
    if sync_if_empty and _needs_profile_sync(doc):
        return sync_user_from_clerk(clerk_id) or formatted
    return formatted


_LAST_SEEN_TOUCH_SECONDS = 300


def _should_touch_last_seen(doc: Optional[Dict[str, Any]]) -> bool:
    if not doc or not doc.get("lastSeenAt"):
        return True
    try:
        last = datetime.fromisoformat(str(doc["lastSeenAt"]))
        return (datetime.utcnow() - last).total_seconds() > _LAST_SEEN_TOUCH_SECONDS
    except ValueError:
        return True


def ensure_user_record(
    clerk_id: str,
    *,
    email: str = "",
    username: str = "",
) -> Dict[str, Any]:
    """
    Upsert a user row on authenticated API access.
    Backfills profile from Clerk when the record is empty (webhook missed).
    """
    now = _now_iso()
    db = get_db()
    existing = db.users.find_one({"_id": clerk_id})

    if existing and not _needs_profile_sync(existing) and not _should_touch_last_seen(existing):
        return _format_user(existing)

    set_fields: Dict[str, Any] = {}
    if _should_touch_last_seen(existing):
        set_fields["lastSeenAt"] = now
        set_fields["updatedAt"] = now
    if email:
        set_fields["email"] = email
    if username:
        set_fields["username"] = username

    if existing:
        if set_fields:
            db.users.update_one({"_id": clerk_id}, {"$set": set_fields})
    else:
        db.users.update_one(
            {"_id": clerk_id},
            {
                "$set": {**set_fields, "lastSeenAt": now, "updatedAt": now},
                "$setOnInsert": {
                    "_id": clerk_id,
                    "email": email,
                    "username": username,
                    "firstName": "",
                    "lastName": "",
                    "imageUrl": "",
                    "createdAt": now,
                },
            },
            upsert=True,
        )

    doc = db.users.find_one({"_id": clerk_id})
    if _needs_profile_sync(doc):
        synced = sync_user_from_clerk(clerk_id)
        if synced:
            return synced
        logger.warning("User %s has empty profile and Clerk fetch failed.", clerk_id)

    return _format_user(doc) if doc else {"id": clerk_id}


def upsert_from_clerk_webhook(data: Dict[str, Any]) -> Dict[str, Any]:
    """Full profile sync from Clerk ``user.created`` / ``user.updated`` payloads."""
    clerk_id = str(data.get("id") or "")
    if not clerk_id:
        raise ValueError("Clerk webhook payload missing user id")

    now = _now_iso()
    created_at = (
        datetime.utcfromtimestamp(data["created_at"] / 1000).isoformat()
        if data.get("created_at")
        else now
    )

    profile = {
        **_profile_from_clerk_data(data),
        "updatedAt": now,
        "lastSeenAt": now,
    }

    db = get_db()
    db.users.update_one(
        {"_id": clerk_id},
        {
            "$set": profile,
            "$setOnInsert": {
                "_id": clerk_id,
                "createdAt": created_at,
            },
        },
        upsert=True,
    )
    doc = db.users.find_one({"_id": clerk_id})
    return _format_user(doc) if doc else {"id": clerk_id, **profile}


def delete_user(clerk_id: str) -> None:
    db = get_db()
    db.users.delete_one({"_id": clerk_id})
