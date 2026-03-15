"""
JOBEZEE backend dev server.

Run from the JOBEZEE/ directory:
    python -m backend.run

Or with the res venv explicitly:
    C:\\Users\\azeez\\PROJECTS\\RESUME-MAKER\\res\\Scripts\\python.exe -m backend.run
"""
import os
import sys
import uvicorn
import logging
from pathlib import Path

# Prevent Python from writing .pyc bytecode — eliminates stale-cache bugs
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.dont_write_bytecode = True

# Load .env into os.environ so Phase 2 tools (tool1/tool3/tool4) can call
# os.getenv('OPENAI_API_KEY') — pydantic-settings alone doesn't set os.environ.
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

if __name__ == "__main__":
    # Ensure uploads dir exists before uvicorn workers spin up
    os.makedirs(os.path.join("uploads", "resumes"), exist_ok=True)

    # Verbose logging so Phase 1 search progress is visible in the console
    logging.basicConfig(
        level   = logging.INFO,
        format  = "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt = "%H:%M:%S",
    )
    # Make sure our Phase1 search logs are not filtered out
    for name in [
        "backend.services.phase1_service",
        "PHASE1_JOB_SEARCH",
        "jobspy_discovery",
        "smartextract_discovery",
        "workday_discovery",
    ]:
        logging.getLogger(name).setLevel(logging.INFO)

    uvicorn.run(
        "backend.main:app",
        host      = "0.0.0.0",
        port      = 8001,
        reload    = False,   # disabled — reload subprocess caused stale bytecode
        log_level = "info",
    )
