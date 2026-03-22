"""
Tailor service — runs the PHASE2_JOB_TAILOR crew in a background thread
and tracks job state in memory.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

# PHASE2_JOB_TAILOR module root (two levels up from this file)
_SERVICE_DIR  = Path(__file__).resolve().parent          # backend/services/
_JOBEZEE_ROOT = _SERVICE_DIR.parent.parent               # JOBEZEE/
_TAILOR_ROOT  = _JOBEZEE_ROOT / "PHASE2_JOB_TAILOR"

# Ensure repo root is importable regardless of which service module loaded first
import sys as _sys
_JOBEZEE_ROOT_STR = str(_JOBEZEE_ROOT)
if _JOBEZEE_ROOT_STR not in _sys.path:
    _sys.path.insert(0, _JOBEZEE_ROOT_STR)
_OUTPUT_DIR   = _TAILOR_ROOT / "output"
_JOB_OUTPUTS  = _JOBEZEE_ROOT / "job_outputs"           # per-job output dirs

# In-memory job store (keyed by tailor_job_id)
_jobs: Dict[str, Dict[str, Any]] = {}
_lock = threading.Lock()


def create_job() -> str:
    job_id = str(uuid.uuid4())
    with _lock:
        _jobs[job_id] = {
            "status": "pending",
            "progress": [],
            "score": None,
            "tex_path": None,
            "pdf_path": None,
            "final_resume": None,
            "filename": None,
            "error": None,
        }
    return job_id


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _jobs.get(job_id)


# ─── Original: run from plain text (TailorPage) ───────────────────────────────

def start_tailor_job(job_id: str, job_description: str, resume: str, openai_api_key: str = "") -> None:
    """Launch crew in a daemon thread (plain text resume — for TailorPage)."""
    t = threading.Thread(
        target=_run_tailor_job,
        args=(job_id, job_description, resume, openai_api_key),
        daemon=True,
    )
    t.start()


def _run_tailor_job(job_id: str, job_description: str, resume: str, openai_api_key: str = "") -> None:
    """Runs inside background thread."""
    import os as _os
    if openai_api_key:
        _os.environ["OPENAI_API_KEY"] = openai_api_key
    with _lock:
        _jobs[job_id]["status"] = "running"

    def progress_callback(data: Dict[str, Any]) -> None:
        with _lock:
            _jobs[job_id]["progress"].append(data)
            if data.get("event") == "round_complete":
                score = data.get("evaluation", {}).get("score")
                if score is not None:
                    _jobs[job_id]["score"] = score

    def _cp1252_safe(s: str) -> str:
        out = []
        for c in (s or ""):
            try:
                c.encode('cp1252')
                out.append(c)
            except (UnicodeEncodeError, LookupError):
                out.append(' ')
        return ''.join(out)

    try:
        _clean_jd = _cp1252_safe(_clean_job_description(job_description))
        _resume   = _cp1252_safe(resume)

        from PHASE2_JOB_TAILOR.crew import ResumeCrew

        job_dir = _JOB_OUTPUTS / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        crew = ResumeCrew()
        result = crew.run_tailoring_process(_clean_jd, _resume, progress_callback, output_dir=job_dir)

        final_score = result.get("final_score")
        final_resume = result.get("final_resume", "")
        latex_summary = result.get("latex_summary", {})

        tex_path: Optional[Path] = None
        pdf_path: Optional[Path] = None

        if latex_summary.get("status") == "success":
            candidate = job_dir / "final_tailored_resume.tex"
            if candidate.exists():
                tex_path = candidate
                compiled = _compile_pdf(tex_path)
                if compiled:
                    pdf_path = compiled

        if not pdf_path and final_resume:
            pdf_path = _generate_pdf_from_text(final_resume, job_dir / "tailored_resume.pdf")

        with _lock:
            _jobs[job_id].update({
                "status": "complete",
                "score": final_score,
                "final_resume": final_resume,
                "tex_path": str(tex_path) if tex_path else None,
                "pdf_path": str(pdf_path) if pdf_path else None,
            })

    except Exception as exc:
        with _lock:
            _jobs[job_id].update({
                "status": "error",
                "error": str(exc),
            })
        print(f"[tailor_service] Job {job_id} failed: {exc}")


# ─── New: run from uploaded resume file (job-card Tailor button) ─────────────

def start_tailor_job_for_job(
    tailor_job_id: str,
    job_description: str,
    resume_url: str,
    username: str,
    company: str,
    openai_api_key: str = "",
) -> None:
    """Launch crew for a specific pulled job using the user's uploaded resume."""
    t = threading.Thread(
        target=_run_tailor_for_job,
        args=(tailor_job_id, job_description, resume_url, username, company, openai_api_key),
        daemon=True,
    )
    t.start()


