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
from .database import create_tables, run_column_migrations
from .routers import auth, jobs, portfolio, profile, search, tailor

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

_cfg = get_settings()

# ── Ensure upload directory exists at import time (before StaticFiles mount) ──
os.makedirs(os.path.join(_cfg.UPLOAD_DIR, "resumes"), exist_ok=True)


# ── 3-hour auto-search background loop ───────────────────────────────────────

async def _auto_search_loop() -> None:
    """Trigger Phase 1 search for all users with profiles every 3 hours."""
    _log = logging.getLogger(__name__ + ".autosearch")
    _log.info("[AutoSearch] loop started — first run in 3 hours")
    await asyncio.sleep(3 * 60 * 60)   # wait 3 h before the first run
    while True:
        _log.info("[AutoSearch] running 3-hour search cycle")
        try:
            from .database import AsyncSessionLocal
            from .models import SearchSession, UserProfile
            from .services.phase1_service import _RUNNING_PROFILES, run_phase1_search
            from sqlalchemy import select

            async with AsyncSessionLocal() as db:
                res = await db.execute(select(UserProfile))
                profiles = res.scalars().all()
                count = 0
                for profile in profiles:
                    if not getattr(profile, "desired_roles", None):
                        continue
                    if str(profile.id) in _RUNNING_PROFILES:
                        continue
                    sid = str(_uuid.uuid4())[:8].upper()
                    db.add(SearchSession(id=sid, status="running"))
                    await db.commit()
                    # include_workday=False — Workday is slow and opt-in only (user toggles it)
                    asyncio.create_task(run_phase1_search(profile, sid, include_workday=False))
                    count += 1
            _log.info("[AutoSearch] triggered %d searches", count)
        except Exception as exc:
            _log.error("[AutoSearch] error: %s", exc)
        await asyncio.sleep(3 * 60 * 60)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()          # creates any new tables
    await run_column_migrations()  # adds any missing columns to existing tables
    _bg_task = asyncio.create_task(_auto_search_loop())
    yield
    _bg_task.cancel()
    try:
        await _bg_task
    except asyncio.CancelledError:
        pass


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "JOBEZEE API",
    description = "AI-powered job-search co-pilot — backend",
    version     = "1.0.0",
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
    debug       = _cfg.DEBUG,   # shows full traceback in 500 responses during dev
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

app.include_router(auth.router,    prefix="/api/auth",    tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(jobs.router,    prefix="/api/jobs",    tags=["jobs"])
app.include_router(search.router,  prefix="/api/search",  tags=["search"])
app.include_router(tailor.router,     prefix="/api/tailor",     tags=["tailor"])
app.include_router(portfolio.router,  prefix="/api/portfolio",  tags=["portfolio"])

# ── Static files (uploaded resumes) ──────────────────────────────────────────

app.mount("/uploads", StaticFiles(directory=_cfg.UPLOAD_DIR), name="uploads")

# ── Global exception handler (shows real error in dev) ────────────────────────

@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    tb = traceback.format_exc()
    logging.error("Unhandled exception on %s %s\n%s", request.method, request.url, tb)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb},
    )


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "service": "JOBEZEE API", "version": "1.0.0"}
