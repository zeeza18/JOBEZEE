"""
Pydantic v2 schemas — mirrors every field in UserProfile DB model.
Used for request validation (Create/Update) and response serialisation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# UserProfile
# ---------------------------------------------------------------------------

class UserProfileBase(BaseModel):

    # ── Personal ─────────────────────────────────────────────────────────────
    full_name        : str = ""
    preferred_name   : str = ""
    email            : str = ""
    phone            : str = ""
    address          : str = ""
    city             : str = ""
    state            : str = ""
    country          : str = "USA"
    zip_code         : str = ""
    linkedin         : str = ""
    github           : str = ""
    portfolio        : str = ""
    personal_website : str = ""
    headline         : str = ""

    # ── Job preferences ──────────────────────────────────────────────────────
    desired_roles        : list[str] = Field(default_factory=list)
    preferred_locations  : list[str] = Field(default_factory=list)
    preferred_countries  : list[str] = Field(default_factory=list)
    preferred_regions    : list[str] = Field(default_factory=list)
    industries           : list[str] = Field(default_factory=list)
    remote_preference    : str = "hybrid"
    job_type             : str = "full_time"
    experience_level     : str = "mid"

    # ── Salary ───────────────────────────────────────────────────────────────
    salary_min        : float = 0.0
    salary_max        : float = 0.0
    salary_currency   : str   = "USD"
    salary_range_text : str   = ""

    # ── Work authorization ────────────────────────────────────────────────────
    work_authorization        : str  = ""
    visa_sponsorship_required : bool = False
    work_permit_type          : str  = ""

    # ── Experience & education ────────────────────────────────────────────────
    current_job_title : str = ""
    target_role       : str = ""
    years_experience  : str = ""
    education         : str = ""

    # ── Skills ───────────────────────────────────────────────────────────────
    skills_languages  : list[str] = Field(default_factory=list)
    skills_frameworks : list[str] = Field(default_factory=list)
    skills_tools      : list[str] = Field(default_factory=list)

    # ── Resume facts (AI preserves verbatim during tailoring) ─────────────────
    resume_facts_companies : list[str] = Field(default_factory=list)
    resume_facts_projects  : list[str] = Field(default_factory=list)
    resume_facts_schools   : list[str] = Field(default_factory=list)
    resume_facts_metrics   : list[str] = Field(default_factory=list)
    earliest_start         : str = "Immediately"

    # ── Search tuning ─────────────────────────────────────────────────────────
    search_radius_miles : int = 50
    hours_old           : int = 72
    results_per_site    : int = 50


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    id              : UUID
    resume_filename : str = ""
    resume_url      : str = ""
    created_at      : datetime
    updated_at      : datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# PulledJob
# ---------------------------------------------------------------------------

class PulledJobResponse(BaseModel):
    id                : UUID
    user_profile_id   : Optional[UUID]
    search_session_id : str
    title             : str
    company           : str
    location          : str
    country           : str
    url               : str
    description       : str
    job_type          : str
    salary_min        : Optional[float]
    salary_max        : Optional[float]
    salary_currency   : str
    salary_text       : str
    source            : str
    site              : str
    posted_at         : str
    skills            : list[str]
    status            : str
    pulled_at         : datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class SearchTriggerRequest(BaseModel):
    roles            : list[str] | None = None
    locations        : list[str] | None = None
    countries        : list[str] | None = None
    regions          : list[str] | None = None
    remote_pref      : str | None       = None
    job_type         : str | None       = None
    experience       : str | None       = None
    salary_min       : float | None     = None
    hours_old        : int | None       = None
    results_per_site : int | None       = None
    include_workday  : bool             = False   # disabled by default (slow)


class SearchTriggerResponse(BaseModel):
    session_id : str
    jobs_found : int
    message    : str
    roles      : list[str] = Field(default_factory=list)
    locations  : list[str] = Field(default_factory=list)


class SearchStatusResponse(BaseModel):
    session_id  : str
    status      : str
    jobs_found  : int
    error       : str
    started_at  : Optional[datetime] = None
    finished_at : Optional[datetime] = None

    model_config = {"from_attributes": True}
