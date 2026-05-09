from datetime import date
import re
from typing import Any

from backend.app.domain.models import Article, DEFAULT_ACCESS, User, VALID_ROLES, VALID_STATUSES


def today_iso_date() -> str:
    return date.today().isoformat()


def normalize_text(value: Any, fallback: str = "") -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def normalize_text_list(value: Any, fallback: list[str] | None = None) -> list[str]:
    fallback_items = [] if fallback is None else fallback
    if not isinstance(value, list):
        return fallback_items

    normalized_items = [item.strip() for item in value if isinstance(item, str) and item.strip()]
    return normalized_items if normalized_items else fallback_items


def normalize_access(value: Any, fallback: list[str] | None = None) -> list[str]:
    fallback_roles = list(DEFAULT_ACCESS if fallback is None else fallback)
    if not isinstance(value, list):
        return fallback_roles

    roles = []
    for role in value:
        if isinstance(role, str) and role in VALID_ROLES and role not in roles:
            roles.append(role)

    return roles if roles else fallback_roles


def normalize_sections(value: Any, fallback: list[dict[str, object]] | None = None) -> list[dict[str, object]]:
    fallback_sections = [] if fallback is None else fallback
    if not isinstance(value, list):
        return fallback_sections

    sections: list[dict[str, object]] = []
    for section in value:
        section_dict = section if isinstance(section, dict) else {}
        sections.append(
            {
                "heading": normalize_text(section_dict.get("heading")),
                "paragraphs": normalize_text_list(section_dict.get("paragraphs")),
                "bullets": normalize_text_list(section_dict.get("bullets"), []),
            }
        )

    return sections


def normalize_status(value: Any, fallback: str = "draft") -> str:
    return value if isinstance(value, str) and value in VALID_STATUSES else fallback


def slugify_title(title: str) -> str:
    normalized_title = "".join(char if char.isalnum() else "-" for char in title.strip().lower())
    normalized_title = re.sub(r"-+", "-", normalized_title).strip("-")
    return normalized_title or "article"


def create_unique_article_id(title: str, existing_ids: set[str]) -> str:
    base_id = slugify_title(title)
    candidate_id = base_id
    counter = 2

    while candidate_id in existing_ids:
        candidate_id = f"{base_id}-{counter}"
        counter += 1

    return candidate_id


def can_read_article(article: Article, user: User) -> bool:
    if user["role"] == "admin":
        return True

    if article["status"] == "published":
        return True

    return user["role"] in article["access"]


def can_write_article(article: Article | None, user: User) -> bool:
    if user["role"] == "admin":
        return True

    if user["role"] != "editor":
        return False

    if not article:
        return True

    return article["ownerId"] == user["id"] or user["role"] in article["access"]


def validate_article(article: Article) -> list[str]:
    errors: list[str] = []

    if not article["title"]:
        errors.append("title is required")

    if not article["description"]:
        errors.append("description is required")

    if not article["group"]:
        errors.append("group is required")

    if not article["owner"]:
        errors.append("owner is required")

    if article["status"] not in VALID_STATUSES:
        errors.append("status is invalid")

    if not article["tags"]:
        errors.append("at least one tag is required")

    if not article["access"]:
        errors.append("at least one access role is required")

    if not article["sections"]:
        errors.append("at least one section is required")

    for index, section in enumerate(article["sections"]):
        section_dict = section if isinstance(section, dict) else {}
        paragraphs = section_dict.get("paragraphs", [])

        if not section_dict.get("heading"):
            errors.append(f"section {index + 1} heading is required")

        if not isinstance(paragraphs, list) or len(paragraphs) == 0:
            errors.append(f"section {index + 1} needs at least one paragraph")

    return errors


