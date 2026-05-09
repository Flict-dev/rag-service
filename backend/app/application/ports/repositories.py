from typing import Protocol

from backend.app.domain.models import Article, User


class UserRepository(Protocol):
    def get_user_by_id(self, user_id: str) -> User | None: ...

    def get_user_by_email(self, email: str) -> User | None: ...

    def get_user_by_role(self, role: str) -> User | None: ...


class ArticleRepository(Protocol):
    def list_articles(self) -> list[Article]: ...

    def get_article_by_id(self, article_id: str) -> Article | None: ...

    def save_article(self, article: Article) -> Article: ...

    def delete_article(self, article_id: str) -> bool: ...


class KnowledgeRepository(UserRepository, ArticleRepository, Protocol):
    pass
