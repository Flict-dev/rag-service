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
    database_path: Path = Field(
        default_factory=lambda: Path(
            os.getenv("DB_PATH", str(BACKEND_DIR / "data" / "rag-base.sqlite"))
        )
    )

    @property
    def allowed_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origin.split(",") if origin.strip()]
        return origins or ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
