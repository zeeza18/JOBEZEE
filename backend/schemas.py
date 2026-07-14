"""
Pydantic v2 schemas — mirrors every field in UserProfile DB model.
Used for request validation (Create/Update) and response serialisation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


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
    # Multi-select (LinkedIn-filter-friendly)
    work_modes           : list[str] = Field(default_factory=list)   # ["remote","hybrid","onsite"]
    job_types            : list[str] = Field(default_factory=list)   # ["full_time","contract"]
    experience_levels    : list[str] = Field(default_factory=list)   # ["junior","mid","senior"]

    # ── Salary ───────────────────────────────────────────────────────────────
    salary_min        : float = 0.0
    salary_max        : float = 0.0
    salary_currency   : str   = "USD"
    salary_range_text : str   = ""

    # ── Work authorization ────────────────────────────────────────────────────
    work_authorization        : str  = ""
    visa_sponsorship_required : bool = False
    work_permit_type          : str  = ""

    # ── Auto-apply credentials ────────────────────────────────────────────────
    apply_email     : str = ""
    apply_password  : str = ""

    # Per-platform credentials
    linkedin_email      : str = ""
    linkedin_password   : str = ""
    indeed_email        : str = ""
    indeed_password     : str = ""
    greenhouse_email    : str = ""
    greenhouse_password : str = ""
    workday_email       : str = ""
    workday_password    : str = ""

    # Email integration
    gmail_api_key : str = ""

    # AI API keys (write-only — never returned in GET, use credentials_set)
    openai_api_key    : str = ""
    anthropic_api_key : str = ""

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
    tailor_resume       : bool = False

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, data: object) -> object:
        """Replace None with safe defaults so old DB rows with null columns don't cause 422s."""
        if not isinstance(data, dict):
            return data
        _str_defaults: list[str] = [
            "full_name", "preferred_name", "email", "phone", "address",
            "city", "state", "zip_code", "linkedin", "github", "portfolio",
            "personal_website", "headline", "remote_preference", "job_type",
            "experience_level", "salary_currency", "salary_range_text",
            "work_authorization", "work_permit_type", "apply_email",
            "apply_password", "linkedin_email", "linkedin_password",
            "indeed_email", "indeed_password", "greenhouse_email",
            "greenhouse_password", "workday_email", "workday_password",
            "gmail_api_key", "openai_api_key", "anthropic_api_key",
            "current_job_title", "target_role", "years_experience",
            "education", "earliest_start",
        ]
        _list_defaults: list[str] = [
            "desired_roles", "preferred_locations", "preferred_countries",
            "preferred_regions", "industries", "work_modes", "job_types",
            "experience_levels", "skills_languages", "skills_frameworks",
            "skills_tools", "resume_facts_companies", "resume_facts_projects",
            "resume_facts_schools", "resume_facts_metrics",
        ]
        _float_defaults: dict[str, float] = {"salary_min": 0.0, "salary_max": 0.0}
        _int_defaults: dict[str, int] = {
            "search_radius_miles": 50, "hours_old": 72, "results_per_site": 50,
        }
        _bool_defaults: dict[str, bool] = {
            "visa_sponsorship_required": False, "tailor_resume": False,
        }
        for k in _str_defaults:
            if data.get(k) is None:
                data[k] = ""
        for k in _list_defaults:
            if data.get(k) is None:
                data[k] = []
        for k, v in _float_defaults.items():
            if data.get(k) is None:
                data[k] = v
        for k, v in _int_defaults.items():
            if data.get(k) is None:
                data[k] = v
        for k, v in _bool_defaults.items():
            if data.get(k) is None:
                data[k] = v
        return data


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    id              : UUID
    resume_filename : str = ""
    resume_url      : str = ""
    avatar_url      : str = ""
    credentials_set : dict = Field(default_factory=dict)
    resume_extraction: dict | None = None   # LLM-extracted resume facts: title, skills, years_exp, education, location
    created_at      : datetime
    updated_at      : datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# PortfolioConfig
# ---------------------------------------------------------------------------

class PortfolioConfigBase(BaseModel):
    template_id   : str  = "ModernDev"
    category      : str  = "tech"
    primary_color : str  = "#06b6d4"
    accent_color  : str  = "#0ea5e9"
    is_published  : bool = False
    custom_bio    : str  = ""
    show_sections : dict = {
        "about": True, "skills": True, "experience": True,
        "projects": True, "education": True, "contact": True,
    }


class PortfolioConfigUpdate(PortfolioConfigBase):
    pass


class PortfolioConfigResponse(PortfolioConfigBase):
    id         : UUID
    user_id    : str
    created_at : datetime
    updated_at : datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# PulledJob
# ---------------------------------------------------------------------------

