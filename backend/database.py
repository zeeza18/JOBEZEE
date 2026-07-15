"""
Async SQLAlchemy engine + session factory wired to Hetzner PostgreSQL.
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

_db_url = _settings.DATABASE_URL or "postgresql+asyncpg://jobezee:Jobezee_PG_2026!@localhost:5432/jobezee"

engine = create_async_engine(
    _db_url,
    echo=_settings.DEBUG,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=15,
    pool_recycle=300,
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
        ("avatar_url",                "VARCHAR(500)  DEFAULT ''"),
        ("apply_email",               "VARCHAR(200)  DEFAULT ''"),
        ("apply_password",            "VARCHAR(200)  DEFAULT ''"),
        ("linkedin_email",            "VARCHAR(200)  DEFAULT ''"),
        ("linkedin_password",         "VARCHAR(200)  DEFAULT ''"),
        ("indeed_email",              "VARCHAR(200)  DEFAULT ''"),
        ("indeed_password",           "VARCHAR(200)  DEFAULT ''"),
        ("greenhouse_email",          "VARCHAR(200)  DEFAULT ''"),
        ("greenhouse_password",       "VARCHAR(200)  DEFAULT ''"),
        ("workday_email",             "VARCHAR(200)  DEFAULT ''"),
        ("workday_password",          "VARCHAR(200)  DEFAULT ''"),
        ("gmail_api_key",             "TEXT          DEFAULT ''"),
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
        ("work_modes",                "JSON          DEFAULT '[]'::json"),
        ("job_types",                 "JSON          DEFAULT '[]'::json"),
        ("experience_levels",         "JSON          DEFAULT '[]'::json"),
        ("tailor_resume",             "BOOLEAN       DEFAULT false"),
        ("openai_api_key",            "TEXT          DEFAULT ''"),
        ("anthropic_api_key",         "TEXT          DEFAULT ''"),
        ("resume_bytes",              "TEXT          DEFAULT ''"),
        ("linkedin_cookies",          "TEXT          DEFAULT ''"),
        ("avatar_b64",                "TEXT          DEFAULT NULL"),
        ("last_digest_at",            "TIMESTAMPTZ   DEFAULT NULL"),
        ("resume_extraction",         "JSON          DEFAULT NULL"),
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
        ("resume_used_url",   "VARCHAR(500) DEFAULT ''"),
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

        # ── tailor_jobs ───────────────────────────────────────────────────────
        _tj_cols: list[tuple[str, str]] = [
            ("progress_events", "JSON         DEFAULT '[]'::json"),
            ("final_resume",    "TEXT         DEFAULT ''"),
            ("pulled_job_id",   "VARCHAR(36)  DEFAULT NULL"),
            ("job_url",         "VARCHAR(1000) DEFAULT ''"),
            ("pdf_b64",         "TEXT         DEFAULT NULL"),
            ("docx_b64",        "TEXT         DEFAULT NULL"),
        ]
        for col, defn in _tj_cols:
            try:
                await conn.execute(text(
                    f"ALTER TABLE tailor_jobs ADD COLUMN IF NOT EXISTS {col} {defn}"
                ))
                added += 1
            except Exception as exc:
                log.warning("Migration skip tailor_jobs.%s: %s", col, exc)

        # ── user_job_states — per-user tracker edit overrides ───────────────────
        _ujs_cols: list[tuple[str, str]] = [
            ("title_override",     "VARCHAR(300)  DEFAULT NULL"),
            ("company_override",   "VARCHAR(200)  DEFAULT NULL"),
            ("salary_override",    "VARCHAR(200)  DEFAULT NULL"),
            ("url_override",       "VARCHAR(1000) DEFAULT NULL"),
            ("applied_at_override","TIMESTAMPTZ   DEFAULT NULL"),
        ]
        for col, defn in _ujs_cols:
            try:
                await conn.execute(text(
                    f"ALTER TABLE user_job_states ADD COLUMN IF NOT EXISTS {col} {defn}"
                ))
                added += 1
            except Exception as exc:
                log.warning("Migration skip user_job_states.%s: %s", col, exc)

    log.info("[DB] Column migration complete (%d statements run)", added)


async def run_schema_migration() -> None:
    """
    v2 schema migration — idempotent, non-destructive.

    1. Creates all new v2 tables (via create_all — already done by create_tables).
    2. Migrates data from old tables into new split tables using
       INSERT ... ON CONFLICT DO NOTHING so repeated runs are safe.
    3. Adds user_id FK column to search_sessions if missing.
    """
    import logging
    from sqlalchemy import text

    log = logging.getLogger(__name__)
    log.info("[Migration] Starting v2 schema migration…")

    async with engine.begin() as conn:

        # ── search_sessions: add user_id column ──────────────────────────────
        await conn.execute(text(
            "ALTER TABLE search_sessions ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)"
        ))

        # ── job_preferences: migrate from user_profiles ───────────────────────
        await conn.execute(text("""
            INSERT INTO job_preferences
                (id, user_id, desired_roles, preferred_locations, preferred_countries,
                 preferred_regions, industries, work_modes, job_types, experience_levels,
                 salary_min, salary_max, salary_currency,
                 search_radius_miles, hours_old, results_per_site, updated_at)
            SELECT
                gen_random_uuid(), id::text,
                COALESCE(desired_roles,       '[]'::json),
                COALESCE(preferred_locations, '[]'::json),
                COALESCE(preferred_countries, '[]'::json),
                COALESCE(preferred_regions,   '[]'::json),
                COALESCE(industries,          '[]'::json),
                COALESCE(work_modes,          '[]'::json),
                COALESCE(job_types,           '[]'::json),
                COALESCE(experience_levels,   '[]'::json),
                COALESCE(salary_min,  0),
                COALESCE(salary_max,  0),
                COALESCE(salary_currency, 'USD'),
                COALESCE(search_radius_miles, 50),
                COALESCE(hours_old, 72),
                COALESCE(results_per_site, 50),
                now()
            FROM user_profiles
            ON CONFLICT (user_id) DO NOTHING
        """))

        # ── user_skills: migrate from user_profiles ───────────────────────────
        await conn.execute(text("""
            INSERT INTO user_skills
                (id, user_id, languages, frameworks, tools,
                 facts_companies, facts_projects, facts_schools, facts_metrics, updated_at)
            SELECT
                gen_random_uuid(), id::text,
                COALESCE(skills_languages,        '[]'::json),
                COALESCE(skills_frameworks,       '[]'::json),
                COALESCE(skills_tools,            '[]'::json),
                COALESCE(resume_facts_companies,  '[]'::json),
                COALESCE(resume_facts_projects,   '[]'::json),
                COALESCE(resume_facts_schools,    '[]'::json),
                COALESCE(resume_facts_metrics,    '[]'::json),
                now()
            FROM user_profiles
            ON CONFLICT (user_id) DO NOTHING
        """))

        # ── user_credentials: migrate from user_profiles ─────────────────────
        await conn.execute(text("""
            INSERT INTO user_credentials
                (id, user_id, apply_email, apply_password,
                 linkedin_email, linkedin_password,
                 indeed_email, indeed_password,
                 greenhouse_email, greenhouse_password,
                 workday_email, workday_password,
                 gmail_api_key, updated_at)
            SELECT
                gen_random_uuid(), id::text,
                COALESCE(apply_email,    ''),
                COALESCE(apply_password, ''),
                COALESCE(linkedin_email,      ''), COALESCE(linkedin_password,   ''),
                COALESCE(indeed_email,        ''), COALESCE(indeed_password,     ''),
                COALESCE(greenhouse_email,    ''), COALESCE(greenhouse_password, ''),
                COALESCE(workday_email,       ''), COALESCE(workday_password,    ''),
                COALESCE(gmail_api_key, ''),
                now()
            FROM user_profiles
            ON CONFLICT (user_id) DO NOTHING
        """))

        # ── resumes: migrate base resume from user_profiles ───────────────────
        await conn.execute(text("""
            INSERT INTO resumes (id, user_id, filename, storage_url, is_base, label, created_at)
            SELECT
                gen_random_uuid(), id::text,
                COALESCE(resume_filename, ''),
                COALESCE(resume_url,      ''),
                true,
                'Base Resume',
                COALESCE(created_at, now())
            FROM user_profiles
            WHERE COALESCE(resume_url, '') != ''
            ON CONFLICT DO NOTHING
        """))

        # ── job_listings: migrate from pulled_jobs (dedup by url) ─────────────
        await conn.execute(text("""
            INSERT INTO job_listings
                (id, title, company, location, country, url, description,
                 job_type, salary_min, salary_max, salary_currency, salary_text,
                 source, site, posted_at, skills, first_seen_at)
            SELECT DISTINCT ON (url)
                gen_random_uuid(), title, company, location, country, url, description,
                job_type, salary_min, salary_max,
                COALESCE(salary_currency, 'USD'), COALESCE(salary_text, ''),
                COALESCE(source, ''), COALESCE(site, ''),
                COALESCE(posted_at, ''),
                COALESCE(skills, '[]'::json),
                pulled_at
            FROM pulled_jobs
            WHERE COALESCE(url, '') != ''
            ON CONFLICT (url) DO NOTHING
        """))

        # ── user_job_states: new/saved/hidden status from pulled_jobs ─────────
        await conn.execute(text("""
            INSERT INTO user_job_states (id, user_id, job_id, status, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                pj.user_profile_id::text,
                jl.id,
                pj.status,
                pj.pulled_at,
                pj.pulled_at
            FROM pulled_jobs pj
            JOIN job_listings jl ON jl.url = pj.url
            WHERE pj.user_profile_id IS NOT NULL
              AND pj.status IN ('new', 'saved', 'hidden')
              AND COALESCE(pj.url, '') != ''
            ON CONFLICT (user_id, job_id) DO NOTHING
        """))

        # ── applications: rows with pipeline status from pulled_jobs ──────────
        await conn.execute(text("""
            INSERT INTO applications
                (id, user_id, job_id, pulled_job_id, platform, status,
                 applied_at, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                pj.user_profile_id::text,
                jl.id,
                pj.id,
                COALESCE(pj.site, ''),
                pj.status,
                pj.pulled_at,
                pj.pulled_at,
                pj.pulled_at
            FROM pulled_jobs pj
            JOIN job_listings jl ON jl.url = pj.url
            WHERE pj.user_profile_id IS NOT NULL
              AND pj.status NOT IN ('new', 'saved', 'hidden')
              AND COALESCE(pj.url, '') != ''
              AND NOT EXISTS (
                  SELECT 1 FROM applications a
                  WHERE a.pulled_job_id = pj.id
              )
        """))

        # ── job_listings: LLM extraction columns ─────────────────────────────
        for col, defn in [
            ("llm_skills",       "JSONB        DEFAULT NULL"),
            ("llm_title",        "TEXT         DEFAULT NULL"),
            ("llm_years_min",    "INTEGER      DEFAULT NULL"),
            ("llm_extracted_at", "TIMESTAMPTZ  DEFAULT NULL"),
        ]:
            await conn.execute(text(
                f"ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS {col} {defn}"
            ))

        # ── preference_cache: idempotent columns ─────────────────────────────
        await conn.execute(text(
            "ALTER TABLE preference_cache ADD COLUMN IF NOT EXISTS total_jobs INTEGER DEFAULT 0"
        ))

        # ── tailor_jobs: billing + watchdog columns ────────────────────────────
        for col, defn in [
            ("input_tokens",     "INTEGER DEFAULT 0"),
            ("output_tokens",    "INTEGER DEFAULT 0"),
            ("cost_usd",         "FLOAT   DEFAULT 0.0"),
            ("dispatch_payload", "JSONB   DEFAULT NULL"),
            ("dispatch_count",   "INTEGER DEFAULT 0"),
        ]:
            await conn.execute(text(
                f"ALTER TABLE tailor_jobs ADD COLUMN IF NOT EXISTS {col} {defn}"
            ))

        # ── linkedin_boost_results: photo/cover columns + nullable result ────────
        for col, defn in [
            ("photo_result",   "JSON DEFAULT NULL"),
            ("cover_result",   "JSON DEFAULT NULL"),
            ("photo_data_url", "TEXT DEFAULT NULL"),
            ("cover_data_url", "TEXT DEFAULT NULL"),
        ]:
            await conn.execute(text(
                f"ALTER TABLE linkedin_boost_results ADD COLUMN IF NOT EXISTS {col} {defn}"
            ))
        await conn.execute(text(
            "ALTER TABLE linkedin_boost_results ALTER COLUMN result DROP NOT NULL"
        ))

        # ── user_job_states: match score columns ─────────────────────────────
        for col, defn in [
            ("match_score",    "FLOAT        DEFAULT NULL"),
            ("matched_skills", "JSON         DEFAULT NULL"),
            ("missing_skills", "JSON         DEFAULT NULL"),
            ("scored_at",      "TIMESTAMPTZ  DEFAULT NULL"),
        ]:
            await conn.execute(text(
                f"ALTER TABLE user_job_states ADD COLUMN IF NOT EXISTS {col} {defn}"
            ))

        # ── pulled_jobs: match score columns (v1 compat) ──────────────────────
        for col, defn in [
            ("match_score",    "FLOAT        DEFAULT NULL"),
            ("matched_skills", "JSON         DEFAULT NULL"),
            ("missing_skills", "JSON         DEFAULT NULL"),
            ("scored_at",      "TIMESTAMPTZ  DEFAULT NULL"),
        ]:
            await conn.execute(text(
                f"ALTER TABLE pulled_jobs ADD COLUMN IF NOT EXISTS {col} {defn}"
            ))

        # ── user_credits: create if not exists (safety net alongside create_all)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_credits (
                id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id    VARCHAR(36) NOT NULL UNIQUE,
                balance    FLOAT       NOT NULL DEFAULT 0.0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ
            )
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_user_credits_user_id ON user_credits (user_id)"
        ))

        # ── interview_sessions table ───────────────────────────────────────────
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS interview_sessions (
                id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id            VARCHAR(36) NOT NULL,
                job_title          VARCHAR(300) NOT NULL DEFAULT '',
                company            VARCHAR(200) NOT NULL DEFAULT '',
                round_type         VARCHAR(20)  NOT NULL DEFAULT '',
                round_label        VARCHAR(100) NOT NULL DEFAULT '',
                duration_minutes   INTEGER      NOT NULL DEFAULT 30,
                questions          JSONB        NOT NULL DEFAULT '[]'::jsonb,
                answers            JSONB        NOT NULL DEFAULT '[]'::jsonb,
                elapsed_seconds    INTEGER      NOT NULL DEFAULT 0,
                questions_answered INTEGER      NOT NULL DEFAULT 0,
                status             VARCHAR(20)  NOT NULL DEFAULT 'completed',
                jd_snippet         TEXT         NOT NULL DEFAULT '',
                completed_at       TIMESTAMPTZ,
                created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
            )
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_interview_sessions_user_id ON interview_sessions (user_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_interview_sessions_created_at ON interview_sessions (created_at)"
        ))

        # ── scheduled_interviews table ────────────────────────────────────────
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scheduled_interviews (
                id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id            VARCHAR(36) NOT NULL,
                job_title          VARCHAR(300) NOT NULL DEFAULT '',
                company            VARCHAR(200) NOT NULL DEFAULT '',
                round_type         VARCHAR(20)  NOT NULL DEFAULT '',
                round_label        VARCHAR(100) NOT NULL DEFAULT '',
                duration_minutes   INTEGER      NOT NULL DEFAULT 30,
                questions          JSONB        NOT NULL DEFAULT '[]'::jsonb,
                scheduled_at       TIMESTAMPTZ  NOT NULL,
                status             VARCHAR(20)  NOT NULL DEFAULT 'pending',
                created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
            )
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_scheduled_interviews_user_id ON scheduled_interviews (user_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_scheduled_interviews_scheduled_at ON scheduled_interviews (scheduled_at)"
        ))

    log.info("[Migration] v2 schema migration complete")
