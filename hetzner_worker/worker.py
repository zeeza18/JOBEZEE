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

# ── LinkedIn Connect sessions (per-user interactive login) ────────────────────
_connect_sessions: dict[str, dict] = {}   # user_id -> {proc, port}
_connect_lock = threading.Lock()
_CONNECT_CDP_PORT = 9223   # fixed CDP port for connect-session Chrome


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


@app.get("/screenshot")
def screenshot(authorization: str = Header(...)):
    """Take a screenshot of the Xvfb display and return it as base64 PNG."""
    _auth(authorization)
    import subprocess, base64, tempfile
    tmp = tempfile.mktemp(suffix=".png")
    env = {**os.environ, "DISPLAY": ":99"}
    for cmd in [["scrot", tmp], ["import", "-window", "root", tmp]]:
        try:
            subprocess.run(cmd, env=env, timeout=5, check=True, capture_output=True)
            data = Path(tmp).read_bytes()
            try:
                Path(tmp).unlink()
            except Exception:
                pass
            return {"image_b64": base64.b64encode(data).decode(), "format": "png"}
        except Exception:
            continue
    return {"image_b64": "", "error": "Screenshot tools not available (install scrot or imagemagick)"}


def _find_chrome_bin() -> str:
    import shutil as _sh
    env_bin = os.environ.get("CHROME_BIN", "")
    if env_bin and os.path.exists(env_bin):
        return env_bin
    for cb in (
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/opt/google/chrome/google-chrome",
        "/opt/google/chrome/chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
    ):
        if os.path.exists(cb):
            return cb
    found = _sh.which("google-chrome") or _sh.which("google-chrome-stable") or _sh.which("chromium-browser") or _sh.which("chromium") or ""
    return found or "google-chrome"


def _connect_profile_dir(user_id: str) -> str:
    return os.path.expanduser(f"~/.config/google-chrome-li-connect-{user_id[:8]}")


class ConnectStartRequest(BaseModel):
    user_id: str


@app.post("/connect/start")
def connect_start(req: ConnectStartRequest, authorization: str = Header(...)):
    """Launch a Chrome session on :99 for the user to log in to LinkedIn interactively."""
    _auth(authorization)

    # Kill any existing connect session for this user
    with _connect_lock:
        old = _connect_sessions.pop(req.user_id, None)
    if old:
        try:
            old["proc"].kill()
        except Exception:
            pass
    import time as _time
    _time.sleep(0.5)

    profile_dir = _connect_profile_dir(req.user_id)
    os.makedirs(profile_dir, exist_ok=True)
    # Remove stale Chrome singleton locks
    for lock_file in ("SingletonLock", "SingletonSocket", "SingletonCookie"):
        lp = os.path.join(profile_dir, lock_file)
        try:
            if os.path.exists(lp) or os.path.islink(lp):
                os.remove(lp)
        except Exception:
            pass

    chrome_bin = _find_chrome_bin()
    cmd = [
        chrome_bin,
        f"--remote-debugging-port={_CONNECT_CDP_PORT}",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--window-size=1280,800",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-features=ProfilePickerOnStartupFeature",
        "--disable-blink-features=AutomationControlled",
        f"--user-data-dir={profile_dir}",
        "--profile-directory=Default",
        "https://www.linkedin.com/login",
    ]
    env = {**os.environ, "DISPLAY": ":99"}
    proc = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with _connect_lock:
        _connect_sessions[req.user_id] = {"proc": proc, "port": _CONNECT_CDP_PORT}

    _time.sleep(3)   # give Chrome time to start
    return {"status": "started", "port": _CONNECT_CDP_PORT}


class ConnectClickRequest(BaseModel):
    user_id: str
    x: int   # display pixel coords (1280x800 window)
    y: int


