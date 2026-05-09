from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import json
import secrets
import sqlite3
from typing import Any

from backend.app.domain.models import Article, Document, IngestionJob, User, UserCredentials
from backend.app.infrastructure.db.seed_data import demo_password, demo_users, roles, seed_articles
from backend.app.infrastructure.security.passwords import PBKDF2PasswordHasher
from backend.app.shared.config import get_settings


settings = get_settings()
database_path = settings.database_path
password_hasher = PBKDF2PasswordHasher()


def _connect() -> sqlite3.Connection:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def _connection() -> Iterator[sqlite3.Connection]:
    connection = _connect()

    try:
        yield connection
    finally:
        connection.close()


@contextmanager
def _transaction() -> Iterator[sqlite3.Connection]:
    connection = _connect()
    connection.execute("BEGIN")

    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    else:
        connection.commit()
    finally:
        connection.close()


def _parse_json_list(value: str | None) -> list[str]:
    if not value:
        return []

    try:
        parsed_value = json.loads(value)
    except json.JSONDecodeError:
        return []

    if not isinstance(parsed_value, list):
        return []

    return [item for item in parsed_value if isinstance(item, str)]


def _parse_json_object(value: str | None) -> dict[str, object]:
    if not value:
        return {}

    try:
        parsed_value = json.loads(value)
    except json.JSONDecodeError:
        return {}

    return parsed_value if isinstance(parsed_value, dict) else {}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso_datetime(value: datetime) -> str:
    return value.isoformat(timespec="seconds")


def _table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    return {row["name"] for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()}


def _run_schema_migrations(connection: sqlite3.Connection) -> None:
    user_columns = _table_columns(connection, "users")

    if "password_hash" not in user_columns:
        connection.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")


def _to_api_article(connection: sqlite3.Connection, article_row: sqlite3.Row) -> Article:
    section_rows = connection.execute(
        """
        SELECT heading, paragraphs_json, bullets_json
        FROM article_sections
        WHERE article_id = ?
        ORDER BY position ASC
        """,
        (article_row["id"],),
    ).fetchall()

    sections: list[dict[str, object]] = []
    for section_row in section_rows:
        bullets = _parse_json_list(section_row["bullets_json"])
        section: dict[str, object] = {
            "heading": section_row["heading"],
            "paragraphs": _parse_json_list(section_row["paragraphs_json"]),
        }

        if bullets:
            section["bullets"] = bullets

        sections.append(section)

    access_rows = connection.execute(
        """
        SELECT role_id
        FROM article_access
        WHERE article_id = ?
        ORDER BY role_id ASC
        """,
        (article_row["id"],),
    ).fetchall()

    tag_rows = connection.execute(
        """
        SELECT tag
        FROM article_tags
        WHERE article_id = ?
        ORDER BY tag ASC
        """,
        (article_row["id"],),
    ).fetchall()

    return {
        "id": article_row["id"],
        "group": article_row["group_name"],
        "title": article_row["title"],
        "description": article_row["description"],
        "owner": article_row["owner_name"],
        "ownerId": article_row["owner_id"],
        "createdAt": article_row["created_at"],
        "updatedAt": article_row["updated_at"],
        "status": article_row["status"],
        "access": [row["role_id"] for row in access_rows],
        "tags": [row["tag"] for row in tag_rows],
        "sections": sections,
    }


