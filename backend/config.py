"""
Central configuration — reads from environment variables with sensible defaults.
Copy `.env.example` → `.env` and fill in your values.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ────────────────────────────────────────────────────────────
    DATABASE_URL: str = ""

    # ── JWT Auth ─────────────────────────────────────────────────────────────
    JWT_SECRET: str = "changeme-use-a-32-char-random-string-in-prod"
    JWT_ALGORITHM: str = "HS256"

    # ── LLM Keys (Phase 1 / SmartExtract) ───────────────────────────────────
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""   # alias — same as GEMINI_API_KEY
    GEMINI_API_KEY: str = ""   # preferred field name for Gemini

    # ── App ──────────────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    DEBUG: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
