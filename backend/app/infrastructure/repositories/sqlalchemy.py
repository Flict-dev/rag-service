from datetime import datetime, timedelta, timezone
import json
import secrets
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from backend.app.domain.models import (
    Article,
    Document,
    DocumentChunk,
    IngestionJob,
    KnowledgeBase,
    KnowledgePage,
    KnowledgeSection,
    RagChunk,
    User,
    UserCredentials,
)
from backend.app.infrastructure.db.orm import models as orm
from backend.app.infrastructure.db.orm.session import session_scope


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso_datetime(value: datetime) -> str:
    return value.isoformat(timespec="seconds")


def _parse_json_list(value: str | None) -> list[Any]:
    if not value:
        return []

    try:
        parsed_value = json.loads(value)
    except json.JSONDecodeError:
        return []

    return parsed_value if isinstance(parsed_value, list) else []


def _parse_json_object(value: str | None) -> dict[str, object]:
    if not value:
        return {}

    try:
        parsed_value = json.loads(value)
    except json.JSONDecodeError:
        return {}

    return parsed_value if isinstance(parsed_value, dict) else {}


def _dump_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def _to_user(user: orm.User | None) -> User | None:
    if not user:
        return None

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role_id,
    }


def _to_user_credentials(user: orm.User | None) -> UserCredentials | None:
    if not user:
        return None

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role_id,
        "passwordHash": user.password_hash or "",
    }


def _to_article(article: orm.Article | None) -> Article | None:
    if not article:
        return None

    sections: list[dict[str, object]] = []
    for section in sorted(article.sections, key=lambda item: item.position):
        section_payload: dict[str, object] = {
            "heading": section.heading,
            "paragraphs": _parse_json_list(section.paragraphs_json),
        }
        bullets = _parse_json_list(section.bullets_json)
        if bullets:
            section_payload["bullets"] = bullets
        sections.append(section_payload)

    return {
        "id": article.id,
        "group": article.group_name,
        "title": article.title,
        "description": article.description,
        "owner": article.owner_name,
        "ownerId": article.owner_id,
        "createdAt": article.created_at,
        "updatedAt": article.updated_at,
        "status": article.status,
        "access": [access.role_id for access in article.access_roles],
        "tags": [tag.tag for tag in article.tags],
        "sections": sections,
    }


def _to_document(document: orm.Document | None) -> Document | None:
    if not document:
        return None

    payload: Document = {
        "id": document.id,
        "filename": document.filename,
        "contentType": document.content_type,
        "sizeBytes": document.size_bytes,
        "storagePath": document.storage_path,
        "uploadedBy": document.uploaded_by,
        "uploadedAt": document.uploaded_at,
        "status": document.status,
        "metadata": _parse_json_object(document.metadata_json),
    }

    if document.knowledge_base_id:
        payload["knowledgeBaseId"] = document.knowledge_base_id

    return payload


def _to_ingestion_job(job: orm.IngestionJob | None) -> IngestionJob | None:
    if not job:
        return None

    payload: IngestionJob = {
        "id": job.id,
        "documentId": job.document_id,
        "status": job.status,
        "createdAt": job.created_at,
        "startedAt": job.started_at,
        "finishedAt": job.finished_at,
        "error": job.error,
    }

    if job.knowledge_base_id:
        payload["knowledgeBaseId"] = job.knowledge_base_id

    return payload


def _to_document_chunk(chunk: orm.DocumentChunk | None) -> DocumentChunk | None:
    if not chunk:
        return None

    payload: DocumentChunk = {
        "id": chunk.id,
        "documentId": chunk.document_id,
        "position": chunk.position,
        "text": chunk.text,
        "metadata": _parse_json_object(chunk.metadata_json),
    }

    if chunk.document:
        payload["documentFilename"] = chunk.document.filename
        if chunk.document.knowledge_base_id:
            payload["knowledgeBaseId"] = chunk.document.knowledge_base_id

    return payload


def _to_section(section: orm.KnowledgeSection | None) -> KnowledgeSection | None:
    if not section:
        return None

    return {
        "id": section.id,
        "title": section.title,
        "createdAt": section.created_at,
        "updatedAt": section.updated_at,
    }