def _replace_article_details(connection: sqlite3.Connection, article: Article) -> None:
    article_id = str(article["id"])
    connection.execute("DELETE FROM article_sections WHERE article_id = ?", (article_id,))
    connection.execute("DELETE FROM article_tags WHERE article_id = ?", (article_id,))
    connection.execute("DELETE FROM article_access WHERE article_id = ?", (article_id,))

    for index, section in enumerate(article["sections"]):
        section_dict = section if isinstance(section, dict) else {}
        connection.execute(
            """
            INSERT INTO article_sections (article_id, position, heading, paragraphs_json, bullets_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                article_id,
                index,
                section_dict.get("heading", ""),
                json.dumps(section_dict.get("paragraphs", []), ensure_ascii=False),
                json.dumps(section_dict.get("bullets", []), ensure_ascii=False),
            ),
        )

    for tag in article["tags"]:
        connection.execute("INSERT INTO article_tags (article_id, tag) VALUES (?, ?)", (article_id, tag))

    for role in article["access"]:
        connection.execute(
            "INSERT INTO article_access (article_id, role_id) VALUES (?, ?)",
            (article_id, role),
        )


def _upsert_article(connection: sqlite3.Connection, article: Article) -> Article:
    connection.execute(
        """
        INSERT INTO articles (
          id,
          group_name,
          title,
          description,
          owner_id,
          owner_name,
          created_at,
          updated_at,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          group_name = excluded.group_name,
          title = excluded.title,
          description = excluded.description,
          owner_id = excluded.owner_id,
          owner_name = excluded.owner_name,
          updated_at = excluded.updated_at,
          status = excluded.status
        """,
        (
            article["id"],
            article["group"],
            article["title"],
            article["description"],
            article["ownerId"],
            article["owner"],
            article["createdAt"],
            article["updatedAt"],
            article["status"],
        ),
    )

    _replace_article_details(connection, article)
    article_row = connection.execute(
        """
        SELECT id, group_name, title, description, owner_id, owner_name, created_at, updated_at, status
        FROM articles
        WHERE id = ?
        """,
        (article["id"],),
    ).fetchone()

    return _to_api_article(connection, article_row)


def init_database() -> None:
    with _connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS roles (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              role_id TEXT NOT NULL REFERENCES roles(id),
              password_hash TEXT
            );

            CREATE TABLE IF NOT EXISTS user_sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              filename TEXT NOT NULL,
              content_type TEXT NOT NULL,
              size_bytes INTEGER NOT NULL,
              storage_path TEXT NOT NULL,
              uploaded_by TEXT NOT NULL REFERENCES users(id),
              uploaded_at TEXT NOT NULL,
              status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'indexed', 'failed')),
              metadata_json TEXT NOT NULL DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS ingestion_jobs (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
              status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
              created_at TEXT NOT NULL,
              started_at TEXT,
              finished_at TEXT,
              error TEXT
            );

            CREATE TABLE IF NOT EXISTS articles (
              id TEXT PRIMARY KEY,
              group_name TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              owner_id TEXT NOT NULL,
              owner_name TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published'))
            );

            CREATE TABLE IF NOT EXISTS article_sections (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
              position INTEGER NOT NULL,
              heading TEXT NOT NULL,
              paragraphs_json TEXT NOT NULL,
              bullets_json TEXT NOT NULL DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS article_tags (
              article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
              tag TEXT NOT NULL,
              PRIMARY KEY (article_id, tag)
            );

            CREATE TABLE IF NOT EXISTS article_access (
              article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
              role_id TEXT NOT NULL REFERENCES roles(id),
              PRIMARY KEY (article_id, role_id)
            );
            """
        )
        _run_schema_migrations(connection)


def seed_database(reset: bool = False) -> None:
    with _transaction() as connection:
        if reset:
            connection.execute("DELETE FROM user_sessions")
            connection.execute("DELETE FROM ingestion_jobs")
            connection.execute("DELETE FROM documents")
            connection.execute("DELETE FROM articles")
            connection.execute("DELETE FROM users")
            connection.execute("DELETE FROM roles")

        user_count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        missing_password_hash_count = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM users
            WHERE password_hash IS NULL OR password_hash = ''
            """
        ).fetchone()["count"]

        if not reset and user_count > 0 and missing_password_hash_count == 0:
            return

        for role in roles:
            connection.execute(
                "INSERT OR REPLACE INTO roles (id, name) VALUES (?, ?)",
                (role["id"], role["name"]),
            )

        for user in demo_users:
            connection.execute(
                """
                INSERT INTO users (id, name, email, role_id, password_hash)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name = excluded.name,
                  email = excluded.email,
                  role_id = excluded.role_id,
                  password_hash = excluded.password_hash
                """,
                (
                    user["id"],
                    user["name"],
                    user["email"],
                    user["role"],
                    password_hasher.hash(demo_password),
                ),
            )

        for article in seed_articles:
            _upsert_article(connection, article)


def list_articles() -> list[Article]:
    with _connection() as connection:
        rows = connection.execute(
            """
            SELECT
              articles.id,
              articles.group_name,
              articles.title,
              articles.description,
              articles.owner_id,
              articles.owner_name,
              articles.created_at,
              articles.updated_at,
              articles.status
            FROM articles
            ORDER BY articles.updated_at DESC, articles.title ASC
            """
        ).fetchall()

        return [_to_api_article(connection, row) for row in rows]


def get_article_by_id(article_id: str) -> Article | None:
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT
              articles.id,
              articles.group_name,
              articles.title,
              articles.description,
              articles.owner_id,
              articles.owner_name,
              articles.created_at,
              articles.updated_at,
              articles.status
            FROM articles
            WHERE articles.id = ?
            """,
            (article_id,),
        ).fetchone()

        return _to_api_article(connection, row) if row else None


