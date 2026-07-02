"""Current user profile (mirrored from Clerk)."""
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.user import UserPublic
from app.repositories.users import get_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
def fetch_current_user(user_id: str = Depends(get_current_user)):
    """Return the Bookish user record for the authenticated Clerk session."""
    doc = get_user(user_id, sync_if_empty=True)
    if not doc:
        raise HTTPException(status_code=404, detail="User record not found.")
    return UserPublic(
        id=doc["id"],
        email=doc.get("email", ""),
        username=doc.get("username", ""),
        firstName=doc.get("firstName", ""),
        lastName=doc.get("lastName", ""),
        imageUrl=doc.get("imageUrl", ""),
    )
