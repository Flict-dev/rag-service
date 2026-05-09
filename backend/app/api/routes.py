from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Response, status
from pydantic import BaseModel

from backend.app.api.dependencies import get_repository, require_user
from backend.app.application.ports.repositories import KnowledgeRepository
from backend.app.application.use_cases.articles import ArticleUseCases
from backend.app.application.use_cases.auth import login as login_user
from backend.app.application.use_cases.qa import QaUseCases
from backend.app.domain.models import User, UserRole


router = APIRouter()


class LoginRequest(BaseModel):
    email: str | None = None
    role: UserRole | None = None


class AskRequest(BaseModel):
    question: str | None = None


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login")
async def login(
    payload: LoginRequest,
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, object]:
    return login_user(repository, payload.email, payload.role)


@router.get("/me")
async def me(user: User = Depends(require_user)) -> dict[str, User]:
    return {"user": user}


@router.get("/articles")
async def articles(
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, list[dict[str, object]]]:
    return {"articles": ArticleUseCases(repository).list_for_user(user)}


@router.get("/articles/{article_id}")
async def article(
    article_id: str,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"article": ArticleUseCases(repository).get_for_user(article_id, user)}


@router.post("/articles", status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: dict[str, Any] | None = Body(default=None),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"article": ArticleUseCases(repository).create(payload or {}, user)}


@router.patch("/articles/{article_id}")
async def update_article(
    article_id: str,
    payload: dict[str, Any] | None = Body(default=None),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"article": ArticleUseCases(repository).update(article_id, payload or {}, user)}


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_article(
    article_id: str,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> Response:
    ArticleUseCases(repository).delete(article_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/search")
async def search(
    q: str = Query(default=""),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, object]:
    return QaUseCases(repository).search(user, q)


@router.post("/ask")
async def ask(
    payload: AskRequest,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, object]:
    return QaUseCases(repository).ask(user, payload.question)
