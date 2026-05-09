from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from backend.app.application.errors import BadRequestError, PermissionDeniedError
from backend.app.application.ports.repositories import DocumentRepository
from backend.app.application.ports.storage import DocumentStorage
from backend.app.domain.models import Document, IngestionJob, User


MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _can_manage_documents(user: User) -> bool:
    return user["role"] in {"editor", "admin"}


class DocumentUseCases:
    def __init__(self, repository: DocumentRepository, storage: DocumentStorage) -> None:
        self.repository = repository
        self.storage = storage

    def list_documents(self, user: User) -> list[Document]:
        if not _can_manage_documents(user):
            raise PermissionDeniedError("Only editor and admin can manage documents")

        return self.repository.list_documents()

    def upload(
        self,
        user: User,
        *,
        filename: str,
        content_type: str | None,
        content: bytes,
    ) -> dict[str, object]:
        if not _can_manage_documents(user):
            raise PermissionDeniedError("Only editor and admin can upload documents")

        if not filename:
            raise BadRequestError("filename is required")

        if not content:
            raise BadRequestError("file is empty")

        if len(content) > MAX_DOCUMENT_UPLOAD_BYTES:
            raise BadRequestError("file is too large")

        now = _utc_now()
        document_id = f"doc-{uuid4().hex}"
        job_id = f"job-{uuid4().hex}"
        storage_path = self.storage.save(document_id, filename, content)
        document: Document = {
            "id": document_id,
            "filename": filename,
            "contentType": content_type or "application/octet-stream",
            "sizeBytes": len(content),
            "storagePath": storage_path,
            "uploadedBy": user["id"],
            "uploadedAt": now,
            "status": "queued",
            "metadata": {},
        }
        job: IngestionJob = {
            "id": job_id,
            "documentId": document_id,
            "status": "queued",
            "createdAt": now,
            "startedAt": None,
            "finishedAt": None,
            "error": None,
        }

        return {
            "document": self.repository.create_document(document),
            "job": self.repository.create_ingestion_job(job),
        }

    def list_ingestion_jobs(self, user: User, document_id: str | None = None) -> list[IngestionJob]:
        if not _can_manage_documents(user):
            raise PermissionDeniedError("Only editor and admin can manage ingestion jobs")

        return self.repository.list_ingestion_jobs(document_id)

    def run_ingestion(self, document_id: str, job_id: str) -> None:
        now = _utc_now()
        self.repository.update_ingestion_job_status(job_id, "processing", started_at=now)
        self.repository.update_document_status(document_id, "processing")

        try:
            finished_at = _utc_now()
            self.repository.update_ingestion_job_status(job_id, "completed", finished_at=finished_at)
            self.repository.update_document_status(document_id, "indexed")
        except Exception as error:
            self.repository.update_ingestion_job_status(
                job_id,
                "failed",
                error=str(error),
                finished_at=_utc_now(),
            )
            self.repository.update_document_status(document_id, "failed")
            raise
