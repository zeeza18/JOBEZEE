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
            # Extract PNG width/height without extra deps (bytes 16-24)
            width  = int.from_bytes(data[16:20], "big")
            height = int.from_bytes(data[20:24], "big")
            try:
                Path(tmp).unlink()
            except Exception:
                pass
            return {
                "image_b64": base64.b64encode(data).decode(),
                "format": "png",
                "width": width,
                "height": height,
            }
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
    # Use the bot's own profile dir — cookies persist natively for all bot runs
    return os.path.expanduser("~/.config/google-chrome-linkedin-bot")


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


class ConnectFillEmailRequest(BaseModel):
    user_id: str
    email: str


@app.post("/connect/fill-email")
def connect_fill_email(req: ConnectFillEmailRequest, authorization: str = Header(...)):
    """Fill LinkedIn email field via CDP click + insertText so it renders visually."""
    _auth(authorization)
    import asyncio as _asyncio, json as _j, time as _t
    from urllib.request import urlopen as _urlopen

    with _connect_lock:
        session = _connect_sessions.get(req.user_id)
    if not session:
        raise HTTPException(400, "No active connect session")

    async def _fill():
        try:
            import websockets as _ws
        except ImportError:
            raise RuntimeError("websockets not installed on worker")

        raw = _urlopen(f"http://127.0.0.1:{_CONNECT_CDP_PORT}/json", timeout=5).read()
        targets = _j.loads(raw)
        tab = next((t for t in targets if t.get("type") == "page"), None)
        if not tab:
            raise RuntimeError("No active Chrome tab found")

        _id = 0
        async def send(sock, method, params=None):
            nonlocal _id
            _id += 1
            await sock.send(_j.dumps({"id": _id, "method": method, "params": params or {}}))
            return _j.loads(await _asyncio.wait_for(sock.recv(), 8))

        async with _ws.connect(tab["webSocketDebuggerUrl"]) as sock:
            # 1) JS: find field, force-clear any auto-filled value, return coords
            res = await send(sock, "Runtime.evaluate", {
                "expression": """
                (function() {
                    var el = document.querySelector('#username')
                          || document.querySelector('input[name="session_key"]')
                          || document.querySelector('input[autocomplete="username"]')
                          || document.querySelector('input[type="email"]');
                    if (!el) return null;
                    var native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                    native.set.call(el, '');
                    el.dispatchEvent(new Event('input',  {bubbles: true}));
                    el.dispatchEvent(new Event('change', {bubbles: true}));
                    var r = el.getBoundingClientRect();
                    return {x: r.left + r.width/2, y: r.top + r.height/2};
                })()
                """,
                "returnByValue": True,
            })
            coords = (res.get("result", {}).get("result", {}) or {}).get("value")
            if not coords:
                raise RuntimeError("Email field not found on page")

            x, y = coords["x"], coords["y"]

            # 2) Click to focus
            await send(sock, "Input.dispatchMouseEvent",
                       {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 3})
            await _asyncio.sleep(0.1)
            await send(sock, "Input.dispatchMouseEvent",
                       {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 3})
            await _asyncio.sleep(0.15)

            # 3) Type — renders visually in the field and shows in screenshots
            await send(sock, "Input.insertText", {"text": req.email})

        return {"ok": True}

    try:
        return _asyncio.run(_fill())
    except RuntimeError as exc:
        raise HTTPException(500, str(exc))


class ConnectFillPasswordRequest(BaseModel):
    user_id: str
    password: str


