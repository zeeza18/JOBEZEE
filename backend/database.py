"""
Async SQLAlchemy engine + session factory wired to Neon PostgreSQL.
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

_settings = get_settings()

engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=_settings.DEBUG,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


async def get_db() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency: yields an async DB session."""
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables() -> None:
    """Create all tables on startup (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def run_column_migrations() -> None:
    """
    Idempotently add any columns missing from existing tables.

    Uses PostgreSQL's ADD COLUMN IF NOT EXISTS so it is safe to run on every
    startup regardless of whether the column already exists.  Required because
    SQLAlchemy's create_all() only creates *new* tables — it never alters
    existing tables to add new columns.
    """
    import logging
    from sqlalchemy import text

    log = logging.getLogger(__name__)

    # ── user_profiles ─────────────────────────────────────────────────────────
    _up_cols: list[tuple[str, str]] = [
        ("preferred_name",            "VARCHAR(100)  DEFAULT ''"),
        ("personal_website",          "VARCHAR(300)  DEFAULT ''"),
        ("preferred_countries",       "JSON          DEFAULT '[]'::json"),
        ("preferred_regions",         "JSON          DEFAULT '[]'::json"),
        ("industries",                "JSON          DEFAULT '[]'::json"),
        ("remote_preference",         "VARCHAR(20)   DEFAULT 'hybrid'"),
        ("job_type",                  "VARCHAR(20)   DEFAULT 'full_time'"),
        ("experience_level",          "VARCHAR(20)   DEFAULT 'mid'"),
        ("salary_range_text",         "VARCHAR(100)  DEFAULT ''"),
        ("work_authorization",        "VARCHAR(100)  DEFAULT ''"),
        ("visa_sponsorship_required", "BOOLEAN       DEFAULT false"),
        ("work_permit_type",          "VARCHAR(100)  DEFAULT ''"),
        ("resume_filename",           "VARCHAR(300)  DEFAULT ''"),
        ("resume_url",                "VARCHAR(500)  DEFAULT ''"),
        ("target_role",               "VARCHAR(200)  DEFAULT ''"),
        ("years_experience",          "VARCHAR(20)   DEFAULT ''"),
        ("education",                 "VARCHAR(200)  DEFAULT ''"),
        ("skills_languages",          "JSON          DEFAULT '[]'::json"),
        ("skills_frameworks",         "JSON          DEFAULT '[]'::json"),
        ("skills_tools",              "JSON          DEFAULT '[]'::json"),
        ("resume_facts_companies",    "JSON          DEFAULT '[]'::json"),
        ("resume_facts_projects",     "JSON          DEFAULT '[]'::json"),
        ("resume_facts_schools",      "JSON          DEFAULT '[]'::json"),
        ("resume_facts_metrics",      "JSON          DEFAULT '[]'::json"),
        ("earliest_start",            "VARCHAR(100)  DEFAULT 'Immediately'"),
        ("search_radius_miles",       "INTEGER       DEFAULT 50"),
        ("hours_old",                 "INTEGER       DEFAULT 72"),
        ("results_per_site",          "INTEGER       DEFAULT 50"),
        ("salary_min",                "FLOAT         DEFAULT 0"),
        ("salary_max",                "FLOAT         DEFAULT 0"),
        ("salary_currency",           "VARCHAR(10)   DEFAULT 'USD'"),
        ("headline",                  "VARCHAR(300)  DEFAULT ''"),
        ("current_job_title",         "VARCHAR(200)  DEFAULT ''"),
        ("portfolio",                 "VARCHAR(300)  DEFAULT ''"),
        ("github",                    "VARCHAR(300)  DEFAULT ''"),
        ("linkedin",                  "VARCHAR(300)  DEFAULT ''"),
        ("zip_code",                  "VARCHAR(20)   DEFAULT ''"),
        ("state",                     "VARCHAR(100)  DEFAULT ''"),
        ("city",                      "VARCHAR(100)  DEFAULT ''"),
        ("address",                   "TEXT          DEFAULT ''"),
        ("phone",                     "VARCHAR(50)   DEFAULT ''"),
    ]

    # ── pulled_jobs ───────────────────────────────────────────────────────────
    _pj_cols: list[tuple[str, str]] = [
        ("search_session_id", "VARCHAR(50) DEFAULT ''"),
        ("country",           "VARCHAR(100) DEFAULT ''"),
        ("salary_text",       "VARCHAR(200) DEFAULT ''"),
        ("salary_currency",   "VARCHAR(10)  DEFAULT 'USD'"),
        ("site",              "VARCHAR(100) DEFAULT ''"),
        ("source",            "VARCHAR(100) DEFAULT ''"),
        ("skills",            "JSON         DEFAULT '[]'::json"),
        ("status",            "VARCHAR(50)  DEFAULT 'new'"),
    ]

    async with engine.begin() as conn:
        added = 0
        for col, defn in _up_cols:
            try:
                await conn.execute(text(
                    f"ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS {col} {defn}"
                ))
                added += 1
            except Exception as exc:
                log.warning("Migration skip user_profiles.%s: %s", col, exc)

        for col, defn in _pj_cols:
            try:
                await conn.execute(text(
                    f"ALTER TABLE pulled_jobs ADD COLUMN IF NOT EXISTS {col} {defn}"
                ))
                added += 1
            except Exception as exc:
                log.warning("Migration skip pulled_jobs.%s: %s", col, exc)

    log.info("[DB] Column migration complete (%d statements run)", added)
