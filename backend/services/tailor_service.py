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

def start_tailor_job(job_id: str, job_description: str, resume: str) -> None:
    """Launch crew in a daemon thread (plain text resume — for TailorPage)."""
    t = threading.Thread(
        target=_run_tailor_job,
        args=(job_id, job_description, resume),
        daemon=True,
    )
    t.start()


def _run_tailor_job(job_id: str, job_description: str, resume: str) -> None:
    """Runs inside background thread."""
    with _lock:
        _jobs[job_id]["status"] = "running"

    def progress_callback(data: Dict[str, Any]) -> None:
        with _lock:
            _jobs[job_id]["progress"].append(data)
            if data.get("event") == "round_complete":
                score = data.get("evaluation", {}).get("score")
                if score is not None:
                    _jobs[job_id]["score"] = score

    try:
        from PHASE2_JOB_TAILOR.crew import ResumeCrew

        crew = ResumeCrew()
        result = crew.run_tailoring_process(_clean_job_description(job_description), resume, progress_callback)

        final_score = result.get("final_score")
        final_resume = result.get("final_resume", "")
        latex_summary = result.get("latex_summary", {})

        tex_path: Optional[Path] = None
        pdf_path: Optional[Path] = None

        if latex_summary.get("status") == "success":
            candidate = _OUTPUT_DIR / "final_tailored_resume.tex"
            if candidate.exists():
                tex_path = candidate
                compiled = _compile_pdf(tex_path)
                if compiled:
                    pdf_path = compiled

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
) -> None:
    """Launch crew for a specific pulled job using the user's uploaded resume."""
    t = threading.Thread(
        target=_run_tailor_for_job,
        args=(tailor_job_id, job_description, resume_url, username, company),
        daemon=True,
    )
    t.start()


def _run_tailor_for_job(
    tailor_job_id: str,
    job_description: str,
    resume_url: str,
    username: str,
    company: str,
) -> None:
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

        from PHASE2_JOB_TAILOR.crew import ResumeCrew

        crew = ResumeCrew()
        result = crew.run_tailoring_process(clean_jd, resume_text, progress_callback)

        final_score = result.get("final_score")
        final_resume = result.get("final_resume", "")
        latex_summary = result.get("latex_summary", {})

        safe_name = _safe_filename(username, company)
        job_dir = _JOB_OUTPUTS / tailor_job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        tex_path: Optional[Path] = None
        pdf_path: Optional[Path] = None

        if latex_summary.get("status") == "success":
            src_tex = _OUTPUT_DIR / "final_tailored_resume.tex"
            if src_tex.exists():
                dest_tex = job_dir / f"{safe_name}.tex"
                shutil.copy2(src_tex, dest_tex)
                tex_path = dest_tex
                compiled = _compile_pdf(dest_tex)
                if compiled:
                    pdf_path = compiled

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

    Removes:
    - Markdown bold/italic/heading markers
    - "About [company/us/team]" intro sections
    - Benefits / perks sections
    - EEO / diversity boilerplate
    - Repeated whitespace

    Keeps: responsibilities, requirements, qualifications, skills, 'what you'll do'.
    """
    if not jd:
        return jd

    # ── 1. Strip markdown formatting ─────────────────────────────────────────
    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', jd)   # **bold** / *italic*
    text = re.sub(r'_{1,2}([^_]+)_{1,2}', r'\1', text)    # __bold__ / _italic_
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)  # headings

    # ── 2. Split into sections by blank lines / common headers ───────────────
    # Identify boilerplate section headers (case-insensitive)
    _BOILERPLATE_HEADERS = re.compile(
        r'^(?:'
        r'about\s+(us|the\s+company|the\s+team|zillow|our\s+company|[a-z]+)'
        r'|who\s+we\s+are'
        r'|our\s+story'
        r'|our\s+mission'
        r'|company\s+overview'
        r'|why\s+(join\s+us|work\s+(here|with\s+us)|us)'
        r'|what\s+we\s+offer'
        r'|compensation\s+and\s+benefits?'
        r'|benefits?\s+(&|and)\s+perks?'
        r'|perks?\s+(&|and)\s+benefits?'
        r'|benefits?'
        r'|perks?'
        r'|equal\s+opportunity'
        r'|eeo\b'
        r'|diversity\s+(&|and)\s+inclusion'
        r'|we\s+are\s+an\s+equal'
        r'|salary\s+range'
        r'|pay\s+range'
        r')\s*[:\-]?\s*$',
        re.IGNORECASE,
    )

    # Identify keeper section headers (we always keep lines after these)
    _KEEPER_HEADERS = re.compile(
        r'^(?:'
        r'responsibilities?'
        r'|what\s+you\'?ll?\s+do'
        r'|what\s+you\'?ll?\s+build'
        r'|what\s+you\'?ll?\s+work\s+on'
        r'|your\s+role'
        r'|the\s+role'
        r'|role\s+overview'
        r'|requirements?'
        r'|qualifications?'
        r'|required\s+qualifications?'
        r'|preferred\s+qualifications?'
        r'|minimum\s+qualifications?'
        r'|basic\s+qualifications?'
        r'|what\s+(you|we)\'?re?\s+looking\s+for'
        r'|must[\s-]have'
        r'|nice[\s-]to[\s-]have'
        r'|skills?'
        r'|technical\s+skills?'
        r'|experience'
        r'|education'
        r'|key\s+responsibilities?'
        r'|job\s+description'
        r'|about\s+the\s+role'
        r'|about\s+the\s+job'
        r'|job\s+summary'
        r'|position\s+summary'
        r')\s*[:\-]?\s*$',
        re.IGNORECASE,
    )

    lines = text.split('\n')
    output_lines = []
    skip_section = False
    found_keeper = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Check if this is a section header (short line, title-like)
        is_header = stripped and len(stripped) < 80 and not stripped.startswith('-')

        if is_header and _KEEPER_HEADERS.match(stripped):
            skip_section = False
            found_keeper = True
            output_lines.append(line)
            continue

        if is_header and _BOILERPLATE_HEADERS.match(stripped):
            # Only skip if we've already found real content, or it's clearly boilerplate
            skip_section = True
            continue

        if skip_section:
            # Stop skipping when we hit the next substantive section header
            if is_header and stripped:
                # Heuristic: if next header looks like a keeper, stop skipping
                if _KEEPER_HEADERS.match(stripped):
                    skip_section = False
                    found_keeper = True
                    output_lines.append(line)
                # If unknown header, tentatively stop skipping (don't throw away unknowns)
                elif not _BOILERPLATE_HEADERS.match(stripped):
                    skip_section = False
                    output_lines.append(line)
            continue

        output_lines.append(line)

    cleaned = '\n'.join(output_lines)

    # ── 3. Collapse excessive blank lines ────────────────────────────────────
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    # ── 4. Strip trailing EEO paragraphs (last 10 lines) ─────────────────────
    _EEO_PHRASES = [
        'equal opportunity', 'eeo', 'affirmative action',
        'discrimination', 'applicants will receive consideration',
        'regardless of race', 'regardless of gender',
    ]
    final_lines = cleaned.rstrip().split('\n')
    while final_lines:
        last = final_lines[-1].lower()
        if any(phrase in last for phrase in _EEO_PHRASES):
            final_lines.pop()
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