@app.post("/connect/fill-password")
def connect_fill_password(req: ConnectFillPasswordRequest, authorization: str = Header(...)):
    """Fill LinkedIn password field via CDP click + insertText so it renders visually."""
    _auth(authorization)
    import asyncio as _asyncio, json as _j
    from urllib.request import urlopen as _urlopen

    with _connect_lock:
        session = _connect_sessions.get(req.user_id)
    if not session:
        raise HTTPException(400, "No active connect session")

    async def _fill():
        try:
            import websockets as _ws
        except ImportError:
            raise RuntimeError("websockets not installed on worker")

        raw = _urlopen(f"http://127.0.0.1:{_CONNECT_CDP_PORT}/json", timeout=5).read()
        targets = _j.loads(raw)
        tab = next((t for t in targets if t.get("type") == "page"), None)
        if not tab:
            raise RuntimeError("No active Chrome tab found")

        _id = 0
        async def send(sock, method, params=None):
            nonlocal _id
            _id += 1
            await sock.send(_j.dumps({"id": _id, "method": method, "params": params or {}}))
            return _j.loads(await _asyncio.wait_for(sock.recv(), 8))

        async with _ws.connect(tab["webSocketDebuggerUrl"]) as sock:
            # 1) JS: find password field, force-clear auto-filled value, return coords
            res = await send(sock, "Runtime.evaluate", {
                "expression": """
                (function() {
                    var el = document.querySelector('#password')
                          || document.querySelector('input[name="session_password"]')
                          || document.querySelector('input[type="password"]');
                    if (!el) return null;
                    var native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                    native.set.call(el, '');
                    el.dispatchEvent(new Event('input',  {bubbles: true}));
                    el.dispatchEvent(new Event('change', {bubbles: true}));
                    var r = el.getBoundingClientRect();
                    return {x: r.left + r.width/2, y: r.top + r.height/2};
                })()
                """,
                "returnByValue": True,
            })
            coords = (res.get("result", {}).get("result", {}) or {}).get("value")
            if not coords:
                raise RuntimeError("Password field not found on page")

            x, y = coords["x"], coords["y"]
            # 2) Triple-click to focus + select all
            await send(sock, "Input.dispatchMouseEvent",
                       {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 3})
            await _asyncio.sleep(0.1)
            await send(sock, "Input.dispatchMouseEvent",
                       {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 3})
            await _asyncio.sleep(0.15)
            # 3) Type password
            await send(sock, "Input.insertText", {"text": req.password})

        return {"ok": True}

    try:
        return _asyncio.run(_fill())
    except RuntimeError as exc:
        raise HTTPException(500, str(exc))


class ConnectPressLoginRequest(BaseModel):
    user_id: str


@app.post("/connect/press-login")
def connect_press_login(req: ConnectPressLoginRequest, authorization: str = Header(...)):
    """Press Enter to submit the LinkedIn login form, poll URL, return result or captcha flag."""
    _auth(authorization)
    import time as _t, asyncio as _asyncio, json as _j
    from urllib.request import urlopen as _urlopen

    with _connect_lock:
        session = _connect_sessions.get(req.user_id)
    if not session:
        raise HTTPException(400, "No active connect session")

    env = {**os.environ, "DISPLAY": ":99"}
    subprocess.run(["xdotool", "key", "Return"], env=env, capture_output=True)

    async def _get_state():
        try:
            import websockets as _ws
        except ImportError:
            return [], ""
        raw = _urlopen(f"http://127.0.0.1:{_CONNECT_CDP_PORT}/json", timeout=5).read()
        targets = _j.loads(raw)
        tab = next((t for t in targets if t.get("type") == "page"), None)
        if not tab:
            return [], ""
        async with _ws.connect(tab["webSocketDebuggerUrl"]) as sock:
            await sock.send(_j.dumps({"id": 10, "method": "Runtime.evaluate",
                                      "params": {"expression": "window.location.href",
                                                 "returnByValue": True}}))
            r_url = _j.loads(await _asyncio.wait_for(sock.recv(), 8))
            url = r_url.get("result", {}).get("result", {}).get("value", "") or ""
            await sock.send(_j.dumps({"id": 11, "method": "Network.getAllCookies", "params": {}}))
            r_ck = _j.loads(await _asyncio.wait_for(sock.recv(), 10))
            cookies = [c for c in r_ck.get("result", {}).get("cookies", [])
                       if "linkedin.com" in c.get("domain", "")]
        return cookies, url

    _CAPTCHA_PATTERNS = ("checkpoint", "security", "challenge", "verification", "authwall")

    # Poll until URL leaves /login (max 20 s)
    for _ in range(20):
        _t.sleep(1)
        try:
            _, interim_url = _asyncio.run(_get_state())
            if "/login" not in interim_url:
                break
        except Exception:
            pass

    try:
        li_cookies, current_url = _asyncio.run(_get_state())
    except Exception as exc:
        raise HTTPException(500, f"Cookie extraction failed: {exc}")

    has_session = any(c.get("name") == "li_at" for c in li_cookies)

    if not has_session and any(p in current_url for p in _CAPTCHA_PATTERNS):
        # Keep Chrome alive — user will solve CAPTCHA interactively
        return {"success": False, "captcha": True, "current_url": current_url,
                "message": "CAPTCHA detected — solve it in the screenshot panel"}

    # Success or definitive failure — kill Chrome
    with _connect_lock:
        s = _connect_sessions.pop(req.user_id, None)
    if s:
        try:
            s["proc"].kill()
        except Exception:
            pass

    return {
        "success": has_session,
        "cookies": li_cookies if has_session else [],
        "count": len(li_cookies) if has_session else 0,
        "current_url": current_url,
        "message": "Login successful" if has_session else "Login failed — wrong email or password",
    }


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


