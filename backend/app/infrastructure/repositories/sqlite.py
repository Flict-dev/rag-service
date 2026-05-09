from backend.app.domain.models import Article, User
from backend.app.infrastructure.db import database


class SQLiteKnowledgeRepository:
    def list_articles(self) -> list[Article]:
        return database.list_articles()

    def get_article_by_id(self, article_id: str) -> Article | None:
        return database.get_article_by_id(article_id)

    def save_article(self, article: Article) -> Article:
        return database.save_article(article)

    def delete_article(self, article_id: str) -> bool:
        return database.delete_article(article_id)

    def get_user_by_id(self, user_id: str) -> User | None:
        return database.get_user_by_id(user_id)

    def get_user_by_email(self, email: str) -> User | None:
        return database.get_user_by_email(email)

    def get_user_by_role(self, role: str) -> User | None:
        return database.get_user_by_role(role)
