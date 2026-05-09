from typing import Protocol


class DocumentStorage(Protocol):
    def save(self, document_id: str, filename: str, content: bytes) -> str: ...

    def read(self, storage_path: str) -> bytes: ...
