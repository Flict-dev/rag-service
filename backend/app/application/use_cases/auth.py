from backend.app.application.errors import AuthError
from backend.app.application.knowledge_service import normalize_text
from backend.app.application.ports.repositories import UserRepository


def login(repository: UserRepository, email: str | None, role: str | None) -> dict[str, object]:
    normalized_email = normalize_text(email)
    normalized_role = normalize_text(role)
    user = (
        repository.get_user_by_email(normalized_email)
        if normalized_email
        else repository.get_user_by_role(normalized_role)
    )

    if not user:
        raise AuthError("Demo user not found")

    return {"token": user["id"], "user": user}
