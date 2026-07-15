"""
SQLAlchemy ORM models — maps to Neon PostgreSQL tables.

Tables
------
users           — authentication records (email + bcrypt password)
user_profiles   — extended job-search preferences for a user
pulled_jobs     — raw Phase 1 output; one row per discovered job listing
search_sessions — audit log of every Phase 1 run
"""
from __future__ import annotations

import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func

from .database import Base


# ---------------------------------------------------------------------------
# User  (authentication)
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email           = Column(String(200), nullable=False, unique=True, index=True)
    hashed_password = Column(String(300), nullable=False)
    full_name       = Column(String(200), default="")
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# UserProfile
# ---------------------------------------------------------------------------

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ── Personal info ────────────────────────────────────────────────────────
    full_name        = Column(String(200), nullable=False, default="")
    preferred_name   = Column(String(100), default="")
    email            = Column(String(200), nullable=False, default="")
    phone            = Column(String(50),  default="")
    address          = Column(Text,         default="")
    city             = Column(String(100),  default="")
    state            = Column(String(100),  default="")
    country          = Column(String(100),  default="USA")
    zip_code         = Column(String(20),   default="")
    linkedin         = Column(String(300),  default="")
    github           = Column(String(300),  default="")
    portfolio        = Column(String(300),  default="")
    personal_website = Column(String(300),  default="")
    headline         = Column(String(300),  default="")

    # ── Job preferences ──────────────────────────────────────────────────────
    desired_roles        = Column(JSON, default=list)   # ["ML Engineer", "Backend Dev"]
    preferred_locations  = Column(JSON, default=list)   # ["Remote", "New York, NY"]
    preferred_countries  = Column(JSON, default=list)   # ["USA", "Germany"]
    preferred_regions    = Column(JSON, default=list)   # ["north_america", "europe"]
    industries           = Column(JSON, default=list)   # ["technology", "finance"]
    remote_preference    = Column(String(20), default="hybrid")   # legacy single-value
    job_type             = Column(String(20), default="full_time") # legacy single-value
    experience_level     = Column(String(20), default="mid")       # legacy single-value
    # Multi-select versions used by LinkedIn bot (LinkedIn supports multiple filters)
    work_modes           = Column(JSON, default=list)   # ["remote","hybrid","onsite"]
    job_types            = Column(JSON, default=list)   # ["full_time","contract"]
    experience_levels    = Column(JSON, default=list)   # ["junior","mid","senior"]

    # ── Salary ───────────────────────────────────────────────────────────────
    salary_min        = Column(Float, default=0.0)
    salary_max        = Column(Float, default=0.0)
    salary_currency   = Column(String(10), default="USD")
    salary_range_text = Column(String(100), default="")   # e.g. "80000-120000"

    # ── Work authorization & visa ─────────────────────────────────────────────
    work_authorization        = Column(String(100), default="")   # "US Citizen", "H1B", "OPT"
    visa_sponsorship_required = Column(Boolean, default=False)
    work_permit_type          = Column(String(100), default="")   # more specific permit detail

    # ── Resume ───────────────────────────────────────────────────────────────
    resume_filename = Column(String(300), default="")
    resume_url      = Column(String(500), default="")
    resume_bytes    = Column(Text,        default="")   # base64-encoded PDF — persists across deploys
    avatar_url      = Column(String(500), default="")
    avatar_b64      = Column(Text,        nullable=True)  # data:<mime>;base64,... — persists across deploys

    # ── Resume extraction (Groq LLM — cached on upload) ─────────────────────
    resume_extraction = Column(JSON, nullable=True)   # ResumeExtracted dict: title/skills/years_exp/…

    # ── Email digest tracking ─────────────────────────────────────────────────
    last_digest_at  = Column(DateTime(timezone=True), nullable=True)  # last digest email sent

    # ── Auto-apply credentials ────────────────────────────────────────────────
    apply_email     = Column(String(200), default="")   # default email for job-site accounts
    apply_password  = Column(String(200), default="")   # default password for job-site accounts

    # Per-platform credentials (override apply_email/apply_password per site)
    linkedin_email      = Column(String(200), default="")
    linkedin_password   = Column(String(200), default="")
    indeed_email        = Column(String(200), default="")
    indeed_password     = Column(String(200), default="")
    greenhouse_email    = Column(String(200), default="")
    greenhouse_password = Column(String(200), default="")
    workday_email       = Column(String(200), default="")
    workday_password    = Column(String(200), default="")

    # LinkedIn session cookies (encrypted Fernet JSON — set via Connect LinkedIn flow)
    linkedin_cookies = Column(Text, default="")

    # Email integration
    gmail_api_key = Column(Text, default="")   # Gmail App Password for IMAP scanning

    # AI API keys (user-supplied; override .env fallback)
    openai_api_key    = Column(Text, default="")
    anthropic_api_key = Column(Text, default="")

    # ── Experience & education ───────────────────────────────────────────────
    current_job_title = Column(String(200), default="")
    target_role       = Column(String(200), default="")
    years_experience  = Column(String(20),  default="")   # stored as string ("5", "5-8", etc.)
    education         = Column(String(200), default="")   # "Master's", "Bachelor's", "PhD"

    # ── Skills ───────────────────────────────────────────────────────────────
    skills_languages  = Column(JSON, default=list)   # ["Python", "TypeScript"]
    skills_frameworks = Column(JSON, default=list)   # ["PyTorch", "FastAPI"]
    skills_tools      = Column(JSON, default=list)   # ["Docker", "AWS", "Git"]

    # ── Resume facts (AI must preserve these verbatim during tailoring) ───────
    resume_facts_companies = Column(JSON, default=list)   # ["Google", "Stripe"]
    resume_facts_projects  = Column(JSON, default=list)   # ["OpenPipeline"]
    resume_facts_schools   = Column(JSON, default=list)   # ["MIT"]
    resume_facts_metrics   = Column(JSON, default=list)   # ["99.9% uptime", "50k users"]
    earliest_start         = Column(String(100), default="Immediately")

    # ── Search tuning ────────────────────────────────────────────────────────
    search_radius_miles = Column(Integer, default=50)
    hours_old           = Column(Integer, default=72)
    results_per_site    = Column(Integer, default=50)
    tailor_resume       = Column(Boolean, default=False)

    # ── Meta ──────────────────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# ---------------------------------------------------------------------------
