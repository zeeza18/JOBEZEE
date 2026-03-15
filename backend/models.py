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
    remote_preference    = Column(String(20), default="hybrid")   # remote/hybrid/onsite/any
    job_type             = Column(String(20), default="full_time") # full_time/part_time/contract
    experience_level     = Column(String(20), default="mid")       # junior/mid/senior/lead/executive

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
    status   = Column(String(50), default="new")   # new / saved / applied / hidden

    pulled_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# SearchSession
# ---------------------------------------------------------------------------

class SearchSession(Base):
    __tablename__ = "search_sessions"

    id         = Column(String(50), primary_key=True)
    status     = Column(String(20), default="running")  # running / done / failed
    jobs_found = Column(Integer, default=0)
    error      = Column(Text, default="")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
