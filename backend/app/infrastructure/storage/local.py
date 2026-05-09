from pathlib import Path
import re

from backend.app.shared.config import get_settings


class LocalDocumentStorage:
    def __init__(self, upload_dir: Path | None = None) -> None:
        self.upload_dir = upload_dir or get_settings().upload_dir

    def save(self, document_id: str, filename: str, content: bytes) -> str:
        safe_filename = self._sanitize_filename(filename)
        document_dir = self.upload_dir / document_id
        document_dir.mkdir(parents=True, exist_ok=True)
        target_path = document_dir / safe_filename
        target_path.write_bytes(content)
        return str(target_path)

    def _sanitize_filename(self, filename: str) -> str:
        cleaned_filename = Path(filename).name.strip()
        cleaned_filename = re.sub(r"[^A-Za-zА-Яа-я0-9._-]+", "-", cleaned_filename)
        return cleaned_filename.strip(".-") or "document"
