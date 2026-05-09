from typing import Annotated

from fastapi import Header, HTTPException

from backend.app.domain.models import User
from backend.app.infrastructure.db.database import get_user_by_id


async def require_user(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> User:
    bearer_user_id = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    user_id = x_user_id or bearer_user_id
    user = get_user_by_id(user_id) if user_id else None

    if not user:
        raise HTTPException(status_code=401, detail={"error": "Auth required"})

    return user
