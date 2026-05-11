from backend.app.infrastructure.db.orm import models as orm
from backend.app.infrastructure.db.orm.session import session_scope
from backend.app.application.rag_chunks import build_rag_chunks
from backend.app.infrastructure.db.seed_data import (
    demo_password,
    demo_users,
    roles,
    seed_articles,
    seed_knowledge_bases,
)
from backend.app.infrastructure.repositories.sqlalchemy import SQLAlchemyKnowledgeRepository
from backend.app.infrastructure.security.passwords import PBKDF2PasswordHasher
from backend.app.shared.config import get_settings


def _clear_database() -> None:
    with session_scope() as session:
        for model in (
            orm.RetrievalTrace,
            orm.ChatMessage,
            orm.ChatThread,
            orm.RagChunk,
            orm.DocumentChunk,
            orm.IngestionJob,
            orm.Document,
            orm.KnowledgePage,
            orm.KnowledgeSection,
            orm.KnowledgeBaseMember,
            orm.KnowledgeBase,
            orm.ArticleSection,
            orm.ArticleTag,
            orm.ArticleAccess,
            orm.Article,
            orm.UserSession,
            orm.User,
            orm.Role,
        ):
            session.query(model).delete()


def _seed_identity() -> None:
    password_hasher = PBKDF2PasswordHasher()

    with session_scope() as session:
        for role in roles:
            session.add(orm.Role(id=role["id"], name=role["name"]))

        for user in demo_users:
            session.add(
                orm.User(
                    id=user["id"],
                    name=user["name"],
                    email=user["email"],
                    role_id=user["role"],
                    password_hash=password_hasher.hash(demo_password),
                )
            )


def _seed_articles() -> None:
    repository = SQLAlchemyKnowledgeRepository()
    for article in seed_articles:
        repository.save_article(article)


def _seed_knowledge_bases() -> None:
    repository = SQLAlchemyKnowledgeRepository()
    for base in seed_knowledge_bases:
        repository.create_knowledge_base(
            {
                "id": base["id"],
                "title": base["title"],
                "ownerId": base["ownerId"],
                "createdAt": base["createdAt"],
                "updatedAt": base["updatedAt"],
                "sections": [],
                "pages": [],
            }
        )
        repository.add_knowledge_base_member(
            {
                "knowledgeBaseId": base["id"],
                "userId": base["ownerId"],
                "role": "admin",
                "invitedBy": base["ownerId"],
                "createdAt": base["createdAt"],
                "updatedAt": base["updatedAt"],
            }
        )

        sections_by_id: dict[str, dict[str, object]] = {}
        for section in base["sections"]:
            section_payload = {
                "id": section["id"],
                "knowledgeBaseId": base["id"],
                "title": section["title"],
                "position": section["position"],
                "createdAt": section["createdAt"],
                "updatedAt": section["updatedAt"],
            }
            repository.create_knowledge_section(section_payload)
            sections_by_id[str(section["id"])] = section_payload

        for page in base["pages"]:
            page_payload = {
                "id": page["id"],
                "knowledgeBaseId": base["id"],
                "sectionId": page["sectionId"],
                "title": page["title"],
                "contentMd": page["contentMd"],
                "createdAt": page["createdAt"],
                "updatedAt": page["updatedAt"],
            }
            repository.create_knowledge_page(page_payload)
            section = sections_by_id.get(str(page["sectionId"]), {})
            chunks = build_rag_chunks(
                knowledge_base_id=str(base["id"]),
                source_type="page",
                source_id=str(page["id"]),
                title=str(page["title"]),
                section_heading=str(section.get("title", "Markdown")),
                text=str(page["contentMd"]),
            )
            repository.replace_rag_chunks("page", str(page["id"]), chunks)


def main() -> None:
    settings = get_settings()
    _clear_database()
    _seed_identity()
    _seed_articles()
    _seed_knowledge_bases()
    counts = {
        "users": len(demo_users),
        "articles": len(seed_articles),
        "knowledge_bases": len(seed_knowledge_bases),
    }
    print(
        f"Seeded RAG Base database at {settings.database_url} "
        f"({counts['users']} users, {counts['articles']} articles, "
        f"{counts['knowledge_bases']} knowledge bases)"
    )


if __name__ == "__main__":
    main()
