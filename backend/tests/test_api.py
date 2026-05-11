from collections.abc import Iterator
import shutil

import pytest
from fastapi.testclient import TestClient

from backend.app.infrastructure.db.orm.models import Base
from backend.app.infrastructure.db.orm.session import engine
from backend.app.seed import main as seed_database
from backend.app.main import app
from backend.app.shared.config import get_settings


@pytest.fixture()
def client() -> Iterator[TestClient]:
    reset_state()
    with TestClient(app) as test_client:
        yield test_client
    reset_state()


def reset_state() -> None:
    settings = get_settings()
    shutil.rmtree(settings.upload_dir, ignore_errors=True)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database()


def login(client: TestClient, email: str) -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": "demo-password"},
    )

    assert response.status_code == 200
    return response.json()["token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_base(client: TestClient, token: str, title: str = "Support KB") -> dict[str, object]:
    response = client.post(
        "/knowledge-bases",
        json={"title": title},
        headers=auth_headers(token),
    )
    assert response.status_code == 201
    return response.json()["base"]


def test_login_me_and_logout_invalidate_session(client: TestClient) -> None:
    token = login(client, "editor@ragbase.local")

    me_response = client.get("/me", headers=auth_headers(token))
    assert me_response.status_code == 200
    assert me_response.json()["user"]["role"] == "editor"

    logout_response = client.post("/auth/logout", headers=auth_headers(token))
    assert logout_response.status_code == 204

    rejected_response = client.get("/me", headers=auth_headers(token))
    assert rejected_response.status_code == 401


def test_register_creates_session_for_new_reader(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={
            "email": "new.reader@ragbase.local",
            "name": "Новый читатель",
            "password": "demo-password",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["user"]["email"] == "new.reader@ragbase.local"

    me_response = client.get("/me", headers=auth_headers(payload["token"]))
    assert me_response.status_code == 200
    assert me_response.json()["user"]["role"] == "reader"


def test_seeded_knowledge_base_answers_rag_question(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")

    bases_response = client.get("/knowledge-bases", headers=auth_headers(editor_token))
    assert bases_response.status_code == 200
    bases = bases_response.json()["bases"]
    demo_base = next((base for base in bases if base["id"] == "kb-rag-demo-support"), None)
    assert demo_base is not None
    assert demo_base["title"] == "RAG Demo Support"

    answer_response = client.post(
        "/knowledge-bases/kb-rag-demo-support/ask",
        json={"question": "синий маркер Вега"},
        headers=auth_headers(editor_token),
    )
    assert answer_response.status_code == 200
    payload = answer_response.json()
    assert payload["sources"][0]["sourceType"] == "page"
    assert payload["sources"][0]["sourceId"] == "page-rag-demo-rag-77"
    assert payload["traceId"]


def test_seeded_pasta_cookbook_has_recipes_and_answers(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")

    base_response = client.get("/knowledge-bases/kb-pasta-cookbook", headers=auth_headers(editor_token))
    assert base_response.status_code == 200
    base = base_response.json()["base"]
    assert base["title"] == "Книга рецептов пасты"
    assert len(base["pages"]) >= 20

    answer_response = client.post(
        "/knowledge-bases/kb-pasta-cookbook/ask",
        json={"question": "янтарный перец Карбонара-01"},
        headers=auth_headers(editor_token),
    )
    assert answer_response.status_code == 200
    payload = answer_response.json()
    assert payload["sources"][0]["sourceType"] == "page"
    assert payload["sources"][0]["sourceId"] == "page-pasta-carbonara"


def test_reader_cannot_read_restricted_articles(client: TestClient) -> None:
    reader_token = login(client, "reader@ragbase.local")
    admin_token = login(client, "admin@ragbase.local")

    list_response = client.get("/articles", headers=auth_headers(reader_token))
    assert list_response.status_code == 200
    article_ids = {article["id"] for article in list_response.json()["articles"]}
    assert "editor-access" not in article_ids
    assert "publishing" not in article_ids

    forbidden_response = client.get(
        "/articles/editor-access",
        headers=auth_headers(reader_token),
    )
    assert forbidden_response.status_code == 403

    admin_response = client.get(
        "/articles/editor-access",
        headers=auth_headers(admin_token),
    )
    assert admin_response.status_code == 200


def test_search_filters_restricted_articles_by_role(client: TestClient) -> None:
    reader_token = login(client, "reader@ragbase.local")
    admin_token = login(client, "admin@ragbase.local")

    reader_response = client.get(
        "/search",
        params={"q": "Проверка перед публикацией"},
        headers=auth_headers(reader_token),
    )
    assert reader_response.status_code == 200
    assert reader_response.json()["results"] == []

    admin_response = client.get(
        "/search",
        params={"q": "Проверка перед публикацией"},
        headers=auth_headers(admin_token),
    )
    assert admin_response.status_code == 200
    admin_article_ids = {
        result["article"]["id"]
        for result in admin_response.json()["results"]
    }
    assert admin_article_ids == {"editor-access"}


def test_ask_filters_sources_by_role(client: TestClient) -> None:
    reader_token = login(client, "reader@ragbase.local")
    admin_token = login(client, "admin@ragbase.local")

    reader_response = client.post(
        "/ask",
        json={"question": "Проверка перед публикацией"},
        headers=auth_headers(reader_token),
    )
    assert reader_response.status_code == 200
    reader_payload = reader_response.json()
    assert reader_payload["sources"] == []
    assert "не нашлось" in reader_payload["answer"]

    admin_response = client.post(
        "/ask",
        json={"question": "Проверка перед публикацией"},
        headers=auth_headers(admin_token),
    )
    assert admin_response.status_code == 200
    assert admin_response.json()["sources"] == [
        {
            "articleId": "editor-access",
            "sectionHeading": "Проверка перед публикацией",
            "title": "Кто может редактировать",
        }
    ]


def test_ask_requires_question(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")

    response = client.post(
        "/ask",
        json={"question": "   "},
        headers=auth_headers(editor_token),
    )

    assert response.status_code == 400
    assert response.json() == {"error": "question is required"}


def test_uploaded_text_document_becomes_rag_source_for_editors(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")
    reader_token = login(client, "reader@ragbase.local")

    upload_response = client.post(
        "/documents",
        files={
            "file": (
                "runbook.txt",
                b"Phoenix escalation marker lives only in this uploaded document.",
                "text/plain",
            )
        },
        headers=auth_headers(editor_token),
    )
    assert upload_response.status_code == 201

    search_response = client.get(
        "/search",
        params={"q": "Phoenix escalation marker"},
        headers=auth_headers(editor_token),
    )
    assert search_response.status_code == 200
    document_results = search_response.json()["documentResults"]
    assert document_results[0]["chunk"]["documentFilename"] == "runbook.txt"

    editor_response = client.post(
        "/ask",
        json={"question": "Phoenix escalation marker"},
        headers=auth_headers(editor_token),
    )
    assert editor_response.status_code == 200
    assert editor_response.json()["sources"] == [
        {
            "documentId": upload_response.json()["document"]["id"],
            "sectionHeading": "Документ, фрагмент 1",
            "title": "runbook.txt",
        }
    ]

    reader_response = client.post(
        "/ask",
        json={"question": "Phoenix escalation marker"},
        headers=auth_headers(reader_token),
    )
    assert reader_response.status_code == 200
    assert reader_response.json()["sources"] == []


def test_document_upload_creates_completed_ingestion_job(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")

    upload_response = client.post(
        "/documents",
        files={"file": ("runbook.txt", b"RAG document fixture", "text/plain")},
        headers=auth_headers(editor_token),
    )
    assert upload_response.status_code == 201
    payload = upload_response.json()
    document_id = payload["document"]["id"]
    assert payload["document"]["filename"] == "runbook.txt"
    assert payload["job"]["status"] == "queued"

    jobs_response = client.get(
        f"/documents/{document_id}/ingestion-jobs",
        headers=auth_headers(editor_token),
    )
    assert jobs_response.status_code == 200
    assert jobs_response.json()["jobs"][0]["status"] == "completed"

    documents_response = client.get("/documents", headers=auth_headers(editor_token))
    assert documents_response.status_code == 200
    assert documents_response.json()["documents"][0]["status"] == "indexed"
    assert documents_response.json()["documents"][0]["metadata"]["chunkCount"] == 1


def test_reader_cannot_upload_documents(client: TestClient) -> None:
    reader_token = login(client, "reader@ragbase.local")

    response = client.post(
        "/documents",
        files={"file": ("reader.txt", b"reader upload", "text/plain")},
        headers=auth_headers(reader_token),
    )
    assert response.status_code == 403


def test_knowledge_base_sections_and_pages_persist(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")
    base = create_base(client, editor_token, "API knowledge")

    section_response = client.post(
        f"/knowledge-bases/{base['id']}/sections",
        json={"title": "Runbooks"},
        headers=auth_headers(editor_token),
    )
    assert section_response.status_code == 201
    section = section_response.json()["section"]

    page_response = client.post(
        f"/knowledge-bases/{base['id']}/pages",
        json={"sectionId": section["id"], "title": "Password reset"},
        headers=auth_headers(editor_token),
    )
    assert page_response.status_code == 201
    page = page_response.json()["page"]

    update_response = client.patch(
        f"/knowledge-bases/{base['id']}/pages/{page['id']}",
        json={"contentMd": "# Password reset\n\nUse the amber reset marker."},
        headers=auth_headers(editor_token),
    )
    assert update_response.status_code == 200

    get_response = client.get(f"/knowledge-bases/{base['id']}", headers=auth_headers(editor_token))
    assert get_response.status_code == 200
    saved_base = get_response.json()["base"]
    assert any(candidate["title"] == "Runbooks" for candidate in saved_base["sections"])
    assert any("amber reset marker" in candidate["contentMd"] for candidate in saved_base["pages"])


def test_ask_is_scoped_to_selected_knowledge_base(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")
    first_base = create_base(client, editor_token, "First")
    second_base = create_base(client, editor_token, "Second")

    first_section_id = first_base["sections"][0]["id"]
    second_section_id = second_base["sections"][0]["id"]
    first_page_response = client.post(
        f"/knowledge-bases/{first_base['id']}/pages",
        json={"sectionId": first_section_id, "title": "Neon runbook"},
        headers=auth_headers(editor_token),
    )
    second_page_response = client.post(
        f"/knowledge-bases/{second_base['id']}/pages",
        json={"sectionId": second_section_id, "title": "Copper runbook"},
        headers=auth_headers(editor_token),
    )
    first_page = first_page_response.json()["page"]
    second_page = second_page_response.json()["page"]

    client.patch(
        f"/knowledge-bases/{first_base['id']}/pages/{first_page['id']}",
        json={"contentMd": "Neon password reset marker lives only in the first base."},
        headers=auth_headers(editor_token),
    )
    client.patch(
        f"/knowledge-bases/{second_base['id']}/pages/{second_page['id']}",
        json={"contentMd": "Copper billing marker lives only in the second base."},
        headers=auth_headers(editor_token),
    )

    first_answer = client.post(
        f"/knowledge-bases/{first_base['id']}/ask",
        json={"question": "Neon password reset marker"},
        headers=auth_headers(editor_token),
    )
    assert first_answer.status_code == 200
    first_sources = first_answer.json()["sources"]
    assert first_sources[0]["sourceType"] == "page"
    assert first_sources[0]["sourceId"] == first_page["id"]

    second_answer = client.post(
        f"/knowledge-bases/{second_base['id']}/ask",
        json={"question": "Neon password reset marker"},
        headers=auth_headers(editor_token),
    )
    assert second_answer.status_code == 200
    assert second_answer.json()["sources"] == []


def test_uploaded_document_becomes_base_rag_source(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")
    base = create_base(client, editor_token, "Uploads")

    upload_response = client.post(
        f"/knowledge-bases/{base['id']}/documents",
        files={
            "file": (
                "upload-runbook.txt",
                b"Orchid escalation marker lives only in this base upload.",
                "text/plain",
            )
        },
        headers=auth_headers(editor_token),
    )
    assert upload_response.status_code == 201

    answer_response = client.post(
        f"/knowledge-bases/{base['id']}/ask",
        json={"question": "Orchid escalation marker"},
        headers=auth_headers(editor_token),
    )
    assert answer_response.status_code == 200
    sources = answer_response.json()["sources"]
    assert sources[0]["sourceType"] == "document"
    assert sources[0]["sourceId"] == upload_response.json()["document"]["id"]


def test_registered_reader_can_create_base_and_becomes_base_admin(client: TestClient) -> None:
    register_response = client.post(
        "/auth/register",
        json={
            "email": "owner.reader@ragbase.local",
            "name": "Reader Owner",
            "password": "demo-password",
        },
    )
    assert register_response.status_code == 201
    payload = register_response.json()
    token = payload["token"]
    user_id = payload["user"]["id"]
    assert payload["user"]["role"] == "reader"

    base = create_base(client, token, "Reader owned base")

    assert base["ownerId"] == user_id
    assert base["myRole"] == "admin"
    assert base["members"] == [
        {
            "userId": user_id,
            "name": "Reader Owner",
            "email": "owner.reader@ragbase.local",
            "role": "admin",
            "createdAt": base["createdAt"],
            "updatedAt": base["createdAt"],
            "isOwner": True,
        }
    ]


def test_knowledge_base_access_requires_membership(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")
    reader_token = login(client, "reader@ragbase.local")
    base = create_base(client, editor_token, "Private base")

    reader_bases_response = client.get("/knowledge-bases", headers=auth_headers(reader_token))
    assert reader_bases_response.status_code == 200
    assert all(candidate["id"] != base["id"] for candidate in reader_bases_response.json()["bases"])

    get_response = client.get(f"/knowledge-bases/{base['id']}", headers=auth_headers(reader_token))
    assert get_response.status_code == 403

    ask_response = client.post(
        f"/knowledge-bases/{base['id']}/ask",
        json={"question": "private marker"},
        headers=auth_headers(reader_token),
    )
    assert ask_response.status_code == 403

    upload_response = client.post(
        f"/knowledge-bases/{base['id']}/documents",
        files={"file": ("reader.txt", b"reader upload", "text/plain")},
        headers=auth_headers(reader_token),
    )
    assert upload_response.status_code == 403


def test_base_admin_invites_reader_and_updates_member_role(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")
    reader_token = login(client, "reader@ragbase.local")
    base = create_base(client, editor_token, "Team base")

    invite_response = client.post(
        f"/knowledge-bases/{base['id']}/members",
        json={"email": "reader@ragbase.local"},
        headers=auth_headers(editor_token),
    )
    assert invite_response.status_code == 201
    invited_member = invite_response.json()["member"]
    assert invited_member["email"] == "reader@ragbase.local"
    assert invited_member["role"] == "reader"

    reader_base_response = client.get(f"/knowledge-bases/{base['id']}", headers=auth_headers(reader_token))
    assert reader_base_response.status_code == 200
    reader_base = reader_base_response.json()["base"]
    assert reader_base["myRole"] == "reader"

    reader_page_response = client.post(
        f"/knowledge-bases/{base['id']}/pages",
        json={"sectionId": base["sections"][0]["id"], "title": "Reader page"},
        headers=auth_headers(reader_token),
    )
    assert reader_page_response.status_code == 403

    reader_upload_response = client.post(
        f"/knowledge-bases/{base['id']}/documents",
        files={"file": ("reader.txt", b"reader upload", "text/plain")},
        headers=auth_headers(reader_token),
    )
    assert reader_upload_response.status_code == 403

    ask_response = client.post(
        f"/knowledge-bases/{base['id']}/ask",
        json={"question": "anything here"},
        headers=auth_headers(reader_token),
    )
    assert ask_response.status_code == 200

    role_response = client.patch(
        f"/knowledge-bases/{base['id']}/members/{invited_member['userId']}",
        json={"role": "editor"},
        headers=auth_headers(editor_token),
    )
    assert role_response.status_code == 200
    assert role_response.json()["member"]["role"] == "editor"

    editor_page_response = client.post(
        f"/knowledge-bases/{base['id']}/pages",
        json={"sectionId": base["sections"][0]["id"], "title": "Editor page"},
        headers=auth_headers(reader_token),
    )
    assert editor_page_response.status_code == 201


def test_only_base_admin_can_manage_members_and_owner_role_is_locked(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")
    reader_token = login(client, "reader@ragbase.local")
    base = create_base(client, editor_token, "Team permissions")

    invite_response = client.post(
        f"/knowledge-bases/{base['id']}/members",
        json={"email": "reader@ragbase.local"},
        headers=auth_headers(editor_token),
    )
    assert invite_response.status_code == 201

    reader_invite_response = client.post(
        f"/knowledge-bases/{base['id']}/members",
        json={"email": "admin@ragbase.local"},
        headers=auth_headers(reader_token),
    )
    assert reader_invite_response.status_code == 403

    reader_role_response = client.patch(
        f"/knowledge-bases/{base['id']}/members/demo-reader",
        json={"role": "editor"},
        headers=auth_headers(reader_token),
    )
    assert reader_role_response.status_code == 403

    owner_role_response = client.patch(
        f"/knowledge-bases/{base['id']}/members/{base['ownerId']}",
        json={"role": "reader"},
        headers=auth_headers(editor_token),
    )
    assert owner_role_response.status_code == 400
