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
    # Accept any token in a comma-separated list (handles multi-environment setups)
    bearer = (authorization or "").removeprefix("Bearer ").strip()
    accepted = {s.strip() for s in secret.split(",") if s.strip()}
    if bearer not in accepted:
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
