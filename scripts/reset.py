"""
reset.py — wipe database rows and optionally trigger a fresh pull.

Modes
-----
  python scripts/reset.py                  # dry-run: show counts only
  python scripts/reset.py --confirm        # wipe EVERYTHING (keeps table structure)
  python scripts/reset.py --jobs-only      # wipe job tables only (keep users/profiles)
  python scripts/reset.py --jobs-only --confirm

Uses Neon HTTP SQL API (HTTPS/443) — no asyncpg / SSL driver needed.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

# ── Locate repo root and load .env ────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent          # scripts/
_ROOT = _HERE.parent                             # JOBEZEE/
_PARENT = _ROOT.parent                           # RESUME-MAKER/

def _load_env() -> None:
    candidates = [
        _ROOT / ".env",
        _PARENT / ".env",
        _ROOT / "backend" / ".env",
        _HERE / ".env",
    ]
    for path in candidates:
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            print(f"[reset] Loaded env from {path}")
            return
    print("[reset] WARNING: no .env file found — relying on shell environment")

_load_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[reset] ERROR: DATABASE_URL not set. Add it to JOBEZEE/.env or RESUME-MAKER/.env")
    sys.exit(1)

# ── Neon HTTP helper ──────────────────────────────────────────────────────────

def _build_http(raw_url: str) -> tuple[str, str]:
    url = raw_url
    for pfx in ("postgresql+asyncpg://", "postgresql+psycopg2://", "postgres://"):
        if url.startswith(pfx):
            url = "postgresql://" + url[len(pfx):]
            break
    p    = urlparse(url)
    host = p.hostname or ""
    db   = (p.path or "/neondb").lstrip("/")
    user = unquote(p.username or "")
    pw   = unquote(p.password or "")
    conn = f"postgresql://{user}:{pw}@{host}/{db}?sslmode=require"
    return f"https://{host}/sql", conn

HTTP_URL, CONN_STR = _build_http(DATABASE_URL)

def _sql(query: str) -> list[dict]:
    import urllib.request
    data = json.dumps({"query": query, "params": []}).encode()
    req  = urllib.request.Request(
        HTTP_URL, data=data,
        headers={
            "Content-Type":           "application/json",
            "Neon-Connection-String": CONN_STR,
            "Neon-Pool-Opt-In":       "true",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read()).get("rows", [])

# ── Table lists (FK children before parents) ──────────────────────────────────

# Tables that hold job data — safe to wipe during development
JOB_TABLES = [
    "application_emails",
    "applications",
    "user_job_states",
    "job_listings",
    "preference_cache",
    "pulled_jobs",
    "tailor_jobs",
    "search_sessions",
]

# Everything else — profile and auth data
PROFILE_TABLES = [
    "resumes",
    "portfolio_configs",
    "password_reset_tokens",
    "feedback",
    "app_logs",
    "error_logs",
    "billing_txns",
    "tool_usage",
    "user_events",
    "job_preferences",
    "user_skills",
    "user_credentials",
    "user_profiles",
    "users",
]

ALL_TABLES = JOB_TABLES + PROFILE_TABLES

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    jobs_only = "--jobs-only" in sys.argv
    confirm   = "--confirm"   in sys.argv

    tables = JOB_TABLES if jobs_only else ALL_TABLES
    mode   = "JOBS-ONLY" if jobs_only else "FULL"

    print(f"\n{'='*55}")
    print(f"  JOBEZEE DB Reset  [{mode}]")
    print(f"{'='*55}\n")

    # Connection check
    try:
        rows = _sql("SELECT COUNT(*) AS n FROM users")
        print(f"Connected to Neon DB  (users: {rows[0]['n']})\n")
    except Exception as exc:
        print(f"Connection failed: {exc}")
        sys.exit(1)

    # Count rows
    counts: dict[str, int] = {}
    for t in tables:
        try:
            rows = _sql(f"SELECT COUNT(*) AS n FROM {t}")
            counts[t] = int(rows[0]["n"])
        except Exception:
            counts[t] = -1   # table not found

    print("Current row counts:")
    total = 0
    for t in tables:
        c = counts[t]
        if c == -1:
            print(f"  {t:<30}  (not found)")
        else:
            flag = "  <-- will delete" if c > 0 else ""
            print(f"  {t:<30}  {c:>8}{flag}")
            total += c
    print(f"\n  TOTAL: {total} rows\n")

    if not confirm:
        print("DRY RUN — nothing deleted.")
        print("  Add --confirm to actually wipe.")
        if jobs_only:
            print("  Add --jobs-only to wipe job tables only (keep users/profiles).")
        return

    tables_with_data = [t for t in tables if counts.get(t, 0) > 0]
    if not tables_with_data:
        print("Nothing to delete.")
        return

    print(f"Wiping {len(tables_with_data)} tables ({total} rows)…")
    try:
        _sql(f"TRUNCATE {', '.join(tables_with_data)} CASCADE")
        print("Done. All rows deleted.\n")
        for t in tables_with_data:
            print(f"  {t:<30}  {counts[t]:>8} rows deleted")
    except Exception as exc:
        print(f"TRUNCATE failed ({exc}) — falling back to per-table DELETE…")
        for t in tables_with_data:
            try:
                _sql(f"DELETE FROM {t}")
                print(f"  {t:<30}  {counts[t]:>8} rows deleted")
            except Exception as e:
                print(f"  [WARN] {t}: {e}")

    print(f"\nDone. {'Job data' if jobs_only else 'Full DB'} wiped — fresh start.")


if __name__ == "__main__":
    main()
