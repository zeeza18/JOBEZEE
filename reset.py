"""
reset.py — Wipe JOBEZEE database tables.

Run from JOBEZEE root:
    python reset.py

Modes
-----
  1  Jobs only     — truncate pulled_jobs + search_sessions
  2  Full reset    — truncate ALL tables (users, user_profiles, pulled_jobs, search_sessions)
"""
import asyncio
import sys

import asyncpg

DSN = (
    "postgresql://neondb_owner:npg_dmxC5cyOnX6D"
    "@ep-ancient-snow-aik3fv7k.c-4.us-east-1.aws.neon.tech/neondb"
    "?sslmode=require"
)

JOBS_TABLES = ["pulled_jobs", "search_sessions"]
ALL_TABLES  = ["pulled_jobs", "search_sessions", "user_profiles", "users"]


async def count(conn: asyncpg.Connection, table: str) -> int:
    return await conn.fetchval(f'SELECT COUNT(*) FROM "{table}"')


async def main() -> None:
    print("\n── JOBEZEE DB Reset ─────────────────────────────────")
    print("  1  Jobs only    (pulled_jobs + search_sessions)")
    print("  2  Full reset   (ALL tables — users, profiles, jobs, sessions)")
    print("  q  Quit")
    print("─────────────────────────────────────────────────────")

    choice = input("Choose [1/2/q]: ").strip().lower()
    if choice == "q" or choice == "":
        print("Aborted.")
        sys.exit(0)
    if choice not in ("1", "2"):
        print("Invalid choice.")
        sys.exit(1)

    tables = JOBS_TABLES if choice == "1" else ALL_TABLES

    conn = await asyncpg.connect(DSN)
    try:
        # Show current counts
        print("\nCurrent row counts:")
        for t in tables:
            n = await count(conn, t)
            print(f"  {t:<25} {n:>6} rows")

        label = "jobs data" if choice == "1" else "ALL data (including users!)"
        confirm = input(f"\nDelete {label}? Type YES to confirm: ").strip()
        if confirm != "YES":
            print("Aborted.")
            return

        # Delete in safe FK order
        for t in tables:
            await conn.execute(f'DELETE FROM "{t}"')
            print(f"  Cleared  {t}")

        print("\nRow counts after reset:")
        for t in tables:
            n = await count(conn, t)
            print(f"  {t:<25} {n:>6} rows")

        print("\nDone.\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
