from typing import Any

from backend.app.application.errors import NotFoundError, PermissionDeniedError, ValidationFailedError
from backend.app.application.knowledge_service import (
    build_article_from_payload,
    can_read_article,
    can_write_article,
    validate_article,
)
from backend.app.application.ports.repositories import ArticleRepository
from backend.app.domain.models import Article, User


class ArticleUseCases:
    def __init__(self, repository: ArticleRepository) -> None:
        self.repository = repository

    def list_for_user(self, user: User) -> list[Article]:
        return [article for article in self.repository.list_articles() if can_read_article(article, user)]

    def get_for_user(self, article_id: str, user: User) -> Article:
        article = self.repository.get_article_by_id(article_id)

        if not article:
            raise NotFoundError("Article not found")

        if not can_read_article(article, user):
            raise PermissionDeniedError("Article is not available for this role")

        return article

    def create(self, payload: dict[str, Any], user: User) -> Article:
        if not can_write_article(None, user):
            raise PermissionDeniedError("Only editor and admin can create articles")

        existing_ids = {str(article["id"]) for article in self.repository.list_articles()}
        article = build_article_from_payload(payload, user, existing_ids=existing_ids)
        errors = validate_article(article)

        if errors:
            raise ValidationFailedError(errors)

        return self.repository.save_article(article)

    def update(self, article_id: str, payload: dict[str, Any], user: User) -> Article:
        existing_article = self.repository.get_article_by_id(article_id)

        if not existing_article:
            raise NotFoundError("Article not found")

        if not can_write_article(existing_article, user):
            raise PermissionDeniedError("Article cannot be edited by this role")

        changed_article = build_article_from_payload(payload, user, existing_article)
        errors = validate_article(changed_article)

        if errors:
            raise ValidationFailedError(errors)

        return self.repository.save_article(changed_article)

    def delete(self, article_id: str, user: User) -> None:
        article = self.repository.get_article_by_id(article_id)

        if not article:
            raise NotFoundError("Article not found")

        if not can_write_article(article, user):
            raise PermissionDeniedError("Article cannot be deleted by this role")

        self.repository.delete_article(article_id)
