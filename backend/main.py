"""
JOBEZEE API — FastAPI entry point.

Start (from JOBEZEE/ directory):
    python -m backend.run

Or directly:
    uvicorn backend.main:app --reload --port 8000

Docs: http://localhost:8000/docs
"""
from __future__ import annotations

import asyncio
import logging
import os
import traceback
import uuid as _uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import create_tables, run_column_migrations, run_schema_migration
from .routers import auth, jobs, portfolio, profile, search, tailor
from .routers import apply_auto, applied_jobs, dashboard, auth_linkedin
from .routers import analytics, logs, internal
from .routers import billing
from .routers import resume_analysis
from .routers import linkedin_boost

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

_cfg = get_settings()

# ── Ensure upload directory exists at import time (before StaticFiles mount) ──
os.makedirs(os.path.join(_cfg.UPLOAD_DIR, "resumes"), exist_ok=True)


# ── Shared: send job digest emails to users with new jobs ────────────────────
# Interval is driven by DIGEST_INTERVAL_MINUTES env var (default 300 = 5 hours).
# Per-user cooldown stored in DB (user_profiles.last_digest_at) so it survives
# server restarts / deploys.

async def _send_job_digests() -> None:
    """
    Send one digest email per user, at most once per DIGEST_INTERVAL_MINUTES.
    Queries user_job_states + job_listings (the live tables) for new jobs since
    the user's last digest, so every job pulled from any source is included.
    """
    _log = logging.getLogger(__name__ + ".digestemail")
    try:
        from .database import AsyncSessionLocal
        from .models import User, UserProfile, UserJobState, JobListing
        from .config import get_settings
        from sqlalchemy import select, cast, String as _SAStr
        from datetime import datetime, timezone, timedelta

        _cfg2 = get_settings()
        interval_minutes = _cfg2.DIGEST_INTERVAL_MINUTES
        now = datetime.now(timezone.utc)
        cooldown = timedelta(minutes=interval_minutes)

        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(UserProfile, User)
                .join(User, User.id == cast(UserProfile.id, _SAStr), isouter=True)
            )
            rows = res.all()

            for profile, user in rows:
                if not getattr(profile, "desired_roles", None):
                    continue
                email = (getattr(profile, "email", "") or "").strip()
                if not email and user:
                    email = (getattr(user, "email", "") or "").strip()
                if not email:
                    continue

                # ── Per-user cooldown from DB ─────────────────────────────
                last_sent = getattr(profile, "last_digest_at", None)
                if last_sent and last_sent.tzinfo is None:
                    last_sent = last_sent.replace(tzinfo=timezone.utc)
                if last_sent and (now - last_sent) < cooldown:
                    remaining = int((cooldown - (now - last_sent)).total_seconds() / 60)
                    _log.debug("[DigestEmail] skip %s — cooldown, %d min left", email, remaining)
                    continue

                # Show jobs added since last email; if first ever, use one interval back
                cutoff = last_sent if last_sent else (now - cooldown)

                # Query live tables with the same preference filters as GET /api/jobs
                from sqlalchemy import func as _sqlfunc, or_ as _or_, and_ as _and_
                _q = (
                    select(JobListing)
                    .join(UserJobState, UserJobState.job_id == JobListing.id)
                    .where(UserJobState.user_id == str(profile.id))
                    .where(UserJobState.created_at >= cutoff)
                    .order_by(UserJobState.created_at.desc())
                    .limit(50)
                )

                # ── Job-type filter ──────────────────────────────────────────
                _preferred_types: list[str] = list(getattr(profile, "job_types", None) or []) or (
                    [profile.job_type] if getattr(profile, "job_type", None) else []
                )
                if _preferred_types:
                    _type_conds = []
                    for _jt in _preferred_types:
                        _jt = _jt.lower()
                        if _jt == "internship":
                            _type_conds.append(_or_(
                                _sqlfunc.lower(JobListing.title).contains("intern"),
                                _sqlfunc.lower(JobListing.description).contains("internship"),
                                _sqlfunc.lower(JobListing.description).contains("intern program"),
                            ))
                        elif _jt == "part_time":
                            _type_conds.append(_or_(
                                _sqlfunc.lower(JobListing.title).contains("part-time"),
                                _sqlfunc.lower(JobListing.title).contains("part time"),
                                _sqlfunc.lower(JobListing.description).contains("part-time"),
                                _sqlfunc.lower(JobListing.description).contains("part time"),
                            ))
                        elif _jt == "contract":
                            _type_conds.append(_or_(
                                _sqlfunc.lower(JobListing.title).contains("contract"),
                                _sqlfunc.lower(JobListing.description).contains("contractor"),
                                _sqlfunc.lower(JobListing.description).contains("contract position"),
                            ))
                        elif _jt == "full_time":
                            pass  # no restriction
                    if _type_conds:
                        _q = _q.where(_or_(*_type_conds))

                # ── Experience-level filter ──────────────────────────────────
                _exp_list: list[str] = list(getattr(profile, "experience_levels", None) or []) or (
                    [profile.experience_level] if getattr(profile, "experience_level", None) else []
                )
                _exp_lvl = _exp_list[0].lower().strip() if _exp_list else ""
                _EXP_YEARS = {"intern": (0,1), "junior": (0,3), "mid": (2,6), "senior": (5,20)}
                _yr = _EXP_YEARS.get(_exp_lvl)
                if _yr:
                    _lo, _hi = _yr
                    if _exp_lvl == "intern":
                        # Title must have intern keyword (exp_years_min is unreliable)
                        _q = _q.where(_or_(
                            _sqlfunc.lower(JobListing.title).contains("intern"),
                            _sqlfunc.lower(JobListing.title).contains("co-op"),
                            _sqlfunc.lower(JobListing.title).contains("apprentice"),
                        ))
                    else:
                        _q = _q.where(_or_(
                            JobListing.exp_years_min.is_(None),
                            _and_(JobListing.exp_years_min >= _lo, JobListing.exp_years_min <= _hi),
                        ))

                jobs_res = await db.execute(_q)
                new_jobs = jobs_res.scalars().all()
                if not new_jobs:
                    _log.debug("[DigestEmail] skip %s — no new jobs since %s", email, str(cutoff)[:16])
                    continue

                name = (getattr(profile, "full_name", "") or "").strip()
                if not name and user:
                    name = (getattr(user, "full_name", "") or "").strip()

                try:
                    # Delegate SMTP to Render (avoids Hetzner port-587 block)
                    await _send_digest_via_render(
                        cfg      = _cfg2,
                        to_email = email,
                        name     = name or email,
                        jobs     = new_jobs,
                    )
                    # Persist timestamp to DB so restarts don't reset cooldown
                    profile.last_digest_at = now
                    await db.commit()
                    _log.info("[DigestEmail] sent → %s (%d jobs since %s)",
                              email, len(new_jobs), str(cutoff)[:16])
                except Exception as _exc:
                    _log.warning("[DigestEmail] failed for %s: %s", email, _exc)
    except Exception as exc:
        _log.exception("[DigestEmail] error in _send_job_digests: %s", exc)


