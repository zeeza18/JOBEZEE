"""
reset.py — wipe ALL data from the database (keeps table structure).

Usage:
    python reset.py           # dry-run: shows row counts, nothing deleted
    python reset.py --confirm # actually deletes everything

DATABASE_URL is read from backend/.env (or .env in this directory).
Uses Neon's HTTP SQL API (HTTPS/443) — works on Windows without any
SSL driver issues.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote


# ── Load .env ─────────────────────────────────────────────────────────────────

def _load_env() -> None:
    for candidate in [
        Path(__file__).parent / "backend" / ".env",
        Path(__file__).parent / ".env",
    ]:
        if candidate.exists():
            for line in candidate.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
            print(f"[reset] Loaded env from {candidate}")
            return

_load_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[reset] ERROR: DATABASE_URL not set.")
    sys.exit(1)


# ── Build the Neon HTTP connection string ─────────────────────────────────────

def _build_conn_str(raw_url: str) -> tuple[str, str]:
    """Returns (http_endpoint, postgresql_conn_str)."""
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
    conn_str = f"postgresql://{user}:{pw}@{host}/{db}?sslmode=require"
    http_url = f"https://{host}/sql"
    return http_url, conn_str

HTTP_URL, CONN_STR = _build_conn_str(DATABASE_URL)


# ── Neon HTTP SQL helper ──────────────────────────────────────────────────────

def _sql(query: str) -> list[dict]:
    """Run a SQL statement via Neon's HTTP API. Returns list of row dicts."""
    import urllib.request
    data = json.dumps({"query": query, "params": []}).encode()
    req  = urllib.request.Request(
        HTTP_URL,
        data    = data,
        headers = {
            "Content-Type":          "application/json",
            "Neon-Connection-String": CONN_STR,
            "Neon-Pool-Opt-In":      "true",
        },
        method = "POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    return body.get("rows", [])


# ── Tables (FK children before parents) ──────────────────────────────────────

TABLES = [
    "application_emails",
    "applications",
    "user_job_states",
    "job_listings",
    "preference_cache",
    "pulled_jobs",
    "tailor_jobs",
    "resumes",
    "search_sessions",
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


# ── Reset ─────────────────────────────────────────────────────────────────────

def reset(confirm: bool) -> None:
    print(f"[reset] Connecting via Neon HTTP API…")
    try:
        rows = _sql("SELECT COUNT(*) AS n FROM users")
        print(f"[reset] Connected! (users: {rows[0]['n']})\n")
    except Exception as exc:
        print(f"[reset] Connection failed: {exc}")
        sys.exit(1)

    # Count rows in each table
    counts: dict[str, int] = {}
    for t in TABLES:
        try:
            rows = _sql(f"SELECT COUNT(*) AS n FROM {t}")
            counts[t] = int(rows[0]["n"])
        except Exception:
            counts[t] = -1

    print("[reset] Row counts:")
    total = 0
    for t, c in counts.items():
        if c == -1:
            print(f"  {t:<30}  (table not found — skip)")
        else:
            mark = "  <" if c > 0 else ""
            print(f"  {t:<30}  {c:>8} rows{mark}")
            total += c
    print(f"\n  TOTAL: {total} rows")

    if not confirm:
        print("\n[reset] DRY RUN — nothing deleted.")
        print("  Run  python reset.py --confirm  to actually wipe everything.")
        return

    print("\n[reset] Deleting all data…")
    _sql("SET session_replication_role = replica")

    deleted = 0
    for t in TABLES:
        if counts.get(t, -1) <= 0:
            continue
        try:
            _sql(f"DELETE FROM {t}")
            n = counts[t]
            deleted += n
            print(f"  {t:<30}  {n:>8} rows deleted")
        except Exception as exc:
            print(f"  [WARN] {t}: {exc}")

    _sql("SET session_replication_role = DEFAULT")
    print(f"\n[reset] Done — {deleted} rows deleted. Database is now empty.")


if __name__ == "__main__":
    reset("--confirm" in sys.argv)
