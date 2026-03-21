"""
Apply service — runs the PHASE3 ApplyPilot launcher in a background thread
and tracks job state in memory (same pattern as tailor_service.py).
"""
from __future__ import annotations

import re
import sys
import threading
import uuid
from pathlib import Path
from typing import Any, Callable, Dict, Optional

# ── Add JOBEZEE root to path (applypilot package lives at root/applypilot/) ───
_SERVICE_DIR  = Path(__file__).resolve().parent          # backend/services/
_JOBEZEE_ROOT = _SERVICE_DIR.parent.parent               # JOBEZEE/
if str(_JOBEZEE_ROOT) not in sys.path:
    sys.path.insert(0, str(_JOBEZEE_ROOT))

# ── Patch dashboard.add_event to capture progress (only when applypilot is available) ──
_event_callbacks: list[Callable[[str], None]] = []
_cb_lock = threading.Lock()

try:
    from applypilot.apply import dashboard as _dash  # noqa: E402
    _orig_add_event = _dash.add_event

    def _patched_add_event(msg: str) -> None:
        _orig_add_event(msg)
        with _cb_lock:
            cbs = list(_event_callbacks)
        for cb in cbs:
            try:
                cb(msg)
            except Exception:
                pass

    _dash.add_event = _patched_add_event
    _APPLYPILOT_AVAILABLE = True
except Exception:
    _APPLYPILOT_AVAILABLE = False

# ── In-memory apply job store ─────────────────────────────────────────────────
_apply_jobs: Dict[str, Dict[str, Any]] = {}
_store_lock = threading.Lock()

# Atomic counter for unique worker IDs (avoids dashboard state collisions on parallel applies)
_worker_id_counter = 0
_worker_id_lock = threading.Lock()

# Semaphore: only 1 apply agent runs at a time (shared Chrome can't handle concurrent sessions)
_apply_semaphore = threading.Semaphore(1)


def _next_worker_id() -> int:
    global _worker_id_counter
    with _worker_id_lock:
        wid = _worker_id_counter
        _worker_id_counter += 1
        return wid

_RICH_RE = re.compile(r"\[/?[^\[\]]*\]")   # strip Rich markup tags


def _strip_markup(msg: str) -> str:
    return _RICH_RE.sub("", msg).strip()


# ── Public API ────────────────────────────────────────────────────────────────

def create_apply_job() -> str:
    job_id = str(uuid.uuid4())
    with _store_lock:
        _apply_jobs[job_id] = {
            "status":   "pending",
            "progress": [],
            "result":   None,    # 'applied' | 'failed' | 'dry_run_done' | ...
            "error":    None,
            "cost":     0.0,
        }
    return job_id


def get_apply_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _apply_jobs.get(job_id)


def start_apply_for_url(
    apply_job_id: str,
    url: str,
    resume_pdf_path: str,
    dry_run: bool = False,
    pulled_job_id: Optional[str] = None,
    company: str = '',
    job_title: str = '',
    user_email: str = '',
    user_password: str = '',
) -> None:
    """Launch apply pipeline in a daemon thread."""
    t = threading.Thread(
        target=_run_apply,
        args=(apply_job_id, url, resume_pdf_path, dry_run, pulled_job_id, company, job_title, user_email, user_password),
        daemon=True,
    )
    t.start()


# ── Background worker ─────────────────────────────────────────────────────────