async def _send_digest_via_render(cfg, to_email: str, name: str, jobs: list) -> None:
    """
    POST job digest data to Render's /api/internal/send-digest so Render
    handles SMTP (avoids Hetzner outbound port-587 block).
    Falls back to direct SMTP if API_BASE_URL or WORKER_SECRET is not set.
    """
    import httpx

    if cfg.API_BASE_URL and cfg.WORKER_SECRET:
        payload = {
            "to_email"   : to_email,
            "name"       : name,
            "total_count": len(jobs),
            "jobs"       : [
                {
                    "title"      : j.title or "",
                    "company"    : j.company or "",
                    "location"   : j.location or "",
                    "job_type"   : j.job_type or "",
                    "salary_text": j.salary_text or "",
                    "site"       : j.site or "",
                    "source"     : j.source or "",
                    "url"        : j.url or "",
                }
                for j in jobs
            ],
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{cfg.API_BASE_URL}/api/internal/send-digest",
                json=payload,
                headers={"Authorization": f"Bearer {cfg.WORKER_SECRET}"},
            )
            r.raise_for_status()
    else:
        # Fallback: direct SMTP (works if not on Hetzner or port is open)
        from .services.email_service import send_new_jobs_email
        await send_new_jobs_email(
            to_email    = to_email,
            name        = name,
            jobs        = jobs,
            total_count = len(jobs),
            app_url     = f"{cfg.FRONTEND_URL}/app/pulled-jobs",
        )


