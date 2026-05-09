from backend.app.domain.models import Article, Document, IngestionJob, User, UserCredentials
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

    def get_user_by_session_token(self, token: str) -> User | None:
        return database.get_user_by_session_token(token)

    def get_user_credentials_by_email(self, email: str) -> UserCredentials | None:
        return database.get_user_credentials_by_email(email)

    def get_user_credentials_by_role(self, role: str) -> UserCredentials | None:
        return database.get_user_credentials_by_role(role)

    def create_user_session(self, user_id: str) -> str:
        return database.create_user_session(user_id)

    def delete_user_session(self, token: str) -> bool:
        return database.delete_user_session(token)

    def list_documents(self) -> list[Document]:
        return database.list_documents()

    def create_document(self, document: Document) -> Document:
        return database.create_document(document)

    def update_document_status(self, document_id: str, status: str) -> Document | None:
        return database.update_document_status(document_id, status)

    def list_ingestion_jobs(self, document_id: str | None = None) -> list[IngestionJob]:
        return database.list_ingestion_jobs(document_id)

    def create_ingestion_job(self, job: IngestionJob) -> IngestionJob:
        return database.create_ingestion_job(job)

    def update_ingestion_job_status(
        self,
        job_id: str,
        status: str,
        *,
        error: str | None = None,
        started_at: str | None = None,
        finished_at: str | None = None,
    ) -> IngestionJob | None:
        return database.update_ingestion_job_status(
            job_id,
            status,
            error=error,
            started_at=started_at,
            finished_at=finished_at,
        )
