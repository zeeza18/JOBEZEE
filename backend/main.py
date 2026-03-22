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


# ── 3-hour auto-search background loop ───────────────────────────────────────

async def _auto_search_loop() -> None:
    """Trigger Phase 1 search for every user with roles set — every 1 hour."""
    _log = logging.getLogger(__name__ + ".autosearch")
    _log.info("[AutoSearch] loop started — first run in 5 minutes")
    await asyncio.sleep(5 * 60)   # short delay so DB is ready before first run
    while True:
        _log.info("[AutoSearch] running 1-hour search cycle")
        try:
            from .database import AsyncSessionLocal
            from .models import SearchSession, UserProfile
            from .services.phase1_service import _RUNNING_PROFILES, run_phase1_search
            from sqlalchemy import select, update as sa_update
            from datetime import datetime, timezone, timedelta

            async with AsyncSessionLocal() as db:
                # Kill zombie sessions older than 30 min so they don't block cron
                zombie_cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
                await db.execute(
                    sa_update(SearchSession)
                    .where(SearchSession.status == "running")
                    .where(SearchSession.started_at < zombie_cutoff)
                    .values(status="done", finished_at=datetime.now(timezone.utc))
                )
                await db.commit()

                # Find all users who have at least one desired role
                res = await db.execute(select(UserProfile))
                profiles = res.scalars().all()
                count = 0
                for profile in profiles:
                    if not getattr(profile, "desired_roles", None):
                        continue
                    if str(profile.id) in _RUNNING_PROFILES:
                        _log.info("[AutoSearch] skipping user=%s — already running", profile.id)
                        continue
                    # Check no running session in DB either
                    running = await db.execute(
                        select(SearchSession)
                        .where(SearchSession.user_id == str(profile.id))
                        .where(SearchSession.status == "running")
                    )
                    if running.scalar_one_or_none():
                        continue
                    sid = str(_uuid.uuid4())[:8].upper()
                    db.add(SearchSession(id=sid, status="running", user_id=str(profile.id)))
                    await db.commit()
                    asyncio.create_task(run_phase1_search(profile, sid, include_workday=False))
                    count += 1
                    _log.info("[AutoSearch] triggered session=%s user=%s roles=%s",
                              sid, profile.id, getattr(profile, "desired_roles", []))
            _log.info("[AutoSearch] cycle complete — %d searches triggered", count)
        except Exception as exc:
            _log.exception("[AutoSearch] error: %s", exc)
        await asyncio.sleep(60 * 60)   # 1 hour between cycles


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
            from .models import PulledJob
            from .routers.applied_jobs import _imap_search, _detect_status_from_text, _gpt_detect_status
            from sqlalchemy import select

            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(PulledJob).where(PulledJob.status == "applied").limit(100)
                )
                jobs = res.scalars().all()

                loop = asyncio.get_event_loop()
                updates = 0
                for job in jobs:
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
                    if new_status and new_status != job.status:
                        job.status = new_status
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
    yield
    _bg_task.cancel()
    _email_task.cancel()
    try:
        await asyncio.gather(_bg_task, _email_task, return_exceptions=True)
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
