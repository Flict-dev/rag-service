from typing import Annotated

from fastapi import Depends, Header

from backend.app.application.errors import AuthError
from backend.app.application.ports.repositories import KnowledgeRepository
from backend.app.domain.models import User
from backend.app.infrastructure.repositories.sqlalchemy import SQLAlchemyKnowledgeRepository


def get_repository() -> KnowledgeRepository:
    return SQLAlchemyKnowledgeRepository()


def get_auth_token(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> str | None:
    bearer_token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    return x_user_id or bearer_token or None


async def require_user(
    token: str | None = Depends(get_auth_token),
    repository: KnowledgeRepository = Depends(get_repository),
) -> User:
    user = repository.get_user_by_session_token(token) if token else None

    if not user and token:
        user = repository.get_user_by_id(token)

    if not user:
        raise AuthError("Auth required")

    return user
