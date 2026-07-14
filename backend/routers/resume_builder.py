"""
Resume Maker router — GET/PUT /api/resume-builder/document, import-from-profile,
export/pdf, export/docx, score.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..schemas import (
    ResumeDocumentOut,
    ResumeDocumentUpdate,
    ResumeImportResponse,
    ResumeScoreResponse,
)
from ..services import resume_builder_service as svc
from ..schemas import ResumeDocumentContent, ResumeDocumentSettings

router = APIRouter(prefix="/api/resume-builder", tags=["resume-builder"])


class ScoreRequest(BaseModel):
    job_description: str = ""


@router.get("/document", response_model=ResumeDocumentOut)
async def get_document(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeDocumentOut:
    doc = await svc.get_or_create_document(db, current_user.id)
    return ResumeDocumentOut(
        id=doc.id, title=doc.title,
        content=ResumeDocumentContent.model_validate(doc.content or {}),
        settings=ResumeDocumentSettings.model_validate(doc.settings or {}),
        created_at=doc.created_at, updated_at=doc.updated_at,
    )


@router.put("/document", response_model=ResumeDocumentOut)
async def put_document(
    body: ResumeDocumentUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeDocumentOut:
    doc = await svc.upsert_document(db, current_user.id, body)
    return ResumeDocumentOut(
        id=doc.id, title=doc.title,
        content=ResumeDocumentContent.model_validate(doc.content or {}),
        settings=ResumeDocumentSettings.model_validate(doc.settings or {}),
        created_at=doc.created_at, updated_at=doc.updated_at,
    )


@router.post("/import-from-profile", response_model=ResumeImportResponse)
async def import_from_profile(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeImportResponse:
    try:
        content = await svc.import_from_profile(db, current_user.id)
    except RuntimeError as exc:
        raise HTTPException(422, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Import failed: {exc}")
    return ResumeImportResponse(content=content, source="profile")


@router.post("/score", response_model=ResumeScoreResponse)
async def score(
    body: ScoreRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeScoreResponse:
    doc = await svc.get_or_create_document(db, current_user.id)
    content = ResumeDocumentContent.model_validate(doc.content or {})
    try:
        return await svc.score_document(content, body.job_description)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Scoring failed: {exc}")


@router.get("/export/pdf")
async def export_pdf(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await svc.get_or_create_document(db, current_user.id)
    content = ResumeDocumentContent.model_validate(doc.content or {})
    settings = ResumeDocumentSettings.model_validate(doc.settings or {})
    with tempfile.TemporaryDirectory() as tmp:
        out_path = Path(tmp) / "resume.pdf"
        try:
            svc.generate_pdf(content, settings, out_path)
        except Exception as exc:
            raise HTTPException(500, f"PDF generation failed: {exc}")
        pdf_bytes = out_path.read_bytes()
    filename = f"{(doc.title or 'resume').replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/docx")
async def export_docx(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await svc.get_or_create_document(db, current_user.id)
    content = ResumeDocumentContent.model_validate(doc.content or {})
    settings = ResumeDocumentSettings.model_validate(doc.settings or {})
    with tempfile.TemporaryDirectory() as tmp:
        out_path = Path(tmp) / "resume.docx"
        try:
            svc.generate_docx(content, settings, out_path)
        except Exception as exc:
            raise HTTPException(500, f"DOCX generation failed: {exc}")
        docx_bytes = out_path.read_bytes()
    filename = f"{(doc.title or 'resume').replace(' ', '_')}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