# ── Hourly auto-search background loop ───────────────────────────────────────

async def _auto_search_loop() -> None:
    """
    Background cron: runs each user's search sequentially so the 2-worker
    scraper pool is never saturated.  One session per user; run_phase1_search
    handles all their roles in one pass.  Sends a digest when the full cycle
    completes.
    """
    _log = logging.getLogger(__name__ + ".autosearch")
    _log.info("[AutoSearch] loop started — first run in 1 minute")
    await asyncio.sleep(60)
    while True:
        _log.info("[AutoSearch] running search cycle")
        cycle_found = 0
        try:
            from .database import AsyncSessionLocal
            from .models import SearchSession, UserProfile
            from .services.phase1_service import _RUNNING_PROFILES, run_phase1_search
            from sqlalchemy import select, update as sa_update
            from datetime import datetime, timezone, timedelta

            async with AsyncSessionLocal() as db:
                # Kill zombie sessions (any running session older than 35 min)
                zombie_cutoff = datetime.now(timezone.utc) - timedelta(minutes=35)
                await db.execute(
                    sa_update(SearchSession)
                    .where(SearchSession.status == "running")
                    .where(SearchSession.started_at < zombie_cutoff)
                    .values(status="done", finished_at=datetime.now(timezone.utc))
                )
                await db.commit()

                res      = await db.execute(select(UserProfile))
                profiles = res.scalars().all()

            # Collect unique users with at least one role
            seen_users: set[str] = set()
            active_profiles = []
            for profile in profiles:
                uid = str(profile.id)
                if uid not in seen_users and (getattr(profile, "desired_roles", None) or []):
                    seen_users.add(uid)
                    active_profiles.append(profile)

            _log.info("[AutoSearch] %d users with active roles to process", len(active_profiles))

            # ── Process users SEQUENTIALLY so each user gets the full pool ────
            # With 2 SCRAPER_WORKERS, running all users concurrently caused the
            # second role per user to time out waiting for a free worker.
            # Sequential processing: user N's pool slot is free before user N+1
            # submits, so no queue wait and every title completes cleanly.
            for profile in active_profiles:
                uid = str(profile.id)
                if uid in _RUNNING_PROFILES:
                    _log.info("[AutoSearch] user=%s already running — skip", uid)
                    continue
                sid = str(_uuid.uuid4())[:8].upper()
                async with AsyncSessionLocal() as db:
                    db.add(SearchSession(id=sid, status="running", user_id=uid))
                    await db.commit()
                _log.info("[AutoSearch] session=%s user=%s roles=%s — starting",
                          sid, uid, getattr(profile, "desired_roles", []))
                profile.hours_old = 24  # incremental window: only jobs from last 24h
                await run_phase1_search(profile, sid, include_workday=True)
                # Read back how many jobs this session found
                async with AsyncSessionLocal() as db:
                    from sqlalchemy import select as _sel
                    r = await db.execute(_sel(SearchSession).where(SearchSession.id == sid))
                    s = r.scalar_one_or_none()
                    found = s.jobs_found if s else 0
                cycle_found += found
                _log.info("[AutoSearch] session=%s done — jobs_found=%d cycle_total=%d",
                          sid, found, cycle_found)

            _log.info("[AutoSearch] cycle complete — cycle_found=%d", cycle_found)

        except Exception as exc:
            _log.exception("[AutoSearch] error: %s", exc)

        await asyncio.sleep(60 * 60)  # next cycle in 1 hour


