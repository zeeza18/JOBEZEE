"""
Concurrent tailor test — simulates 2 users running tailor at the same time.
Run from JOBEZEE root: python test_concurrent_tailor.py
"""
import os, sys, threading, time
from pathlib import Path

# Load .env so OPENAI_API_KEY / ANTHROPIC_API_KEY are available
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

sys.path.insert(0, str(Path(__file__).parent))

from backend.services.tailor_service import create_job, get_job, start_tailor_job

SHORT_JD = """
Software Engineer — Python Backend
We are looking for a Python backend engineer with 2+ years of experience.
Requirements: Python, FastAPI, PostgreSQL, REST APIs, Docker.
Nice to have: Redis, Celery, AWS.
Responsibilities: Build and maintain APIs, write unit tests, code reviews.
""".strip()

RESUME_A = """
Jane Doe
jane@example.com | LinkedIn: linkedin.com/in/janedoe

EXPERIENCE
Software Engineer, Acme Corp (2022-2024)
- Built REST APIs using Python and FastAPI
- Managed PostgreSQL databases and wrote unit tests
- Deployed services with Docker

SKILLS
Python, FastAPI, PostgreSQL, Docker, REST APIs
""".strip()

RESUME_B = """
Bob Smith
bob@example.com | GitHub: github.com/bobsmith

EXPERIENCE
Backend Developer, StartupXYZ (2021-2024)
- Developed backend services in Python
- Worked with PostgreSQL and Redis
- Used Docker and AWS for deployment

SKILLS
Python, PostgreSQL, Redis, Docker, AWS, REST APIs
""".strip()

results = {}

def run_user(label, resume, openai_key):
    job_id = create_job()
    print(f"[{label}] started job {job_id[:8]}...")
    start_tailor_job(job_id, SHORT_JD, resume, openai_api_key=openai_key)

    # Poll until done (max 5 min)
    for _ in range(300):
        time.sleep(1)
        job = get_job(job_id)
        status = job["status"]
        if status in ("complete", "error"):
            results[label] = job
            score = job.get("score")
            err   = job.get("error", "")
            kw_events = [e for e in job.get("progress", []) if e.get("event") == "keywords_extracted"]
            kw_count  = len(kw_events[0]["keyword_analysis"].get("keywords", [])) if kw_events else 0
            print(f"[{label}] DONE — status={status} score={score} keywords={kw_count} error={err[:80] if err else ''}")
            return
        if status == "running":
            progress = job.get("progress", [])
            if progress:
                last = progress[-1].get("event", "")
                print(f"[{label}] running... last_event={last}")
    print(f"[{label}] TIMEOUT")
    results[label] = {"status": "timeout"}

openai_key = os.getenv("OPENAI_API_KEY", "")
if not openai_key:
    print("ERROR: OPENAI_API_KEY not set in .env")
    sys.exit(1)

print(f"Using server OPENAI_API_KEY (first 8 chars): {openai_key[:8]}...")
print("Starting 2 concurrent tailor jobs...\n")

t1 = threading.Thread(target=run_user, args=("User1", RESUME_A, openai_key), daemon=True)
t2 = threading.Thread(target=run_user, args=("User2", RESUME_B, openai_key), daemon=True)

t1.start()
t2.start()
t1.join()
t2.join()

print("\n=== RESULTS ===")
for label, job in results.items():
    print(f"{label}: status={job.get('status')} score={job.get('score')} error={str(job.get('error',''))[:100]}")

all_ok = all(r.get("status") == "complete" for r in results.values())
print(f"\n{'PASS - Both users completed successfully' if all_ok else 'FAIL - One or more users failed'}")
sys.exit(0 if all_ok else 1)
