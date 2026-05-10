from typing import Any, cast

from fastapi import APIRouter, BackgroundTasks, Body, Depends, File, Query, Response, UploadFile, status
from pydantic import BaseModel

from backend.app.api.dependencies import get_auth_token, get_repository, require_user
from backend.app.application.ports.repositories import KnowledgeRepository
from backend.app.application.ports.security import PasswordHasher
from backend.app.application.ports.storage import DocumentStorage
from backend.app.application.use_cases.articles import ArticleUseCases
from backend.app.application.use_cases.auth import login as login_user
from backend.app.application.use_cases.auth import logout as logout_user
from backend.app.application.use_cases.auth import register as register_user
from backend.app.application.use_cases.documents import DocumentUseCases, MAX_DOCUMENT_UPLOAD_BYTES
from backend.app.application.use_cases.knowledge_bases import KnowledgeBaseUseCases
from backend.app.application.use_cases.qa import QaUseCases
from backend.app.domain.models import User, UserRole
from backend.app.infrastructure.rag.local import LocalRagService
from backend.app.infrastructure.security.passwords import PBKDF2PasswordHasher
from backend.app.infrastructure.storage.local import LocalDocumentStorage


router = APIRouter()


class LoginRequest(BaseModel):
    email: str | None = None
    password: str | None = None
    role: UserRole | None = None


class RegisterRequest(BaseModel):
    email: str | None = None
    name: str | None = None
    password: str | None = None


class AskRequest(BaseModel):
    question: str | None = None
    threadId: str | None = None


class NameRequest(BaseModel):
    title: str | None = None


class CreatePageRequest(BaseModel):
    sectionId: str | None = None
    title: str | None = None


def get_password_hasher() -> PasswordHasher:
    return PBKDF2PasswordHasher()


def get_document_storage() -> DocumentStorage:
    return LocalDocumentStorage()


def get_rag_service() -> LocalRagService:
    return LocalRagService()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login")