# ── Job digest email loop (interval from DIGEST_INTERVAL_MINUTES env var) ────

async def _digest_email_loop() -> None:
    """
    Digest loop: fires every DIGEST_INTERVAL_MINUTES minutes (default 300 = 5h).
    Set DIGEST_INTERVAL_MINUTES=5 in .env for a dry-run test.
    """
    from .config import get_settings as _gs
    _interval_sec = _gs().DIGEST_INTERVAL_MINUTES * 60
    _log = logging.getLogger(__name__ + ".digestemail")
    _log.info("[DigestEmail] loop started — interval=%d min, first run in %d min",
              _gs().DIGEST_INTERVAL_MINUTES, _gs().DIGEST_INTERVAL_MINUTES)
    await asyncio.sleep(_interval_sec)   # initial delay = one interval
    while True:
        _log.info("[DigestEmail] running digest (interval=%d min)", _gs().DIGEST_INTERVAL_MINUTES)
        await _send_job_digests()
        await asyncio.sleep(_interval_sec)


# ── 30-minute auto email scan background loop ─────────────────────────────────

async def _auto_email_scan_loop() -> None:
    """Scan Gmail for all users with applied jobs every 30 minutes and auto-update statuses."""
    _log = logging.getLogger(__name__ + ".emailscan")
    _log.info("[EmailScan] loop started — first run in 5 minutes")
    await asyncio.sleep(5 * 60)   # wait 5 min before first run (let DB initialize)
    while True:
        _log.info("[EmailScan] running 30-min email scan cycle")
        try:
            from .database import AsyncSessionLocal
            from .models import UserProfile
            from .routers.applied_jobs import (
                _imap_search, _detect_status_from_text, _gpt_detect_status,
                sync_linkedin_emails_for_user,
            )
            from sqlalchemy import select

            # Step 1: sync LinkedIn confirmation emails (uses server Gmail config)
            from .config import get_settings as _cfg
            if _cfg().GMAIL_USER and _cfg().GMAIL_APP_PASSWORD:
                async with AsyncSessionLocal() as db:
                    res = await db.execute(select(UserProfile.id).limit(50))
                    user_ids = [str(row[0]) for row in res.all()]

                for uid in user_ids:
                    try:
                        added = await sync_linkedin_emails_for_user(uid)
                        if added:
                            _log.info("[EmailScan] synced %d new LinkedIn apps for user %s", added, uid)
                    except Exception as ue:
                        _log.error("[EmailScan] LinkedIn sync error for user %s: %s", uid, ue)

            # Step 2: update statuses of applied jobs via keyword/GPT scan
            from .models import UserJobState, JobListing
            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(UserJobState, JobListing)
                    .join(JobListing, JobListing.id == UserJobState.job_id)
                    .where(UserJobState.status == "applied")
                    .limit(100)
                )
                rows = res.all()

                loop = asyncio.get_event_loop()
                updates = 0
                for state, job in rows:
                    query = f"{job.company} {job.title}" if job.company else (job.title or "")
                    if not query.strip():
                        continue
                    combined_text = await loop.run_in_executor(
                        None, lambda q=query: _imap_search(q, 3)
                    )
                    if not combined_text.strip():
                        continue
                    new_status = _detect_status_from_text(combined_text)
                    if not new_status:
                        new_status = await _gpt_detect_status(combined_text)
                    if new_status and new_status != state.status:
                        state.status = new_status
                        updates += 1

                if updates:
                    await db.commit()
            _log.info("[EmailScan] cycle complete — %d status updates", updates)
        except Exception as exc:
            _log.error("[EmailScan] error: %s", exc)
        await asyncio.sleep(30 * 60)


# ── Lifespan ──────────────────────────────────────────────────────────────────

