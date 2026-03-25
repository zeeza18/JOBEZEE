"""
Hetzner bot worker — FastAPI service that runs on the Hetzner VPS.
Render API POSTs bot jobs here → worker runs linkedin bot → POSTs log lines back to Render.

Run: uvicorn worker:app --host 0.0.0.0 --port 8001
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

import httpx
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI()

WORKER_SECRET = os.environ.get("WORKER_SECRET", "")
_JOBEZEE_ROOT = Path(__file__).resolve().parent.parent
_BOT_DIR      = _JOBEZEE_ROOT / "linkedin_bot"
_LAUNCHER     = _BOT_DIR / "linkedin_launcher.py"

_procs: dict[str, subprocess.Popen] = {}
_lock  = threading.Lock()


# ── Auth ──────────────────────────────────────────────────────────────────────

def _auth(authorization: str) -> None:
    if WORKER_SECRET and authorization != f"Bearer {WORKER_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Models ────────────────────────────────────────────────────────────────────

class BotJobRequest(BaseModel):
    job_id:          str
    config:          dict
    resume_b64:      str = ""   # base64-encoded PDF
    resume_filename: str = ""
    callback_url:    str        # https://api.jobezee.org/api/bot/internal/log


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "active_jobs": len(_procs)}


@app.post("/run-bot")
async def run_bot(
    job: BotJobRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
):
    _auth(authorization)
    background_tasks.add_task(_run_bot_task, job)
    return {"status": "started", "job_id": job.job_id}


@app.post("/stop-bot/{job_id}")
def stop_bot(job_id: str, authorization: str = Header(...)):
    _auth(authorization)
    with _lock:
        proc = _procs.get(job_id)
    if proc:
        try:
            proc.kill()
        except Exception:
            pass
        with _lock:
            _procs.pop(job_id, None)
        return {"stopped": True}
    return {"stopped": False}


# ── Bot runner ────────────────────────────────────────────────────────────────

def _post_log(callback_url: str, job_id: str, line: str, status: str = "running") -> None:
    try:
        httpx.post(
            callback_url,
            json={"job_id": job_id, "line": line, "status": status},
            headers={"Authorization": f"Bearer {WORKER_SECRET}"},
            timeout=5,
        )
    except Exception:
        pass


def _run_bot_task(job: BotJobRequest) -> None:
    tmp_config     = None
    tmp_resume_dir = None

    try:
        # Write resume PDF to temp file
        resume_path = ""
        if job.resume_b64 and job.resume_filename:
            tmp_resume_dir = tempfile.mkdtemp(prefix="jobezee_resume_")
            resume_path    = str(Path(tmp_resume_dir) / job.resume_filename)
            with open(resume_path, "wb") as f:
                f.write(base64.b64decode(job.resume_b64))

        # Patch config for Linux/Hetzner
        config = job.config
        if resume_path and "questions" in config:
            config["questions"]["default_resume_path"] = resume_path
        if "settings" in config:
            config["settings"]["run_in_background"] = False  # use Xvfb display, not headless
            config["settings"]["stealth_mode"]      = False  # regular selenium — uc incompatible with Chrome 146
            config["settings"]["safe_mode"]         = False  # use persistent bot profile
            config["settings"]["jobezee_root"]      = str(_JOBEZEE_ROOT)

        # Write config JSON
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(config, f)
            tmp_config = f.name

        env = {
            **os.environ,
            "PYTHONUNBUFFERED": "1",
            "PYTHONIOENCODING": "utf-8",
            "PYTHONUTF8":       "1",
            "DISPLAY":          ":99",   # Xvfb virtual display
        }

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
            env=env,
        )

        with _lock:
            _procs[job.job_id] = proc

        for line in proc.stdout:
            line = line.rstrip()
            if line:
                _post_log(job.callback_url, job.job_id, line)

        proc.wait()
        exit_code = proc.returncode
        status    = "complete" if exit_code == 0 else "error"
        _post_log(job.callback_url, job.job_id, f"[JOBEZEE] Bot finished (exit code {exit_code})", status)

    except Exception as exc:
        _post_log(job.callback_url, job.job_id, f"[JOBEZEE] Worker ERROR: {exc}", "error")
    finally:
        with _lock:
            _procs.pop(job.job_id, None)
        if tmp_config:
            try:
                Path(tmp_config).unlink()
            except Exception:
                pass
        if tmp_resume_dir:
            try:
                import shutil
                shutil.rmtree(tmp_resume_dir, ignore_errors=True)
            except Exception:
                pass
