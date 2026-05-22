"""
reset.py — wipe all rows from every table (keeps schema).

Modes
-----
  python scripts/reset.py                         # dry-run: show row counts
  python scripts/reset.py --confirm               # wipe EVERYTHING
  python scripts/reset.py --jobs-only             # wipe job tables only (keep users/profiles)
  python scripts/reset.py --jobs-only --confirm

  python scripts/reset.py --hetzner               # dry-run against PRODUCTION Hetzner DB (via SSH)
  python scripts/reset.py --hetzner --confirm     # wipe PRODUCTION DB
"""
from __future__ import annotations

import os, sys, json
from pathlib import Path

# ── Load .env ─────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parent.parent

def _load_env() -> None:
    for path in [_ROOT / ".env", _ROOT.parent / ".env", _ROOT / "backend" / ".env"]:
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            return

_load_env()

# ── Table order (FK children before parents) ──────────────────────────────────
JOB_TABLES = [
    "application_emails", "applications", "user_job_states",
    "job_listings", "preference_cache", "pulled_jobs",
    "tailor_jobs", "search_sessions",
]
PROFILE_TABLES = [
    "resumes", "portfolio_configs", "password_reset_tokens",
    "feedback", "app_logs", "error_logs", "billing_txns",
    "tool_usage", "user_events", "job_preferences",
    "user_skills", "user_credentials", "user_profiles", "users",
]
ALL_TABLES = JOB_TABLES + PROFILE_TABLES


# ── Hetzner production mode (SSH → docker exec psql) ─────────────────────────
def _hetzner_sql(query: str) -> str:
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect("5.161.60.37", username="root", password="Zeeza_het@6996", timeout=15)
    cmd = f'docker exec jobezee-postgres-1 psql -U jobezee -d jobezee -t -c "{query}"'
    _, out, err = c.exec_command(cmd, timeout=60)
    out.channel.recv_exit_status()
    result = out.read().decode("utf-8", "replace").strip()
    c.close()
    return result

def _hetzner_count(table: str) -> int:
    try:
        r = _hetzner_sql(f"SELECT COUNT(*) FROM {table};")
        return int(r.strip())
    except Exception as exc:
        raise RuntimeError(f"Count failed for {table}: {exc}") from exc

def _hetzner_truncate(tables: list[str]) -> None:
    _hetzner_sql(f"TRUNCATE {', '.join(tables)} CASCADE;")


# ── Local mode — Hetzner PostgreSQL (no SSL needed) ──────────────────────────
def _local_sql(query: str, db_url: str) -> list[dict]:
    import asyncio, asyncpg

    url = db_url
    for pfx in ("postgresql+asyncpg://", "postgres://"):
        if url.startswith(pfx):
            url = "postgresql://" + url[len(pfx):]

    async def _run():
        conn = await asyncpg.connect(url)
        try:
            rows = await conn.fetch(query)
            return [dict(r) for r in rows]
        finally:
            await conn.close()

    return asyncio.run(_run())

def _local_count(table: str, db_url: str) -> int:
    try:
        rows = _local_sql(f"SELECT COUNT(*) AS n FROM {table}", db_url)
        return int(rows[0]["n"])
    except Exception:
        return -1

def _local_truncate(tables: list[str], db_url: str) -> None:
    _local_sql(f"TRUNCATE {', '.join(tables)} CASCADE", db_url)


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    hetzner   = "--hetzner"   in sys.argv
    jobs_only = "--jobs-only" in sys.argv
    confirm   = "--confirm"   in sys.argv

    tables = JOB_TABLES if jobs_only else ALL_TABLES
    mode   = "JOBS-ONLY" if jobs_only else "FULL"
    target = "HETZNER PRODUCTION" if hetzner else "LOCAL (.env DATABASE_URL)"

    print(f"\n{'='*55}")
    print(f"  JOBEZEE DB Reset  [{mode}]  [{target}]")
    print(f"{'='*55}\n")

    if hetzner:
        count_fn    = _hetzner_count
        truncate_fn = lambda t: _hetzner_truncate(t)
        # Connection check
        try:
            n = _hetzner_count("users")
            print(f"Connected to Hetzner postgres  (users: {n})\n")
        except Exception as exc:
            print(f"SSH/connection failed: {exc}")
            sys.exit(1)
    else:
        db_url = os.environ.get("DATABASE_URL", "")
        if not db_url:
            print("ERROR: DATABASE_URL not set in .env")
            sys.exit(1)
        count_fn    = lambda t: _local_count(t, db_url)
        truncate_fn = lambda t: _local_truncate(t, db_url)
        try:
            n = _local_count("users", db_url)
            print(f"Connected  (users: {n})\n")
        except Exception as exc:
            print(f"Connection failed: {exc}")
            sys.exit(1)

    # Row counts
    counts: dict[str, int] = {t: count_fn(t) for t in tables}

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
        print("DRY RUN — nothing deleted. Add --confirm to wipe.")
        return

    tables_with_data = [t for t in tables if counts.get(t, 0) > 0]
    if not tables_with_data:
        print("Nothing to delete.")
        return

    print(f"Wiping {len(tables_with_data)} tables ({total} rows)…")
    try:
        truncate_fn(tables_with_data)
        print("Done.\n")
        for t in tables_with_data:
            print(f"  {t:<30}  {counts[t]:>8} rows deleted")
    except Exception as exc:
        print(f"TRUNCATE failed: {exc}")
        sys.exit(1)

    print(f"\nFresh start. {'Job data' if jobs_only else 'All data'} wiped.")


if __name__ == "__main__":
    main()