def _start_global_chrome() -> None:
    """Launch the persistent Chrome window at startup (background thread)."""
    _log = logging.getLogger(__name__ + ".chrome")
    try:
        import sys
        from pathlib import Path as _P
        _root = _P(__file__).resolve().parent.parent
        if str(_root) not in sys.path:
            sys.path.insert(0, str(_root))
            _apply = _root / "apply"
            if str(_apply) not in sys.path:
                sys.path.insert(0, str(_apply))
        from applypilot.config import load_env, ensure_dirs
        from applypilot.apply.chrome import ensure_global_chrome
        load_env()
        ensure_dirs()
        ensure_global_chrome(headless=True)
        _log.info("[Chrome] Global browser window started on port 9222")
    except Exception as exc:
        _log.warning("[Chrome] Could not start global browser at startup: %s", exc)


async def _tailor_watchdog_loop() -> None:
    """
    Re-dispatch tailor jobs that are stuck in queued/running state.

    Runs every 5 min. If a job has been queued/running for >8 min and still has
    a dispatch_payload, it re-POSTs to the worker. Gives up after 3 attempts
    (the 35-min startup cleanup will then mark it error).
    """
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import select as _sel, update as _upd
    from .database import AsyncSessionLocal
    from .models import TailorJobRecord
    import httpx as _httpx
    import os as _os

    _log = logging.getLogger(__name__ + ".tailor_watchdog")
    await asyncio.sleep(120)  # let the server warm up first

    while True:
        await asyncio.sleep(300)  # check every 5 min
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=8)
            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    _sel(TailorJobRecord).where(
                        TailorJobRecord.status.in_(["queued", "running"]),
                        TailorJobRecord.created_at < cutoff,
                        TailorJobRecord.dispatch_payload.isnot(None),
                        TailorJobRecord.dispatch_count < 3,
                    )
                )
                stuck_jobs = res.scalars().all()

            if not stuck_jobs:
                continue

            _log.warning("[TailorWatchdog] %d stuck job(s) detected — re-dispatching", len(stuck_jobs))

            worker_url = _os.getenv("BOT_WORKER_URL", "").rstrip("/")
            worker_secret = _os.getenv("WORKER_SECRET", "")
            api_base = _os.getenv("API_BASE_URL", "https://www.jobezee.org")
            if not worker_url:
                _log.warning("[TailorWatchdog] BOT_WORKER_URL not set — cannot re-dispatch")
                continue

            for job in stuck_jobs:
                try:
                    payload = dict(job.dispatch_payload)
                    payload["job_id"] = job.id
                    payload["callback_url"] = f"{api_base}/api/tailor/internal/callback"

                    async with _httpx.AsyncClient(timeout=30) as client:
                        r = await client.post(
                            f"{worker_url}/run-tailor",
                            json=payload,
                            headers={"Authorization": f"Bearer {worker_secret}"},
                        )
                    _log.info("[TailorWatchdog] Re-dispatched %s → %d", job.id, r.status_code)

                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            _upd(TailorJobRecord)
                            .where(TailorJobRecord.id == job.id)
                            .values(
                                status="running",
                                dispatch_count=TailorJobRecord.dispatch_count + 1,
                            )
                        )
                        await db.commit()
                except Exception as exc:
                    _log.error("[TailorWatchdog] Failed to re-dispatch %s: %s", job.id, exc)

        except Exception as exc:
            _log.error("[TailorWatchdog] Loop error: %s", exc)