def _run_tailor_for_job(
    tailor_job_id: str,
    job_description: str,
    resume_url: str,
    username: str,
    company: str,
    openai_api_key: str = "",
) -> None:
    import os as _os
    if openai_api_key:
        _os.environ["OPENAI_API_KEY"] = openai_api_key
    with _lock:
        _jobs[tailor_job_id]["status"] = "running"

    def progress_callback(data: Dict[str, Any]) -> None:
        with _lock:
            _jobs[tailor_job_id]["progress"].append(data)
            if data.get("event") == "round_complete":
                score = data.get("evaluation", {}).get("score")
                if score is not None:
                    _jobs[tailor_job_id]["score"] = score

    try:
        # Resolve resume file from URL path (/uploads/resumes/<filename>)
        resume_file = _JOBEZEE_ROOT / resume_url.lstrip('/')
        resume_text = _extract_resume_text(resume_file)
        clean_jd = _clean_job_description(job_description)

        # If cleaning removed too much (boilerplate was all we had), fall back to
        # raw JD with only markdown stripped — better than erroring or feeding nothing.
        raw_words = len(job_description.split())
        clean_words = len(clean_jd.split())
        if clean_words < 40 and raw_words >= clean_words:
            print(f"[tailor_service] Cleaned JD too short ({clean_words}w), using raw JD ({raw_words}w)")
            clean_jd = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', job_description)
            clean_jd = re.sub(r'_{1,2}([^_]+)_{1,2}', r'\1', clean_jd)

        if len(clean_jd.split()) < 10:
            raise RuntimeError(
                "Job description is too short to tailor against — "
                "the scraper only captured a preview of this posting. "
                "Pull fresh jobs to get the full description."
            )

        # Sanitize chars Windows cp1252 can't encode (arrows, emojis, curly chars)
        def _cp1252_safe(s: str) -> str:
            out = []
            for c in (s or ""):
                try:
                    c.encode('cp1252')
                    out.append(c)
                except (UnicodeEncodeError, LookupError):
                    out.append(' ')
            return ''.join(out)
        clean_jd    = _cp1252_safe(clean_jd)
        resume_text = _cp1252_safe(resume_text)

        from PHASE2_JOB_TAILOR.crew import ResumeCrew

        safe_name = _safe_filename(username, company)
        job_dir = _JOB_OUTPUTS / tailor_job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        crew = ResumeCrew()
        result = crew.run_tailoring_process(clean_jd, resume_text, progress_callback, output_dir=job_dir)

        final_score = result.get("final_score")
        final_resume = result.get("final_resume", "")
        latex_summary = result.get("latex_summary", {})

        tex_path: Optional[Path] = None
        pdf_path: Optional[Path] = None

        if latex_summary.get("status") == "success":
            src_tex = job_dir / "final_tailored_resume.tex"
            if src_tex.exists():
                dest_tex = job_dir / f"{safe_name}.tex"
                if src_tex != dest_tex:
                    shutil.copy2(src_tex, dest_tex)
                tex_path = dest_tex
                compiled = _compile_pdf(dest_tex)
                if compiled:
                    pdf_path = compiled

        if not pdf_path and final_resume:
            pdf_path = _generate_pdf_from_text(final_resume, job_dir / f"{safe_name}.pdf")

        with _lock:
            _jobs[tailor_job_id].update({
                "status": "complete",
                "score": final_score,
                "final_resume": final_resume,
                "tex_path": str(tex_path) if tex_path else None,
                "pdf_path": str(pdf_path) if pdf_path else None,
                "filename": safe_name,
            })

    except Exception as exc:
        with _lock:
            _jobs[tailor_job_id].update({
                "status": "error",
                "error": str(exc),
            })
        print(f"[tailor_service] Job {tailor_job_id} failed: {exc}")


def _extract_resume_text(file_path: Path) -> str:
    """Extract plain text from PDF or DOCX resume file."""
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                pages = [p.extract_text() or "" for p in pdf.pages]
            return "\n\n".join(p for p in pages if p.strip())
        except ImportError:
            print("[tailor_service] pdfplumber not installed — trying PyPDF2")
        try:
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                return "\n\n".join(
                    page.extract_text() or "" for page in reader.pages
                )
        except ImportError:
            raise RuntimeError(
                "PDF extraction requires pdfplumber. Run: pip install pdfplumber"
            )

    elif suffix in (".docx", ".doc"):
        try:
            from docx import Document
            doc = Document(file_path)
            return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except ImportError:
            raise RuntimeError(
                "DOCX extraction requires python-docx. Run: pip install python-docx"
            )

    elif suffix == ".txt":
        return file_path.read_text(encoding="utf-8", errors="ignore")

    else:
        # Try reading as plain text as last resort
        try:
            return file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            raise RuntimeError(f"Unsupported resume format: {suffix}")


