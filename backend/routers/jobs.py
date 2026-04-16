"""
/api/jobs — Read/write jobs via the global job_listings + user_job_states tables.

All job data is stored once globally (deduped by URL in job_listings).
Per-user state (new / saved / applied / hidden) lives in user_job_states.
The API response shape is identical to the old pulled_jobs schema so the
frontend requires zero changes.
"""
from __future__ import annotations

import asyncio
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, delete, select, update, func as sqlfunc, text

from ..auth import get_current_user
from ..database import get_db
from ..models import JobListing, UserJobState, PreferenceCache, User, UserProfile
from ..schemas import PulledJobResponse

log = logging.getLogger(__name__)
router = APIRouter()


# ── Full description fetcher ──────────────────────────────────────────────────

def _sync_fetch_description(url: str, site: str) -> str | None:
    """Synchronously fetch a full job description from the source URL."""
    try:
        import requests
        from bs4 import BeautifulSoup
        from markdownify import markdownify

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        }

        if "linkedin.com" in url:
            m = re.search(r"/(?:view|jobs)/(\d+)", url)
            if m:
                jid = m.group(1)
                guest_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{jid}"
                r = requests.get(guest_url, headers=headers, timeout=12)
                if r.ok:
                    soup = BeautifulSoup(r.text, "html.parser")
                    div = soup.find(
                        "div",
                        class_=lambda c: c and "show-more-less-html__markup" in c,
                    )
                    if div:
                        return markdownify(str(div), heading_style="ATX").strip()

        if "indeed.com" in url:
            r = requests.get(url, headers=headers, timeout=12)
            if r.ok:
                soup = BeautifulSoup(r.text, "html.parser")
                div = (
                    soup.find(id="jobDescriptionText")
                    or soup.find(id="jobsearch-JobComponent-description")
                    or soup.find(class_=lambda c: c and "jobsearch-jobDescriptionText" in (c if isinstance(c, str) else " ".join(c)))
                )
                if div:
                    return markdownify(str(div), heading_style="ATX").strip()

        r = requests.get(url, headers=headers, timeout=12)
        if not r.ok:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        for selector in [
            lambda s: s.find(id=re.compile(r"job.?desc", re.I)),
            lambda s: s.find(class_=re.compile(r"job.?desc|job.?detail|posting.?body", re.I)),
            lambda s: s.find("article"),
            lambda s: s.find("main"),
        ]:
            div = selector(soup)
            if div and len(div.get_text()) > 200:
                return markdownify(str(div), heading_style="ATX").strip()

        return None
    except Exception as exc:
        log.warning("_sync_fetch_description failed for %s: %s", url, exc)
        return None


