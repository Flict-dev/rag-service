from datetime import datetime, timezone
from uuid import uuid4

from backend.app.application.errors import BadRequestError, NotFoundError, PermissionDeniedError
from backend.app.application.ports.repositories import KnowledgeRepository
from backend.app.application.rag_chunks import build_rag_chunks
from backend.app.domain.models import KnowledgeBase, KnowledgePage, KnowledgeSection, User


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _can_manage_content(user: User) -> bool:
    return user["role"] in {"editor", "admin"}


def _title(value: str | None, fallback: str) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback


class KnowledgeBaseUseCases:
    def __init__(self, repository: KnowledgeRepository, rag_service: object | None = None) -> None:
        self.repository = repository
        self.rag_service = rag_service

    def list_bases(self, user: User) -> list[KnowledgeBase]:
        return self.repository.list_knowledge_bases(user)

    def get_base(self, base_id: str, user: User) -> KnowledgeBase:
        base = self.repository.get_knowledge_base(base_id)
        if not base:
            raise NotFoundError("Knowledge base not found")
        return base

    def create_base(self, title: str | None, user: User) -> KnowledgeBase:
        if not _can_manage_content(user):
            raise PermissionDeniedError("Only editor and admin can create knowledge bases")

        now = _utc_now()
        base_id = f"base-{uuid4().hex}"
        section_id = f"section-{uuid4().hex}"
        base = self.repository.create_knowledge_base(
            {
                "id": base_id,
                "title": _title(title, "Новая база знаний"),
                "ownerId": user["id"],
                "createdAt": now,
                "updatedAt": now,
                "sections": [],
                "pages": [],
            }
        )
        self.repository.create_knowledge_section(
            {
                "id": section_id,
                "knowledgeBaseId": base_id,
                "title": "Раздел",
                "position": 0,
                "createdAt": now,
                "updatedAt": now,
            }
        )
        return self.get_base(str(base["id"]), user)

    def create_section(self, base_id: str, title: str | None, user: User) -> KnowledgeSection:
        if not _can_manage_content(user):
            raise PermissionDeniedError("Only editor and admin can create sections")

        self.get_base(base_id, user)
        now = _utc_now()
        section = self.repository.create_knowledge_section(
            {
                "id": f"section-{uuid4().hex}",
                "knowledgeBaseId": base_id,
                "title": _title(title, "Новый раздел"),
                "position": len(self.get_base(base_id, user)["sections"]),
                "createdAt": now,
                "updatedAt": now,
            }
        )
        return section

    def create_page(self, base_id: str, section_id: str | None, title: str | None, user: User) -> dict[str, object]:
        if not _can_manage_content(user):
            raise PermissionDeniedError("Only editor and admin can create pages")

        base = self.get_base(base_id, user)
        target_section_id = section_id or str(base["sections"][0]["id"] if base["sections"] else "")
        if not target_section_id:
            raise BadRequestError("sectionId is required")

        section = next((item for item in base["sections"] if item["id"] == target_section_id), None)
        if not section:
            raise NotFoundError("Section not found")

        now = _utc_now()
        page_title = _title(title, "Новая страница")
        page = self.repository.create_knowledge_page(
            {
                "id": f"page-{uuid4().hex}",
                "knowledgeBaseId": base_id,
                "sectionId": target_section_id,
                "title": page_title,
                "contentMd": f"# {page_title}\n\nНачните писать markdown здесь.",
                "createdAt": now,
                "updatedAt": now,
            }
        )
        self._index_page(base_id, page, str(section["title"]))
        return {"page": page, "job": self._page_job(page)}

    def update_page(self, base_id: str, page_id: str, payload: dict[str, object], user: User) -> dict[str, object]:
        if not _can_manage_content(user):
            raise PermissionDeniedError("Only editor and admin can update pages")

        base = self.get_base(base_id, user)
        existing_page = next((page for page in base["pages"] if page["id"] == page_id), None)
        if not existing_page:
            raise NotFoundError("Page not found")

        if "sectionId" in payload and not any(section["id"] == payload["sectionId"] for section in base["sections"]):
            raise NotFoundError("Section not found")

        page = self.repository.update_knowledge_page(page_id, {**payload, "updatedAt": _utc_now()})
        if not page:
            raise NotFoundError("Page not found")

        section = next((item for item in base["sections"] if item["id"] == page["sectionId"]), None)
        self._index_page(base_id, page, str(section["title"] if section else "Markdown"))
        return {"page": page, "job": self._page_job(page)}

    def _index_page(self, base_id: str, page: KnowledgePage, section_heading: str) -> None:
        chunks = build_rag_chunks(
            knowledge_base_id=base_id,
            source_type="page",
            source_id=str(page["id"]),
            title=str(page["title"]),
            section_heading=section_heading,
            text=str(page["contentMd"]),
        )
        if self.rag_service:
            chunks = self.rag_service.index_chunks(chunks)
        self.repository.replace_rag_chunks("page", str(page["id"]), chunks)

    def _page_job(self, page: KnowledgePage) -> dict[str, object]:
        now = _utc_now()
        return {
            "id": f"job-page-{page['id']}",
            "documentId": str(page["id"]),
            "status": "completed",
            "createdAt": now,
            "startedAt": now,
            "finishedAt": now,
            "error": None,
        }
