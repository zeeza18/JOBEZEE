"""
linkedin_launcher.py — launched by JOBEZEE backend.

Usage:
    python -u linkedin_launcher.py --config /path/to/overrides.json

Reads a JSON file with config overrides, patches the config modules in-memory
(before runAiBot.py imports them), then runs runAiBot.py.
"""
import json
import runpy
import sys
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

# ── Patch config modules BEFORE runAiBot imports them ─────────────────────────
import importlib

def _patch_module(module_name: str, patch: dict) -> None:
    try:
        mod = importlib.import_module(module_name)
        for k, v in patch.items():
            setattr(mod, k, v)
        print(f"[Launcher] Patched {module_name}: {list(patch.keys())}", flush=True)
    except Exception as e:
        print(f"[Launcher] Could not patch {module_name}: {e}", flush=True)

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

# ── Run the bot ───────────────────────────────────────────────────────────────
print("[Launcher] Starting runAiBot.py ...", flush=True)
runpy.run_path(str(_bot_dir / "runAiBot.py"), run_name="__main__")
