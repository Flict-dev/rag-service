from typing import Literal, TypeAlias


UserRole: TypeAlias = Literal["reader", "editor", "admin"]
ArticleStatus: TypeAlias = Literal["draft", "review", "published"]

VALID_ROLES: set[str] = {"reader", "editor", "admin"}
VALID_STATUSES: set[str] = {"draft", "review", "published"}
DEFAULT_ACCESS: list[UserRole] = ["reader", "editor", "admin"]

User: TypeAlias = dict[str, str]
Article: TypeAlias = dict[str, object]
