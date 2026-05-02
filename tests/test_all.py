# Test: Full JOBEZEE stack — imports, structure, and basic function checks
"""
Run from repo root: python tests/test_all.py
Tests all modules post-reorganisation without needing network/DB/credentials.
"""
import sys
import os
import traceback
from pathlib import Path

REPO_ROOT  = Path(__file__).resolve().parent.parent
APPLY_ROOT = REPO_ROOT / "apply"
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(APPLY_ROOT))

PASS = []
FAIL = []

def check(name, fn):
    try:
        fn()
        PASS.append(name)
        print(f"  ✓  {name}")
    except Exception as e:
        FAIL.append((name, str(e)))
        print(f"  ✗  {name}")
        print(f"       {e}")

print("\n" + "="*60)
print("  JOBEZEE — Full Stack Smoke Test")
print("="*60)

# ─────────────────────────────────────────────
print("\n[discovery]")
# ─────────────────────────────────────────────

def _disc_imports():
    from discovery import (
        JobRecord, UserPreferences, SearchFilters, deduplicate,
        LLMClient, search_boards, search_workday, search_greenhouse,
        INDEED_COUNTRY_CODES, GLOBAL_EMPLOYERS, get_global_employers,
        GREENHOUSE_COMPANIES, REGION_COUNTRIES,
    )
check("discovery — all public symbols importable", _disc_imports)

def _disc_jobrecord():
    from discovery import JobRecord
    j = JobRecord(title="SWE", company="Acme", location="Remote", url="https://example.com", source="indeed")
    assert j.title == "SWE"
check("discovery — JobRecord instantiation", _disc_jobrecord)

def _disc_dedupe():
    from discovery import JobRecord, deduplicate
    jobs = [
        JobRecord(title="SWE", company="Acme", url="https://example.com/1", source="indeed"),
        JobRecord(title="SWE", company="Acme", url="https://example.com/1", source="indeed"),
        JobRecord(title="PM",  company="Beta", url="https://example.com/2", source="linkedin"),
    ]
    result = deduplicate(jobs)
    assert len(result) == 2, f"expected 2, got {len(result)}"
check("discovery — deduplicate removes exact duplicates", _disc_dedupe)

def _disc_searchfilters():
    from discovery import SearchFilters
    f = SearchFilters(queries=["engineer"], locations=["Remote"], hours_old=48)
    kwargs = f.to_jobspy_kwargs()
    assert "queries" in kwargs or "search_term" in kwargs or len(kwargs) > 0
check("discovery — SearchFilters.to_jobspy_kwargs()", _disc_searchfilters)

def _disc_global_employers():
    from discovery import get_global_employers
    result = get_global_employers(regions=["north_america"], industries=["technology"])
    assert len(result) > 0
check("discovery — get_global_employers returns employers", _disc_global_employers)

def _disc_country_codes():
    from discovery import INDEED_COUNTRY_CODES
    assert "USA" in INDEED_COUNTRY_CODES
    assert len(INDEED_COUNTRY_CODES) > 10
check("discovery — INDEED_COUNTRY_CODES has USA and 10+ entries", _disc_country_codes)

def _disc_workday_module():
    from discovery.workday_discovery import GLOBAL_EMPLOYERS as GE
    assert len(GE) > 10
check("discovery.workday_discovery — GLOBAL_EMPLOYERS direct access", _disc_workday_module)

def _disc_greenhouse_module():
    from discovery.greenhouse_discovery import GREENHOUSE_COMPANIES
    assert len(GREENHOUSE_COMPANIES) > 5
check("discovery.greenhouse_discovery — GREENHOUSE_COMPANIES direct access", _disc_greenhouse_module)

# ─────────────────────────────────────────────
print("\n[tailor]")
# ─────────────────────────────────────────────

def _tailor_crew_import():
    from tailor.crew import ResumeCrew
    assert ResumeCrew is not None
check("tailor.crew — ResumeCrew importable", _tailor_crew_import)

def _tailor_llm_client():
    from tailor.llm_client import make_client, resolve_system_key
    assert callable(make_client) and callable(resolve_system_key)
check("tailor.llm_client — make_client and resolve_system_key importable", _tailor_llm_client)

def _tailor_prompts_exist():
    prompt_dir = REPO_ROOT / "tailor" / "prompt"
    assert prompt_dir.exists(), "tailor/prompt/ missing"
    prompts = list(prompt_dir.glob("*.txt"))
    assert len(prompts) >= 4, f"expected 4+ prompts, got {len(prompts)}"
