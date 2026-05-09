from backend.app.application.errors import BadRequestError
from backend.app.application.knowledge_service import (
    build_answer_from_results,
    can_read_article,
    normalize_text,
    search_readable_articles,
)
from backend.app.application.ports.repositories import ArticleRepository
from backend.app.domain.models import User


class QaUseCases:
    def __init__(self, repository: ArticleRepository) -> None:
        self.repository = repository

    def search(self, user: User, query: str) -> dict[str, object]:
        readable_articles = [
            article for article in self.repository.list_articles() if can_read_article(article, user)
        ]
        results = search_readable_articles(readable_articles, query)
        return {"query": query, "results": results}

    def ask(self, user: User, question: str | None) -> dict[str, object]:
        normalized_question = normalize_text(question)

        if not normalized_question:
            raise BadRequestError("question is required")

        readable_articles = [
            article for article in self.repository.list_articles() if can_read_article(article, user)
        ]
        results = search_readable_articles(readable_articles, normalized_question)

        return {
            "question": normalized_question,
            **build_answer_from_results(normalized_question, results),
        }