def save_article(article: Article) -> Article:
    with _transaction() as connection:
        return _upsert_article(connection, article)


def delete_article(article_id: str) -> bool:
    with _transaction() as connection:
        cursor = connection.execute("DELETE FROM articles WHERE id = ?", (article_id,))
        return cursor.rowcount > 0


def _to_document(row: sqlite3.Row | None) -> Document | None:
    if not row:
        return None

    return {
        "id": row["id"],
        "filename": row["filename"],
        "contentType": row["content_type"],
        "sizeBytes": row["size_bytes"],
        "storagePath": row["storage_path"],
        "uploadedBy": row["uploaded_by"],
        "uploadedAt": row["uploaded_at"],
        "status": row["status"],
        "metadata": _parse_json_object(row["metadata_json"]),
    }


def _to_ingestion_job(row: sqlite3.Row | None) -> IngestionJob | None:
    if not row:
        return None

    return {
        "id": row["id"],
        "documentId": row["document_id"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "startedAt": row["started_at"],
        "finishedAt": row["finished_at"],
        "error": row["error"],
    }


def list_documents() -> list[Document]:
    with _connection() as connection:
        rows = connection.execute(
            """
            SELECT id, filename, content_type, size_bytes, storage_path, uploaded_by, uploaded_at, status, metadata_json
            FROM documents
            ORDER BY uploaded_at DESC, filename ASC
            """
        ).fetchall()

        return [document for row in rows if (document := _to_document(row)) is not None]


def create_document(document: Document) -> Document:
    with _transaction() as connection:
        connection.execute(
            """
            INSERT INTO documents (
              id,
              filename,
              content_type,
              size_bytes,
              storage_path,
              uploaded_by,
              uploaded_at,
              status,
              metadata_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                document["id"],
                document["filename"],
                document["contentType"],
                document["sizeBytes"],
                document["storagePath"],
                document["uploadedBy"],
                document["uploadedAt"],
                document["status"],
                json.dumps(document.get("metadata", {}), ensure_ascii=False),
            ),
        )

    with _connection() as connection:
        row = connection.execute(
            """
            SELECT id, filename, content_type, size_bytes, storage_path, uploaded_by, uploaded_at, status, metadata_json
            FROM documents
            WHERE id = ?
            """,
            (document["id"],),
        ).fetchone()

        saved_document = _to_document(row)
        if saved_document is None:
            raise RuntimeError("created document was not found")

        return saved_document


def update_document_status(document_id: str, status: str) -> Document | None:
    with _transaction() as connection:
        connection.execute("UPDATE documents SET status = ? WHERE id = ?", (status, document_id))

    with _connection() as connection:
        row = connection.execute(
            """
            SELECT id, filename, content_type, size_bytes, storage_path, uploaded_by, uploaded_at, status, metadata_json
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()

        return _to_document(row)


def list_ingestion_jobs(document_id: str | None = None) -> list[IngestionJob]:
    with _connection() as connection:
        if document_id:
            rows = connection.execute(
                """
                SELECT id, document_id, status, created_at, started_at, finished_at, error
                FROM ingestion_jobs
                WHERE document_id = ?
                ORDER BY created_at DESC
                """,
                (document_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT id, document_id, status, created_at, started_at, finished_at, error
                FROM ingestion_jobs
                ORDER BY created_at DESC
                """
            ).fetchall()

        return [job for row in rows if (job := _to_ingestion_job(row)) is not None]


def create_ingestion_job(job: IngestionJob) -> IngestionJob:
    with _transaction() as connection:
        connection.execute(
            """
            INSERT INTO ingestion_jobs (id, document_id, status, created_at, started_at, finished_at, error)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job["id"],
                job["documentId"],
                job["status"],
                job["createdAt"],
                job["startedAt"],
                job["finishedAt"],
                job["error"],
            ),
        )

    jobs = list_ingestion_jobs(str(job["documentId"]))
    return next((saved_job for saved_job in jobs if saved_job["id"] == job["id"]), job)


def update_ingestion_job_status(
    job_id: str,
    status: str,
    *,
    error: str | None = None,
    started_at: str | None = None,
    finished_at: str | None = None,
) -> IngestionJob | None:
    with _transaction() as connection:
        connection.execute(
            """
            UPDATE ingestion_jobs
            SET
              status = ?,
              error = COALESCE(?, error),
              started_at = COALESCE(?, started_at),
              finished_at = COALESCE(?, finished_at)
            WHERE id = ?
            """,
            (status, error, started_at, finished_at, job_id),
        )

    with _connection() as connection:
        row = connection.execute(
            """
            SELECT id, document_id, status, created_at, started_at, finished_at, error
            FROM ingestion_jobs
            WHERE id = ?
            """,
            (job_id,),
        ).fetchone()

        return _to_ingestion_job(row)


def _to_user(row: sqlite3.Row | None) -> User | None:
    if not row:
        return None

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
    }


def _to_user_credentials(row: sqlite3.Row | None) -> UserCredentials | None:
    if not row:
        return None

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "passwordHash": row["password_hash"],
    }


