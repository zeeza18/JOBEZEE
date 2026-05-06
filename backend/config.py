"""
Central configuration — reads from environment variables with sensible defaults.
Copy `.env.example` → `.env` and fill in your values.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings

_HERE = Path(__file__).parent  # backend/


class Settings(BaseSettings):
    # ── Database ────────────────────────────────────────────────────────────
    DATABASE_URL: str = ""

    # ── JWT Auth ─────────────────────────────────────────────────────────────
    JWT_SECRET: str = "changeme-use-a-32-char-random-string-in-prod"
    JWT_ALGORITHM: str = "HS256"

    # ── LLM Keys (Phase 1 / SmartExtract) ───────────────────────────────────
    OPUSMAX_API_KEY:   str = ""   # OpusMax — always first priority for Claude calls
    OPENAI_API_KEY:    str = ""
    ANTHROPIC_API_KEY: str = ""   # Claude API key (OpusMax or standard)
    CLAUDE_API_KEY:    str = ""   # Standard Anthropic key fallback (sk-ant-api)
    GOOGLE_API_KEY:    str = ""   # alias — same as GEMINI_API_KEY
    GEMINI_API_KEY:    str = ""   # preferred field name for Gemini

    # ── Tavily Search API ────────────────────────────────────────────────────
    TAVILY_API_KEY: str = ""

    # ── Gmail IMAP ───────────────────────────────────────────────────────────
    GMAIL_USER:         str = ""
    GMAIL_APP_PASSWORD: str = ""

    # ── SMTP (transactional email — forgot password etc.) ────────────────────
    # Works with Gmail App Password, SendGrid, Resend, Mailgun, etc.
    # Gmail:    SMTP_HOST=smtp.gmail.com  SMTP_PORT=587  SMTP_USER=you@gmail.com  SMTP_PASSWORD=<app-password>
    # SendGrid: SMTP_HOST=smtp.sendgrid.net  SMTP_PORT=587  SMTP_USER=apikey  SMTP_PASSWORD=<SG.xxx>
    # Resend:   SMTP_HOST=smtp.resend.com  SMTP_PORT=465  SMTP_USER=resend  SMTP_PASSWORD=<re_xxx>
    SMTP_HOST:     str = ""
    SMTP_PORT:     int = 587
    SMTP_USER:     str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM:     str = "noreply@jobezee.org"   # display from address

    # ── LinkedIn OAuth ────────────────────────────────────────────────────────
    LINKEDIN_CLIENT_ID:     str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_REDIRECT_URI:  str = "http://localhost:8001/api/auth/linkedin/callback"
    FRONTEND_URL:           str = "http://localhost:5173"

    # ── Cookie settings ───────────────────────────────────────────────────────
    # Set COOKIE_DOMAIN=.jobezee.org in production so cookies are first-party
    # (requires backend to be on api.jobezee.org — add custom domain in Render)
    COOKIE_DOMAIN: str = ""   # empty = no domain attr (localhost default)

    # ── Credential encryption (Fernet key — generate with crypto.Fernet.generate_key()) ──
    CREDENTIALS_KEY: str = ""

    # ── Hetzner bot worker ────────────────────────────────────────────────────
    # If set, linkedin_bot_service delegates bot execution to the Hetzner worker.
    # Leave empty for local development (runs subprocess directly).
    BOT_WORKER_URL: str = ""                            # e.g. http://5.161.60.37:8001
    WORKER_SECRET:  str = ""                            # shared bearer token between Render and Hetzner
    API_BASE_URL:   str = "https://jobezee-api.onrender.com"  # self URL for Hetzner callbacks

    # ── 2Captcha (automated CAPTCHA solving for LinkedIn bot) ─────────────────
    TWOCAPTCHA_API_KEY: str = ""                        # 2captcha.com API key

    # ── Job digest email interval ─────────────────────────────────────────────
    # Default 300 min (5 hours). Set to 5 for dry-run testing.
    DIGEST_INTERVAL_MINUTES: int = 300

    # ── App ──────────────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://jobezee.org,https://www.jobezee.org"
    DEBUG: bool = False

    model_config = {
        "env_file": [str(_HERE / ".env"), str(_HERE.parent / ".env")],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
