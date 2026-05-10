from functools import lru_cache
import os
from pathlib import Path

from pydantic import BaseModel, Field


BACKEND_DIR = Path(__file__).resolve().parents[2]


def _read_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


class Settings(BaseModel):
    host: str = Field(default_factory=lambda: os.getenv("HOST", "127.0.0.1"))
    port: int = Field(default_factory=lambda: _read_int("PORT", 4000))
    cors_origin: str = Field(default_factory=lambda: os.getenv("CORS_ORIGIN", "*"))
    database_url_override: str | None = Field(default_factory=lambda: os.getenv("DATABASE_URL"))
    database_path: Path = Field(
        default_factory=lambda: Path(
            os.getenv("DB_PATH", str(BACKEND_DIR / "data" / "rag-base.sqlite"))
        )
    )
    upload_dir: Path = Field(
        default_factory=lambda: Path(os.getenv("UPLOAD_DIR", str(BACKEND_DIR / "data" / "uploads")))
    )
    qdrant_url: str = Field(default_factory=lambda: os.getenv("QDRANT_URL", "http://127.0.0.1:6333"))
    qdrant_collection: str = Field(default_factory=lambda: os.getenv("QDRANT_COLLECTION", "rag_chunks"))
    ollama_base_url: str = Field(default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"))
    ollama_chat_model: str = Field(default_factory=lambda: os.getenv("OLLAMA_CHAT_MODEL", "qwen3:4b"))
    ollama_embed_model: str = Field(default_factory=lambda: os.getenv("OLLAMA_EMBED_MODEL", "embeddinggemma"))
    rag_top_k: int = Field(default_factory=lambda: _read_int("RAG_TOP_K", 4))

    @property
    def allowed_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origin.split(",") if origin.strip()]
        return origins or ["*"]

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override

        return f"sqlite:///{self.database_path.as_posix()}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