@app.get("/connect/page-url")
def connect_page_url(user_id: str, authorization: str = Header(...)):
    """Return the current page URL from the connect-session Chrome (used to detect CAPTCHA solved)."""
    _auth(authorization)
    import asyncio as _asyncio, json as _j
    from urllib.request import urlopen as _urlopen

    with _connect_lock:
        session = _connect_sessions.get(user_id)
    if not session:
        return {"url": ""}

    port = session.get("port", _CONNECT_CDP_PORT)

    async def _get_url():
        try:
            import websockets as _ws
        except ImportError:
            return ""
        try:
            raw = _urlopen(f"http://127.0.0.1:{port}/json", timeout=3).read()
            tab = next((t for t in _j.loads(raw) if t.get("type") == "page"), None)
            if not tab:
                return ""
            async with _ws.connect(tab["webSocketDebuggerUrl"]) as sock:
                await sock.send(_j.dumps({"id": 1, "method": "Runtime.evaluate",
                                           "params": {"expression": "window.location.href",
                                                      "returnByValue": True}}))
                r = _j.loads(await _asyncio.wait_for(sock.recv(), 5))
                return r.get("result", {}).get("result", {}).get("value", "")
        except Exception:
            return ""

    try:
        url = _asyncio.run(_get_url())
    except Exception:
        url = ""
    return {"url": url}


class ConnectDoLoginRequest(BaseModel):
    user_id: str
    email: str
    password: str


