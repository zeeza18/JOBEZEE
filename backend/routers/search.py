"""
/api/search — Trigger Phase 1 discovery, poll session status.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from ..auth import get_current_user
from ..database import get_db
from ..models import SearchSession, User, UserProfile
from ..schemas import SearchStatusResponse, SearchTriggerRequest, SearchTriggerResponse
from ..services.phase1_service import run_phase1_search

router = APIRouter()
log = logging.getLogger(__name__)


def _merge_profile(profile: UserProfile, override: SearchTriggerRequest) -> UserProfile:
    """Return a lightweight profile clone with overrides applied (no DB writes)."""
    class P:  # simple struct for Phase1
        pass
    p = P()
    # Preserve ID for saving pulled jobs
    p.id = profile.id
    p.desired_roles       = override.roles            or profile.desired_roles
    p.preferred_locations = override.locations        or profile.preferred_locations
    p.preferred_countries = override.countries        or profile.preferred_countries
    p.preferred_regions   = override.regions          or profile.preferred_regions
    p.remote_preference   = override.remote_pref      or profile.remote_preference
    p.job_type            = override.job_type         or profile.job_type
    p.experience_level    = override.experience       or profile.experience_level
    p.industries          = profile.industries
    p.salary_min          = override.salary_min       if override.salary_min is not None else profile.salary_min
    p.salary_currency     = profile.salary_currency
    p.hours_old           = override.hours_old        if override.hours_old is not None else profile.hours_old
    p.results_per_site    = override.results_per_site if override.results_per_site is not None else profile.results_per_site
    return p


@router.post("/trigger", response_model=SearchTriggerResponse, status_code=202)
async def trigger_search(
    background_tasks : BackgroundTasks,
    current_user     : User          = Depends(get_current_user),
    db               : AsyncSession  = Depends(get_db),
    filters          : SearchTriggerRequest = SearchTriggerRequest(),
) -> SearchTriggerResponse:
    log.info("[SearchTrigger] user=%s payload=%s", current_user.email, filters.model_dump())
    try:
        profile_id = uuid.UUID(current_user.id)
    except ValueError as exc:
        log.error("[SearchTrigger] bad user id=%s: %s", current_user.id, exc)
        raise HTTPException(500, f"Invalid user ID format: {current_user.id}")

    try:
        result = await db.execute(select(UserProfile).where(UserProfile.id == profile_id))
        profile = result.scalar_one_or_none()
    except Exception as exc:
        log.exception("[SearchTrigger] DB error looking up profile for user=%s", current_user.id)
        raise HTTPException(500, f"Database error fetching profile: {exc}")

    if not profile:
        # Auto-create a blank profile so the user gets a useful 400 (no roles)
        # rather than a confusing 404
        log.info("[SearchTrigger] no profile for user=%s — auto-creating blank", current_user.id)
        profile = UserProfile(
            id        = profile_id,
            full_name = current_user.full_name,
            email     = current_user.email,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    # Merge any overrides provided in the request
    merged = _merge_profile(profile, filters)
    if not merged.desired_roles:
        raise HTTPException(400, "Add at least one desired job role in Profile → Job Preferences or include roles in the request.")

    # Block duplicate search — but auto-expire zombies older than 30 min
    from sqlalchemy import update as sa_update
    from datetime import datetime, timezone, timedelta
    zombie_cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    await db.execute(
        sa_update(SearchSession)
        .where(SearchSession.user_id == current_user.id)
        .where(SearchSession.status == "running")
        .where(SearchSession.started_at < zombie_cutoff)
        .values(status="done", finished_at=datetime.now(timezone.utc))
    )
    await db.commit()

    running_check = await db.execute(
        select(SearchSession)
        .where(SearchSession.user_id == current_user.id)
        .where(SearchSession.status == "running")
    )
    running_session = running_check.scalars().first()
    if running_session:
        raise HTTPException(409, detail={"message": "A search is already running.", "session_id": running_session.id})

    session_id = str(uuid.uuid4())[:8].upper()

    try:
        session = SearchSession(id=session_id, status="running", user_id=current_user.id)
        db.add(session)
        await db.commit()
    except Exception as exc:
        log.exception("[SearchTrigger] DB error creating session=%s", session_id)
        raise HTTPException(500, f"Database error creating search session: {exc}")

    # Kick off Phase 1 in the background
    log.info(
        "[SearchTrigger] session=%s roles=%s locations=%s countries=%s regions=%s remote=%s",
        session_id, merged.desired_roles, merged.preferred_locations, merged.preferred_countries,
        merged.preferred_regions, merged.remote_preference,
    )
    background_tasks.add_task(run_phase1_search, merged, session_id, filters.include_workday, filters.workday_only)

    roles     = merged.desired_roles      or ["software engineer"]
    locations = (
        merged.preferred_locations
        or merged.preferred_countries
        or (["Remote"] if merged.remote_preference in ("remote", "hybrid", "any") else [])
        or ["Remote"]
    )

    return SearchTriggerResponse(
        session_id = session_id,
        jobs_found = 0,
        roles      = roles,
        locations  = locations,
        message    = (
            f"Searching for {', '.join(roles[:3])} "
            f"in {', '.join(locations[:3])} (session {session_id}). "
            "Results appear in 30–60 s."
        ),
    )


@router.get("/status/{session_id}")
async def get_status(
    session_id   : str,
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
) -> SearchStatusResponse:
    try:
        result = await db.execute(
            select(SearchSession).where(SearchSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            log.warning("[SearchStatus] session=%s not found", session_id)
            raise HTTPException(404, "Session not found")
        log.info("[SearchStatus] session=%s status=%s jobs=%s", session_id, session.status, session.jobs_found)
        return SearchStatusResponse(
            session_id  = session.id,
            status      = session.status      or "running",
            jobs_found  = session.jobs_found  or 0,
            error       = (session.error      or "")[:500],   # cap traceback length
            started_at  = session.started_at,
            finished_at = session.finished_at,
        )
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("[SearchStatus] session=%s failed: %s", session_id, exc)
        raise HTTPException(500, f"Could not fetch search status: {exc}")


@router.get("/debug/board-search")
async def debug_board_search(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """
    Debug endpoint — runs board search directly (no subprocess) and returns
    full details: kwargs, raw count, kept count, sample titles, any errors.
    """
    import sys, traceback
    from pathlib import Path

    out: dict = {"steps": [], "error": None}

    try:
        # Step 1: load profile
        from sqlalchemy import select as sa_select
        from ..models import UserProfile
        res = await db.execute(sa_select(UserProfile).where(UserProfile.id == current_user.id))
        profile = res.scalar_one_or_none()
        if not profile:
            return {"error": "profile not found"}

        out["steps"].append(f"profile loaded: roles={profile.desired_roles} locs={profile.preferred_locations} countries={profile.preferred_countries}")

        # Step 2: build prefs
        _root = str(Path(__file__).resolve().parents[3])
        if _root not in sys.path:
            sys.path.insert(0, _root)

        from ..services.phase1_service import build_preferences, _normalise_countries
        prefs = build_preferences(profile)
        kwargs = prefs.to_jobspy_kwargs()
        out["steps"].append(f"prefs built: titles={prefs.job_titles} countries_arg={kwargs.get('countries')} locations={kwargs.get('locations')}")
        out["kwargs"] = {k: v for k, v in kwargs.items()}

        # Step 3: import check
        try:
            from PHASE1_JOB_SEARCH import search_boards, INDEED_COUNTRY_CODES  # type: ignore
            out["steps"].append(f"PHASE1_JOB_SEARCH imported OK")
        except Exception as e:
            out["steps"].append(f"PHASE1_JOB_SEARCH IMPORT FAILED: {e}")
            out["error"] = str(e)
            return out

        # Step 4: validate countries
        countries = kwargs.get("countries") or []
        for c in countries:
            valid = c in INDEED_COUNTRY_CODES
            out["steps"].append(f"country '{c}' valid={valid}")

        # Step 5: run search for first title only (fast test)
        title = prefs.job_titles[0] if prefs.job_titles else "software engineer"
        test_kwargs = {**kwargs, "queries": [title], "results_per_site": 10}
        out["steps"].append(f"running search_boards: {test_kwargs}")

        try:
            raw = search_boards(**test_kwargs)
            out["steps"].append(f"search_boards returned {len(raw)} results")
            out["raw_count"] = len(raw)
            out["sample_titles"] = [(j.title, j.site, j.location) for j in raw[:10]]
        except Exception as e:
            out["steps"].append(f"search_boards EXCEPTION: {e}")
            out["error"] = traceback.format_exc()

    except Exception as e:
        out["error"] = traceback.format_exc()

    return out