# PulledJob
# ---------------------------------------------------------------------------

class PulledJob(Base):
    __tablename__ = "pulled_jobs"

    id              = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_profile_id = Column(PGUUID(as_uuid=True), nullable=True)
    search_session_id = Column(String(50), default="", index=True)

    # ── Job data ─────────────────────────────────────────────────────────────
    title           = Column(String(300), default="")
    company         = Column(String(200), default="")
    location        = Column(String(200), default="")
    country         = Column(String(100), default="")
    url             = Column(String(1000), default="", unique=False)
    description     = Column(Text, default="")
    job_type        = Column(String(50), default="")
    salary_min      = Column(Float, nullable=True)
    salary_max      = Column(Float, nullable=True)
    salary_currency = Column(String(10), default="USD")
    salary_text     = Column(String(200), default="")
    source          = Column(String(100), default="")   # jobspy / workday / smart
    site            = Column(String(100), default="")   # indeed / linkedin / glassdoor
    posted_at       = Column(String(100), default="")
    skills          = Column(JSON, default=list)

    # ── User action ──────────────────────────────────────────────────────────
    status          = Column(String(50), default="new")   # new / saved / applied / hidden
    resume_used_url = Column(String(500), default="")     # URL of the resume used when applying

    # ── Match score (computed against user's resume_extraction) ──────────────
    match_score    = Column(Float,   nullable=True)
    matched_skills = Column(JSON,    nullable=True)
    missing_skills = Column(JSON,    nullable=True)
    scored_at      = Column(DateTime(timezone=True), nullable=True)

    pulled_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# PortfolioConfig
# ---------------------------------------------------------------------------