def get_user_by_id(user_id: str) -> User | None:
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.role_id AS role
            FROM users
            WHERE users.id = ?
            """,
            (user_id,),
        ).fetchone()

        return _to_user(row)


def get_user_by_session_token(token: str) -> User | None:
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.role_id AS role
            FROM user_sessions
            JOIN users ON users.id = user_sessions.user_id
            WHERE user_sessions.token = ?
              AND user_sessions.expires_at > ?
            """,
            (token, _to_iso_datetime(_utc_now())),
        ).fetchone()

        return _to_user(row)


def get_user_credentials_by_email(email: str) -> UserCredentials | None:
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.role_id AS role, users.password_hash
            FROM users
            WHERE LOWER(users.email) = LOWER(?)
            """,
            (email,),
        ).fetchone()

        return _to_user_credentials(row)


def get_user_credentials_by_role(role: str) -> UserCredentials | None:
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.role_id AS role, users.password_hash
            FROM users
            WHERE users.role_id = ?
            ORDER BY users.id ASC
            LIMIT 1
            """,
            (role,),
        ).fetchone()

        return _to_user_credentials(row)


def create_user_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    now = _utc_now()
    expires_at = now + timedelta(days=7)

    with _transaction() as connection:
        connection.execute(
            """
            INSERT INTO user_sessions (token, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (token, user_id, _to_iso_datetime(now), _to_iso_datetime(expires_at)),
        )

    return token


def delete_user_session(token: str) -> bool:
    with _transaction() as connection:
        cursor = connection.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
        return cursor.rowcount > 0


def table_counts() -> dict[str, Any]:
    with _connection() as connection:
        return {
            "users": connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"],
            "articles": connection.execute("SELECT COUNT(*) AS count FROM articles").fetchone()["count"],
            "sessions": connection.execute("SELECT COUNT(*) AS count FROM user_sessions").fetchone()["count"],
        }
