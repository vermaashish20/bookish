"""Shared FastAPI dependencies."""
import os
import logging
from functools import lru_cache
from typing import Optional

import httpx
import jwt
from fastapi import Header, HTTPException

from app.repositories.projects import get_project

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Clerk JWT verification
# ---------------------------------------------------------------------------

CLERK_JWKS_URL = "https://api.clerk.com/v1/jwks"


@lru_cache(maxsize=1)
def _fetch_jwks() -> dict:
    """Fetch Clerk's JWKS (cached for process lifetime; restart to rotate)."""
    resp = httpx.get(CLERK_JWKS_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _get_public_key(kid: str):
    """Return the RSA public key matching the given key ID from Clerk's JWKS."""
    jwks = _fetch_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
    # Key not found — clear cache and retry once (key rotation)
    _fetch_jwks.cache_clear()
    jwks = _fetch_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
    return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    FastAPI dependency that verifies a Clerk-issued JWT and returns the user_id
    (the `sub` claim, e.g. ``user_2abc...``).

    Raises HTTP 401 for missing, expired, or otherwise invalid tokens.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    token = authorization[7:].strip()

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.DecodeError as exc:
        raise HTTPException(status_code=401, detail=f"Malformed token: {exc}") from exc

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token header missing 'kid'.")

    public_key = _get_public_key(kid)
    if public_key is None:
        raise HTTPException(status_code=401, detail="JWT signing key not found.")

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing 'sub' claim.")

    return user_id


# ---------------------------------------------------------------------------
# Project ownership check
# ---------------------------------------------------------------------------

def require_project(project_id: str) -> dict:
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


def require_owned_project(project_id: str, user_id: str) -> dict:
    """Return the project only if it belongs to `user_id`."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if project.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return project