def _to_page(page: orm.KnowledgePage | None) -> KnowledgePage | None:
    if not page:
        return None

    return {
        "id": page.id,
        "sectionId": page.section_id,
        "title": page.title,
        "contentMd": page.content_md,
        "createdAt": page.created_at,
        "updatedAt": page.updated_at,
    }


def _to_knowledge_base(base: orm.KnowledgeBase | None) -> KnowledgeBase | None:
    if not base:
        return None

    return {
        "id": base.id,
        "title": base.title,
        "createdAt": base.created_at,
        "updatedAt": base.updated_at,
        "sections": [
            section
            for item in sorted(base.sections, key=lambda section: section.position)
            if (section := _to_section(item)) is not None
        ],
        "pages": [
            page
            for item in sorted(base.pages, key=lambda candidate: candidate.updated_at, reverse=True)
            if (page := _to_page(item)) is not None
        ],
    }


def _to_rag_chunk(chunk: orm.RagChunk | None) -> RagChunk | None:
    if not chunk:
        return None

    payload: RagChunk = {
        "id": chunk.id,
        "knowledgeBaseId": chunk.knowledge_base_id,
        "sourceType": chunk.source_type,
        "sourceId": chunk.source_id,
        "title": chunk.source_title,
        "sectionHeading": chunk.section_heading,
        "position": chunk.position,
        "text": chunk.text,
        "metadata": _parse_json_object(chunk.metadata_json),
    }

    if chunk.qdrant_point_id:
        payload["qdrantPointId"] = chunk.qdrant_point_id

    if chunk.source_type == "document":
        payload["documentId"] = chunk.source_id
        payload["documentFilename"] = chunk.source_title
    elif chunk.source_type == "page":
        payload["pageId"] = chunk.source_id

    return payload