def _run_apply(
    apply_job_id: str,
    url: str,
    resume_pdf_path: str,
    dry_run: bool,
    pulled_job_id: Optional[str] = None,
    company: str = '',
    job_title: str = '',
    user_email: str = '',
    user_password: str = '',
) -> None:
    """Runs inside a background thread."""
    from applypilot.config import load_env, ensure_dirs, DB_PATH
    from applypilot.database import init_db, get_connection
    from applypilot.apply.launcher import main as launcher_main
    from applypilot.apply.dashboard import get_state

    # Unique worker ID so parallel jobs don't clobber each other's state
    wid = _next_worker_id()

    # Register progress callback for this job
    def _on_event(msg: str) -> None:
        clean = _strip_markup(msg)
        if not clean:
            return
        with _store_lock:
            job = _apply_jobs.get(apply_job_id)
            if job:
                job["progress"].append(clean)

    with _cb_lock:
        _event_callbacks.append(_on_event)

    # If another apply is already running, wait in queue
    with _store_lock:
        _apply_jobs[apply_job_id]["status"] = "queued"
    _dash.add_event("STEP:queued")

    _apply_semaphore.acquire()
    try:
        with _store_lock:
            _apply_jobs[apply_job_id]["status"] = "running"

        # Emit the first step so the frontend stepper wakes up immediately
        _dash.add_event("STEP:started")

        load_env()
        # Also load JOBEZEE root .env explicitly
        from dotenv import load_dotenv
        load_dotenv(_JOBEZEE_ROOT / ".env", override=False)
        ensure_dirs()
        init_db()

        # Inject JOBEZEE email + apply_password into the ApplyPilot profile
        # so the agent uses the correct credentials on job-site login/signup forms.
        if user_email or user_password:
            import json as _json
            from applypilot.config import PROFILE_PATH
            try:
                _profile = _json.loads(Path(PROFILE_PATH).read_text(encoding="utf-8"))
                if user_email:
                    _profile["personal"]["email"] = user_email
                if user_password:
                    _profile["personal"]["password"] = user_password
                Path(PROFILE_PATH).write_text(_json.dumps(_profile, indent=2), encoding="utf-8")
            except Exception:
                pass  # non-fatal — agent will fall back to whatever is in profile

        # Seed the URL into ApplyPilot's SQLite so the launcher can acquire it
        conn = get_connection(DB_PATH)
        conn.execute("""
            INSERT INTO jobs (
                url, title, site, fit_score, tailored_resume_path,
                detail_scraped_at, scored_at, tailored_at,
                apply_status, apply_error, apply_attempts
            )
            VALUES (?, 'Manual Job', 'manual', 10, ?,
                    datetime('now'), datetime('now'), datetime('now'),
                    NULL, NULL, 0)
            ON CONFLICT(url) DO UPDATE SET
                tailored_resume_path = excluded.tailored_resume_path,
                apply_status         = NULL,
                apply_error          = NULL,
                apply_attempts       = 0
        """, (url, resume_pdf_path))
        conn.commit()

        launcher_main(
            limit=1,
            target_url=url,
            min_score=1,
            headless=False,   # use the persistent visible Chrome window
            model="gpt-4o-mini",
            dry_run=dry_run,
            continuous=False,
            workers=1,
            worker_id=wid,
        )

        # Read final apply status from ApplyPilot DB
        row = conn.execute(
            "SELECT apply_status, apply_error FROM jobs WHERE url = ?", (url,)
        ).fetchone()
        result = (row["apply_status"] or "unknown") if row else "unknown"
        if dry_run and result == "unknown":
            result = "dry_run_done"

        # Per-worker cost — accurate even when multiple jobs run in parallel
        ws = get_state(wid)
        job_cost = ws.total_cost if ws else 0.0

        with _store_lock:
            job = _apply_jobs[apply_job_id]
            job["status"] = "complete"
            job["result"] = result
            job["cost"]   = job_cost

        # Update JOBEZEE PostgreSQL pulled_jobs status
        if pulled_job_id and not dry_run:
            pg_status = {
                "applied":            "applied",
                "submitted":          "applied",
                "failed:external_site": "hidden",
            }.get(result, "new")  # leave as 'new' for other failures so user can retry
            if pg_status != "new":
                _update_pulled_job_status(pulled_job_id, pg_status)

        # If submitted but not yet confirmed by email, start a background poller
        if result == "submitted" and not dry_run and pulled_job_id:
            _dash.add_event("STEP:awaiting_email")
            t = threading.Thread(
                target=_poll_email_confirmation,
                args=(apply_job_id, pulled_job_id, company, job_title),
                daemon=True,
            )
            t.start()

    except Exception as exc:
        with _store_lock:
            job = _apply_jobs.get(apply_job_id)
            if job:
                job["status"] = "error"
                job["error"]  = str(exc)
    finally:
        _apply_semaphore.release()
        with _cb_lock:
            try:
                _event_callbacks.remove(_on_event)
            except ValueError:
                pass


# ── Email confirmation poller ──────────────────────────────────────────────────

_CONFIRMATION_KEYWORDS = (
    "application received", "we received your application",
    "thank you for applying", "thank you for your application",
    "application submitted", "successfully submitted",
    "application confirmation", "your application has been",
)

def _poll_email_confirmation(
    apply_job_id: str,
    pulled_job_id: str,
    company: str,
    job_title: str,
) -> None:
    """Poll Gmail every 5 minutes (up to 60 min) for a confirmation email.
    On confirmation, upgrades result to 'applied' and updates the JOBEZEE DB.
    """
    import asyncio as _asyncio
    import time as _time
    from applypilot.apply.openai_runner import _gmail_search

    queries = [
        "application received",
        "thank you for applying",
        f"{company} application" if company else "application confirmation",
    ]

    _dash.add_event(f"Waiting for confirmation email from {company or 'company'}…")

    for attempt in range(12):  # 12 × 5 min = 60 min
        _time.sleep(5 * 60)

        for query in queries:
            try:
                result_text = _gmail_search(query=query, max_results=3)
                lower = result_text.lower()
                if any(kw in lower for kw in _CONFIRMATION_KEYWORDS):
                    _dash.add_event(f"Confirmation email received! Marking as Applied.")
                    # Update in-memory job state
                    with _store_lock:
                        job = _apply_jobs.get(apply_job_id)
                        if job:
                            job["result"] = "applied"
                    # Update JOBEZEE PostgreSQL pulled_jobs table
                    _update_pulled_job_status(pulled_job_id, "applied")
                    return
            except Exception:
                pass

    _dash.add_event("No confirmation email after 60 min — application may still be processing.")


def _update_pulled_job_status(pulled_job_id: str, status: str) -> None:
    """Synchronously update a pulled_job's status in the JOBEZEE PostgreSQL DB."""
    import asyncio as _asyncio
    import uuid as _uuid

    async def _do_update():
        from ..database import AsyncSessionLocal
        from ..models import PulledJob
        from sqlalchemy import update as _update
        async with AsyncSessionLocal() as db:
            await db.execute(
                _update(PulledJob)
                .where(PulledJob.id == _uuid.UUID(pulled_job_id))
                .values(status=status)
            )
            await db.commit()

    loop = _asyncio.new_event_loop()
    try:
        loop.run_until_complete(_do_update())
    except Exception:
        pass
    finally:
        loop.close()