@app.post("/connect/click")
def connect_click(req: ConnectClickRequest, authorization: str = Header(...)):
    """Inject a mouse click at display coordinates via xdotool."""
    _auth(authorization)
    env = {**os.environ, "DISPLAY": ":99"}
    try:
        subprocess.run(
            ["xdotool", "mousemove", "--sync", str(req.x), str(req.y), "click", "1"],
            env=env, timeout=5, check=True, capture_output=True,
        )
    except Exception as e:
        raise HTTPException(500, f"xdotool click failed: {e}")
    return {"ok": True}


class ConnectTypeRequest(BaseModel):
    user_id: str
    text: str


@app.post("/connect/type")
def connect_type(req: ConnectTypeRequest, authorization: str = Header(...)):
    """Inject keyboard input via xdotool."""
    _auth(authorization)
    env = {**os.environ, "DISPLAY": ":99"}
    try:
        subprocess.run(
            ["xdotool", "type", "--clearmodifiers", "--delay", "50", req.text],
            env=env, timeout=15, check=True, capture_output=True,
        )
    except Exception as e:
        raise HTTPException(500, f"xdotool type failed: {e}")
    return {"ok": True}


@app.get("/connect/cookies")
def connect_cookies(user_id: str, authorization: str = Header(...)):
    """Extract LinkedIn session cookies from the connect-session Chrome via CDP."""
    _auth(authorization)
    with _connect_lock:
        session = _connect_sessions.get(user_id)
    if not session:
        raise HTTPException(404, "No connect session for this user")

    port = session["port"]
    import asyncio as _asyncio
    import json as _j
    from urllib.request import urlopen as _urlopen

    async def _get_cookies_cdp():
        try:
            import websockets as _ws
        except ImportError:
            raise RuntimeError("websockets not installed on worker")

        raw = _urlopen(f"http://127.0.0.1:{port}/json", timeout=5).read()
        targets = _j.loads(raw)
        tab = next((t for t in targets if t.get("type") == "page"), None)
        if not tab:
            raise RuntimeError("No Chrome page found — is Chrome still running?")
        ws_url = tab["webSocketDebuggerUrl"]
        async with _ws.connect(ws_url) as sock:
            await sock.send(_j.dumps({"id": 1, "method": "Network.getAllCookies", "params": {}}))
            resp = await _asyncio.wait_for(sock.recv(), timeout=10)
            result = _j.loads(resp)
            return result.get("result", {}).get("cookies", [])

    try:
        all_cookies = _asyncio.run(_get_cookies_cdp())
    except Exception as e:
        raise HTTPException(500, f"Cookie extraction failed: {e}")

    li_cookies = [c for c in all_cookies if "linkedin.com" in c.get("domain", "")]
    return {"cookies": li_cookies, "count": len(li_cookies)}


@app.post("/connect/stop")
def connect_stop(user_id: str, authorization: str = Header(...)):
    """Kill the connect-session Chrome for this user."""
    _auth(authorization)
    with _connect_lock:
        session = _connect_sessions.pop(user_id, None)
    if session:
        try:
            session["proc"].kill()
        except Exception:
            pass
        return {"stopped": True}
    return {"stopped": False}


@app.get("/connect/status")
def connect_status(user_id: str, authorization: str = Header(...)):
    """Check if there's an active connect session for this user."""
    _auth(authorization)
    with _connect_lock:
        session = _connect_sessions.get(user_id)
    if not session:
        return {"active": False}
    proc = session["proc"]
    alive = proc.poll() is None
    if not alive:
        with _connect_lock:
            _connect_sessions.pop(user_id, None)
    return {"active": alive, "port": session.get("port")}


@app.post("/git-pull")
def git_pull(authorization: str = Header(...)):
    """Pull latest code from origin and return output."""
    _auth(authorization)
    try:
        result = subprocess.run(
            ["git", "pull", "--ff-only"],
            cwd=str(_JOBEZEE_ROOT),
            capture_output=True, text=True, timeout=60,
        )
        return {
            "returncode": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        }
    except Exception as e:
        return {"returncode": -1, "stdout": "", "stderr": str(e)}


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
            "TWOCAPTCHA_API_KEY": os.environ.get("TWOCAPTCHA_API_KEY", ""),
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
