"""
/api/jobs — Read pulled jobs, update status.
"""
from __future__ import annotations

import asyncio
import logging
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, select, update, func as sqlfunc

from ..auth import get_current_user
from ..database import get_db
from ..models import PulledJob, User
from ..schemas import PulledJobResponse

log = logging.getLogger(__name__)
router = APIRouter()


# ── Full description fetcher ──────────────────────────────────────────────────

def _sync_fetch_description(url: str, site: str) -> str | None:
    """
    Synchronously fetch a full job description from the source URL.
    Tried in executor so it doesn't block the event loop.
    """
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

        # ── LinkedIn: guest jobs API returns full description HTML ─────────
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

        # ── Indeed: parse job description section ──────────────────────────
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

        # ── Generic fallback: fetch URL and pick the largest text block ────
        r = requests.get(url, headers=headers, timeout=12)
        if not r.ok:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        # Try common job description containers
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
    """
    Fetch the full job description from the source URL on demand.
    If a longer version is found it is saved back to the DB.
    """
    from fastapi import HTTPException

    result = await db.execute(
        select(PulledJob).where(PulledJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    if not job.url:
        return {"description": job.description or "", "source": "cached"}

    loop = asyncio.get_event_loop()
    fetched = await loop.run_in_executor(
        None, _sync_fetch_description, job.url, job.site or ""
    )

    if fetched and len(fetched) > len(job.description or ""):
        await db.execute(
            update(PulledJob)
            .where(PulledJob.id == job_id)
            .values(description=fetched)
        )
        await db.commit()
        log.info("Updated description for job %s (+%d chars)", job_id, len(fetched) - len(job.description or ""))
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
) -> list[PulledJob]:
    profile_id = uuid.UUID(current_user.id)
    q = (
        select(PulledJob)
        .where(PulledJob.user_profile_id == profile_id)
        .order_by(
            # Workday always last; all other sources first
            case((PulledJob.site == 'workday', 1), else_=0).asc(),
            case((PulledJob.source == 'workday', 1), else_=0).asc(),
            PulledJob.pulled_at.desc(),
        )
    )
    if status_filter:
        q = q.where(PulledJob.status == status_filter)
    if source_filter:
        q = q.where(PulledJob.source == source_filter)
    if search:
        like = f"%{search}%"
        q = q.where(PulledJob.title.ilike(like) | PulledJob.company.ilike(like))
    q = q.limit(limit).offset(offset)

    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/{job_id}/status")
async def set_job_status(
    job_id       : uuid.UUID,
    status       : str           = Body(..., embed=True),
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> dict:
    valid = {"new", "saved", "applied", "hidden", "favourite"}
    if status not in valid:
        from fastapi import HTTPException
        raise HTTPException(400, f"status must be one of {valid}")

    await db.execute(
        update(PulledJob)
        .where(PulledJob.id == job_id)
        .values(status=status)
    )
    await db.commit()
    return {"ok": True, "status": status}


@router.get("/stats")
async def job_stats(
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> dict:
    profile_id = uuid.UUID(current_user.id)

    # Use SQL aggregates — never load all rows into memory
    counts_q = (
        select(PulledJob.status, sqlfunc.count().label("cnt"))
        .where(PulledJob.user_profile_id == profile_id)
        .group_by(PulledJob.status)
    )
    counts_res = await db.execute(counts_q)
    status_map: dict[str, int] = {row.status: row.cnt for row in counts_res}

    sources_q = (
        select(PulledJob.source)
        .where(PulledJob.user_profile_id == profile_id)
        .distinct()
    )
    sources_res = await db.execute(sources_q)
    sources = [r[0] for r in sources_res if r[0]]

    return {
        "total"     : sum(status_map.values()),
        "new"       : status_map.get("new", 0),
        "saved"     : status_map.get("saved", 0),
        "applied"   : status_map.get("applied", 0),
        "favourite" : status_map.get("favourite", 0),
        "hidden"    : status_map.get("hidden", 0),
        "sources"   : sources,
    }
