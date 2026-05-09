from collections.abc import Iterator
from contextlib import contextmanager
import json
import sqlite3
from typing import Any

from backend.app.domain.models import Article, User
from backend.app.infrastructure.db.seed_data import demo_users, roles, seed_articles
from backend.app.shared.config import get_settings


settings = get_settings()
database_path = settings.database_path


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
              role_id TEXT NOT NULL REFERENCES roles(id)
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


def seed_database(reset: bool = False) -> None:
    with _transaction() as connection:
        if reset:
            connection.execute("DELETE FROM articles")
            connection.execute("DELETE FROM users")
            connection.execute("DELETE FROM roles")

        user_count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        if not reset and user_count > 0:
            return

        for role in roles:
            connection.execute(
                "INSERT OR REPLACE INTO roles (id, name) VALUES (?, ?)",
                (role["id"], role["name"]),
            )

        for user in demo_users:
            connection.execute(
                "INSERT OR REPLACE INTO users (id, name, email, role_id) VALUES (?, ?, ?, ?)",
                (user["id"], user["name"], user["email"], user["role"]),
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


def _to_user(row: sqlite3.Row | None) -> User | None:
    if not row:
        return None

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
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


def get_user_by_email(email: str) -> User | None:
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.role_id AS role
            FROM users
            WHERE LOWER(users.email) = LOWER(?)
            """,
            (email,),
        ).fetchone()

        return _to_user(row)


def get_user_by_role(role: str) -> User | None:
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.role_id AS role
            FROM users
            WHERE users.role_id = ?
            ORDER BY users.id ASC
            LIMIT 1
            """,
            (role,),
        ).fetchone()

        return _to_user(row)


def table_counts() -> dict[str, Any]:
    with _connection() as connection:
        return {
            "users": connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"],
            "articles": connection.execute("SELECT COUNT(*) AS count FROM articles").fetchone()["count"],
        }