check("tailor — prompt/ dir has 4+ .txt files", _tailor_prompts_exist)

def _tailor_tools_exist():
    tools_dir = REPO_ROOT / "tailor" / "tools"
    assert tools_dir.exists()
    tools = [f for f in tools_dir.glob("tool*.py")]
    assert len(tools) >= 4
check("tailor — tools/ has 4+ tool files", _tailor_tools_exist)

# ─────────────────────────────────────────────
print("\n[apply / applypilot]")
# ─────────────────────────────────────────────

def _apply_version():
    from applypilot import __version__
    assert __version__ == "0.3.0"
check("applypilot — __version__ importable", _apply_version)

def _apply_config():
    from applypilot.config import load_env, ensure_dirs
    assert callable(load_env) and callable(ensure_dirs)
check("applypilot.config — load_env and ensure_dirs importable", _apply_config)

def _apply_pipeline():
    import importlib
    spec = importlib.util.find_spec("applypilot.pipeline")
    assert spec is not None
check("applypilot.pipeline — module findable", _apply_pipeline)

def _apply_chrome():
    from applypilot.apply.chrome import BASE_CDP_PORT
    assert isinstance(BASE_CDP_PORT, int) and BASE_CDP_PORT > 1024
check("applypilot.apply.chrome — BASE_CDP_PORT is valid port int", _apply_chrome)

def _apply_folder_structure():
    apply_root = REPO_ROOT / "apply" / "applypilot"
    required = ["apply", "discovery", "scoring", "enrichment", "wizard", "config"]
    for sub in required:
        assert (apply_root / sub).exists(), f"apply/applypilot/{sub}/ missing"
check("apply/ — all expected subdirs present", _apply_folder_structure)

# ─────────────────────────────────────────────
print("\n[backend]")
# ─────────────────────────────────────────────

def _backend_config():
    from backend.config import Settings
    s = Settings()
    assert hasattr(s, "DATABASE_URL")
check("backend.config — Settings importable", _backend_config)

def _backend_auth():
    from backend.auth import create_access_token, create_refresh_token, hash_password, verify_password
    assert callable(create_access_token) and callable(hash_password)
check("backend.auth — create_access_token, hash_password importable", _backend_auth)

def _backend_crypto():
    from backend.crypto import encrypt, decrypt
    msg = "hello"
    enc = encrypt(msg)
    assert decrypt(enc) == msg
check("backend.crypto — encrypt/decrypt round-trip", _backend_crypto)

def _backend_models():
    from backend.models import User, UserProfile, PulledJob
    assert User is not None
check("backend.models — ORM models importable", _backend_models)

def _backend_schemas():
    from backend.schemas import UserProfileCreate, UserProfileResponse, PulledJobResponse, SearchTriggerRequest
    assert UserProfileCreate is not None
check("backend.schemas — Pydantic schemas importable", _backend_schemas)

def _backend_routers():
    from backend.routers import auth, jobs, profile, search, tailor as tailor_router
    from backend.routers import apply_auto, applied_jobs, dashboard, portfolio
    from backend.routers import analytics, logs, internal, billing, auth_linkedin
    assert all([auth, jobs, profile])
check("backend.routers — all 14 routers importable", _backend_routers)

def _backend_services():
    from backend.services import phase1_service, tailor_service, apply_service
    from backend.services import linkedin_bot_service, email_service
    assert phase1_service is not None
check("backend.services — all 5 services importable", _backend_services)

def _backend_app_loads():
    from backend.main import app
    assert app is not None
    assert app.title  # FastAPI app has a title
check("backend.main — FastAPI app loads", _backend_app_loads)

# ─────────────────────────────────────────────
print("\n[worker]")
# ─────────────────────────────────────────────

def _worker_app():
    # Add worker dir to path for its internal imports
    import importlib.util
    worker_path = REPO_ROOT / "worker" / "worker.py"
    assert worker_path.exists(), "worker/worker.py missing"
check("worker — worker.py exists", _worker_app)

def _worker_setup_paths():
    setup = (REPO_ROOT / "worker" / "setup.sh").read_text()
    assert "worker/requirements.txt" in setup, "setup.sh still references old hetzner_worker path"
    assert "linkedin/requirements.txt" in setup, "setup.sh still references old linkedin_bot path"
    assert "hetzner_worker" not in setup, "setup.sh has stale hetzner_worker reference"
