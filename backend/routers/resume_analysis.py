"""
Resume Analysis API — endpoints for resume scoring, PDF extraction, and photo analysis.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from ..services.resume_analysis_service import (
    _extract_pdf_text,
    analyze_image,
    analyze_resume,
)

router = APIRouter(prefix="/api/resume-analysis", tags=["resume-analysis"])


# ── Analyze ───────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze(
    body: dict,
) -> dict:
    """
    Analyze a resume (plain text) and optionally against a job description.

    Body: { resume_text: string, job_description?: string }
    """
    resume_text = (body.get("resume_text") or "").strip()
    if not resume_text:
        raise HTTPException(400, "resume_text is required")

    if len(resume_text) < 100:
        raise HTTPException(400, "Resume text too short to analyze.")

    try:
        result = analyze_resume(
            resume_text,
            job_description=(body.get("job_description") or "").strip(),
        )
        return result
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── Extract PDF text ────────────────────────────────────────────────────────────

@router.post("/extract-pdf")
async def extract_pdf(file: UploadFile) -> dict:
    """Upload a PDF/DOCX and get back plain text."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in (".pdf", ".docx", ".doc", ".txt"):
        raise HTTPException(400, "Unsupported file type. Upload PDF, DOCX, or TXT.")

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)

        try:
            text = _extract_pdf_text(tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)

        if not text.strip():
            raise HTTPException(422, "Could not extract text from this file.")

        return {"text": text, "filename": file.filename}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Extraction failed: {exc}")


# ── Analyze Profile Photo ───────────────────────────────────────────────────────

@router.post("/analyze-image")
async def analyze_image_endpoint(file: UploadFile) -> dict:
    """Upload a profile photo and get LinkedIn-readiness feedback."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in (".jpg", ".jpeg", ".png", ".webp"):
        raise HTTPException(400, "Upload a JPG, PNG, or WebP image.")

    try:
        contents = await file.read()
        import base64 as _b64
        b64 = _b64.b64encode(contents).decode().replace("\n", "")
        result = analyze_image(b64)
        return result

    except Exception as exc:
        raise HTTPException(500, f"Image analysis failed: {exc}")
