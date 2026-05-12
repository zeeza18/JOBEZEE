"""
Test email script — sends 2 dummy job digest emails with match score badges.
Usage: python scripts/test_email.py [recipient@email.com]
"""
import sys, os, asyncio
from pathlib import Path
from types import SimpleNamespace

# Repo root on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Load backend/.env
_env = Path(__file__).resolve().parents[1] / "backend" / ".env"
if _env.exists():
    for _line in _env.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            k, _, v = _line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


TARGET = sys.argv[1] if len(sys.argv) > 1 else "mdazeezulla2020@gmail.com"

DIGEST_1 = [
    SimpleNamespace(title="Senior AI Engineer",       company="OpenAI",         location="San Francisco, CA",
                    job_type="full_time", salary_text="USD 180,000 – 250,000", site="linkedin", source="jobspy",
                    url="https://openai.com/careers",           match_score=0.82),
    SimpleNamespace(title="ML Research Scientist",    company="Google DeepMind",location="Remote",
                    job_type="full_time", salary_text="USD 200,000 – 300,000", site="indeed",   source="jobspy",
                    url="https://deepmind.google/careers",      match_score=0.71),
    SimpleNamespace(title="Data Scientist",           company="Anthropic",      location="New York, NY",
                    job_type="full_time", salary_text="USD 160,000 – 220,000", site="linkedin", source="jobspy",
                    url="https://anthropic.com/careers",        match_score=0.65),
    SimpleNamespace(title="NLP Engineer",             company="Hugging Face",   location="Remote",
                    job_type="full_time", salary_text="",                       site="glassdoor",source="jobspy",
                    url="https://huggingface.co/jobs",          match_score=0.52),
    SimpleNamespace(title="AI Product Manager",       company="Scale AI",       location="Austin, TX",
                    job_type="full_time", salary_text="USD 140,000 – 180,000", site="linkedin", source="jobspy",
                    url="https://scale.com/careers",            match_score=0.38),
]

DIGEST_2 = [
    SimpleNamespace(title="LLM Engineer",             company="Mistral AI",     location="Remote",
                    job_type="full_time", salary_text="USD 150,000 – 200,000", site="linkedin", source="jobspy",
                    url="https://mistral.ai/careers",           match_score=0.88),
    SimpleNamespace(title="Computer Vision Engineer", company="NVIDIA",         location="Santa Clara, CA",
                    job_type="full_time", salary_text="USD 170,000 – 240,000", site="indeed",   source="jobspy",
                    url="https://nvidia.com/careers",           match_score=0.74),
    SimpleNamespace(title="Applied AI Researcher",    company="Meta AI",        location="Menlo Park, CA",
                    job_type="full_time", salary_text="",                       site="linkedin", source="jobspy",
                    url="https://metacareers.com",              match_score=0.61),
    SimpleNamespace(title="Backend Engineer (AI Infra)",company="Cohere",       location="Remote",
                    job_type="full_time", salary_text="USD 130,000 – 175,000", site="linkedin", source="jobspy",
                    url="https://cohere.com/careers",           match_score=0.44),
]


async def main():
    from backend.services.email_service import send_new_jobs_email

    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_user = os.environ.get("SMTP_USER", "")
    if not smtp_host or not smtp_user:
        print("ERROR: SMTP_HOST / SMTP_USER not set in backend/.env — cannot send emails.")
        print("Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM in backend/.env")
        return

    print(f"SMTP: {smtp_user} -> {smtp_host}:{os.environ.get('SMTP_PORT','587')}")
    print(f"Sending to: {TARGET}")
    print()

    print(f"[1/2] Digest email — {len(DIGEST_1)} jobs (various match scores) ...")
    await send_new_jobs_email(
        to_email    = TARGET,
        name        = "Azeez",
        jobs        = DIGEST_1,
        total_count = len(DIGEST_1),
        app_url     = "https://www.jobezee.org/app/pulled-jobs",
    )
    print("      Sent!")

    print(f"[2/2] Digest email — {len(DIGEST_2)} jobs (+12 more line) ...")
    await send_new_jobs_email(
        to_email    = TARGET,
        name        = "Azeez",
        jobs        = DIGEST_2,
        total_count = len(DIGEST_2) + 12,
        app_url     = "https://www.jobezee.org/app/pulled-jobs",
    )
    print("      Sent!")

    print()
    print(f"Done — check inbox for {TARGET} (may land in Promotions tab).")


asyncio.run(main())
