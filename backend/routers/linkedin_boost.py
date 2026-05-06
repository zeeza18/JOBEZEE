"""
LinkedIn Profile Boost router — POST /api/linkedin-boost/analyze
                               POST /api/linkedin-boost/optimize
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.params import File as FFile

from ..services.linkedin_boost_service import analyze_linkedin_profile, optimize_linkedin_profile
from ..services.resume_analysis_service import _extract_pdf_text

router = APIRouter(prefix="/api/linkedin-boost", tags=["linkedin-boost"])


@router.post("/analyze")
async def analyze(
    profile_pdf    : UploadFile,
    profile_image  : UploadFile | None = FFile(default=None),
    cover_image    : UploadFile | None = FFile(default=None),
    job_description: str = Form(default=""),
    target_role    : str = Form(default=""),
) -> dict:
    if not profile_pdf.filename:
        raise HTTPException(400, "profile_pdf is required")

    suffix = Path(profile_pdf.filename).suffix.lower()
    if suffix not in (".pdf", ".txt"):
        raise HTTPException(400, "Upload a LinkedIn profile PDF.")

    pdf_bytes = await profile_pdf.read()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        pdf_text = _extract_pdf_text(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    if not pdf_text.strip():
        raise HTTPException(422, "Could not extract text from the PDF.")

    profile_image_bytes: bytes | None = None
    profile_image_type:  str   | None = None
    if profile_image and profile_image.filename:
        profile_image_bytes = await profile_image.read()
        profile_image_type  = profile_image.content_type or "image/jpeg"

    cover_image_bytes: bytes | None = None
    cover_image_type:  str   | None = None
    if cover_image and cover_image.filename:
        cover_image_bytes = await cover_image.read()
        cover_image_type  = cover_image.content_type or "image/jpeg"

    try:
        result = analyze_linkedin_profile(
            pdf_text            = pdf_text,
            job_description     = job_description.strip(),
            target_role         = target_role.strip(),
            profile_image_bytes = profile_image_bytes,
            profile_image_type  = profile_image_type,
            cover_image_bytes   = cover_image_bytes,
            cover_image_type    = cover_image_type,
        )
        return result
    except Exception as exc:
        raise HTTPException(500, str(exc))


@router.post("/optimize")
async def optimize(body: dict) -> dict:
    """
    Body: { pdf_text: str, score_result: dict, target_role: str }
    Returns optimized sections.
    """
    pdf_text    = (body.get("pdf_text")    or "").strip()
    score_result = body.get("score_result") or {}
    target_role  = (body.get("target_role") or "").strip()

    if not pdf_text:
        raise HTTPException(400, "pdf_text is required")
    if not score_result:
        raise HTTPException(400, "score_result is required")

    try:
        result = optimize_linkedin_profile(pdf_text, score_result, target_role)
        return result
    except Exception as exc:
        raise HTTPException(500, str(exc))