class SQLAlchemyKnowledgeRepository:
    def list_articles(self) -> list[Article]:
        with session_scope() as session:
            articles = session.scalars(
                select(orm.Article)
                .options(
                    selectinload(orm.Article.sections),
                    selectinload(orm.Article.tags),
                    selectinload(orm.Article.access_roles),
                )
                .order_by(orm.Article.updated_at.desc(), orm.Article.title.asc())
            ).all()
            return [article for item in articles if (article := _to_article(item)) is not None]

    def get_article_by_id(self, article_id: str) -> Article | None:
        with session_scope() as session:
            article = session.scalar(
                select(orm.Article)
                .options(
                    selectinload(orm.Article.sections),
                    selectinload(orm.Article.tags),
                    selectinload(orm.Article.access_roles),
                )
                .where(orm.Article.id == article_id)
            )
            return _to_article(article)

    def save_article(self, article: Article) -> Article:
        with session_scope() as session:
            existing = session.get(orm.Article, str(article["id"]))
            if existing is None:
                existing = orm.Article(id=str(article["id"]))
                session.add(existing)

            existing.group_name = str(article["group"])
            existing.title = str(article["title"])
            existing.description = str(article["description"])
            existing.owner_id = str(article["ownerId"])
            existing.owner_name = str(article["owner"])
            existing.created_at = str(article["createdAt"])
            existing.updated_at = str(article["updatedAt"])
            existing.status = str(article["status"])
            existing.sections = []
            existing.tags = []
            existing.access_roles = []
            session.flush()

            for index, section in enumerate(article["sections"]):
                section_dict = section if isinstance(section, dict) else {}
                existing.sections.append(
                    orm.ArticleSection(
                        position=index,
                        heading=str(section_dict.get("heading", "")),
                        paragraphs_json=_dump_json(section_dict.get("paragraphs", [])),
                        bullets_json=_dump_json(section_dict.get("bullets", [])),
                    )
                )

            existing.tags = [orm.ArticleTag(tag=str(tag)) for tag in article["tags"]]
            existing.access_roles = [orm.ArticleAccess(role_id=str(role)) for role in article["access"]]
            session.flush()
            session.refresh(existing)
            return _to_article(existing) or article

    def delete_article(self, article_id: str) -> bool:
        with session_scope() as session:
            result = session.execute(delete(orm.Article).where(orm.Article.id == article_id))
            return (result.rowcount or 0) > 0

    def get_user_by_id(self, user_id: str) -> User | None:
        with session_scope() as session:
            return _to_user(session.get(orm.User, user_id))

    def get_user_by_session_token(self, token: str) -> User | None:
        with session_scope() as session:
            user = session.scalar(
                select(orm.User)
                .join(orm.UserSession)
                .where(
                    orm.UserSession.token == token,
                    orm.UserSession.expires_at > _to_iso_datetime(_utc_now()),
                )
            )
            return _to_user(user)

    def get_user_credentials_by_email(self, email: str) -> UserCredentials | None:
        with session_scope() as session:
            user = session.scalar(select(orm.User).where(orm.User.email.ilike(email)))
            return _to_user_credentials(user)

    def get_user_credentials_by_role(self, role: str) -> UserCredentials | None:
        with session_scope() as session:
            user = session.scalar(
                select(orm.User).where(orm.User.role_id == role).order_by(orm.User.id.asc()).limit(1)
            )
            return _to_user_credentials(user)

    def create_user(self, user: UserCredentials) -> UserCredentials:
        with session_scope() as session:
            session.add(
                orm.User(
                    id=str(user["id"]),
                    name=str(user["name"]),
                    email=str(user["email"]),
                    role_id=str(user["role"]),
                    password_hash=str(user["passwordHash"]),
                )
            )
            session.flush()
            saved_user = session.get(orm.User, str(user["id"]))
            saved_credentials = _to_user_credentials(saved_user)
            if saved_credentials is None:
                raise RuntimeError("created user was not found")
            return saved_credentials

    def create_user_session(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        now = _utc_now()
        expires_at = now + timedelta(days=7)

        with session_scope() as session:
            session.add(
                orm.UserSession(
                    token=token,
                    user_id=user_id,
                    created_at=_to_iso_datetime(now),
                    expires_at=_to_iso_datetime(expires_at),
                )
            )
        return token

    def delete_user_session(self, token: str) -> bool:
        with session_scope() as session:
            result = session.execute(delete(orm.UserSession).where(orm.UserSession.token == token))
            return (result.rowcount or 0) > 0

    def list_documents(self, knowledge_base_id: str | None = None) -> list[Document]:
        with session_scope() as session:
            query = select(orm.Document).order_by(orm.Document.uploaded_at.desc(), orm.Document.filename.asc())
            if knowledge_base_id:
                query = query.where(orm.Document.knowledge_base_id == knowledge_base_id)
            documents = session.scalars(query).all()
            return [document for item in documents if (document := _to_document(item)) is not None]

    def get_document_by_id(self, document_id: str) -> Document | None:
        with session_scope() as session:
            return _to_document(session.get(orm.Document, document_id))

    def create_document(self, document: Document) -> Document:
        with session_scope() as session:
            session.add(
                orm.Document(
                    id=str(document["id"]),
                    knowledge_base_id=(
                        str(document["knowledgeBaseId"]) if document.get("knowledgeBaseId") else None
                    ),
                    filename=str(document["filename"]),
                    content_type=str(document["contentType"]),
                    size_bytes=int(document["sizeBytes"]),
                    storage_path=str(document["storagePath"]),
                    uploaded_by=str(document["uploadedBy"]),
                    uploaded_at=str(document["uploadedAt"]),
                    status=str(document["status"]),
                    metadata_json=_dump_json(document.get("metadata", {})),
                )
            )
            session.flush()
            saved_document = _to_document(session.get(orm.Document, str(document["id"])))
            if saved_document is None:
                raise RuntimeError("created document was not found")
            return saved_document

    def update_document_status(self, document_id: str, status: str) -> Document | None:
        with session_scope() as session:
            document = session.get(orm.Document, document_id)
            if not document:
                return None
            document.status = status
            session.flush()
            return _to_document(document)

    def update_document_metadata(self, document_id: str, metadata: dict[str, object]) -> Document | None:
        with session_scope() as session:
            document = session.get(orm.Document, document_id)
            if not document:
                return None
            document.metadata_json = _dump_json(metadata)
            session.flush()
            return _to_document(document)

    def list_ingestion_jobs(self, document_id: str | None = None) -> list[IngestionJob]:
        with session_scope() as session:
            query = select(orm.IngestionJob).order_by(orm.IngestionJob.created_at.desc())
            if document_id:
                query = query.where(orm.IngestionJob.document_id == document_id)
            jobs = session.scalars(query).all()
            return [job for item in jobs if (job := _to_ingestion_job(item)) is not None]

    def create_ingestion_job(self, job: IngestionJob) -> IngestionJob:
        with session_scope() as session:
            session.add(
                orm.IngestionJob(
                    id=str(job["id"]),
                    document_id=str(job["documentId"]),
                    knowledge_base_id=str(job["knowledgeBaseId"]) if job.get("knowledgeBaseId") else None,
                    status=str(job["status"]),
                    created_at=str(job["createdAt"]),
                    started_at=job.get("startedAt") if isinstance(job.get("startedAt"), str) else None,
                    finished_at=job.get("finishedAt") if isinstance(job.get("finishedAt"), str) else None,
                    error=job.get("error") if isinstance(job.get("error"), str) else None,
                )
            )
            session.flush()
            saved_job = _to_ingestion_job(session.get(orm.IngestionJob, str(job["id"])))
            if saved_job is None:
                raise RuntimeError("created ingestion job was not found")
            return saved_job

    def update_ingestion_job_status(
        self,
        job_id: str,
        status: str,
        *,
        error: str | None = None,
        started_at: str | None = None,
        finished_at: str | None = None,
    ) -> IngestionJob | None:
        with session_scope() as session:
            job = session.get(orm.IngestionJob, job_id)
            if not job:
                return None
            job.status = status
            if error is not None:
                job.error = error
            if started_at is not None:
                job.started_at = started_at
            if finished_at is not None:
                job.finished_at = finished_at
            session.flush()
            return _to_ingestion_job(job)

    def replace_document_chunks(self, document_id: str, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        with session_scope() as session:
            session.execute(delete(orm.DocumentChunk).where(orm.DocumentChunk.document_id == document_id))
            for chunk in chunks:
                session.add(
                    orm.DocumentChunk(
                        id=str(chunk["id"]),
                        document_id=document_id,
                        position=int(chunk["position"]),
                        text=str(chunk["text"]),
                        metadata_json=_dump_json(chunk.get("metadata", {})),
                    )
                )
            session.flush()
            saved_chunks = session.scalars(
                select(orm.DocumentChunk)
                .options(selectinload(orm.DocumentChunk.document))
                .where(orm.DocumentChunk.document_id == document_id)
                .order_by(orm.DocumentChunk.position.asc())
            ).all()
            return [chunk for item in saved_chunks if (chunk := _to_document_chunk(item)) is not None]

    def list_document_chunks(self) -> list[DocumentChunk]:
        with session_scope() as session:
            chunks = session.scalars(
                select(orm.DocumentChunk)
                .join(orm.Document)
                .options(selectinload(orm.DocumentChunk.document))
                .where(orm.Document.status == "indexed")
                .order_by(orm.Document.uploaded_at.desc(), orm.DocumentChunk.position.asc())
            ).all()
            return [chunk for item in chunks if (chunk := _to_document_chunk(item)) is not None]

    def list_knowledge_bases(self, user: User) -> list[KnowledgeBase]:
        with session_scope() as session:
            bases = session.scalars(
                select(orm.KnowledgeBase)
                .options(
                    selectinload(orm.KnowledgeBase.sections),
                    selectinload(orm.KnowledgeBase.pages),
                )
                .order_by(orm.KnowledgeBase.updated_at.desc(), orm.KnowledgeBase.title.asc())
            ).all()
            return [base for item in bases if (base := _to_knowledge_base(item)) is not None]

    def get_knowledge_base(self, base_id: str) -> KnowledgeBase | None:
        with session_scope() as session:
            base = session.scalar(
                select(orm.KnowledgeBase)
                .options(
                    selectinload(orm.KnowledgeBase.sections),
                    selectinload(orm.KnowledgeBase.pages),
                )
                .where(orm.KnowledgeBase.id == base_id)
            )
            return _to_knowledge_base(base)

    def create_knowledge_base(self, base: KnowledgeBase) -> KnowledgeBase:
        with session_scope() as session:
            session.add(
                orm.KnowledgeBase(
                    id=str(base["id"]),
                    title=str(base["title"]),
                    owner_id=str(base["ownerId"]),
                    created_at=str(base["createdAt"]),
                    updated_at=str(base["updatedAt"]),
                )
            )
            session.flush()
            saved_base = session.scalar(
                select(orm.KnowledgeBase)
                .options(
                    selectinload(orm.KnowledgeBase.sections),
                    selectinload(orm.KnowledgeBase.pages),
                )
                .where(orm.KnowledgeBase.id == str(base["id"]))
            )
            saved_payload = _to_knowledge_base(saved_base)
            if saved_payload is None:
                raise RuntimeError("created knowledge base was not found")
            return saved_payload

    def create_knowledge_section(self, section: KnowledgeSection) -> KnowledgeSection:
        with session_scope() as session:
            session.add(
                orm.KnowledgeSection(
                    id=str(section["id"]),
                    knowledge_base_id=str(section["knowledgeBaseId"]),
                    title=str(section["title"]),
                    position=int(section.get("position", 0)),
                    created_at=str(section["createdAt"]),
                    updated_at=str(section["updatedAt"]),
                )
            )
            base = session.get(orm.KnowledgeBase, str(section["knowledgeBaseId"]))
            if base:
                base.updated_at = str(section["updatedAt"])
            session.flush()
            saved_section = _to_section(session.get(orm.KnowledgeSection, str(section["id"])))
            if saved_section is None:
                raise RuntimeError("created knowledge section was not found")
            return saved_section

    def create_knowledge_page(self, page: KnowledgePage) -> KnowledgePage:
        with session_scope() as session:
            session.add(
                orm.KnowledgePage(
                    id=str(page["id"]),
                    knowledge_base_id=str(page["knowledgeBaseId"]),
                    section_id=str(page["sectionId"]),
                    title=str(page["title"]),
                    content_md=str(page["contentMd"]),
                    created_at=str(page["createdAt"]),
                    updated_at=str(page["updatedAt"]),
                )
            )
            base = session.get(orm.KnowledgeBase, str(page["knowledgeBaseId"]))
            if base:
                base.updated_at = str(page["updatedAt"])
            session.flush()
            saved_page = _to_page(session.get(orm.KnowledgePage, str(page["id"])))
            if saved_page is None:
                raise RuntimeError("created knowledge page was not found")
            return saved_page

    def update_knowledge_page(self, page_id: str, payload: dict[str, object]) -> KnowledgePage | None:
        with session_scope() as session:
            page = session.get(orm.KnowledgePage, page_id)
            if not page:
                return None
            if isinstance(payload.get("title"), str):
                page.title = str(payload["title"]).strip() or page.title
            if isinstance(payload.get("contentMd"), str):
                page.content_md = str(payload["contentMd"])
            if isinstance(payload.get("sectionId"), str):
                page.section_id = str(payload["sectionId"])
            if isinstance(payload.get("updatedAt"), str):
                page.updated_at = str(payload["updatedAt"])
            base = session.get(orm.KnowledgeBase, page.knowledge_base_id)
            if base:
                base.updated_at = page.updated_at
            session.flush()
            return _to_page(page)

    def get_knowledge_page(self, page_id: str) -> KnowledgePage | None:
        with session_scope() as session:
            return _to_page(session.get(orm.KnowledgePage, page_id))

    def replace_rag_chunks(self, source_type: str, source_id: str, chunks: list[RagChunk]) -> list[RagChunk]:
        with session_scope() as session:
            session.execute(
                delete(orm.RagChunk).where(
                    orm.RagChunk.source_type == source_type,
                    orm.RagChunk.source_id == source_id,
                )
            )
            for chunk in chunks:
                session.add(
                    orm.RagChunk(
                        id=str(chunk["id"]),
                        knowledge_base_id=str(chunk["knowledgeBaseId"]),
                        source_type=str(chunk["sourceType"]),
                        source_id=str(chunk["sourceId"]),
                        source_title=str(chunk["title"]),
                        section_heading=str(chunk["sectionHeading"]),
                        position=int(chunk["position"]),
                        text=str(chunk["text"]),
                        qdrant_point_id=(
                            str(chunk["qdrantPointId"]) if chunk.get("qdrantPointId") else None
                        ),
                        metadata_json=_dump_json(chunk.get("metadata", {})),
                    )
                )
            session.flush()
            saved_chunks = session.scalars(
                select(orm.RagChunk)
                .where(
                    orm.RagChunk.source_type == source_type,
                    orm.RagChunk.source_id == source_id,
                )
                .order_by(orm.RagChunk.position.asc())
            ).all()
            return [chunk for item in saved_chunks if (chunk := _to_rag_chunk(item)) is not None]

    def list_rag_chunks(self, knowledge_base_id: str) -> list[RagChunk]:
        with session_scope() as session:
            chunks = session.scalars(
                select(orm.RagChunk)
                .where(orm.RagChunk.knowledge_base_id == knowledge_base_id)
                .order_by(orm.RagChunk.source_type.asc(), orm.RagChunk.source_id.asc(), orm.RagChunk.position.asc())
            ).all()
            return [chunk for item in chunks if (chunk := _to_rag_chunk(item)) is not None]

    def create_chat_thread(self, thread: dict[str, object]) -> dict[str, object]:
        with session_scope() as session:
            session.add(
                orm.ChatThread(
                    id=str(thread["id"]),
                    knowledge_base_id=str(thread["knowledgeBaseId"]),
                    user_id=str(thread["userId"]),
                    title=str(thread["title"]),
                    created_at=str(thread["createdAt"]),
                    updated_at=str(thread["updatedAt"]),
                )
            )
            return thread

    def get_chat_thread(self, thread_id: str) -> dict[str, object] | None:
        with session_scope() as session:
            thread = session.get(orm.ChatThread, thread_id)
            if not thread:
                return None
            return {
                "id": thread.id,
                "knowledgeBaseId": thread.knowledge_base_id,
                "userId": thread.user_id,
                "title": thread.title,
                "createdAt": thread.created_at,
                "updatedAt": thread.updated_at,
            }

    def create_chat_message(self, message: dict[str, object]) -> dict[str, object]:
        with session_scope() as session:
            session.add(
                orm.ChatMessage(
                    id=str(message["id"]),
                    thread_id=str(message["threadId"]),
                    user_id=str(message["userId"]),
                    role=str(message["role"]),
                    text=str(message["text"]),
                    sources_json=_dump_json(message.get("sources", [])),
                    created_at=str(message["createdAt"]),
                )
            )
            thread = session.get(orm.ChatThread, str(message["threadId"]))
            if thread:
                thread.updated_at = str(message["createdAt"])
            return message

    def create_retrieval_trace(self, trace: dict[str, object]) -> dict[str, object]:
        with session_scope() as session:
            session.add(
                orm.RetrievalTrace(
                    id=str(trace["id"]),
                    knowledge_base_id=str(trace["knowledgeBaseId"]),
                    thread_id=str(trace["threadId"]) if trace.get("threadId") else None,
                    message_id=str(trace["messageId"]) if trace.get("messageId") else None,
                    user_id=str(trace["userId"]),
                    question=str(trace["question"]),
                    answer=str(trace["answer"]),
                    sources_json=_dump_json(trace.get("sources", [])),
                    confidence=str(trace["confidence"]) if trace.get("confidence") is not None else None,
                    warning=str(trace["warning"]) if trace.get("warning") else None,
                    created_at=str(trace["createdAt"]),
                )
            )
            return trace
