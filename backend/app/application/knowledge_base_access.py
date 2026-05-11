from backend.app.application.errors import PermissionDeniedError
from backend.app.domain.models import KnowledgeBase, User, UserRole


BASE_WRITE_ROLES: set[str] = {"editor", "admin"}


def get_base_role(base: KnowledgeBase, user: User) -> UserRole | None:
    if base.get("ownerId") == user["id"]:
        return "admin"

    members = base.get("members", [])
    if not isinstance(members, list):
        return None

    for member in members:
        if isinstance(member, dict) and member.get("userId") == user["id"]:
            role = member.get("role")
            if role in {"reader", "editor", "admin"}:
                return role

    return None


def base_with_user_role(base: KnowledgeBase, user: User) -> KnowledgeBase:
    return {**base, "myRole": get_base_role(base, user)}


def require_base_access(base: KnowledgeBase, user: User) -> UserRole:
    role = get_base_role(base, user)
    if not role:
        raise PermissionDeniedError("Knowledge base is not available for this user")
    return role


def require_base_write_access(base: KnowledgeBase, user: User) -> UserRole:
    role = require_base_access(base, user)
    if role not in BASE_WRITE_ROLES:
        raise PermissionDeniedError("Only editor and admin can manage this knowledge base")
    return role


def require_base_admin_access(base: KnowledgeBase, user: User) -> UserRole:
    role = require_base_access(base, user)
    if role != "admin":
        raise PermissionDeniedError("Only admin can manage the knowledge base team")
    return role
