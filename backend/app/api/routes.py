from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel

from backend.app.api.dependencies import require_user
from backend.app.application.knowledge_service import (
    build_answer_from_results,
    build_article_from_payload,
    can_read_article,
    can_write_article,
    normalize_text,
    search_readable_articles,
    validate_article,
)
from backend.app.domain.models import User, UserRole
from backend.app.infrastructure.db.database import (
    delete_article,
    get_article_by_id,
    get_user_by_email,
    get_user_by_role,
    list_articles,
    save_article,
)


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
async def login(payload: LoginRequest) -> dict[str, object]:
    email = normalize_text(payload.email)
    role = normalize_text(payload.role)
    user = get_user_by_email(email) if email else get_user_by_role(role)

    if not user:
        raise HTTPException(status_code=401, detail={"error": "Demo user not found"})

    return {"token": user["id"], "user": user}


@router.get("/me")
async def me(user: User = Depends(require_user)) -> dict[str, User]:
    return {"user": user}


@router.get("/articles")
async def articles(user: User = Depends(require_user)) -> dict[str, list[dict[str, object]]]:
    readable_articles = [article for article in list_articles() if can_read_article(article, user)]
    return {"articles": readable_articles}


@router.get("/articles/{article_id}")
async def article(article_id: str, user: User = Depends(require_user)) -> dict[str, dict[str, object]]:
    found_article = get_article_by_id(article_id)

    if not found_article:
        raise HTTPException(status_code=404, detail={"error": "Article not found"})

    if not can_read_article(found_article, user):
        raise HTTPException(status_code=403, detail={"error": "Article is not available for this role"})

    return {"article": found_article}


@router.post("/articles", status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: dict[str, Any] | None = Body(default=None),
    user: User = Depends(require_user),
) -> dict[str, dict[str, object]]:
    if not can_write_article(None, user):
        raise HTTPException(status_code=403, detail={"error": "Only editor and admin can create articles"})

    new_article = build_article_from_payload(payload or {}, user)
    errors = validate_article(new_article)

    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    return {"article": save_article(new_article)}


@router.patch("/articles/{article_id}")
async def update_article(
    article_id: str,
    payload: dict[str, Any] | None = Body(default=None),
    user: User = Depends(require_user),
) -> dict[str, dict[str, object]]:
    existing_article = get_article_by_id(article_id)

    if not existing_article:
        raise HTTPException(status_code=404, detail={"error": "Article not found"})

    if not can_write_article(existing_article, user):
        raise HTTPException(status_code=403, detail={"error": "Article cannot be edited by this role"})

    changed_article = build_article_from_payload(payload or {}, user, existing_article)
    errors = validate_article(changed_article)

    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    return {"article": save_article(changed_article)}


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_article(article_id: str, user: User = Depends(require_user)) -> Response:
    found_article = get_article_by_id(article_id)

    if not found_article:
        raise HTTPException(status_code=404, detail={"error": "Article not found"})

    if not can_write_article(found_article, user):
        raise HTTPException(status_code=403, detail={"error": "Article cannot be deleted by this role"})

    delete_article(article_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/search")
async def search(
    q: str = Query(default=""),
    user: User = Depends(require_user),
) -> dict[str, object]:
    readable_articles = [article for article in list_articles() if can_read_article(article, user)]
    results = search_readable_articles(readable_articles, q)
    return {"query": q, "results": results}


@router.post("/ask")
async def ask(payload: AskRequest, user: User = Depends(require_user)) -> dict[str, object]:
    question = normalize_text(payload.question)

    if not question:
        raise HTTPException(status_code=400, detail={"error": "question is required"})

    readable_articles = [article for article in list_articles() if can_read_article(article, user)]
    results = search_readable_articles(readable_articles, question)

    return {
        "question": question,
        **build_answer_from_results(question, results),
    }