def _clean_job_description(jd: str) -> str:
    """
    Strip boilerplate from scraped job descriptions before sending to the crew.

    Strategy (universal, non-strict):
    - Strip markdown formatting
    - Skip known boilerplate SECTIONS only (company overview, benefits, EEO)
    - Once inside a boilerplate section, ONLY stop skipping for a known keeper header
      (never for unknown lines — prevents salary/perks lines leaking back in)
    - Strip trailing EEO paragraphs regardless of section structure
    - If cleaned result is too short, caller should fall back to original JD

    Keeps everything not explicitly matching a boilerplate pattern.
    """
    if not jd:
        return jd

    # ── 1. Strip markdown formatting ─────────────────────────────────────────
    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', jd)
    text = re.sub(r'_{1,2}([^_]+)_{1,2}', r'\1', text)
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)

    # ── 2. Boilerplate section headers — trigger skip mode ───────────────────
    _BOILERPLATE = re.compile(
        r'^(?:'
        r'about\s+(us|the\s+company|the\s+team|our\s+company|[a-z]{2,30})\b'
        r'|about\s+the\s+(role|position)'     # intro pitch — not requirements
        r'|who\s+we\s+are'
        r'|our\s+(story|mission|values?|culture|vision)'
        r'|company\s+overview'
        r'|why\s+(join\s+us|work\s+(here|with\s+us|for\s+us)|us|choose\s+us)'
        r'|what\s+we\s+offer'
        r'|what\s+makes\s+this\s+role\s+(different|unique|special|stand\s+out)'
        r'|what\s+sets\s+(us|this\s+role)\s+apart'
        r'|life\s+at\s+\w+'
        r'|compensation(\s+and\s+benefits?)?'
        r'|benefits?\s+(&|and)\s+perks?'
        r'|perks?\s+(&|and)\s+benefits?'
        r'|benefits?\s*$'
        r'|perks?\s*$'
        r'|featured\s+benefits?'
        r'|what\s+you.ll\s+(get|receive|enjoy)'
        r'|additional\s+details?'
        r'|interview\s+(process|stages?|steps?)'
        r'|our\s+interview\s+process'
        r'|hiring\s+process'
        r'|how\s+we\s+(hire|interview|work)'
        r'|equal\s+(opportunity|employment)'
        r'|eeo\b'
        r'|diversity\s+(&|and)\s+inclusion'
        r'|we\s+are\s+an\s+equal'
        r'|salary\s+range'
        r'|pay\s+range'
        r'|total\s+(rewards?|compensation)'
        r'|application\s+(terms|process|note|deadline)'
        r'|please\s+(note|read)\b'
        r')\s*[:\-]?\s*$',
        re.IGNORECASE,
    )

    # ── 3. Keeper section headers — always exit skip mode ────────────────────
    _KEEPER = re.compile(
        r'^(?:'
        r'responsibilities?'
        r'|key\s+responsibilities?'
        r'|what\s+you.ll\s+(do|build|work\s+on|own|own\s+and\s+build)'
        r'|your\s+(role|impact|day[\s-]to[\s-]day)'
        r'|the\s+role'
        r'|role\s+overview'
        r'|day[\s-]to[\s-]day'
        r'|requirements?'
        r'|qualifications?'
        r'|required\s+qualifications?'
        r'|preferred\s+qualifications?'
        r'|minimum\s+qualifications?'
        r'|basic\s+qualifications?'
        r'|desired\s+qualifications?'
        r'|what\s+(you|we).re?\s+looking\s+for'
        r'|what\s+you.ll\s+bring'
        r'|what\s+you\s+bring'
        r'|must[\s-]have'
        r'|nice[\s-]to[\s-]have'
        r'|skills?\s+(required|needed|we\s+need)?'
        r'|technical\s+skills?'
        r'|core\s+skills?'
        r'|experience'
        r'|education'
        r'|about\s+the\s+job'                 # "About the job" kept; "About the role/position" is boilerplate
        r'|job\s+(description|summary|overview)'
        r'|position\s+summary'
        r'|you\s+will'
        r'|we\s+are\s+looking'
        r'|tech\s+stack'
        r'|stack'
        r'|requirements\s+added\s+by.*'         # LinkedIn structured requirements block
        r')\s*[:\-]?\s*$',
        re.IGNORECASE,
    )

    lines = text.split('\n')
    output_lines = []
    skip_section = False

    for line in lines:
        stripped = line.strip()
        # A "section header" is a standalone short line (not a bullet or long sentence)
        is_header = bool(stripped) and len(stripped) < 70 and not stripped.startswith(('-', '*', '•', '·'))

        if is_header and _KEEPER.match(stripped):
            skip_section = False
            output_lines.append(line)
            continue

        if is_header and _BOILERPLATE.match(stripped):
            skip_section = True
            continue

        if skip_section:
            # Only a confirmed KEEPER header exits skip mode — never unknown lines
            # This prevents salary/perks content lines from leaking back
            continue

        output_lines.append(line)

    cleaned = '\n'.join(output_lines)

    # ── 4. Collapse excessive blank lines ────────────────────────────────────
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    # ── 5. Strip trailing EEO / application-note paragraphs (up to last 15 lines)
    _EEO_PHRASES = [
        'equal opportunity', 'eeo', 'affirmative action', 'discrimination',
        'applicants will receive consideration', 'regardless of race',
        'regardless of gender', 'protected veteran', 'disability status',
        'visa sponsorship', 'authorized to work', 'work authorization',
        'unsubscribe', 'resume database', 'resume submission',
        'background check', 'drug test',
    ]
    final_lines = cleaned.rstrip().split('\n')
    removed = 0
    while final_lines and removed < 15:
        last = final_lines[-1].lower()
        if any(phrase in last for phrase in _EEO_PHRASES):
            final_lines.pop()
            removed += 1
        else:
            break
    cleaned = '\n'.join(final_lines).strip()

    print(f"[tailor_service] JD cleaned: {len(jd)} -> {len(cleaned)} chars")
    return cleaned