@router.get("/{job_id}/full-description")
async def get_full_description(
    job_id       : uuid.UUID,
    current_user : User         = Depends(get_current_user),
    db           : AsyncSession = Depends(get_db),
) -> dict:
    """Fetch the full job description from source URL; save back to job_listings."""
    from fastapi import HTTPException

    result = await db.execute(select(JobListing).where(JobListing.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    if not job.url:
        return {"description": job.description or "", "source": "cached"}

    loop = asyncio.get_event_loop()
    fetched = await loop.run_in_executor(
        None, _sync_fetch_description, job.url, job.site or ""
    )

    if fetched:
        await db.execute(
            update(JobListing)
            .where(JobListing.id == job_id)
            .values(description=fetched)
        )
        await db.commit()
        log.info("Updated description for job %s (%d chars)", job_id, len(fetched))
        return {"description": fetched, "source": "fetched"}

    return {"description": job.description or "", "source": "cached"}


@router.get("/", response_model=list[PulledJobResponse])
async def list_pulled_jobs(
    status_filter : Optional[str] = Query(None, alias="status"),
    source_filter : Optional[str] = Query(None, alias="source"),
    search        : Optional[str] = Query(None),
    limit         : int           = Query(200, le=1000),
    offset        : int           = Query(0),
    current_user  : User          = Depends(get_current_user),
    db            : AsyncSession  = Depends(get_db),
) -> list[dict]:
    """
    Return jobs for the current user, joined from job_listings + user_job_states.
    Response shape matches PulledJobResponse exactly (frontend unchanged).
    """
    user_id = current_user.id

    q = (
        select(
            JobListing.id,
            JobListing.title,
            JobListing.company,
            JobListing.location,
            JobListing.country,
            JobListing.url,
            JobListing.description,
            JobListing.job_type,
            JobListing.salary_min,
            JobListing.salary_max,
            JobListing.salary_currency,
            JobListing.salary_text,
            JobListing.source,
            JobListing.site,
            JobListing.posted_at,
            JobListing.skills,
            UserJobState.status,
            UserJobState.created_at.label("pulled_at"),
            UserJobState.id.label("state_id"),
        )
        .join(UserJobState, UserJobState.job_id == JobListing.id)
        .where(UserJobState.user_id == user_id)
        .order_by(
            case(
                (JobListing.site == "linkedin",      0),
                (JobListing.site == "indeed",        1),
                (JobListing.site == "glassdoor",     2),
                (JobListing.site == "zip_recruiter", 3),
                (JobListing.site == "workday",       99),
                else_=4,
            ).asc(),
            UserJobState.created_at.desc(),
        )
    )

    if status_filter:
        q = q.where(UserJobState.status == status_filter)
    if source_filter:
        q = q.where(JobListing.source == source_filter)
    if search:
        like = f"%{search}%"
        q = q.where(JobListing.title.ilike(like) | JobListing.company.ilike(like))

    # ── Per-user preference filters (job_type + experience_level) ───────────
    # job_type field is empty for all jobs from jobspy, so we scan title+desc.
    # exp_years_min is parsed from title/desc at pull time (NULL = unknown).
    # 4 supported experience levels: intern / junior / mid / senior.
    _EXP_LEVEL_YEARS: dict[str, tuple[int, int]] = {
        "intern":  (0, 1),
        "junior":  (0, 3),
        "mid":     (2, 6),
        "senior":  (5, 20),
    }

    profile_res = await db.execute(
        select(UserProfile.job_types, UserProfile.job_type,
               UserProfile.experience_level, UserProfile.experience_levels)
        .where(UserProfile.email == current_user.email)
    )
    prof_row = profile_res.first()
    if prof_row:
        from sqlalchemy import or_, and_, true as sqltrue

        # ── Job-type filter (title + description scan) ────────────────────
        preferred_types: list[str] = list(prof_row.job_types or []) or (
            [prof_row.job_type] if prof_row.job_type else []
        )
        if preferred_types:
            type_conditions = []
            for jt in preferred_types:
                jt = jt.lower()
                if jt == "internship":
                    type_conditions.append(or_(
                        sqlfunc.lower(JobListing.title).contains("intern"),
                        sqlfunc.lower(JobListing.description).contains("internship"),
                        sqlfunc.lower(JobListing.description).contains("intern program"),
                    ))
                elif jt == "part_time":
                    type_conditions.append(or_(
                        sqlfunc.lower(JobListing.title).contains("part-time"),
                        sqlfunc.lower(JobListing.title).contains("part time"),
                        sqlfunc.lower(JobListing.description).contains("part-time"),
                        sqlfunc.lower(JobListing.description).contains("part time"),
                    ))
                elif jt == "contract":
                    type_conditions.append(or_(
                        sqlfunc.lower(JobListing.title).contains("contract"),
                        sqlfunc.lower(JobListing.description).contains("contractor"),
                        sqlfunc.lower(JobListing.description).contains("contract position"),
                    ))
                elif jt == "full_time":
                    type_conditions.append(sqltrue())  # no restriction
            if type_conditions:
                q = q.where(or_(*type_conditions))

        # ── Experience-level year-range filter ────────────────────────────
        exp_list: list[str] = list(prof_row.experience_levels or []) or (
            [prof_row.experience_level] if prof_row.experience_level else []
        )
        exp_lvl = exp_list[0].lower().strip() if exp_list else ""
        yr_range = _EXP_LEVEL_YEARS.get(exp_lvl)
        if yr_range:
            lo, hi = yr_range
            if exp_lvl == "intern":
                # Strict: NULL only passes if title also has intern keyword
                _intern_title = or_(
                    sqlfunc.lower(JobListing.title).contains("intern"),
                    sqlfunc.lower(JobListing.title).contains("co-op"),
                    sqlfunc.lower(JobListing.title).contains("apprentice"),
                )
                q = q.where(or_(
                    and_(JobListing.exp_years_min >= lo, JobListing.exp_years_min <= hi),
                    and_(JobListing.exp_years_min.is_(None), _intern_title),
                ))
            else:
                # junior / mid / senior: NULL passes freely
                q = q.where(or_(
                    JobListing.exp_years_min.is_(None),
                    and_(JobListing.exp_years_min >= lo, JobListing.exp_years_min <= hi),
                ))

    q = q.limit(limit).offset(offset)

    rows = (await db.execute(q)).mappings().all()

    # Build response dicts — shape must match PulledJobResponse
    return [
        {
            "id"                : row["id"],
            "user_profile_id"   : uuid.UUID(user_id) if user_id else None,
            "search_session_id" : "",
            "title"             : row["title"] or "",
            "company"           : row["company"] or "",
            "location"          : row["location"] or "",
            "country"           : row["country"] or "",
            "url"               : row["url"] or "",
            "description"       : row["description"] or "",
            "job_type"          : row["job_type"] or "",
            "salary_min"        : row["salary_min"],
            "salary_max"        : row["salary_max"],
            "salary_currency"   : row["salary_currency"] or "USD",
            "salary_text"       : row["salary_text"] or "",
            "source"            : row["source"] or "",
            "site"              : row["site"] or "",
            "posted_at"         : row["posted_at"] or "",
            "skills"            : row["skills"] or [],
            "status"            : row["status"] or "new",
            "pulled_at"         : row["pulled_at"] or datetime.now(timezone.utc),
        }
        for row in rows
    ]


@router.patch("/{job_id}/status")
async def set_job_status(
    job_id       : uuid.UUID,
    status       : str           = Body(..., embed=True),
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> dict:
    valid = {"new", "saved", "applied", "submitted", "hidden", "favourite"}
    if status not in valid:
        from fastapi import HTTPException
        raise HTTPException(400, f"status must be one of {valid}")

    result = await db.execute(
        update(UserJobState)
        .where(UserJobState.job_id == job_id, UserJobState.user_id == current_user.id)
        .values(status=status, updated_at=datetime.now(timezone.utc))
    )
    await db.commit()

    # Fallback: if no user_job_states row existed yet (old data), create one
    if result.rowcount == 0:
        jl = (await db.execute(select(JobListing).where(JobListing.id == job_id))).scalar_one_or_none()
        if jl:
            db.add(UserJobState(
                id=uuid.uuid4(),
                user_id=current_user.id,
                job_id=job_id,
                status=status,
            ))
            await db.commit()

    return {"ok": True, "status": status}


@router.delete("/clear")
async def clear_jobs(
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> dict:
    """
    Remove all of this user's job states and expire their preference_cache entries
    so the next search performs a full 30-day pull.
    """
    user_id = current_user.id

    # Count before delete
    count_res = await db.execute(
        select(sqlfunc.count()).select_from(UserJobState).where(UserJobState.user_id == user_id)
    )
    deleted = count_res.scalar() or 0

    # Delete user_job_states
    await db.execute(delete(UserJobState).where(UserJobState.user_id == user_id))

    # Expire preference_cache for this user's role+location combos
    # so next trigger uses hours_old=720 (fresh 30-day pull)
    profile_res = await db.execute(
        select(UserProfile).where(UserProfile.id == uuid.UUID(user_id))
    )
    profile = profile_res.scalar_one_or_none()
    if profile:
        roles     = [r.lower().strip() for r in (profile.desired_roles or [])]
        countries = [c.lower().strip() for c in (profile.preferred_countries or [])]
        if not countries:
            countries = ["usa"]
        for role in roles:
            for country in countries:
                await db.execute(
                    update(PreferenceCache)
                    .where(PreferenceCache.role_tag == role, PreferenceCache.location_tag == country)
                    .values(last_pulled_at=None)   # NULL = "never pulled" → forces 30d on next run
                )

    await db.commit()
    log.info("[Jobs] Cleared %d job states for user=%s + expired preference_cache", deleted, user_id)
    return {"deleted": deleted}


@router.get("/stats")
async def job_stats(
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> dict:
    user_id = current_user.id

    counts_q = (
        select(UserJobState.status, sqlfunc.count().label("cnt"))
        .where(UserJobState.user_id == user_id)
        .group_by(UserJobState.status)
    )
    counts_res = await db.execute(counts_q)
    status_map: dict[str, int] = {row.status: row.cnt for row in counts_res}

    sources_q = (
        select(JobListing.source)
        .join(UserJobState, UserJobState.job_id == JobListing.id)
        .where(UserJobState.user_id == user_id)
        .distinct()
    )
    sources_res = await db.execute(sources_q)
    sources = [r[0] for r in sources_res if r[0]]

    # "new" = jobs pulled in the last 48 hours (today + yesterday)
    new_48h_res = await db.execute(
        select(sqlfunc.count())
        .where(
            UserJobState.user_id == user_id,
            UserJobState.created_at >= text("NOW() - INTERVAL '48 hours'"),
        )
    )
    new_48h: int = new_48h_res.scalar() or 0

    return {
        "total"     : sum(status_map.values()),
        "new"       : new_48h,
        "saved"     : status_map.get("saved", 0),
        "applied"   : status_map.get("applied", 0),
        "favourite" : status_map.get("favourite", 0),
        "hidden"    : status_map.get("hidden", 0),
        "sources"   : sources,
    }