class PortfolioConfig(Base):
    __tablename__ = "portfolio_configs"

    id           = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True, index=True)

    template_id  = Column(String(100), default="ModernDev")   # e.g. "ModernDev", "ArtCanvas"
    category     = Column(String(50),  default="tech")        # tech / creative / business / finance / healthcare / marketing
    primary_color = Column(String(20), default="#06b6d4")
    accent_color  = Column(String(20), default="#0ea5e9")
    is_published  = Column(Boolean, default=False)
    custom_bio    = Column(Text, default="")
    show_sections = Column(JSON, default=lambda: {
        "about": True, "skills": True, "experience": True,
        "projects": True, "education": True, "contact": True,
    })

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# SearchSession
# ---------------------------------------------------------------------------

class SearchSession(Base):
    __tablename__ = "search_sessions"

    id         = Column(String(50), primary_key=True)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    status     = Column(String(20), default="running")  # running / done / failed
    jobs_found = Column(Integer, default=0)
    error      = Column(Text, default="")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)


# ===========================================================================
# NEW SCHEMA — v2 tables (created alongside old tables, non-destructive)
# ===========================================================================

# ---------------------------------------------------------------------------
# Profile split tables
# ---------------------------------------------------------------------------

class JobPreferences(Base):
    """Job-search preferences split out of the monolithic user_profiles table."""
    __tablename__ = "job_preferences"

    id      = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True, index=True)

    desired_roles       = Column(JSON, default=list)
    preferred_locations = Column(JSON, default=list)
    preferred_countries = Column(JSON, default=list)
    preferred_regions   = Column(JSON, default=list)
    industries          = Column(JSON, default=list)
    work_modes          = Column(JSON, default=list)   # ["remote","hybrid","onsite"]
    job_types           = Column(JSON, default=list)   # ["full_time","contract"]
    experience_levels   = Column(JSON, default=list)   # ["junior","mid","senior"]

    salary_min      = Column(Float,      default=0.0)
    salary_max      = Column(Float,      default=0.0)
    salary_currency = Column(String(10), default="USD")

    search_radius_miles = Column(Integer, default=50)
    hours_old           = Column(Integer, default=72)
    results_per_site    = Column(Integer, default=50)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserSkills(Base):
    """Skills and resume facts split out of user_profiles."""
    __tablename__ = "user_skills"

    id      = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True, index=True)

    languages  = Column(JSON, default=list)
    frameworks = Column(JSON, default=list)
    tools      = Column(JSON, default=list)

    facts_companies = Column(JSON, default=list)
    facts_projects  = Column(JSON, default=list)
    facts_schools   = Column(JSON, default=list)
    facts_metrics   = Column(JSON, default=list)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserCredentials(Base):
    """Platform credentials stored separately from profile data."""
    __tablename__ = "user_credentials"

    id      = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True, index=True)

    apply_email    = Column(String(200), default="")
    apply_password = Column(String(200), default="")

    linkedin_email      = Column(String(200), default="")
    linkedin_password   = Column(String(200), default="")
    indeed_email        = Column(String(200), default="")
    indeed_password     = Column(String(200), default="")
    greenhouse_email    = Column(String(200), default="")
    greenhouse_password = Column(String(200), default="")
    workday_email       = Column(String(200), default="")
    workday_password    = Column(String(200), default="")

    gmail_api_key = Column(Text, default="")

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Resumes
# ---------------------------------------------------------------------------

class Resume(Base):
    """Tracks every resume version uploaded by a user."""
    __tablename__ = "resumes"

    id          = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    filename    = Column(String(300), default="")
    storage_url = Column(String(500), default="")
    is_base     = Column(Boolean, default=True)    # False = tailored version
    label       = Column(String(100), default="")  # e.g. "Base", "Tailored for Google"
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class ResumeDocument(Base):
    """A structured, template-driven resume built in the Resume Maker (distinct from
    the flat-text/PDF versions tracked by Resume above, which the Tailor tool works on).
    One active document per user for now — schema allows more later."""
    __tablename__ = "resume_documents"

    id         = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title      = Column(String(200), default="My Resume")

    # { contact, summary, experience[], education[], skills[], projects[], certifications[], custom[] }
    content    = Column(JSON, default=dict)
    # { template, page_size, margins, spacing, font_size, header_font, body_font,
    #   accent_color, compact, show_contact_icons }
    settings   = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Jobs v2  (immutable listing + mutable user state separated)
