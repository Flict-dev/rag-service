from typing import Annotated

from fastapi import Depends, Header

from backend.app.application.errors import AuthError
from backend.app.application.ports.repositories import KnowledgeRepository
from backend.app.domain.models import User
from backend.app.infrastructure.repositories.sqlite import SQLiteKnowledgeRepository


def get_repository() -> KnowledgeRepository:
    return SQLiteKnowledgeRepository()


async def require_user(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    repository: KnowledgeRepository = Depends(get_repository),
) -> User:
    bearer_user_id = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    user_id = x_user_id or bearer_user_id
    user = repository.get_user_by_id(user_id) if user_id else None

    if not user:
        raise AuthError("Auth required")

    return user
