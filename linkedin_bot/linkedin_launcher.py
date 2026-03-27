"""
linkedin_launcher.py — launched by JOBEZEE backend.

Usage:
    python -u linkedin_launcher.py --config /path/to/overrides.json

Reads a JSON file with config overrides, patches the config modules in-memory
(before runAiBot.py imports them), then runs runAiBot.py.
"""
import importlib
import json
import os
import platform
import runpy
import sys
import tempfile
import types
from pathlib import Path

# ── Parse --config arg ────────────────────────────────────────────────────────
config_path = None
for i, arg in enumerate(sys.argv[1:], 1):
    if arg == "--config" and i < len(sys.argv):
        config_path = sys.argv[i + 1]
        break

overrides: dict = {}
if config_path and Path(config_path).exists():
    overrides = json.loads(Path(config_path).read_text(encoding="utf-8"))
    print(f"[Launcher] Loaded config overrides from {config_path}", flush=True)
else:
    print("[Launcher] No config override file — using defaults from config/", flush=True)

# ── Ensure this directory is on sys.path so config.* imports resolve ──────────
_bot_dir    = Path(__file__).resolve().parent
_jobezee_root = str(_bot_dir.parent)
if str(_bot_dir) not in sys.path:
    sys.path.insert(0, str(_bot_dir))
if _jobezee_root not in sys.path:
    sys.path.insert(0, _jobezee_root)

# ── Set per-user env vars BEFORE any module imports ──────────────────────────
_uid = overrides.get("settings", {}).get("user_profile_id", "")
if _uid:
    os.environ["JOBEZEE_USER_ID"] = _uid

# ── Patch config modules BEFORE runAiBot imports them ─────────────────────────

def _patch_module(module_name: str, patch: dict) -> None:
    """Import (or create in-memory) a module and set attributes from patch."""
    try:
        mod = importlib.import_module(module_name)
    except ImportError:
        # Module file doesn't exist on this machine (e.g. gitignored secrets.py).
        # Create it in-memory so runAiBot.py can still import from it.
        mod = types.ModuleType(module_name)
        sys.modules[module_name] = mod
        # Ensure parent package is registered too
        if "." in module_name:
            parent = module_name.rsplit(".", 1)[0]
            if parent not in sys.modules:
                sys.modules[parent] = types.ModuleType(parent)
    except Exception as e:
        print(f"[Launcher] Could not patch {module_name}: {e}", flush=True)
        return

    for k, v in patch.items():
        setattr(mod, k, v)
    print(f"[Launcher] Patched {module_name}: {list(patch.keys())}", flush=True)


if "search" in overrides:
    _patch_module("config.search", overrides["search"])
if "secrets" in overrides:
    _patch_module("config.secrets", overrides["secrets"])
if "settings" in overrides:
    _patch_module("config.settings", overrides["settings"])
if "personals" in overrides:
    _patch_module("config.personals", overrides["personals"])
if "questions" in overrides:
    _patch_module("config.questions", overrides["questions"])

# ── Start virtual display on headless Linux (e.g. Render) ────────────────────
_vdisplay = None
if platform.system() == "Linux" and not os.environ.get("DISPLAY"):
    # Xlib requires ~/.Xauthority to exist (even empty) before it can connect.
    _xauth = os.path.join(os.path.expanduser("~"), ".Xauthority")
    if not os.path.exists(_xauth):
        try:
            open(_xauth, "wb").close()
        except OSError:
            # Home dir not writable — fall back to /tmp
            _xauth = os.path.join(tempfile.gettempdir(), ".Xauthority")
            open(_xauth, "wb").close()
    os.environ["XAUTHORITY"] = _xauth

    try:
        from pyvirtualdisplay import Display
        _vdisplay = Display(visible=False, size=(1920, 1080))
        _vdisplay.start()
        print("[Launcher] Started virtual display (Xvfb)", flush=True)
    except Exception as _e:
        print(f"[Launcher] Could not start virtual display: {_e}", flush=True)

# ── Run the bot ───────────────────────────────────────────────────────────────
import traceback
print("[Launcher] Starting runAiBot.py ...", flush=True)
try:
    runpy.run_path(str(_bot_dir / "runAiBot.py"), run_name="__main__")
except SystemExit as _se:
    print(f"[Launcher] SystemExit raised with code: {_se.code!r}", flush=True)
    raise
except Exception as _bot_err:
    print(f"\n[Launcher] *** BOT CRASHED ***", flush=True)
    print(f"[Launcher] Exception: {type(_bot_err).__name__}: {_bot_err}", flush=True)
    traceback.print_exc()
    sys.exit(1)
finally:
    if _vdisplay is not None:
        try:
            _vdisplay.stop()
        except Exception:
            pass
