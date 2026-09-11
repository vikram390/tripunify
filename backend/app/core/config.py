"""Centralized app settings, loaded from environment variables / .env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file (backend/app/core/config.py -> backend/.env),
# not the process's current working directory — that varies depending on how
# uvicorn is launched and silently falls back to defaults if it's ever wrong.
ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "TripUnify API"
    ENVIRONMENT: str = "development"

    # CORS - comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:5173"

    # PostgreSQL (async driver: asyncpg)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tripunify"

    # Auth
    JWT_SECRET_KEY: str = "dev-secret-change-me-before-any-real-deployment"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # LLM provider: "openai" or "gemini"
    LLM_PROVIDER: str = "gemini"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Places / Weather
    GOOGLE_PLACES_API_KEY: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