async def _tailor_cleanup_loop() -> None:
    """Delete expired tailor job records and their output files — runs every hour."""
    import shutil as _shutil
    from datetime import datetime, timezone
    from sqlalchemy import select as _sel, delete as _del
    from .database import AsyncSessionLocal
    from .models import TailorJobRecord
    from .services.tailor_service import _JOB_OUTPUTS

    _log = logging.getLogger(__name__ + ".tailor_cleanup")
    await asyncio.sleep(60)
    while True:
        try:
            now = datetime.now(timezone.utc)
            async with AsyncSessionLocal() as db:
                expired_res = await db.execute(
                    _sel(TailorJobRecord.id).where(TailorJobRecord.expires_at <= now)
                )
                expired_ids = [row[0] for row in expired_res]
                if expired_ids:
                    for jid in expired_ids:
                        job_dir = _JOB_OUTPUTS / jid
                        if job_dir.exists():
                            try: _shutil.rmtree(job_dir)
                            except Exception: pass
                    await db.execute(_del(TailorJobRecord).where(TailorJobRecord.expires_at <= now))
                    await db.commit()
                    _log.info("[TailorCleanup] Removed %d expired tailor jobs", len(expired_ids))
        except Exception as exc:
            _log.error("[TailorCleanup] Error: %s", exc)
        await asyncio.sleep(3600)


async def _run_startup_db() -> None:
    """
    All DB startup work runs in the background.

    Uvicorn runs the lifespan BEFORE it binds the port, so ANY await here
    delays port binding and triggers Render's 'no open ports' timeout.
    Tables and columns already exist in production — these are all idempotent.
    """
    import os as _os
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import text as _text, update as _upd
    from .database import AsyncSessionLocal
    from .models import TailorJobRecord

    _log = logging.getLogger(__name__ + ".startup")
    try:
        await create_tables()
        _log.info("[Startup] create_tables done")
        await run_column_migrations()
        _log.info("[Startup] column migrations done")
        await run_schema_migration()
        _log.info("[Startup] schema migration done")
    except Exception as exc:
        _log.error("[Startup] DB startup failed (non-fatal): %s", exc)

    # ── Mark stuck tailor jobs as error ───────────────────────────────────────
    # Any job that's been running/queued for > 35 min is assumed dead
    # (Hetzner worker killed it or Render restarted mid-run).
    # This unblocks the frontend SSE which would otherwise wait forever.
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=35)
        async with AsyncSessionLocal() as _db:
            result = await _db.execute(
                _upd(TailorJobRecord)
                .where(
                    TailorJobRecord.status.in_(["running", "queued"]),
                    TailorJobRecord.created_at < cutoff,
                )
                .values(status="error", error_msg="Worker restarted — please try tailoring again")
                .returning(TailorJobRecord.id)
            )
            stuck = result.fetchall()
            await _db.commit()
            if stuck:
                _log.warning("[Startup] Marked %d stuck tailor jobs as error: %s",
                             len(stuck), [r[0] for r in stuck])
    except Exception as exc:
        _log.warning("[Startup] Stuck-job cleanup failed (non-fatal): %s", exc)

    # ── Rescore any unscored jobs (e.g. from failed fan-out batches) ──────────
    try:
        from sqlalchemy import select as _sel, update as _upd2, func as _func
        from .models import UserProfile, UserJobState, JobListing
        from .services.scorer_service import score_job_for_user
        from datetime import datetime, timezone

        async with AsyncSessionLocal() as _db:
            # Find users with resume_extraction that have unscored jobs
            profiles = (await _db.execute(
                _sel(UserProfile).where(UserProfile.resume_extraction.isnot(None))
            )).scalars().all()

            total_rescored = 0
            for p in profiles:
                uid = str(p.id)
                unscored_states = (await _db.execute(
                    _sel(UserJobState)
                    .where(UserJobState.user_id == uid, UserJobState.match_score.is_(None))
                    .limit(500)
                )).scalars().all()

                if not unscored_states:
                    continue

                job_ids = [s.job_id for s in unscored_states]
                jobs = {j.id: j for j in (await _db.execute(
                    _sel(JobListing).where(JobListing.id.in_(job_ids))
                )).scalars().all()}

                now = datetime.now(timezone.utc)
                for state in unscored_states:
                    job = jobs.get(state.job_id)
                    if not job:
                        continue
                    try:
                        score, matched, missing = score_job_for_user(
                            job.title or "", job.description or "",
                            list(job.llm_skills) if job.llm_skills else None,
                            job.llm_years_min, p.resume_extraction,
                        )
                        await _db.execute(
                            _upd2(UserJobState).where(UserJobState.id == state.id)
                            .values(match_score=score, matched_skills=matched,
                                    missing_skills=missing, scored_at=now)
                        )
                        total_rescored += 1
                    except Exception:
                        pass

                await _db.commit()

            if total_rescored:
                _log.info("[Startup] Auto-rescored %d unscored job-user pairs", total_rescored)
    except Exception as exc:
        _log.warning("[Startup] Auto-rescore failed (non-fatal): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nothing blocking here — port binds immediately, health check passes fast.
    # All DB work (create_tables + migrations) runs in background.
    asyncio.create_task(_run_startup_db())

    # Start the persistent Chrome window so it's ready before the first apply
    import threading as _threading
    _threading.Thread(target=_start_global_chrome, daemon=True, name="chrome-startup").start()

    _bg_task = asyncio.create_task(_auto_search_loop())
    _email_task = asyncio.create_task(_auto_email_scan_loop())
    _digest_task = asyncio.create_task(_digest_email_loop())
    _tailor_cleanup_task = asyncio.create_task(_tailor_cleanup_loop())
    _tailor_watchdog_task = asyncio.create_task(_tailor_watchdog_loop())
    yield
    _bg_task.cancel()
    _email_task.cancel()
    _digest_task.cancel()
    _tailor_cleanup_task.cancel()
    _tailor_watchdog_task.cancel()
    try:
        await asyncio.gather(_bg_task, _email_task, _digest_task, _tailor_cleanup_task, _tailor_watchdog_task, return_exceptions=True)
    except asyncio.CancelledError:
        pass


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "JOBEZEE API",
    description = "AI-powered job-search co-pilot — backend",
    version     = "1.0.0",
    lifespan    = lifespan,
    docs_url    = "/docs"   if _cfg.DEBUG else None,
    redoc_url   = "/redoc"  if _cfg.DEBUG else None,
    debug       = _cfg.DEBUG,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins     = _cfg.cors_origins_list,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router,         prefix="/api/auth",    tags=["auth"])