# ---------------------------------------------------------------------------

class JobListing(Base):
    """Deduped, immutable job listing data. One row per unique URL."""
    __tablename__ = "job_listings"

    id              = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title           = Column(String(300), default="")
    company         = Column(String(200), default="", index=True)
    location        = Column(String(200), default="")
    country         = Column(String(100), default="")
    url             = Column(String(1000), default="", unique=True, index=True)
    description     = Column(Text, default="")
    job_type        = Column(String(50), default="")
    salary_min      = Column(Float, nullable=True)
    salary_max      = Column(Float, nullable=True)
    salary_currency = Column(String(10), default="USD")
    salary_text     = Column(String(200), default="")
    source          = Column(String(100), default="")
    site            = Column(String(100), default="")
    posted_at       = Column(String(100), default="")
    skills          = Column(JSON, default=list)
    exp_years_min   = Column(Integer, nullable=True)   # min yrs experience extracted from title/desc
    first_seen_at   = Column(DateTime(timezone=True), server_default=func.now())
    # LLM-extracted fields (populated async by scripts/extract_jobs.py)
    llm_skills       = Column(JSON, nullable=True)          # e.g. ["Python", "AWS", "Docker"]
    llm_title        = Column(String(300), nullable=True)   # normalized job title
    llm_years_min    = Column(Integer, nullable=True)       # required years of experience
    llm_extracted_at = Column(DateTime(timezone=True), nullable=True)


class NewsItem(Base):
    """Job-market news item pulled from Google News RSS. Pruned after 14 days."""
    __tablename__ = "news_items"
    __table_args__ = (UniqueConstraint("link", name="uq_news_link"),)

    id           = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title        = Column(String(500), default="")
    link         = Column(String(1000), default="")
    source       = Column(String(200), default="")
    category     = Column(String(50), default="")
    topic        = Column(String(300), default="")
    country      = Column(String(100), default="", index=True)
    role         = Column(String(200), default="", index=True)
    published_at = Column(DateTime(timezone=True), nullable=True, index=True)
    fetched_at   = Column(DateTime(timezone=True), server_default=func.now())


class UserJobState(Base):
    """Per-user mutable state on a job listing (saved / hidden / new)."""
    __tablename__ = "user_job_states"
    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_user_job"),)

    id         = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    job_id     = Column(PGUUID(as_uuid=True), ForeignKey("job_listings.id"), nullable=False, index=True)
    status     = Column(String(50), default="new")   # new / saved / hidden

    # ── Match score (computed against user's resume_extraction) ──────────────
    match_score    = Column(Float,   nullable=True)
    matched_skills = Column(JSON,    nullable=True)
    missing_skills = Column(JSON,    nullable=True)
    scored_at      = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