def build_article_from_payload(
    payload: dict[str, Any],
    user: User,
    existing_article: Article | None = None,
    existing_ids: set[str] | None = None,
) -> Article:
    now = today_iso_date()
    status = normalize_status(payload.get("status"), str(existing_article.get("status", "draft")) if existing_article else "draft")
    fallback_access = existing_article.get("access", DEFAULT_ACCESS) if existing_article else DEFAULT_ACCESS
    requested_access = normalize_access(payload.get("access"), list(fallback_access))
    fallback_sections = existing_article.get("sections", []) if existing_article else []

    return {
        "id": (
            existing_article["id"]
            if existing_article
            else normalize_text(
                payload.get("id"),
                create_unique_article_id(str(payload.get("title", "article")), existing_ids or set()),
            )
        ),
        "group": normalize_text(payload.get("group"), str(existing_article.get("group", "")) if existing_article else ""),
        "title": normalize_text(payload.get("title"), str(existing_article.get("title", "")) if existing_article else ""),
        "description": normalize_text(
            payload.get("description"),
            str(existing_article.get("description", "")) if existing_article else "",
        ),
        "owner": normalize_text(
            payload.get("owner"),
            str(existing_article.get("owner", user["name"])) if existing_article else user["name"],
        ),
        "ownerId": (
            normalize_text(
                payload.get("ownerId"),
                str(existing_article.get("ownerId", user["id"])) if existing_article else user["id"],
            )
            if user["role"] == "admin"
            else (existing_article.get("ownerId", user["id"]) if existing_article else user["id"])
        ),
        "createdAt": (
            existing_article["createdAt"]
            if existing_article
            else normalize_text(payload.get("createdAt"), now)
        ),
        "updatedAt": now,
        "status": status,
        "access": requested_access if user["role"] == "admin" else (existing_article.get("access", DEFAULT_ACCESS) if existing_article else list(DEFAULT_ACCESS)),
        "tags": normalize_text_list(payload.get("tags"), list(existing_article.get("tags", [])) if existing_article else []),
        "sections": normalize_sections(payload.get("sections"), list(fallback_sections)),
    }


def normalize_query(value: Any) -> str:
    return str(value or "").strip().casefold()


def collect_search_fields(article: Article) -> list[dict[str, str]]:
    sections = article["sections"] if isinstance(article["sections"], list) else []
    first_heading = "Статья"
    if sections and isinstance(sections[0], dict):
        first_heading = str(sections[0].get("heading") or first_heading)

    fields = [
        {"field": "title", "sectionHeading": first_heading, "value": str(article["title"])},
        {"field": "description", "sectionHeading": first_heading, "value": str(article["description"])},
        {"field": "group", "sectionHeading": first_heading, "value": str(article["group"])},
        {"field": "owner", "sectionHeading": first_heading, "value": str(article["owner"])},
        {
            "field": "tags",
            "sectionHeading": first_heading,
            "value": ", ".join(str(tag) for tag in article["tags"]),
        },
    ]

    for section in sections:
        if not isinstance(section, dict):
            continue

        heading = str(section.get("heading") or "")
        fields.append({"field": "sectionHeading", "sectionHeading": heading, "value": heading})

        paragraphs = section.get("paragraphs", [])
        if isinstance(paragraphs, list):
            for paragraph in paragraphs:
                fields.append(
                    {
                        "field": "paragraph",
                        "sectionHeading": heading,
                        "value": str(paragraph),
                    }
                )

    return fields


def search_readable_articles(articles: list[Article], query: Any) -> list[dict[str, object]]:
    normalized_query = normalize_query(query)
    if not normalized_query:
        return []

    results: list[dict[str, object]] = []
    for article in articles:
        matched_field = next(
            (
                field
                for field in collect_search_fields(article)
                if normalized_query in normalize_query(field["value"])
            ),
            None,
        )

        if matched_field:
            results.append({"article": article, "match": matched_field})

    return results


def build_answer_from_results(question: str, results: list[dict[str, object]]) -> dict[str, object]:
    if not results:
        return {
            "answer": "По доступным статьям не нашлось уверенного ответа. Попробуйте уточнить вопрос или проверьте права доступа.",
            "sources": [],
        }

    sources = [
        {
            "articleId": result["article"]["id"],
            "sectionHeading": result["match"]["sectionHeading"],
            "title": result["article"]["title"],
        }
        for result in results[:3]
    ]
    source_titles = ", ".join(str(source["title"]) for source in sources)

    return {
        "answer": f"По запросу “{question}” ближе всего подходят материалы: {source_titles}. Это черновой ответ по поисковому индексу, без LLM-обобщения.",
        "sources": sources,
    }
