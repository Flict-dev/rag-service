from datetime import datetime, timezone
import re
from typing import Any
from uuid import uuid4

from backend.app.application.errors import BadRequestError, PermissionDeniedError
from backend.app.application.ports.repositories import DocumentRepository
from backend.app.application.ports.storage import DocumentStorage
from backend.app.domain.models import Document, DocumentChunk, IngestionJob, User


MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024
DOCUMENT_CHUNK_SIZE = 900
TEXT_DOCUMENT_EXTENSIONS = {".csv", ".json", ".log", ".md", ".txt"}
TEXT_DOCUMENT_CONTENT_TYPES = {
    "application/json",
    "text/csv",
    "text/markdown",
    "text/plain",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _can_manage_documents(user: User) -> bool:
    return user["role"] in {"editor", "admin"}


def _is_text_document(document: Document) -> bool:
    filename = str(document["filename"]).lower()
    content_type = str(document["contentType"]).split(";")[0].strip().lower()
    return content_type in TEXT_DOCUMENT_CONTENT_TYPES or any(
        filename.endswith(extension) for extension in TEXT_DOCUMENT_EXTENSIONS
    )


def _decode_text(content: bytes) -> str:
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("utf-8", errors="replace")


def _normalize_document_text(value: str) -> str:
    stripped_lines = [line.strip() for line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    text = "\n".join(line for line in stripped_lines if line)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _chunk_text(document_id: str, text: str) -> list[DocumentChunk]:
    if not text:
        return []

    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n{2,}", text) if paragraph.strip()]
    chunks: list[DocumentChunk] = []
    current_parts: list[str] = []
    current_length = 0

    def append_chunk(parts: list[str]) -> None:
        chunk_text = "\n\n".join(parts).strip()
        if not chunk_text:
            return

        chunks.append(
            {
                "id": f"{document_id}-chunk-{len(chunks) + 1}",
                "documentId": document_id,
                "position": len(chunks),
                "text": chunk_text,
                "metadata": {"extractor": "plain-text-v1"},
            }
        )

    for paragraph in paragraphs:
        paragraph_length = len(paragraph)

        if paragraph_length > DOCUMENT_CHUNK_SIZE:
            if current_parts:
                append_chunk(current_parts)
                current_parts = []
                current_length = 0

            for start in range(0, paragraph_length, DOCUMENT_CHUNK_SIZE):
                append_chunk([paragraph[start : start + DOCUMENT_CHUNK_SIZE]])
            continue

        next_length = current_length + paragraph_length
        if current_parts and next_length > DOCUMENT_CHUNK_SIZE:
            append_chunk(current_parts)
            current_parts = [paragraph]
            current_length = paragraph_length
            continue

        current_parts.append(paragraph)
        current_length = next_length

    if current_parts:
        append_chunk(current_parts)

    return chunks


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
            document = self.repository.get_document_by_id(document_id)
            if not document:
                raise RuntimeError("document not found")

            content = self.storage.read(str(document["storagePath"]))
            text = _normalize_document_text(_decode_text(content)) if _is_text_document(document) else ""
            chunks = _chunk_text(document_id, text)
            self.repository.replace_document_chunks(document_id, chunks)

            finished_at = _utc_now()
            metadata: dict[str, object] = {
                "chunkCount": len(chunks),
                "characterCount": len(text),
                "extractor": "plain-text-v1",
                "ingestedAt": finished_at,
            }

            if text:
                metadata["preview"] = text[:240]
            else:
                metadata["warning"] = "No extractable text found for this file type."

            self.repository.update_document_metadata(document_id, metadata)
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
