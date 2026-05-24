"""Clerk Backend API client."""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_API_BASE = os.getenv("CLERK_API_BASE", "https://api.clerk.com/v1").rstrip("/")


def fetch_clerk_user(clerk_id: str) -> Optional[Dict[str, Any]]:
    """Load a Clerk user object by id (same shape as webhook payloads)."""
    if not CLERK_SECRET_KEY:
        logger.warning("CLERK_SECRET_KEY not set — cannot fetch Clerk user profile.")
        return None

    url = f"{CLERK_API_BASE}/users/{clerk_id}"
    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "User-Agent": "bookish-backend",
    }
    try:
        resp = httpx.get(url, headers=headers, timeout=10)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.warning("Failed to fetch Clerk user %s: %s", clerk_id, exc)
        return None