check("worker/setup.sh — all paths updated (no hetzner_worker refs)", _worker_setup_paths)

def _worker_requirements():
    req = (REPO_ROOT / "worker" / "requirements.txt").read_text()
    assert "fastapi" in req
check("worker/requirements.txt — fastapi listed", _worker_requirements)

# ─────────────────────────────────────────────
print("\n[structure]")
# ─────────────────────────────────────────────

def _structure_no_old_folders():
    old = ["PHASE1_JOB_SEARCH", "PHASE2_JOB_TAILOR", "PHASE3_AUTO_APPLY", "linkedin_bot", "hetzner_worker"]
    for name in old:
        assert not (REPO_ROOT / name).exists(), f"Old folder still exists: {name}"
check("structure — no old PHASE/bot folder names at root", _structure_no_old_folders)

def _structure_new_folders():
    required = ["discovery", "tailor", "apply", "linkedin", "worker", "tests", "scripts"]
    for name in required:
        assert (REPO_ROOT / name).exists(), f"Missing: {name}/"
check("structure — all new folders present", _structure_new_folders)

def _structure_tests_populated():
    for module in ["discovery", "apply", "backend", "worker"]:
        folder = REPO_ROOT / "tests" / module
        assert folder.exists(), f"tests/{module}/ missing"
        files = list(folder.iterdir())
        assert len(files) > 0, f"tests/{module}/ is empty"
check("tests/ — discovery, apply, backend, worker subdirs populated", _structure_tests_populated)

def _structure_skills():
    skills = REPO_ROOT / ".claude" / "skills"
    assert (skills / "test.md").exists()
    assert (skills / "deploy-worker.md").exists()
check(".claude/skills — test.md and deploy-worker.md present", _structure_skills)

def _structure_github():
    gh = REPO_ROOT / ".github"
    assert (gh / "workflows" / "ci.yml").exists()
    assert (gh / "CONTRIBUTING.md").exists()
    assert (gh / "PULL_REQUEST_TEMPLATE.md").exists()
check(".github/ — ci.yml, CONTRIBUTING.md, PR template present", _structure_github)

def _structure_no_stale_imports():
    import subprocess
    result = subprocess.run(
        ["git", "grep", "-l", r"from PHASE1_JOB_SEARCH\|from PHASE2_JOB_TAILOR"],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    # Exclude files that use these strings as grep patterns, not actual imports
    offending = [f for f in result.stdout.strip().splitlines()
                 if ".github/workflows" not in f and "tests/test_all.py" not in f]
    assert offending == [], f"Stale PHASE imports found in:\n" + "\n".join(offending)
check("structure — zero stale PHASE import statements in .py files", _structure_no_stale_imports)

# ─────────────────────────────────────────────
print("\n[linkedin]")
# ─────────────────────────────────────────────

def _linkedin_files():
    lin = REPO_ROOT / "linkedin"
    assert (lin / "linkedin_launcher.py").exists()
    assert (lin / "runAiBot.py").exists()
    assert (lin / "modules").exists()
    assert (lin / "requirements.txt").exists()
check("linkedin/ — core files present (launcher, bot, modules, requirements)", _linkedin_files)

def _linkedin_no_runtime_junk():
    lin = REPO_ROOT / "linkedin"
    junk = ["all resumes", "all excels", "output", "logs", "LICENSE"]
    found = [j for j in junk if (lin / j).exists()]
    assert found == [], f"Runtime artifacts still present: {found}"
check("linkedin/ — runtime artifacts removed", _linkedin_no_runtime_junk)

# ─────────────────────────────────────────────
print("\n[scripts]")
# ─────────────────────────────────────────────

def _scripts_present():
    s = REPO_ROOT / "scripts"
    assert (s / "db_reset.py").exists()
    assert (s / "reset.py").exists()
    assert (s / "workday_autodiscovery.py").exists()
    assert (s / "workday_discovery_remote.py").exists()
check("scripts/ — db_reset, reset, workday_autodiscovery, workday_discovery_remote present", _scripts_present)

# ─────────────────────────────────────────────
print("\n" + "="*60)
total = len(PASS) + len(FAIL)
print(f"  Results: {len(PASS)}/{total} passed")
if FAIL:
    print(f"\n  FAILURES ({len(FAIL)}):")
    for name, err in FAIL:
        print(f"    ✗ {name}")
        print(f"      {err}")
    print()
    sys.exit(1)
else:
    print("  ALL PASS ✓")
    print()
