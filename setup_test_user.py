"""
Test DB setup script.

Actions:
  1. Wipe all rows from pulled_jobs, search_sessions, user_profiles, users
  2. Create user  : Azeez / star123@gmail.com / star@123
  3. Create profile: USA, AI Engineer + GenAI roles, hybrid remote, senior level

Run:
    cd JOBEZEE
    python setup_test_user.py
"""
import asyncio
import sys
import uuid
from pathlib import Path

# Windows asyncio fix
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

DB_URL = (
    "postgresql+asyncpg://neondb_owner:npg_dmxC5cyOnX6D"
    "@ep-ancient-snow-aik3fv7k.c-4.us-east-1.aws.neon.tech"
    "/neondb?ssl=require"
)

engine = create_async_engine(DB_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def main():
    async with AsyncSessionLocal() as db:

        # ── 1. Wipe all tables ───────────────────────────────────────────────
        print("Wiping all tables...")
        for tbl in ("pulled_jobs", "search_sessions", "user_profiles", "users"):
            await db.execute(text(f"DELETE FROM {tbl}"))
        await db.commit()
        print("  ✓ All tables cleared")

        # ── 2. Create user ───────────────────────────────────────────────────
        user_id = str(uuid.uuid4())
        hashed  = bcrypt.hashpw(b"star@123", bcrypt.gensalt()).decode()

        await db.execute(text("""
            INSERT INTO users (id, email, hashed_password, full_name, is_active)
            VALUES (:id, :email, :pw, :name, true)
        """), {"id": user_id, "email": "star123@gmail.com", "pw": hashed, "name": "Azeez"})
        await db.commit()
        print(f"  ✓ User created  id={user_id}  email=star123@gmail.com")

        # ── 3. Create profile ────────────────────────────────────────────────
        import json

        desired_roles    = json.dumps([
            "AI Engineer",
            "GenAI Engineer",
            "Generative AI Engineer",
            "LLM Engineer",
            "Machine Learning Engineer",
            "MLOps Engineer",
        ])
        preferred_countries = json.dumps(["USA"])
        preferred_locations = json.dumps(["Remote", "New York, NY", "San Francisco, CA", "Seattle, WA"])
        preferred_regions   = json.dumps(["north_america"])
        industries          = json.dumps(["technology"])
        skills_langs        = json.dumps(["Python", "SQL"])
        skills_fw           = json.dumps(["PyTorch", "TensorFlow", "LangChain", "FastAPI"])
        skills_tools        = json.dumps(["Docker", "AWS", "Git", "Kubernetes"])

        await db.execute(text("""
            INSERT INTO user_profiles (
                id, full_name, preferred_name, email,
                desired_roles, preferred_countries, preferred_locations,
                preferred_regions, industries,
                remote_preference, job_type, experience_level,
                skills_languages, skills_frameworks, skills_tools,
                hours_old, results_per_site,
                salary_currency, country
            ) VALUES (
                :id, :full_name, :preferred_name, :email,
                :desired_roles::jsonb, :preferred_countries::jsonb, :preferred_locations::jsonb,
                :preferred_regions::jsonb, :industries::jsonb,
                :remote_preference, :job_type, :experience_level,
                :skills_languages::jsonb, :skills_frameworks::jsonb, :skills_tools::jsonb,
                :hours_old, :results_per_site,
                :salary_currency, :country
            )
        """), {
            "id":                   user_id,
            "full_name":            "Azeez",
            "preferred_name":       "Azeez",
            "email":                "star123@gmail.com",
            "desired_roles":        desired_roles,
            "preferred_countries":  preferred_countries,
            "preferred_locations":  preferred_locations,
            "preferred_regions":    preferred_regions,
            "industries":           industries,
            "remote_preference":    "hybrid",
            "job_type":             "full_time",
            "experience_level":     "senior",
            "skills_languages":     skills_langs,
            "skills_frameworks":    skills_fw,
            "skills_tools":         skills_tools,
            "hours_old":            72,
            "results_per_site":     25,
            "salary_currency":      "USD",
            "country":              "USA",
        })
        await db.commit()
        print(f"  ✓ Profile created")
        print(f"      desired_roles     : AI Engineer, GenAI Engineer, Generative AI Engineer,")
        print(f"                          LLM Engineer, Machine Learning Engineer, MLOps Engineer")
        print(f"      preferred_countries: ['USA']")
        print(f"      preferred_locations: Remote, New York NY, San Francisco CA, Seattle WA")
        print(f"      remote_preference  : hybrid")
        print(f"      experience_level   : senior")
        print(f"      hours_old          : 72")
        print(f"      results_per_site   : 25")

        # ── 4. Verify ────────────────────────────────────────────────────────
        r = await db.execute(text("SELECT COUNT(*) FROM users"))
        print(f"\n  DB verify — users        : {r.scalar()}")
        r = await db.execute(text("SELECT COUNT(*) FROM user_profiles"))
        print(f"  DB verify — user_profiles: {r.scalar()}")
        r = await db.execute(text("SELECT COUNT(*) FROM pulled_jobs"))
        print(f"  DB verify — pulled_jobs  : {r.scalar()}")
        r = await db.execute(text("SELECT COUNT(*) FROM search_sessions"))
        print(f"  DB verify — search_sessions: {r.scalar()}")

    await engine.dispose()
    print("\nDone. Login: star123@gmail.com / star@123")


if __name__ == "__main__":
    asyncio.run(main())
