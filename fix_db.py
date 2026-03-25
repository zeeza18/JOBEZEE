import asyncio
import asyncpg
from datetime import datetime, timezone, timedelta

DB = "postgresql://neondb_owner:npg_dmxC5cyOnX6D@ep-ancient-snow-aik3fv7k.c-4.us-east-1.aws.neon.tech/neondb"

async def run():
    conn = await asyncpg.connect(DB, ssl="require")

    # 1. Fix sakshi hours_old=0 → 72
    sakshi_id = "f9f625db-1abc-45f9-ac94-9c41637fafd3"
    r = await conn.execute(
        "UPDATE user_profiles SET hours_old = 72 WHERE id = $1 AND hours_old = 0",
        sakshi_id
    )
    print(f"Fixed sakshi hours_old: {r}")

    # 2. Purge Star@gmail.com's 333 accumulated 'new' jobs older than 7 days
    star_id = "b3aa8881-592b-4ba6-b74e-a97312dfa59f"
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    # posted_at is varchar, use pulled_at (timestamp) instead for the cutoff
    r2 = await conn.execute(
        "DELETE FROM pulled_jobs WHERE user_profile_id = $1 AND status = 'new' AND pulled_at < $2",
        star_id, cutoff
    )
    print(f"Purged Star old new-jobs: {r2}")

    # 3. Check state after fixes
    print("\n=== STATE AFTER FIX ===")
    users = await conn.fetch("SELECT id, email FROM users ORDER BY email")
    for u in users:
        cnt = await conn.fetchval(
            "SELECT COUNT(*) FROM pulled_jobs WHERE user_profile_id = $1", u["id"]
        )
        profile = await conn.fetchrow(
            "SELECT hours_old, desired_roles FROM user_profiles WHERE id = $1", u["id"]
        )
        hrs   = profile["hours_old"] if profile else "NO PROFILE"
        roles = profile["desired_roles"] if profile else []
        print(f"  {u['email']}: {cnt} jobs | hours_old={hrs} | roles={roles}")

    # 4. Check sakshi running session
    sess = await conn.fetchrow(
        "SELECT id, status, jobs_found, started_at FROM search_sessions WHERE id = '0D55DB16'"
    )
    print(f"\nSakshi session 0D55DB16: {dict(sess)}")

    await conn.close()

asyncio.run(run())