app.include_router(auth_linkedin.router, prefix="/api/auth",   tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(jobs.router,    prefix="/api/jobs",    tags=["jobs"])
app.include_router(search.router,  prefix="/api/search",  tags=["search"])
app.include_router(tailor.router,     prefix="/api/tailor",     tags=["tailor"])
app.include_router(portfolio.router,  prefix="/api/portfolio",  tags=["portfolio"])
app.include_router(apply_auto.router, prefix="/api/apply",       tags=["apply"])
app.include_router(applied_jobs.router, prefix="/api/applied-jobs", tags=["applied-jobs"])
app.include_router(dashboard.router,    prefix="/api/dashboard",    tags=["dashboard"])
app.include_router(analytics.router,    prefix="/api/analytics",    tags=["analytics"])
app.include_router(logs.router,         prefix="/api/logs",         tags=["logs"])
app.include_router(internal.router,     prefix="/api/internal",     tags=["internal"])
app.include_router(billing.router,      tags=["billing"])
app.include_router(resume_analysis.router, tags=["resume-analysis"])
app.include_router(linkedin_boost.router,  tags=["linkedin-boost"])

# ── Static files (uploaded resumes) ──────────────────────────────────────────

app.mount("/uploads", StaticFiles(directory=_cfg.UPLOAD_DIR), name="uploads")

# ── Global exception handler (shows real error in dev) ────────────────────────

@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    tb = traceback.format_exc()
    logging.error("Unhandled exception on %s %s\n%s", request.method, request.url, tb)

    # Persist to error_logs table (fire-and-forget)
    try:
        from .routers.logs import write_error_log
        asyncio.create_task(write_error_log(
            source="unhandled_exception",
            message=str(exc),
            traceback_str=tb,
            request_path=str(request.url.path),
            request_method=request.method,
        ))
    except Exception:
        pass

    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb} if _cfg.DEBUG else {"detail": "Internal server error"},
    )


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "service": "JOBEZEE API", "version": "1.0.0"}
