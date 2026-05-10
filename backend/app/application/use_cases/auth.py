from uuid import uuid4

from backend.app.application.errors import AuthError, BadRequestError
from backend.app.application.knowledge_service import normalize_text
from backend.app.application.ports.repositories import UserRepository
from backend.app.application.ports.security import PasswordHasher
from backend.app.domain.models import UserCredentials


def _to_public_user(user: UserCredentials) -> dict[str, str]:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
    }


def login(
    repository: UserRepository,
    password_hasher: PasswordHasher,
    email: str | None,
    role: str | None,
    password: str | None,
) -> dict[str, object]:
    normalized_email = normalize_text(email)
    normalized_role = normalize_text(role)
    normalized_password = normalize_text(password)
    user = (
        repository.get_user_credentials_by_email(normalized_email)
        if normalized_email
        else repository.get_user_credentials_by_role(normalized_role)
    )

    if not user or not normalized_password or not password_hasher.verify(normalized_password, user["passwordHash"]):
        raise AuthError("Invalid credentials")

    token = repository.create_user_session(user["id"])

    return {"token": token, "user": _to_public_user(user)}


def register(
    repository: UserRepository,
    password_hasher: PasswordHasher,
    email: str | None,
    name: str | None,
    password: str | None,
) -> dict[str, object]:
    normalized_email = normalize_text(email).lower()
    normalized_name = normalize_text(name)
    normalized_password = normalize_text(password)

    if not normalized_email or "@" not in normalized_email:
        raise BadRequestError("valid email is required")

    if not normalized_name:
        raise BadRequestError("name is required")

    if len(normalized_password) < 8:
        raise BadRequestError("password must be at least 8 characters")

    if repository.get_user_credentials_by_email(normalized_email):
        raise BadRequestError("email is already registered")

    user = repository.create_user(
        {
            "id": f"user-{uuid4().hex}",
            "name": normalized_name,
            "email": normalized_email,
            "role": "editor",
            "passwordHash": password_hasher.hash(normalized_password),
        }
    )
    token = repository.create_user_session(user["id"])

    return {"token": token, "user": _to_public_user(user)}


def logout(repository: UserRepository, token: str | None) -> None:
    if token:
        repository.delete_user_session(token)
