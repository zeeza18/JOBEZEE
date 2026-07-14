"""
Resume Maker router — multi-document CRUD under /documents, plus stateless
AI helpers (import, score, bullet rewrite/generate, live preview HTML).
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
    BulletFromTextRequest,
    BulletResponse,
    CreateResumeDocumentRequest,
    PreviewHtmlRequest,
    PreviewHtmlResponse,
    ResumeDocumentContent,
    ResumeDocumentOut,
    ResumeDocumentSettings,
    ResumeDocumentSummary,
    ResumeDocumentUpdate,
    ResumeImportResponse,
    ResumeScoreResponse,
    RewriteBulletRequest,
)
from ..services import resume_builder_service as svc

router = APIRouter(prefix="/api/resume-builder", tags=["resume-builder"])


class ScoreRequest(BaseModel):
    job_description: str = ""


def _to_out(doc) -> ResumeDocumentOut:
    return ResumeDocumentOut(
        id=doc.id, title=doc.title,
        content=ResumeDocumentContent.model_validate(doc.content or {}),
        settings=ResumeDocumentSettings.model_validate(doc.settings or {}),
        created_at=doc.created_at, updated_at=doc.updated_at,
    )


def _to_summary(doc) -> ResumeDocumentSummary:
    return ResumeDocumentSummary(
        id=doc.id, title=doc.title,
        template=(doc.settings or {}).get("template", "classic"),
        created_at=doc.created_at, updated_at=doc.updated_at,
    )


# ---------------------------------------------------------------------------
# Document CRUD
# ---------------------------------------------------------------------------

@router.get("/documents", response_model=list[ResumeDocumentSummary])
async def list_documents(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ResumeDocumentSummary]:
    docs = await svc.list_documents(db, current_user.id)
    return [_to_summary(d) for d in docs]


@router.post("/documents", response_model=ResumeDocumentOut)
async def create_document(
    body: CreateResumeDocumentRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeDocumentOut:
    doc = await svc.create_document(db, current_user.id, body.title, body.seed_from_profile)
    return _to_out(doc)


@router.get("/documents/{doc_id}", response_model=ResumeDocumentOut)
async def get_document(
    doc_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeDocumentOut:
    try:
        doc = await svc.get_document(db, current_user.id, doc_id)
    except LookupError:
        raise HTTPException(404, "Resume not found")
    return _to_out(doc)


@router.put("/documents/{doc_id}", response_model=ResumeDocumentOut)
async def update_document(
    doc_id: str,
    body: ResumeDocumentUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeDocumentOut:
    try:
        doc = await svc.update_document(db, current_user.id, doc_id, body)
    except LookupError:
        raise HTTPException(404, "Resume not found")
    return _to_out(doc)


@router.delete("/documents/{doc_id}", status_code=204, response_model=None)
async def delete_document(
    doc_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await svc.delete_document(db, current_user.id, doc_id)
    except LookupError:
        raise HTTPException(404, "Resume not found")


@router.post("/documents/{doc_id}/duplicate", response_model=ResumeDocumentOut)
async def duplicate_document(
    doc_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeDocumentOut:
    try:
        doc = await svc.duplicate_document(db, current_user.id, doc_id)
    except LookupError:
        raise HTTPException(404, "Resume not found")
    return _to_out(doc)


# ---------------------------------------------------------------------------
# AI helpers (stateless — operate on content passed in, or a single doc's content)
# ---------------------------------------------------------------------------

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


@router.post("/documents/{doc_id}/score", response_model=ResumeScoreResponse)
async def score(
    doc_id: str,
    body: ScoreRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeScoreResponse:
    try:
        doc = await svc.get_document(db, current_user.id, doc_id)
    except LookupError:
        raise HTTPException(404, "Resume not found")
    content = ResumeDocumentContent.model_validate(doc.content or {})
    try:
        return await svc.score_document(content, body.job_description)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Scoring failed: {exc}")


@router.post("/rewrite-bullet", response_model=BulletResponse)
async def rewrite_bullet(
    body: RewriteBulletRequest,
    current_user=Depends(get_current_user),
) -> BulletResponse:
    try:
        bullet = await svc.rewrite_bullet(body.bullet, body.context, body.other_bullets, body.job_description)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Bullet rewrite failed: {exc}")
    return BulletResponse(bullet=bullet)


@router.post("/bullet-from-text", response_model=BulletResponse)
async def bullet_from_text(
    body: BulletFromTextRequest,
    current_user=Depends(get_current_user),
) -> BulletResponse:
    if not body.text.strip():
        raise HTTPException(400, "text is required")
    try:
        bullet = await svc.bullet_from_text(body.text, body.context, body.other_bullets, body.job_description)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Bullet generation failed: {exc}")
    return BulletResponse(bullet=bullet)


@router.post("/preview-html", response_model=PreviewHtmlResponse)
async def preview_html(
    body: PreviewHtmlRequest,
    current_user=Depends(get_current_user),
) -> PreviewHtmlResponse:
    """Same section-rendering logic the PDF export uses (screen-appropriate page
    chrome instead of @page) — pixel-parity live preview. Stateless: takes
    content/settings directly so it reflects unsaved edits."""
    try:
        html = svc._wrap_preview_html(svc._render_body_html(body.content, body.settings), body.settings)
    except Exception as exc:
        raise HTTPException(500, f"Preview render failed: {exc}")
    return PreviewHtmlResponse(html=html)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@router.get("/documents/{doc_id}/export/pdf")
async def export_pdf(
    doc_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        doc = await svc.get_document(db, current_user.id, doc_id)
    except LookupError:
        raise HTTPException(404, "Resume not found")
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


@router.get("/documents/{doc_id}/export/docx")
async def export_docx(
    doc_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        doc = await svc.get_document(db, current_user.id, doc_id)
    except LookupError:
        raise HTTPException(404, "Resume not found")
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
