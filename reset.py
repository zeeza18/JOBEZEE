"""
reset.py — wipe ALL data from the database (keeps table structure).

Usage:
    python reset.py                  # dry-run: shows what would be deleted
    python reset.py --confirm        # actually deletes everything

DATABASE_URL is read from (in order):
  1. DATABASE_URL environment variable
  2. backend/.env file
  3. .env file in this directory
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path


# ── Load .env if present ──────────────────────────────────────────────────────

def _load_env() -> None:
    for candidate in [
        Path(__file__).parent / ".env",
        Path(__file__).parent / "backend" / ".env",
    ]:
        if candidate.exists():
            for line in candidate.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
            print(f"[reset] Loaded env from {candidate}")
            break


_load_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[reset] ERROR: DATABASE_URL not set.")
    print("  Set it as an env var, or create a .env / backend/.env file.")
    sys.exit(1)

# asyncpg needs postgresql+asyncpg:// — fix if plain postgres:// is given
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


# ── Tables to wipe (order matters — FK children first) ───────────────────────

# Delete in this order so FK constraints don't block.
# Keep-users tables (users / user_profiles) are listed last and handled
# separately so we can offer the option to preserve auth accounts.

_DATA_TABLES = [
    # ── child tables first ────────────────────────────────────────────────────
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
    # ── v2 schema tables (may not exist on all envs) ──────────────────────────
    "job_preferences",
    "user_skills",
    "user_credentials",
    # ── parent / auth tables last ─────────────────────────────────────────────
    "user_profiles",
    "users",
]


# ── Main ──────────────────────────────────────────────────────────────────────

async def reset(confirm: bool) -> None:
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    print(f"\n[reset] Connecting to database…")
    engine = create_async_engine(DATABASE_URL, echo=False)

    # First: count rows in each table so the user can see what will be wiped
    counts: dict[str, int] = {}
    async with engine.connect() as conn:
        for table in _DATA_TABLES:
            try:
                row = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                counts[table] = row.scalar() or 0
            except Exception:
                counts[table] = -1   # table doesn't exist

    print("\n[reset] Row counts before wipe:")
    total = 0
    for table, cnt in counts.items():
        if cnt == -1:
            print(f"  {table:<30}  (table does not exist — skip)")
        else:
            mark = " ◀" if cnt > 0 else ""
            print(f"  {table:<30}  {cnt:>8} rows{mark}")
            total += cnt

    print(f"\n  TOTAL rows to delete: {total}")

    if not confirm:
        print("\n[reset] DRY RUN — nothing deleted.")
        print("  Re-run with  python reset.py --confirm  to actually wipe the data.")
        await engine.dispose()
        return

    print("\n[reset] ⚠️  DELETING ALL DATA — this cannot be undone …")

    deleted: dict[str, int] = {}
    async with engine.begin() as conn:
        # Disable FK checks for the session so order doesn't matter
        await conn.execute(text("SET session_replication_role = replica"))

        for table in _DATA_TABLES:
            if counts.get(table, -1) == -1:
                continue   # skip tables that don't exist
            try:
                result = await conn.execute(text(f"DELETE FROM {table}"))
                deleted[table] = result.rowcount
            except Exception as exc:
                print(f"  [WARN] Could not delete from {table}: {exc}")
                deleted[table] = 0

        await conn.execute(text("SET session_replication_role = DEFAULT"))

    print("\n[reset] Rows deleted:")
    for table, cnt in deleted.items():
        if cnt > 0:
            print(f"  {table:<30}  {cnt:>8} rows deleted")

    grand_total = sum(deleted.values())
    print(f"\n[reset] ✅  Done — {grand_total} rows deleted. Database is now empty.")
    await engine.dispose()


if __name__ == "__main__":
    confirm = "--confirm" in sys.argv
    asyncio.run(reset(confirm))
