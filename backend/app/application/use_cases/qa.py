from datetime import datetime, timezone
from uuid import uuid4

from backend.app.application.errors import BadRequestError, NotFoundError
from backend.app.application.knowledge_base_access import require_base_access
from backend.app.application.knowledge_service import (
    build_answer_from_results,
    can_read_article,
    normalize_text,
    search_document_chunks,
    search_readable_articles,
)
from backend.app.application.ports.repositories import KnowledgeRepository
from backend.app.domain.models import User


class QaUseCases:
    def __init__(self, repository: KnowledgeRepository, rag_service: object | None = None) -> None:
        self.repository = repository
        self.rag_service = rag_service

    def search(self, user: User, query: str) -> dict[str, object]:
        readable_articles = [
            article for article in self.repository.list_articles() if can_read_article(article, user)
        ]
        results = search_readable_articles(readable_articles, query)
        document_results = (
            search_document_chunks(self.repository.list_document_chunks(), query)
            if user["role"] in {"editor", "admin"}
            else []
        )
        return {"query": query, "results": results, "documentResults": document_results}

    def ask(self, user: User, question: str | None) -> dict[str, object]:
        normalized_question = normalize_text(question)

        if not normalized_question:
            raise BadRequestError("question is required")

        readable_articles = [
            article for article in self.repository.list_articles() if can_read_article(article, user)
        ]
        results = search_readable_articles(readable_articles, normalized_question)
        document_results = (
            search_document_chunks(self.repository.list_document_chunks(), normalized_question)
            if user["role"] in {"editor", "admin"}
            else []
        )

        return {
            "question": normalized_question,
            **build_answer_from_results(normalized_question, results, document_results),
        }

    def ask_in_base(self, user: User, base_id: str, question: str | None, thread_id: str | None = None) -> dict[str, object]:
        normalized_question = normalize_text(question)

        if not normalized_question:
            raise BadRequestError("question is required")

        base = self.repository.get_knowledge_base(base_id)
        if not base:
            raise NotFoundError("Knowledge base not found")
        require_base_access(base, user)

        chunks = self.repository.list_rag_chunks(base_id)
        search_results = (
            self.rag_service.search(normalized_question, base_id, chunks)
            if self.rag_service
            else []
        )

        if not search_results:
            search_results = []

        if self.rag_service:
            answer, warning = self.rag_service.answer(normalized_question, search_results)
        else:
            answer = str(build_answer_from_results(normalized_question, [], [])["answer"])
            warning = "RAG service is not configured."
        sources = [
            {
                "sourceType": result["sourceType"],
                "sourceId": result["sourceId"],
                "title": result["title"],
                "sectionHeading": result["sectionHeading"],
                "excerpt": result["excerpt"],
                "score": result["score"],
            }
            for result in search_results
        ]
        confidence = (
            round(sum(float(source["score"]) for source in sources) / len(sources), 3)
            if sources
            else 0
        )
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        thread = self._resolve_thread(user, base_id, thread_id, normalized_question, now)
        self.repository.create_chat_message(
            {
                "id": f"msg-{uuid4().hex}",
                "threadId": thread["id"],
                "userId": user["id"],
                "role": "user",
                "text": normalized_question,
                "sources": [],
                "createdAt": now,
            }
        )
        assistant_message = self.repository.create_chat_message(
            {
                "id": f"msg-{uuid4().hex}",
                "threadId": thread["id"],
                "userId": user["id"],
                "role": "assistant",
                "text": answer,
                "sources": sources,
                "createdAt": now,
            }
        )
        trace = self.repository.create_retrieval_trace(
            {
                "id": f"trace-{uuid4().hex}",
                "knowledgeBaseId": base_id,
                "threadId": thread["id"],
                "messageId": assistant_message["id"],
                "userId": user["id"],
                "question": normalized_question,
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "warning": warning,
                "createdAt": now,
            }
        )

        payload: dict[str, object] = {
            "answer": answer,
            "question": normalized_question,
            "sources": sources,
            "confidence": confidence,
            "traceId": trace["id"],
            "threadId": thread["id"],
        }
        if warning:
            payload["warning"] = warning
        return payload

    def _resolve_thread(
        self,
        user: User,
        base_id: str,
        thread_id: str | None,
        question: str,
        now: str,
    ) -> dict[str, object]:
        if thread_id:
            thread = self.repository.get_chat_thread(thread_id)
            if thread and thread["knowledgeBaseId"] == base_id and thread["userId"] == user["id"]:
                return thread

        return self.repository.create_chat_thread(
            {
                "id": f"thread-{uuid4().hex}",
                "knowledgeBaseId": base_id,
                "userId": user["id"],
                "title": question[:80],
                "createdAt": now,
                "updatedAt": now,
            }
        )
