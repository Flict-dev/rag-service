from collections.abc import Iterator
import shutil

import pytest
from fastapi.testclient import TestClient

from backend.app.infrastructure.db.database import init_database, seed_database
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
    init_database()
    seed_database(reset=True)


def login(client: TestClient, email: str) -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": "demo-password"},
    )

    assert response.status_code == 200
    return response.json()["token"]


def test_login_me_and_logout_invalidate_session(client: TestClient) -> None:
    token = login(client, "editor@ragbase.local")

    me_response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["user"]["role"] == "editor"

    logout_response = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_response.status_code == 204

    rejected_response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert rejected_response.status_code == 401


def test_reader_cannot_read_restricted_articles(client: TestClient) -> None:
    reader_token = login(client, "reader@ragbase.local")
    admin_token = login(client, "admin@ragbase.local")

    list_response = client.get("/articles", headers={"Authorization": f"Bearer {reader_token}"})
    assert list_response.status_code == 200
    article_ids = {article["id"] for article in list_response.json()["articles"]}
    assert "editor-access" not in article_ids
    assert "publishing" not in article_ids

    forbidden_response = client.get(
        "/articles/editor-access",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert forbidden_response.status_code == 403

    admin_response = client.get(
        "/articles/editor-access",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_response.status_code == 200


def test_document_upload_creates_completed_ingestion_job(client: TestClient) -> None:
    editor_token = login(client, "editor@ragbase.local")

    upload_response = client.post(
        "/documents",
        files={"file": ("runbook.txt", b"RAG document fixture", "text/plain")},
        headers={"Authorization": f"Bearer {editor_token}"},
    )
    assert upload_response.status_code == 201
    payload = upload_response.json()
    document_id = payload["document"]["id"]
    assert payload["document"]["filename"] == "runbook.txt"
    assert payload["job"]["status"] == "queued"

    jobs_response = client.get(
        f"/documents/{document_id}/ingestion-jobs",
        headers={"Authorization": f"Bearer {editor_token}"},
    )
    assert jobs_response.status_code == 200
    assert jobs_response.json()["jobs"][0]["status"] == "completed"

    documents_response = client.get("/documents", headers={"Authorization": f"Bearer {editor_token}"})
    assert documents_response.status_code == 200
    assert documents_response.json()["documents"][0]["status"] == "indexed"


def test_reader_cannot_upload_documents(client: TestClient) -> None:
    reader_token = login(client, "reader@ragbase.local")

    response = client.post(
        "/documents",
        files={"file": ("reader.txt", b"reader upload", "text/plain")},
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert response.status_code == 403