def _safe_filename(username: str, company: str) -> str:
    """Produce a filesystem-safe filename like 'john_doe_google'."""
    def clean(s: str) -> str:
        s = s.strip().lower()
        s = re.sub(r'[^\w\s-]', '', s)
        s = re.sub(r'[\s-]+', '_', s)
        return s[:40]
    return f"{clean(username)}_{clean(company)}"


def _generate_pdf_from_text(resume_text: str, out_path: Path) -> Optional[Path]:
    """Generate a clean PDF from plain-text resume using reportlab (pdflatex fallback)."""
    try:
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib import colors

        doc = SimpleDocTemplate(
            str(out_path),
            pagesize=LETTER,
            leftMargin=0.75 * inch,
            rightMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )
        styles = getSampleStyleSheet()
        heading_style = ParagraphStyle(
            "Heading",
            parent=styles["Normal"],
            fontSize=11,
            fontName="Helvetica-Bold",
            spaceAfter=2,
            textColor=colors.HexColor("#1a1a2e"),
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=10,
            fontName="Helvetica",
            leading=14,
            spaceAfter=1,
        )
        name_style = ParagraphStyle(
            "Name",
            parent=styles["Normal"],
            fontSize=16,
            fontName="Helvetica-Bold",
            spaceAfter=4,
            textColor=colors.HexColor("#1a1a2e"),
        )

        story = []
        _SECTION_HEADERS = {
            "EXPERIENCE", "EDUCATION", "SKILLS", "SUMMARY", "OBJECTIVE",
            "PROJECTS", "CERTIFICATIONS", "AWARDS", "PUBLICATIONS",
            "VOLUNTEER", "LANGUAGES", "INTERESTS", "REFERENCES",
        }

        lines = resume_text.split("\n")
        first_non_empty = True
        for line in lines:
            stripped = line.strip()
            if not stripped:
                story.append(Spacer(1, 4))
                continue
            # First non-empty line = name
            if first_non_empty:
                story.append(Paragraph(stripped, name_style))
                first_non_empty = False
            elif stripped.upper() in _SECTION_HEADERS or (len(stripped) < 40 and stripped.isupper()):
                story.append(Spacer(1, 6))
                story.append(Paragraph(stripped, heading_style))
            else:
                # Escape HTML special chars for reportlab
                safe = stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(safe, body_style))

        doc.build(story)
        print(f"[tailor_service] PDF generated via reportlab: {out_path}")
        return out_path
    except ImportError:
        print("[tailor_service] reportlab not installed — PDF generation skipped")
    except Exception as exc:
        print(f"[tailor_service] reportlab PDF generation failed: {exc}")
    return None


def _compile_pdf(tex_path: Path) -> Optional[Path]:
    """Run pdflatex on the .tex file. Returns pdf Path on success or None."""
    try:
        output_dir = tex_path.parent
        result = subprocess.run(
            [
                "pdflatex",
                "-interaction=nonstopmode",
                f"-output-directory={output_dir}",
                str(tex_path),
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        pdf_path = tex_path.with_suffix(".pdf")
        if pdf_path.exists():
            print(f"[tailor_service] PDF compiled: {pdf_path}")
            return pdf_path
        else:
            print(f"[tailor_service] pdflatex stdout: {result.stdout[-500:]}")
            print(f"[tailor_service] pdflatex stderr: {result.stderr[-500:]}")
    except FileNotFoundError:
        print("[tailor_service] pdflatex not found — install MiKTeX or TeX Live")
    except subprocess.TimeoutExpired:
        print("[tailor_service] pdflatex timed out")
    except Exception as exc:
        print(f"[tailor_service] pdflatex error: {exc}")
    return None