@app.post("/connect/do-login")
def connect_do_login(req: ConnectDoLoginRequest, authorization: str = Header(...)):
    """
    All-in-one: start Chrome on bot profile, navigate to LinkedIn login,
    fill email+password via CDP JS injection, wait for redirect, return cookies.
    Uses the bot's persistent profile so cookies are stored natively.
    """
    _auth(authorization)
    import time as _t, asyncio as _asyncio, json as _j
    from urllib.request import urlopen as _urlopen

    # Kill any existing connect session
    with _connect_lock:
        old = _connect_sessions.pop(req.user_id, None)
    if old:
        try:
            old["proc"].kill()
        except Exception:
            pass
    _t.sleep(0.5)

    profile_dir = _connect_profile_dir(req.user_id)
    os.makedirs(profile_dir, exist_ok=True)
    for lf in ("SingletonLock", "SingletonSocket", "SingletonCookie"):
        lp = os.path.join(profile_dir, lf)
        try:
            if os.path.exists(lp) or os.path.islink(lp):
                os.remove(lp)
        except Exception:
            pass

    chrome_bin = _find_chrome_bin()
    cmd = [
        chrome_bin,
        f"--remote-debugging-port={_CONNECT_CDP_PORT}",
        "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
        "--window-size=1280,800", "--no-first-run", "--no-default-browser-check",
        "--disable-extensions", "--disable-blink-features=AutomationControlled",
        "--disable-features=ProfilePickerOnStartupFeature",
        "--no-restore-last-session",
        f"--user-data-dir={profile_dir}", "--profile-directory=Default",
        "https://www.linkedin.com/login",
    ]
    env = {**os.environ, "DISPLAY": ":99"}
    proc = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with _connect_lock:
        _connect_sessions[req.user_id] = {"proc": proc, "port": _CONNECT_CDP_PORT}

    _t.sleep(5)  # wait for Chrome + LinkedIn page to load

    # Dismiss "Restore pages?" dialog with OS-level Escape key
    subprocess.run(["xdotool", "key", "--clearmodifiers", "Escape"], env=env,
                   capture_output=True)
    _t.sleep(1)

    def _xdotool_login():
        """Fill LinkedIn login form using xdotool — indistinguishable from real input."""
        r = subprocess.run(
            ["xdotool", "search", "--onlyvisible", "--class", "google-chrome"],
            env=env, capture_output=True, text=True
        )
        win_ids = [w for w in r.stdout.strip().split() if w]
        if not win_ids:
            raise RuntimeError("Chrome window not found — xdotool search returned nothing")
        win_id = win_ids[-1]

        subprocess.run(["xdotool", "windowactivate", "--sync", win_id], env=env,
                       capture_output=True)
        _t.sleep(0.4)

        geo_r = subprocess.run(
            ["xdotool", "getwindowgeometry", "--shell", win_id],
            env=env, capture_output=True, text=True
        )
        geo = {}
        for line in geo_r.stdout.strip().splitlines():
            if '=' in line:
                k, v = line.split('=', 1)
                try:
                    geo[k.strip()] = int(v.strip())
                except ValueError:
                    pass
        win_x = geo.get('X', 0)
        win_y = geo.get('Y', 0)
        win_w = geo.get('WIDTH', 1280)
        # Chrome title-bar(35) + address-bar(50) + --no-sandbox info-bar(30) = 115px
        header = 115

        # LinkedIn login page: email field center at viewport y≈415 (confirmed via screenshot)
        cx      = win_x + win_w // 2
        email_y = win_y + header + 415

        # Click email field, clear any pre-filled text, type email
        subprocess.run(["xdotool", "mousemove", str(cx), str(email_y)], env=env,
                       capture_output=True)
        subprocess.run(["xdotool", "click", "1"], env=env, capture_output=True)
        _t.sleep(0.3)
        subprocess.run(["xdotool", "key", "ctrl+a"], env=env, capture_output=True)
        _t.sleep(0.1)
        subprocess.run(["xdotool", "type", "--clearmodifiers", "--delay", "40",
                         req.email], env=env, capture_output=True)
        _t.sleep(0.5)

        # Tab to password field (more reliable than coordinate click)
        subprocess.run(["xdotool", "key", "Tab"], env=env, capture_output=True)
        _t.sleep(0.3)
        subprocess.run(["xdotool", "type", "--clearmodifiers", "--delay", "40",
                         req.password], env=env, capture_output=True)
        _t.sleep(0.3)

        # Press Enter to submit the form
        subprocess.run(["xdotool", "key", "Return"], env=env, capture_output=True)

    async def _read_result_after_login():
        """CDP used only for reading URL + cookies — no JS page interaction."""
        try:
            import websockets as _ws
        except ImportError:
            raise RuntimeError("websockets package not installed on worker")
        raw = _urlopen(f"http://127.0.0.1:{_CONNECT_CDP_PORT}/json", timeout=5).read()
        targets = _j.loads(raw)
        tab = next((t for t in targets if t.get("type") == "page"), None)
        if not tab:
            raise RuntimeError("No Chrome page found")
        async with _ws.connect(tab["webSocketDebuggerUrl"]) as sock:
            await sock.send(_j.dumps({"id": 10, "method": "Runtime.evaluate",
                                       "params": {"expression": "window.location.href",
                                                  "returnByValue": True}}))
            r_url = _j.loads(await _asyncio.wait_for(sock.recv(), timeout=8))
            current_url = (r_url.get("result", {}).get("result", {}).get("value", "") or "")
            await sock.send(_j.dumps({"id": 11, "method": "Network.getAllCookies",
                                       "params": {}}))
            r_ck = _j.loads(await _asyncio.wait_for(sock.recv(), timeout=10))
            all_cookies = r_ck.get("result", {}).get("cookies", [])
        li_cookies = [c for c in all_cookies if "linkedin.com" in c.get("domain", "")]
        return li_cookies, current_url

    def _kill_connect_chrome():
        with _connect_lock:
            s = _connect_sessions.pop(req.user_id, None)
        if s:
            try:
                s["proc"].kill()
            except Exception:
                pass

    try:
        _xdotool_login()
    except Exception as exc:
        _kill_connect_chrome()
        raise HTTPException(500, f"Login automation failed: {exc}")

    # Poll URL until it leaves /login (max 20 s) — more reliable than fixed sleep
    _CAPTCHA_PATTERNS = ("checkpoint", "security", "challenge", "verification", "authwall")
    for _ in range(20):
        _t.sleep(1)
        try:
            _interim = _asyncio.run(_read_result_after_login())
            _interim_url = _interim[1]
            if "/login" not in _interim_url:
                break
        except Exception:
            pass

    try:
        li_cookies, current_url = _asyncio.run(_read_result_after_login())
    except Exception as exc:
        _kill_connect_chrome()
        raise HTTPException(500, f"Cookie extraction failed: {exc}")

    has_session = any(c.get("name") == "li_at" for c in li_cookies)

    # CAPTCHA / security challenge — keep Chrome alive so the user can solve it interactively
    if not has_session and any(p in current_url for p in _CAPTCHA_PATTERNS):
        return {
            "success": False,
            "captcha": True,
            "current_url": current_url,
            "message": "CAPTCHA detected — solve it in the screenshot panel",
        }

    # Success or definitive failure — kill Chrome now
    _kill_connect_chrome()

    return {
        "success": has_session,
        "cookies": li_cookies if has_session else [],
        "count": len(li_cookies) if has_session else 0,
        "current_url": current_url,
        "message": "Login successful" if has_session else "Login failed — check your email and password",
    }


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
