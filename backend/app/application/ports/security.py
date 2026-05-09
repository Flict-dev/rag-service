from typing import Protocol


class PasswordHasher(Protocol):
    def verify(self, password: str, password_hash: str) -> bool: ...