class Application(Base):
    """One row per apply attempt — proper pipeline tracking."""
    __tablename__ = "applications"

    id               = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    job_id           = Column(PGUUID(as_uuid=True), ForeignKey("job_listings.id"), nullable=True, index=True)
    pulled_job_id    = Column(PGUUID(as_uuid=True), nullable=True)   # backward compat ref to pulled_jobs
    resume_id        = Column(PGUUID(as_uuid=True), ForeignKey("resumes.id"), nullable=True)
    platform         = Column(String(100), default="")   # linkedin / indeed / greenhouse / workday
    status           = Column(String(50), default="applying")
    applied_at       = Column(DateTime(timezone=True), server_default=func.now())
    email_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    notes            = Column(Text, default="")
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ApplicationEmail(Base):
    """Email detected from inbox linked to an application."""
    __tablename__ = "application_emails"

    id               = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id   = Column(PGUUID(as_uuid=True), ForeignKey("applications.id"), nullable=True, index=True)
    user_id          = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    subject          = Column(String(500), default="")
    body_snippet     = Column(Text, default="")
    detected_status  = Column(String(50), default="")   # applied / interview_r1 / offer / rejected
    received_at      = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class UserEvent(Base):
    """Browser-level analytics: page views, clicks, feature usage."""
    __tablename__ = "user_events"

    id         = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    event_type = Column(String(50), default="")   # page_view / click / search / apply / tailor / login
    page       = Column(String(200), default="")
    element    = Column(String(200), default="")
    extra      = Column(JSON, default=dict)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class ToolUsage(Base):
    """AI tool cost tracking — tokens + USD per operation."""
    __tablename__ = "tool_usage"

    id         = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    tool       = Column(String(50), default="")    # tailor / apply / search / linkedin_bot
    model      = Column(String(100), default="")   # gpt-4o-mini / claude-3-5-sonnet / etc.
    tokens_in  = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    cost_usd   = Column(Float,   default=0.0)
    job_id     = Column(PGUUID(as_uuid=True), nullable=True)
    extra      = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class BillingTransaction(Base):
    """Every credit added or debit taken from a user's balance."""
    __tablename__ = "billing_txns"

    id           = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    type         = Column(String(20), default="debit")   # credit / debit
    amount_usd   = Column(Float, default=0.0)
    description  = Column(String(500), default="")
    balance_after = Column(Float, default=0.0)
    created_at   = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# ---------------------------------------------------------------------------
# Ops: error logs, app logs, feedback
# ---------------------------------------------------------------------------

