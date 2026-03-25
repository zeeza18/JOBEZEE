"""
linkedin_bot_service.py — runs the LinkedIn Easy Apply bot (linkedin_bot/runAiBot.py)
in a subprocess and streams stdout back as progress events.

Job lifecycle: pending -> running -> complete | error
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

# ── Paths ─────────────────────────────────────────────────────────────────────
_JOBEZEE_ROOT = Path(__file__).resolve().parent.parent.parent   # JOBEZEE/
_BOT_DIR      = _JOBEZEE_ROOT / "linkedin_bot"
_LAUNCHER     = _BOT_DIR / "linkedin_launcher.py"

# ── In-memory job store ───────────────────────────────────────────────────────
_jobs: Dict[str, Dict[str, Any]] = {}
_procs: Dict[str, Any] = {}   # job_id -> subprocess.Popen
_lock = threading.Lock()

# ── Profile-field → LinkedIn filter mappings ─────────────────────────────────
_EXP_MAP: dict[str, list[str]] = {
    "junior":    ["Entry level", "Associate"],
    "mid":       ["Entry level", "Associate", "Mid-Senior level"],
    "senior":    ["Mid-Senior level"],
    "lead":      ["Mid-Senior level", "Director"],
    "executive": ["Director", "Executive"],
}

_REMOTE_MAP: dict[str, list[str]] = {
    "remote":  ["Remote"],
    "hybrid":  ["On-site", "Hybrid", "Remote"],
    "onsite":  ["On-site"],
    "on-site": ["On-site"],
    "any":     ["On-site", "Hybrid", "Remote"],
}

_JOB_TYPE_MAP: dict[str, list[str]] = {
    "full_time":  ["Full-time"],
    "part_time":  ["Part-time"],
    "contract":   ["Contract"],
    "temporary":  ["Temporary"],
    "internship": ["Internship"],
}

_LOCATION_MAP: dict[str, str] = {
    "usa":           "United States",
    "us":            "United States",
    "u.s.":          "United States",
    "u.s.a.":        "United States",
    "america":       "United States",
    "united states": "United States",
    "uk":            "United Kingdom",
    "u.k.":          "United Kingdom",
    "united kingdom": "United Kingdom",
    "canada":        "Canada",
    "australia":     "Australia",
}


_SALARY_BRACKETS = [
    (40_000,  "$40,000+"),
    (60_000,  "$60,000+"),
    (80_000,  "$80,000+"),
    (100_000, "$100,000+"),
    (120_000, "$120,000+"),
    (140_000, "$140,000+"),
    (160_000, "$160,000+"),
    (180_000, "$180,000+"),
    (200_000, "$200,000+"),
]


def _salary_bracket(salary_min: float) -> str:
    for threshold, label in _SALARY_BRACKETS:
        if salary_min <= threshold:
            return label
    return ""


def _split_name(profile) -> tuple[str, str]:
    """
    Derive a non-empty first/last name pair from the profile.
    Falls back to preferred_name or email local-part so validation never fails.
    """
    full_name  = (getattr(profile, "full_name", "") or "").strip()
    pref_name  = (getattr(profile, "preferred_name", "") or "").strip()
    # Ignore full_name if it was accidentally set to an email address
    if "@" in full_name:
        full_name = ""
    name_src   = full_name or pref_name

    if name_src:
        parts = name_src.split()
        first = parts[0] if parts else "User"
        last  = " ".join(parts[1:]) or first
        return first, last

    email = (getattr(profile, "email", "") or "").strip()
    if email and "@" in email:
        local = email.split("@", 1)[0]
        local_parts = [p for p in re.split(r"[._\s]+", local) if p]
        first = local_parts[0] if local_parts else local or "User"
        last  = " ".join(local_parts[1:]) or first
        return first or "User", last or "User"

    return "User", "Candidate"


def build_config_overrides(profile, resume_pdf_path: str = "") -> dict:
    """
    Map a UserProfile ORM/Pydantic object to a config overrides dict
    suitable for linkedin_launcher.py --config.

    Prefers the new multi-select fields (work_modes, job_types, experience_levels)
    and falls back to the legacy single-value fields.
    """
    sal_min      = float(getattr(profile, "salary_min", 0) or 0)
    search_terms = list(getattr(profile, "desired_roles", None) or [])
    raw_locations = list(getattr(profile, "preferred_locations", None) or [])
    # Normalize location names to LinkedIn-expected strings (e.g. "USA" → "United States")
    # Drop "United States" — LinkedIn already defaults to it and the filter click fails
    _US_DEFAULTS = {"united states", "usa", "us", "u.s.", "u.s.a.", "america"}
    locations = [
        _LOCATION_MAP.get(loc.strip().lower(), loc)
        for loc in raw_locations
        if loc.strip().lower() not in _US_DEFAULTS
    ]

    # ── Work mode ─────────────────────────────────────────────────────────────
    work_modes = list(getattr(profile, "work_modes", None) or [])
    if work_modes:
        on_site = []
        for m in work_modes:
            on_site += _REMOTE_MAP.get(m.lower(), [])
        on_site = list(dict.fromkeys(on_site))   # deduplicate, preserve order
    else:
        fallback = (getattr(profile, "remote_preference", None) or "hybrid").lower()
        on_site = _REMOTE_MAP.get(fallback, ["On-site", "Hybrid", "Remote"])

    # ── Job types ─────────────────────────────────────────────────────────────
    job_types = list(getattr(profile, "job_types", None) or [])
    if job_types:
        jtype_filter = []
        for jt in job_types:
            jtype_filter += _JOB_TYPE_MAP.get(jt.lower(), [])
        jtype_filter = list(dict.fromkeys(jtype_filter))
    else:
        fallback = (getattr(profile, "job_type", None) or "full_time").lower()
        jtype_filter = _JOB_TYPE_MAP.get(fallback, ["Full-time"])

    # ── Experience levels ─────────────────────────────────────────────────────
    exp_levels = list(getattr(profile, "experience_levels", None) or [])
    if exp_levels:
        exp_filter = []
        for el in exp_levels:
            exp_filter += _EXP_MAP.get(el.lower(), [])
        exp_filter = list(dict.fromkeys(exp_filter))
    else:
        fallback = (getattr(profile, "experience_level", None) or "mid").lower()
        exp_filter = _EXP_MAP.get(fallback, ["Entry level", "Associate", "Mid-Senior level"])

    salary_filter = _salary_bracket(sal_min) if sal_min >= 40_000 else ""

    return {
        "search": {
            "search_terms":       search_terms or ["AI Engineer", "ML Engineer"],
            "title_keywords":     [],   # let LinkedIn filters handle relevance
            "current_experience": -1,  # ignore JD experience text parser
            "experience_level":   exp_filter,
            "on_site":            on_site,
            "job_type":           jtype_filter,
            "salary":             salary_filter,
            "location":           locations,
            "search_location":    "",  # empty = use LinkedIn's current location context
            "easy_apply_only":    True,
            "sort_by":            "Most recent",
            "date_posted":        "Any time",
            "companies":          [],
            "switch_number":      999999, # effectively unlimited — apply to all available jobs per search term
        },
        "questions": {
            "default_resume_path": str(Path(resume_pdf_path).resolve()) if resume_pdf_path else "",
        },
    }


# ── Public API ────────────────────────────────────────────────────────────────

def create_linkedin_job(user_profile_id: str = "") -> str:
    job_id = str(uuid.uuid4())
    with _lock:
        _jobs[job_id] = {
            "status":          "pending",
            "progress":        [],
            "result":          None,
            "error":           None,
            "user_profile_id": user_profile_id,
        }
    return job_id


def get_linkedin_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _jobs.get(job_id)


def start_linkedin_bot(job_id: str, profile, resume_pdf_path: str = "", resume_url: str = "", tailor_before_apply: bool = False) -> None:
    """Launch the LinkedIn bot in a daemon thread."""
    t = threading.Thread(target=_run_bot, args=(job_id, profile, resume_pdf_path, resume_url, tailor_before_apply), daemon=True)
    t.start()


# ── Background worker ─────────────────────────────────────────────────────────

def _run_bot(job_id: str, profile, resume_pdf_path: str = "", resume_url: str = "", tailor_before_apply: bool = False) -> None:
    with _lock:
        _jobs[job_id]["status"] = "running"

    tmp_config = None
    proc = None
    try:
        # Build overrides — search preferences, secrets, and questions
        overrides = build_config_overrides(profile)

        from ..crypto import decrypt as _decrypt
        li_email = (getattr(profile, "linkedin_email", "") or "").strip()
        li_pass  = _decrypt((getattr(profile, "linkedin_password", "") or "").strip())
        if not li_email or not li_pass:
            raise ValueError("LinkedIn email and password are required. Please add them in Settings → Credentials.")

        # API keys: prefer DB profile value (decrypt it), fall back to process env
        _openai_key    = _decrypt((getattr(profile, "openai_api_key",    "") or "").strip()) or os.environ.get("OPENAI_API_KEY",    "")
        _anthropic_key = _decrypt((getattr(profile, "anthropic_api_key", "") or "").strip()) or os.environ.get("ANTHROPIC_API_KEY", "")

        overrides["secrets"] = {
            "username":    li_email,
            "password":    li_pass,
            "use_AI":      True,
            "ai_provider": "openai",
            "llm_api_url": "https://api.openai.com/v1/",
            "llm_model":   "gpt-4o-mini",
            "llm_api_key": _openai_key,
            "stream_output": False,
        }

        # ── Clean resume filename (strip UUID prefix so LinkedIn doesn't flag it) ──
        clean_resume_path = resume_pdf_path
        if resume_pdf_path:
            import re as _re, shutil as _shutil, tempfile as _tempfile
            orig_name = Path(resume_pdf_path).name
            clean_name = _re.sub(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_', '', orig_name)
            if clean_name != orig_name:
                tmp_dir = Path(_tempfile.mkdtemp())
                clean_path = tmp_dir / clean_name
                _shutil.copy2(resume_pdf_path, clean_path)
                clean_resume_path = str(clean_path)

        # ── Extract resume text to give AI proper context ─────────────────────
        resume_text = ""
        if clean_resume_path:
            try:
                import pdfplumber
                with pdfplumber.open(clean_resume_path) as pdf:
                    resume_text = "\n\n".join(p.extract_text() or "" for p in pdf.pages if p.extract_text())
            except Exception:
                pass

        overrides["questions"] = {
            "default_resume_path":  str(Path(clean_resume_path).resolve()) if clean_resume_path else "",
            "user_information_all": resume_text or "User Information",
        }

        import platform as _platform
        _is_windows = _platform.system() == "Windows"
        overrides["settings"] = {
            "tailor_resume": tailor_before_apply,
            "jobezee_root":  str(_JOBEZEE_ROOT),
            # Windows: run Chrome visibly (headless gets blocked by LinkedIn)
            # Linux (Render/prod): stay headless
            "run_in_background": not _is_windows,
            # Windows: use persistent bot profile so LinkedIn stays logged in across runs
            # Linux: use temp profile (no persistent home dir in containers)
            "safe_mode": not _is_windows,
            "disable_extensions": True,  # faster startup
        }

        # ── Personals (config/personals.py is gitignored — inject from profile) ─
        first_name, last_name = _split_name(profile)
        first_name = (first_name or "User").strip()
        last_name  = (last_name or first_name or "Candidate").strip()
        overrides["personals"] = {
            "first_name":        first_name,
            "middle_name":       "",
            "last_name":         last_name,
            "phone_number":      (getattr(profile, "phone", "")    or "").strip(),
            "current_city":      (getattr(profile, "city", "")     or "").strip(),
            "street":            (getattr(profile, "address", "")  or "").strip(),
            "state":             (getattr(profile, "state", "")    or "").strip(),
            "zipcode":           (getattr(profile, "zip_code", "") or "").strip(),
            "country":           (getattr(profile, "country", "")  or "United States").strip() or "United States",
            "ethnicity":         "Decline",
            "gender":            "Decline",
            "disability_status": "Decline",
            "veteran_status":    "Decline",
        }

        _append(job_id, f"[JOBEZEE] Using name: {first_name} {last_name}")
        _append(job_id, f"[JOBEZEE] search_terms = {overrides['search']['search_terms']}")
        _append(job_id, f"[JOBEZEE] experience_level = {overrides['search']['experience_level']}")
        _append(job_id, f"[JOBEZEE] on_site = {overrides['search']['on_site']}")
        _append(job_id, f"[JOBEZEE] job_type = {overrides['search']['job_type']}")
        _append(job_id, f"[JOBEZEE] salary = {overrides['search']['salary'] or '(any)'}")
        _append(job_id, f"[JOBEZEE] tailor_resume = {'ON' if tailor_before_apply else 'OFF'}")

        from ..config import get_settings as _get_settings
        _cfg = _get_settings()

        if _cfg.BOT_WORKER_URL:
            # ── Production: delegate to Hetzner worker ────────────────────────
            _append(job_id, f"[JOBEZEE] Delegating to Hetzner worker at {_cfg.BOT_WORKER_URL}")

            # Base64-encode resume so Hetzner can write it to a temp file
            resume_b64      = ""
            resume_filename = ""
            if clean_resume_path and Path(clean_resume_path).exists():
                resume_b64      = base64.b64encode(Path(clean_resume_path).read_bytes()).decode()
                resume_filename = Path(clean_resume_path).name
                _append(job_id, f"[Resume] Sending: {resume_filename}")
            elif resume_url:
                _append(job_id, f"[Resume] File missing on disk — bot will use previous LinkedIn upload")
            else:
                _append(job_id, "[Resume] No resume uploaded yet — bot will use previous LinkedIn upload")

            callback_url = f"{_cfg.API_BASE_URL.rstrip('/')}/api/apply/internal/log"

            payload = {
                "job_id":          job_id,
                "config":          overrides,
                "resume_b64":      resume_b64,
                "resume_filename": resume_filename,
                "callback_url":    callback_url,
            }
            with httpx.Client(timeout=15) as client:
                r = client.post(
                    f"{_cfg.BOT_WORKER_URL}/run-bot",
                    json=payload,
                    headers={"Authorization": f"Bearer {_cfg.WORKER_SECRET}"},
                )
            if r.status_code != 200:
                raise RuntimeError(f"Hetzner worker rejected job: {r.status_code} {r.text}")
            _append(job_id, "[JOBEZEE] Bot job accepted by Hetzner worker — streaming logs...")
            # Logs arrive asynchronously via /api/bot/internal/log callback.
            # This thread is done; status updates come from the callback endpoint.

        else:
            # ── Local / dev: run subprocess directly ──────────────────────────
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False, encoding="utf-8"
            ) as f:
                json.dump(overrides, f, indent=2)
                tmp_config = f.name

            _append(job_id, f"[JOBEZEE] Config written to {tmp_config}")

            cmd  = [sys.executable, "-u", str(_LAUNCHER), "--config", tmp_config]
            proc = subprocess.Popen(
                cmd,
                cwd=str(_BOT_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace",
                env={
                    **os.environ,
                    "PYTHONUNBUFFERED":   "1",
                    "PYTHONIOENCODING":   "utf-8",
                    "PYTHONUTF8":         "1",
                    "OPENAI_API_KEY":     _openai_key,
                    "ANTHROPIC_API_KEY":  _anthropic_key,
                    "CLAUDE_API_KEY":     _anthropic_key,
                    "TWOCAPTCHA_API_KEY": _cfg.TWOCAPTCHA_API_KEY,
                },
            )

            if clean_resume_path:
                _append(job_id, f"[Resume] Found and loaded: {Path(clean_resume_path).name}")
            elif resume_url:
                _append(job_id, f"[Resume] File missing on disk (url: {resume_url}) — bot will use previous LinkedIn upload")
            else:
                _append(job_id, "[Resume] No resume uploaded to your profile yet")
            _append(job_id, f"[JOBEZEE] Bot process started (PID {proc.pid})")
            with _lock:
                _procs[job_id] = proc

            for line in proc.stdout:
                line = line.rstrip()
                if line:
                    _append(job_id, line)

            proc.wait()
            exit_code = proc.returncode
            with _lock:
                _jobs[job_id]["status"] = "complete"
                _jobs[job_id]["result"] = "complete" if exit_code == 0 else f"exit_code_{exit_code}"
            _append(job_id, f"[JOBEZEE] Bot finished (exit code {exit_code})")

    except Exception as exc:
        with _lock:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"]  = str(exc)
        _append(job_id, f"[JOBEZEE] ERROR: {exc}")
    finally:
        with _lock:
            _procs.pop(job_id, None)
        if tmp_config and os.path.exists(tmp_config):
            try:
                os.unlink(tmp_config)
            except Exception:
                pass


def stop_linkedin_bot(job_id: str) -> bool:
    """Kill the bot subprocess for the given job. Returns True if process was found and killed."""
    with _lock:
        proc = _procs.get(job_id)
        job  = _jobs.get(job_id)
    if proc is None or job is None:
        return False
    try:
        proc.kill()
    except Exception:
        pass
    with _lock:
        if _jobs.get(job_id, {}).get("status") == "running":
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"]  = "Stopped by user"
        _procs.pop(job_id, None)
    _append(job_id, "[JOBEZEE] Bot stopped by user")
    return True


def _append(job_id: str, line: str) -> None:
    with _lock:
        job = _jobs.get(job_id)
        if job:
            job["progress"].append(line)
