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
from .routers import analytics, logs

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

_cfg = get_settings()

# ── Ensure upload directory exists at import time (before StaticFiles mount) ──
os.makedirs(os.path.join(_cfg.UPLOAD_DIR, "resumes"), exist_ok=True)


# ── Shared: send job digest emails to users with new jobs ────────────────────
# Per-user cooldown — max 1 email per user per 5 hours.
# Stored in-memory (resets on restart, but 5-hour initial delay compensates).
_LAST_EMAIL_SENT: dict[str, "datetime"] = {}
_EMAIL_COOLDOWN_HOURS = 5

async def _send_job_digests() -> None:
    """
    Send one digest email per user, at most every 5 hours.
    The email shows ALL new jobs since the last time we emailed that user
    (or the last 5 hours if this is the first email after a restart).
    """
    _log = logging.getLogger(__name__ + ".digestemail")
    try:
        from .database import AsyncSessionLocal
        from .models import User, UserProfile, UserJobState, JobListing
        from .services.email_service import send_new_jobs_email
        from .config import get_settings
        from sqlalchemy import select, cast, String as _SAStr
        from datetime import datetime, timezone, timedelta

        _cfg2 = get_settings()
        now = datetime.now(timezone.utc)
        cooldown = timedelta(hours=_EMAIL_COOLDOWN_HOURS)

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

                # ── Per-user 5-hour cooldown ───────────────────────────────
                last_sent = _LAST_EMAIL_SENT.get(email)
                if last_sent and (now - last_sent) < cooldown:
                    remaining = int((cooldown - (now - last_sent)).total_seconds() / 60)
                    _log.debug("[DigestEmail] skip %s — cooldown, %d min left", email, remaining)
                    continue

                # Show jobs added since last email (or last 5 hours if first run)
                cutoff = last_sent if last_sent else (now - cooldown)

                jobs_res = await db.execute(
                    select(JobListing)
                    .join(UserJobState, UserJobState.job_id == JobListing.id)
                    .where(UserJobState.user_id == str(profile.id))
                    .where(UserJobState.created_at >= cutoff)
                    .order_by(UserJobState.created_at.desc())
                    .limit(50)
                )
                new_jobs = jobs_res.scalars().all()
                if not new_jobs:
                    continue

                name = (getattr(profile, "full_name", "") or "").strip()
                if not name and user:
                    name = (getattr(user, "full_name", "") or "").strip()

                try:
                    await send_new_jobs_email(
                        to_email    = email,
                        name        = name or email,
                        jobs        = new_jobs,
                        total_count = len(new_jobs),
                        app_url     = f"{_cfg2.FRONTEND_URL}/app/search",
                    )
                    _LAST_EMAIL_SENT[email] = now
                    _log.info("[DigestEmail] sent → %s (%d jobs since %s)",
                              email, len(new_jobs), str(cutoff)[:16])
                except Exception as _exc:
                    _log.warning("[DigestEmail] failed for %s: %s", email, _exc)
    except Exception as exc:
        _log.exception("[DigestEmail] error in _send_job_digests: %s", exc)


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


# ── 5-hour job digest email loop ─────────────────────────────────────────────

async def _digest_email_loop() -> None:
    """
    Digest loop: fires every 5 hours.  Per-user 5-hour cooldown in
    _send_job_digests() ensures each user gets at most 1 email per 5 hours
    showing ALL new jobs since their last digest.
    """
    _log = logging.getLogger(__name__ + ".digestemail")
    _log.info("[DigestEmail] loop started — first digest in 5 hours")
    await asyncio.sleep(5 * 60 * 60)   # initial 5-hour delay
    while True:
        _log.info("[DigestEmail] running 5-hour digest")
        await _send_job_digests()
        await asyncio.sleep(5 * 60 * 60)   # every 5 hours


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
        from applypilot.config import load_env, ensure_dirs
        from applypilot.apply.chrome import ensure_global_chrome
        load_env()
        ensure_dirs()
        ensure_global_chrome(headless=True)
        _log.info("[Chrome] Global browser window started on port 9222")
    except Exception as exc:
        _log.warning("[Chrome] Could not start global browser at startup: %s", exc)


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
    yield
    _bg_task.cancel()
    _email_task.cancel()
    _digest_task.cancel()
    _tailor_cleanup_task.cancel()
    try:
        await asyncio.gather(_bg_task, _email_task, _digest_task, _tailor_cleanup_task, return_exceptions=True)
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