async def login(
    payload: LoginRequest,
    password_hasher: PasswordHasher = Depends(get_password_hasher),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, object]:
    return login_user(repository, password_hasher, payload.email, payload.role, payload.password)


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    password_hasher: PasswordHasher = Depends(get_password_hasher),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, object]:
    return register_user(repository, password_hasher, payload.email, payload.name, payload.password)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token: str | None = Depends(get_auth_token),
    repository: KnowledgeRepository = Depends(get_repository),
) -> Response:
    logout_user(repository, token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me")
async def me(user: User = Depends(require_user)) -> dict[str, User]:
    return {"user": user}


@router.get("/articles")
async def articles(
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, list[dict[str, object]]]:
    return {"articles": ArticleUseCases(repository).list_for_user(user)}


@router.get("/articles/{article_id}")
async def article(
    article_id: str,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"article": ArticleUseCases(repository).get_for_user(article_id, user)}


@router.post("/articles", status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: dict[str, Any] | None = Body(default=None),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"article": ArticleUseCases(repository).create(payload or {}, user)}


@router.get("/knowledge-bases")
async def knowledge_bases(
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, list[dict[str, object]]]:
    return {"bases": KnowledgeBaseUseCases(repository).list_bases(user)}


@router.post("/knowledge-bases", status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    payload: NameRequest,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"base": KnowledgeBaseUseCases(repository).create_base(payload.title, user)}


@router.get("/knowledge-bases/{base_id}")
async def knowledge_base(
    base_id: str,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"base": KnowledgeBaseUseCases(repository).get_base(base_id, user)}


@router.post("/knowledge-bases/{base_id}/sections", status_code=status.HTTP_201_CREATED)
async def create_knowledge_section(
    base_id: str,
    payload: NameRequest,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"section": KnowledgeBaseUseCases(repository).create_section(base_id, payload.title, user)}


@router.post("/knowledge-bases/{base_id}/pages", status_code=status.HTTP_201_CREATED)
async def create_knowledge_page(
    base_id: str,
    payload: CreatePageRequest,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    rag_service: LocalRagService = Depends(get_rag_service),
) -> dict[str, object]:
    return KnowledgeBaseUseCases(repository, rag_service).create_page(base_id, payload.sectionId, payload.title, user)


@router.patch("/knowledge-bases/{base_id}/pages/{page_id}")
async def update_knowledge_page(
    base_id: str,
    page_id: str,
    payload: dict[str, Any] | None = Body(default=None),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    rag_service: LocalRagService = Depends(get_rag_service),
) -> dict[str, object]:
    return KnowledgeBaseUseCases(repository, rag_service).update_page(base_id, page_id, payload or {}, user)


@router.get("/knowledge-bases/{base_id}/documents")
async def base_documents(
    base_id: str,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    storage: DocumentStorage = Depends(get_document_storage),
    rag_service: LocalRagService = Depends(get_rag_service),
) -> dict[str, list[dict[str, object]]]:
    KnowledgeBaseUseCases(repository).get_base(base_id, user)
    return {"documents": DocumentUseCases(repository, storage, rag_service).list_documents(user, base_id)}


@router.post("/knowledge-bases/{base_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_base_document(
    base_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    storage: DocumentStorage = Depends(get_document_storage),
    rag_service: LocalRagService = Depends(get_rag_service),
) -> dict[str, object]:
    KnowledgeBaseUseCases(repository).get_base(base_id, user)
    content = await file.read(MAX_DOCUMENT_UPLOAD_BYTES + 1)
    use_cases = DocumentUseCases(repository, storage, rag_service)
    result = use_cases.upload(
        user,
        filename=file.filename or "document",
        content_type=file.content_type,
        content=content,
        knowledge_base_id=base_id,
    )
    document = cast(dict[str, object], result["document"])
    job = cast(dict[str, object], result["job"])
    background_tasks.add_task(use_cases.run_ingestion, str(document["id"]), str(job["id"]))
    return result


@router.post("/knowledge-bases/{base_id}/ask")
async def ask_knowledge_base(
    base_id: str,
    payload: AskRequest,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    rag_service: LocalRagService = Depends(get_rag_service),
) -> dict[str, object]:
    return QaUseCases(repository, rag_service).ask_in_base(user, base_id, payload.question, payload.threadId)


@router.patch("/articles/{article_id}")
async def update_article(
    article_id: str,
    payload: dict[str, Any] | None = Body(default=None),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, dict[str, object]]:
    return {"article": ArticleUseCases(repository).update(article_id, payload or {}, user)}


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_article(
    article_id: str,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> Response:
    ArticleUseCases(repository).delete(article_id, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/documents")
async def documents(
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    storage: DocumentStorage = Depends(get_document_storage),
) -> dict[str, list[dict[str, object]]]:
    return {"documents": DocumentUseCases(repository, storage).list_documents(user)}


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    storage: DocumentStorage = Depends(get_document_storage),
) -> dict[str, object]:
    content = await file.read(MAX_DOCUMENT_UPLOAD_BYTES + 1)
    use_cases = DocumentUseCases(repository, storage)
    result = use_cases.upload(
        user,
        filename=file.filename or "document",
        content_type=file.content_type,
        content=content,
    )
    document = cast(dict[str, object], result["document"])
    job = cast(dict[str, object], result["job"])
    background_tasks.add_task(use_cases.run_ingestion, str(document["id"]), str(job["id"]))
    return result


@router.get("/documents/{document_id}/ingestion-jobs")
async def ingestion_jobs(
    document_id: str,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
    storage: DocumentStorage = Depends(get_document_storage),
) -> dict[str, list[dict[str, object]]]:
    return {"jobs": DocumentUseCases(repository, storage).list_ingestion_jobs(user, document_id)}


@router.get("/search")
async def search(
    q: str = Query(default=""),
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, object]:
    return QaUseCases(repository).search(user, q)


@router.post("/ask")
async def ask(
    payload: AskRequest,
    user: User = Depends(require_user),
    repository: KnowledgeRepository = Depends(get_repository),
) -> dict[str, object]:
    return QaUseCases(repository).ask(user, payload.question)
