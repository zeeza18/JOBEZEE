"""
/api/profile — CRUD for user job-search preferences.

Endpoints
---------
GET  /api/profile/          — fetch current user's profile (auto-creates if missing)
PUT  /api/profile/          — full replace / create profile
POST /api/profile/resume    — upload resume file
POST /api/profile/import-local — sync profile from local/user_profile.json into DB
GET  /api/profile/export-local — write current DB profile back to local/user_profile.json
"""
from __future__ import annotations

import json
import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..auth import get_current_user
from ..database import get_db
from ..models import User, UserProfile
from ..schemas import UserProfileCreate, UserProfileResponse

router = APIRouter()

# Path to local JSON (relative to repo root — two levels up from backend/)
_LOCAL_JSON = Path(__file__).resolve().parents[2] / "local" / "user_profile.json"


def _profile_id_for(user: User) -> uuid.UUID:
    """Each user gets a profile whose PK == their user UUID."""
    return uuid.UUID(user.id)


# ── GET ───────────────────────────────────────────────────────────────────────

@router.get("/", response_model=UserProfileResponse)
async def get_profile(
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> UserProfile:
    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(id=pid, full_name=current_user.full_name, email=current_user.email)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


# ── PUT ───────────────────────────────────────────────────────────────────────

@router.put("/", response_model=UserProfileResponse)
async def update_profile(
    data         : UserProfileCreate,
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> UserProfile:
    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(id=pid, **data.model_dump())
        db.add(profile)
    else:
        for key, val in data.model_dump().items():
            setattr(profile, key, val)

    await db.commit()
    await db.refresh(profile)
    return profile


# ── Resume upload ─────────────────────────────────────────────────────────────

@router.post("/resume")
async def upload_resume(
    file         : UploadFile     = File(...),
    current_user : User           = Depends(get_current_user),
    db           : AsyncSession   = Depends(get_db),
) -> dict:
    from ..config import get_settings
    cfg = get_settings()

    upload_dir = os.path.join(cfg.UPLOAD_DIR, "resumes")
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4()}_{file.filename}"
    dest_path = os.path.join(upload_dir, safe_name)

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(id=pid, full_name=current_user.full_name, email=current_user.email)
        db.add(profile)

    profile.resume_filename = file.filename or ""
    profile.resume_url      = f"/uploads/resumes/{safe_name}"
    await db.commit()

    return {"filename": file.filename, "url": f"/uploads/resumes/{safe_name}"}


# ── Import from local JSON ────────────────────────────────────────────────────

@router.post("/import-local", response_model=UserProfileResponse)
async def import_from_local(
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> UserProfile:
    """
    Read local/user_profile.json and upsert into the DB.
    Flattens the nested JSON structure into the flat UserProfile columns.
    """
    if not _LOCAL_JSON.exists():
        raise HTTPException(404, f"local/user_profile.json not found at {_LOCAL_JSON}")

    try:
        raw = json.loads(_LOCAL_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Invalid JSON: {e}")

    def _get(section: str, key: str, default=""):
        return raw.get(section, {}).get(key, default)

    # ── Flatten nested JSON → flat dict matching UserProfileCreate ─────────────
    flat: dict = {
        # personal
        "full_name"        : _get("personal", "full_name"),
        "preferred_name"   : _get("personal", "preferred_name"),
        "email"            : _get("personal", "email"),
        "phone"            : _get("personal", "phone"),
        "address"          : _get("personal", "address"),
        "city"             : _get("personal", "city"),
        "state"            : _get("personal", "state"),
        "country"          : _get("personal", "country", "USA"),
        "zip_code"         : _get("personal", "zip_code"),
        "linkedin"         : _get("personal", "linkedin"),
        "github"           : _get("personal", "github"),
        "portfolio"        : _get("personal", "portfolio"),
        "personal_website" : _get("personal", "personal_website"),
        "headline"         : _get("personal", "headline"),

        # work auth
        "work_authorization"        : _get("work_authorization", "work_authorization"),
        "visa_sponsorship_required" : bool(_get("work_authorization", "visa_sponsorship_required", False)),
        "work_permit_type"          : _get("work_authorization", "work_permit_type"),

        # compensation
        "salary_currency"   : _get("compensation", "salary_currency", "USD"),
        "salary_min"        : float(_get("compensation", "salary_min", 0) or 0),
        "salary_max"        : float(_get("compensation", "salary_max", 0) or 0),
        "salary_range_text" : _get("compensation", "salary_range_text"),

        # experience
        "current_job_title" : _get("experience", "current_job_title"),
        "target_role"       : _get("experience", "target_role"),
        "years_experience"  : str(_get("experience", "years_experience", "")),
        "education"         : _get("experience", "education"),

        # skills
        "skills_languages"  : _get("skills", "languages", []),
        "skills_frameworks" : _get("skills", "frameworks", []),
        "skills_tools"      : _get("skills", "tools", []),

        # job prefs
        "desired_roles"       : _get("job_preferences", "desired_roles", []),
        "preferred_locations" : _get("job_preferences", "preferred_locations", []),
        "preferred_countries" : _get("job_preferences", "preferred_countries", ["USA"]),
        "preferred_regions"   : _get("job_preferences", "preferred_regions", []),
        "industries"          : _get("job_preferences", "industries", []),
        "remote_preference"   : _get("job_preferences", "remote_preference", "hybrid"),
        "job_type"            : _get("job_preferences", "job_type", "full_time"),
        "experience_level"    : _get("job_preferences", "experience_level", "mid"),
        "search_radius_miles" : int(_get("job_preferences", "search_radius_miles", 50) or 50),
        "hours_old"           : int(_get("job_preferences", "hours_old", 72) or 72),
        "results_per_site"    : int(_get("job_preferences", "results_per_site", 50) or 50),

        # resume facts
        "resume_facts_companies" : _get("resume_facts", "companies_to_keep", []),
        "resume_facts_projects"  : _get("resume_facts", "projects_to_keep", []),
        "resume_facts_schools"   : _get("resume_facts", "schools_to_keep", []),
        "resume_facts_metrics"   : _get("resume_facts", "metrics_to_keep", []),
        "earliest_start"         : _get("resume_facts", "earliest_start", "Immediately"),
    }

    data = UserProfileCreate(**flat)

    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(id=pid, **data.model_dump())
        db.add(profile)
    else:
        for key, val in data.model_dump().items():
            setattr(profile, key, val)

    await db.commit()
    await db.refresh(profile)
    return profile


# ── Export to local JSON ──────────────────────────────────────────────────────

@router.get("/export-local")
async def export_to_local(
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> dict:
    """
    Write the current DB profile back to local/user_profile.json.
    Useful for keeping the local file in sync after editing via the UI.
    """
    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(404, "No profile found. Fill in your preferences first.")

    _LOCAL_JSON.parent.mkdir(parents=True, exist_ok=True)

    nested = {
        "_comment": "JOBEZEE local user profile — auto-exported from DB. Edit and POST /api/profile/import-local to re-sync.",
        "personal": {
            "full_name"        : profile.full_name,
            "preferred_name"   : profile.preferred_name,
            "email"            : profile.email,
            "phone"            : profile.phone,
            "address"          : profile.address,
            "city"             : profile.city,
            "state"            : profile.state,
            "country"          : profile.country,
            "zip_code"         : profile.zip_code,
            "linkedin"         : profile.linkedin,
            "github"           : profile.github,
            "portfolio"        : profile.portfolio,
            "personal_website" : profile.personal_website,
            "headline"         : profile.headline,
        },
        "work_authorization": {
            "is_authorized"            : not profile.visa_sponsorship_required,
            "visa_sponsorship_required": profile.visa_sponsorship_required,
            "work_authorization"       : profile.work_authorization,
            "work_permit_type"         : profile.work_permit_type,
        },
        "compensation": {
            "salary_currency"   : profile.salary_currency,
            "salary_min"        : profile.salary_min,
            "salary_max"        : profile.salary_max,
            "salary_range_text" : profile.salary_range_text,
        },
        "experience": {
            "current_job_title" : profile.current_job_title,
            "target_role"       : profile.target_role,
            "years_experience"  : profile.years_experience,
            "education"         : profile.education,
        },
        "skills": {
            "languages"  : profile.skills_languages,
            "frameworks" : profile.skills_frameworks,
            "tools"      : profile.skills_tools,
        },
        "job_preferences": {
            "desired_roles"       : profile.desired_roles,
            "preferred_locations" : profile.preferred_locations,
            "preferred_countries" : profile.preferred_countries,
            "preferred_regions"   : profile.preferred_regions,
            "industries"          : profile.industries,
            "remote_preference"   : profile.remote_preference,
            "job_type"            : profile.job_type,
            "experience_level"    : profile.experience_level,
            "search_radius_miles" : profile.search_radius_miles,
            "hours_old"           : profile.hours_old,
            "results_per_site"    : profile.results_per_site,
        },
        "resume_facts": {
            "companies_to_keep" : profile.resume_facts_companies,
            "projects_to_keep"  : profile.resume_facts_projects,
            "schools_to_keep"   : profile.resume_facts_schools,
            "metrics_to_keep"   : profile.resume_facts_metrics,
            "earliest_start"    : profile.earliest_start,
        },
        "resume": {
            "filename" : profile.resume_filename,
            "url"      : profile.resume_url,
        },
        "_meta": {
            "last_updated" : str(__import__("datetime").date.today()),
            "source"       : "exported from DB via GET /api/profile/export-local",
        },
    }

    _LOCAL_JSON.write_text(json.dumps(nested, indent=2), encoding="utf-8")
    return {"ok": True, "path": str(_LOCAL_JSON)}