class ErrorLog(Base):
    """Server-side errors caught by exception handlers."""
    __tablename__ = "error_logs"

    id             = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(String(36), nullable=True, index=True)
    level          = Column(String(20), default="error")   # error / warning / critical
    source         = Column(String(200), default="")       # module or router name
    message        = Column(Text, default="")
    traceback      = Column(Text, default="")
    request_path   = Column(String(500), default="")
    request_method = Column(String(10), default="")
    extra          = Column(JSON, default=dict)
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AppLog(Base):
    """General application-level log events (search started, apply complete, etc.)."""
    __tablename__ = "app_logs"

    id         = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(36), nullable=True, index=True)
    level      = Column(String(20), default="info")   # debug / info / warning / error
    source     = Column(String(200), default="")
    message    = Column(Text, default="")
    extra      = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class Feedback(Base):
    """User-submitted feedback, bug reports, and feature requests."""
    __tablename__ = "feedback"

    id         = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(36), nullable=True, index=True)
    type       = Column(String(50), default="general")   # bug / feature / general
    rating     = Column(Integer, nullable=True)           # 1–5 stars
    message    = Column(Text, default="")
    page       = Column(String(200), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# ---------------------------------------------------------------------------
# Password reset tokens
# ---------------------------------------------------------------------------

class PasswordResetToken(Base):
    """Short-lived tokens for the forgot-password flow."""
    __tablename__ = "password_reset_tokens"

    id         = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token      = Column(String(128), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# TailorJobRecord — persists card-based tailor jobs for 2 days
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# PreferenceCache  — global (role, location) pull schedule tracker
# ---------------------------------------------------------------------------

class PreferenceCache(Base):
    """
    One row per unique (role_tag, location_tag) combination.
    Tracks when this combination was last scraped globally so we can
    decide: first pull → 720h (30 days), subsequent → 72h (3 days).
    """
    __tablename__ = "preference_cache"
    __table_args__ = (
        UniqueConstraint("role_tag", "location_tag", name="uq_pref_cache"),
    )

    id             = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_tag       = Column(String(200), nullable=False, index=True)   # normalised title, e.g. "ai engineer"
    location_tag   = Column(String(200), nullable=False, index=True)   # normalised country, e.g. "usa"
    last_pulled_at = Column(DateTime(timezone=True), nullable=True)    # NULL = never pulled
    total_jobs     = Column(Integer, default=0)                        # global pool size for this pair
    created_at     = Column(DateTime(timezone=True), server_default=func.now())


class TailorJobRecord(Base):
    __tablename__ = "tailor_jobs"

    id              = Column(String(36), primary_key=True)
    user_id         = Column(String(36), nullable=False, index=True)
    status          = Column(String(20), default="queued")  # queued/running/complete/error/stale
    pulled_job_id   = Column(String(36), nullable=True, index=True)  # links back to the job card
    company_name    = Column(String(200), nullable=True)
    job_url         = Column(String(1000), nullable=True)
    score           = Column(Integer, nullable=True)
    has_pdf         = Column(Boolean, default=False)
    has_docx        = Column(Boolean, default=False)
    filename        = Column(String(300), nullable=True)
    error_msg       = Column(Text, nullable=True)
    final_resume    = Column(Text, nullable=True)
    progress_events = Column(JSON, default=list)   # persisted for refresh/restart recovery
    pdf_b64         = Column(Text, nullable=True)  # base64 PDF from Hetzner worker (survives Render restarts)
    docx_b64        = Column(Text, nullable=True)  # base64 DOCX from Hetzner worker
    dispatch_payload = Column(JSON, nullable=True)  # stored so watchdog can re-dispatch stuck jobs
    dispatch_count  = Column(Integer, default=0)    # how many times we've sent to the worker
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    expires_at      = Column(DateTime(timezone=True), nullable=False)
    input_tokens    = Column(Integer, default=0)
    output_tokens   = Column(Integer, default=0)
    cost_usd        = Column(Float, default=0.0)


# ---------------------------------------------------------------------------
# UserCredits — credit balance for Claude token billing
# ---------------------------------------------------------------------------

class UserCredits(Base):
    __tablename__ = "user_credits"

    id        = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id   = Column(String(36), nullable=False, unique=True, index=True)
    balance   = Column(Float, default=0.0)   # USD
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ---------------------------------------------------------------------------
# Interview Sessions
# ---------------------------------------------------------------------------

class InterviewSessionRecord(Base):
    """One completed mock interview session per user."""
    __tablename__ = "interview_sessions"

    id               = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Interview metadata
    job_title        = Column(String(300), default="")
    company          = Column(String(200), default="")
    round_type       = Column(String(20),  default="")    # phone | mid | technical | hr
    round_label      = Column(String(100), default="")
    duration_minutes = Column(Integer, default=30)

    # AI-generated questions + candidate answers (parallel arrays)
    questions        = Column(JSON, default=list)   # [{id, question, category, estimated_time_seconds}]
    answers          = Column(JSON, default=list)   # ["answer text", ...] indexed by question order

    # Outcome
    elapsed_seconds  = Column(Integer, default=0)
    questions_answered = Column(Integer, default=0)
    status           = Column(String(20), default="completed")   # completed | abandoned

    # Snapshot of the JD used (first 500 chars — for display)
    jd_snippet       = Column(Text, default="")

    completed_at     = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class ScheduledInterviewRecord(Base):
    """Interview scheduled by the user for a future date."""
    __tablename__ = "scheduled_interviews"

    id               = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    job_title        = Column(String(300), default="")
    company          = Column(String(200), default="")
    round_type       = Column(String(20),  default="")
    round_label      = Column(String(100), default="")
    duration_minutes = Column(Integer, default=30)

    # Pre-generated questions stored so the interview starts instantly
    questions        = Column(JSON, default=list)

    scheduled_at     = Column(DateTime(timezone=True), nullable=False)
    status           = Column(String(20), default="pending")   # pending | started | cancelled

    created_at       = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class LinkedInBoostResult(Base):
    __tablename__ = "linkedin_boost_results"

    id              = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(String(36), nullable=False, unique=True, index=True)
    result          = Column(JSON, nullable=True)
    optimize_result = Column(JSON, nullable=True)
    target_role     = Column(String(200), default='')
    photo_result    = Column(JSON, nullable=True)
    cover_result    = Column(JSON, nullable=True)
    photo_data_url  = Column(Text, nullable=True)
    cover_data_url  = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