class PulledJobResponse(BaseModel):
    id                : UUID
    user_profile_id   : Optional[UUID]   = None
    search_session_id : str              = ""
    title             : str
    company           : str
    location          : str
    country           : str              = ""
    url               : str
    description       : str              = ""
    job_type          : str              = ""
    salary_min        : Optional[float]  = None
    salary_max        : Optional[float]  = None
    salary_currency   : str              = "USD"
    salary_text       : str              = ""
    source            : str              = ""
    site              : str              = ""
    posted_at         : str              = ""
    skills            : list[str]        = []
    status            : str              = "new"
    pulled_at         : datetime
    match_score       : Optional[float]  = None
    matched_skills    : list[str]        = []
    missing_skills    : list[str]        = []

    @field_validator("status", mode="before")
    @classmethod
    def _coerce_status(cls, v: object) -> str:
        return v if isinstance(v, str) and v else "new"

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
    include_workday  : bool             = True
    workday_only     : bool             = False  # skip boards, run Workday phase only
    force_full_pull  : bool             = False  # bypass preference cache → use hours_old=720 (30d)


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


# ---------------------------------------------------------------------------
# Resume Maker (ResumeDocument)
# ---------------------------------------------------------------------------

class ResumeContact(BaseModel):
    full_name : str = ""
    headline  : str = ""
    email     : str = ""
    phone     : str = ""
    location  : str = ""
    linkedin  : str = ""
    github    : str = ""
    portfolio : str = ""
    website   : str = ""


class ResumeExperienceItem(BaseModel):
    id       : str = ""
    company  : str = ""
    title    : str = ""
    location : str = ""
    start_date : str = ""
    end_date   : str = ""
    current    : bool = False
    bullets    : list[str] = Field(default_factory=list)


class ResumeEducationItem(BaseModel):
    id       : str = ""
    school   : str = ""
    degree   : str = ""
    field    : str = ""
    location : str = ""
    start_date : str = ""
    end_date   : str = ""
    gpa        : str = ""


class ResumeProjectItem(BaseModel):
    id          : str = ""
    name        : str = ""
    description : str = ""
    bullets     : list[str] = Field(default_factory=list)
    link        : str = ""
    tech        : list[str] = Field(default_factory=list)


class ResumeCertificationItem(BaseModel):
    id     : str = ""
    name   : str = ""
    issuer : str = ""
    date   : str = ""
    link   : str = ""


class ResumeSkillCategory(BaseModel):
    id    : str = ""
    label : str = ""
    items : list[str] = Field(default_factory=list)


class ResumeCustomSection(BaseModel):
    id    : str = ""
    title : str = ""
    items : list[str] = Field(default_factory=list)


class ResumeDocumentContent(BaseModel):
    contact       : ResumeContact = Field(default_factory=ResumeContact)
    summary       : str = ""
    experience    : list[ResumeExperienceItem] = Field(default_factory=list)
    education     : list[ResumeEducationItem] = Field(default_factory=list)
    skills        : list[ResumeSkillCategory] = Field(default_factory=list)
    projects      : list[ResumeProjectItem] = Field(default_factory=list)
    certifications: list[ResumeCertificationItem] = Field(default_factory=list)
    custom        : list[ResumeCustomSection] = Field(default_factory=list)
    section_order : list[str] = Field(
        default_factory=lambda: ["summary", "experience", "education", "skills", "projects", "certifications"]
    )


class ResumeDocumentSettings(BaseModel):
    template            : str = "classic"      # classic | modern | clean
    page_size           : str = "letter"       # letter | a4
    margin_top          : float = 15.0
    margin_bottom       : float = 15.0
    margin_left         : float = 15.0
    margin_right        : float = 15.0
    spacing_level       : int = 3              # 1-5
    font_size_level     : int = 3              # 1-5
    header_font         : str = "sans"         # serif | sans | mono
    body_font           : str = "sans"
    accent_color        : str = "blue"         # blue | green | orange | red
    compact             : bool = False
    show_contact_icons  : bool = True


class ResumeDocumentUpdate(BaseModel):
    title    : Optional[str] = None
    content  : Optional[ResumeDocumentContent] = None
    settings : Optional[ResumeDocumentSettings] = None


class ResumeDocumentOut(BaseModel):
    id         : UUID
    title      : str
    content    : ResumeDocumentContent
    settings   : ResumeDocumentSettings
    created_at : datetime
    updated_at : datetime

    model_config = {"from_attributes": True}


class ResumeImportResponse(BaseModel):
    content : ResumeDocumentContent
    source  : str   # "profile" — where the text was pulled from


class ResumeScoreResponse(BaseModel):
    score       : int
    matched     : list[str] = Field(default_factory=list)
    missing     : list[str] = Field(default_factory=list)
    suggestions : list[str] = Field(default_factory=list)
