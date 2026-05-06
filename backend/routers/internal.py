"""
/api/internal — Internal endpoints called by the Hetzner tasks runner.
Protected by WORKER_SECRET bearer token.
"""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()


def _check_secret(authorization: str | None) -> None:
    from ..config import get_settings
    secret = get_settings().WORKER_SECRET
    if not secret:
        raise HTTPException(503, "WORKER_SECRET not configured")
    # Split both sides by comma so multi-token secrets match regardless of order
    bearer = (authorization or "").removeprefix("Bearer ").strip()
    bearer_tokens  = {t.strip() for t in bearer.split(",")  if t.strip()}
    allowed_tokens = {t.strip() for t in secret.split(",") if t.strip()}
    if not bearer_tokens.intersection(allowed_tokens):
        raise HTTPException(401, "Unauthorized")


class DigestJob(BaseModel):
    title    : str
    company  : str
    location : str
    job_type : str = ""
    salary_text: str = ""
    site     : str = ""
    source   : str = ""
    url      : str = ""


class DigestRequest(BaseModel):
    to_email   : str
    name       : str
    jobs       : list[DigestJob]
    total_count: int


@router.post("/send-digest")
async def send_digest(
    req          : DigestRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    """
    Called by the Hetzner tasks runner to send a job digest email.
    Render handles SMTP — no port-blocking issues.
    """
    _check_secret(authorization)

    from ..services.email_service import send_new_jobs_email
    from ..config import get_settings
    cfg = get_settings()

    await send_new_jobs_email(
        to_email    = req.to_email,
        name        = req.name,
        jobs        = req.jobs,          # list of DigestJob (same attrs email_service needs)
        total_count = req.total_count,
        app_url     = f"{cfg.FRONTEND_URL}/app/pulled-jobs",
    )
    return {"ok": True, "sent_to": req.to_email, "job_count": req.total_count}


@router.post("/deploy")
async def deploy(
    authorization: str | None = Header(default=None),
) -> dict:
    """
    Called by GitHub Actions CI to deploy the latest code.
    Runs git pull + docker compose up --build on the host.
    """
    _check_secret(authorization)

    import asyncio, os
    env = {**os.environ, "POSTGRES_PASSWORD": os.getenv("POSTGRES_PASSWORD", "")}
    proc = await asyncio.create_subprocess_shell(
        "cd /opt/jobezee && git pull origin main && "
        "docker compose up -d postgres && "
        "docker compose up -d --build backend",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        env=env,
    )
    stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=600)
    output = stdout.decode("utf-8", "replace").strip()
    if proc.returncode != 0:
        raise HTTPException(500, f"Deploy failed:\n{output[-2000:]}")
    return {"ok": True, "output": output[-2000:]}
