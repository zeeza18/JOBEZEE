"""
test_tailor_pipeline.py — end-to-end test for the tailor -> tex -> pdf -> upload flow.

Tests:
  1. JD cleaning (boilerplate removal, key sections kept)
  2. Tailor crew (resume + JD -> tailored text + .tex file)
  3. pdflatex compilation (.tex -> .pdf)
  4. Frontend log-line visibility (are the logged lines visible in the UI?)

Run from JOBEZEE root:
    python test_tailor_pipeline.py
or on Hetzner:
    /opt/jobezee/.venv/bin/python test_tailor_pipeline.py
"""
from __future__ import annotations
import os, sys, shutil, subprocess, tempfile
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))
os.chdir(_ROOT)

# -- helpers -------------------------------------------------------------------

PASS = "[OK] PASS"
FAIL = "[FAIL] FAIL"
WARN = "[WARN] WARN"

def section(title: str):
    print(f"\n{'-'*60}")
    print(f"  {title}")
    print('-'*60)

def ok(msg):  print(f"  {PASS}  {msg}")
def fail(msg): print(f"  {FAIL}  {msg}")
def warn(msg): print(f"  {WARN}  {msg}")

# -- Sample data ---------------------------------------------------------------

SAMPLE_JD = """
About Us
We are a leading AI company building the future. Founded in 2018, we have raised $200M
and are passionate about our mission to make AI accessible to all.

Why Join Us
- Competitive salary
- Unlimited PTO
- Free lunches

About the Role
We are looking for a talented AI Engineer to join our growing team.

Responsibilities
- Design and implement ML pipelines using Python and PyTorch
- Build and deploy transformer models (GPT, BERT) to production
- Collaborate with data scientists to improve model accuracy
- Write clean, tested, production-grade code

Requirements
- 3+ years Python experience
- Strong background in deep learning (PyTorch or TensorFlow)
- Experience with LLMs, RAG, or embedding models
- Familiarity with MLOps tools (MLflow, W&B)
- Strong problem-solving and communication skills

Preferred Qualifications
- Experience with distributed training (DeepSpeed, FSDP)
- Published research or open-source contributions
- Knowledge of Kubernetes and cloud platforms (AWS/GCP)

Benefits & Perks
- Health, dental, vision insurance
- 401(k) matching
- Remote-first culture

Equal Opportunity Employer
We are an equal opportunity employer and do not discriminate regardless of race, color,
religion, gender, national origin, or disability status.
"""

SAMPLE_RESUME = """Mohammed Azeezulla
azeez@example.com | github.com/azeez | linkedin.com/in/azeez

SUMMARY
AI Engineer with 4 years of experience building ML systems and LLM-powered products.

EXPERIENCE
AI Engineer — TechCorp (2022–present)
- Built RAG pipeline using OpenAI embeddings + Pinecone, reducing query latency 40%
- Fine-tuned BERT models for NER tasks achieving 92% F1 on production data
- Deployed PyTorch models to AWS SageMaker serving 1M+ requests/day

Software Engineer — StartupXYZ (2020–2022)
- Developed Python microservices handling 500k daily events
- Built CI/CD pipelines with GitHub Actions and Docker

SKILLS
Python, PyTorch, TensorFlow, LangChain, OpenAI API, AWS, Docker, Kubernetes, MLflow

EDUCATION
B.S. Computer Science — State University (2020)
"""


# ==============================================================================
# TEST 1: JD Cleaning
# ==============================================================================
section("TEST 1 — JD Cleaning")

try:
    from backend.services.tailor_service import _clean_job_description
    cleaned = _clean_job_description(SAMPLE_JD)

    # Check boilerplate removed
    boilerplate_removed = all(phrase not in cleaned for phrase in [
        "We are a leading AI company",  # About Us
        "Unlimited PTO",                # Why Join Us
        "Free lunches",                 # Why Join Us
        "Health, dental, vision",       # Benefits
        "equal opportunity employer",   # EEO
        "401(k)",                       # Benefits
    ])

    # Check key sections kept
    key_kept = all(phrase in cleaned for phrase in [
        "ML pipelines",          # Responsibilities
        "PyTorch",               # Requirements
        "deep learning",         # Requirements
        "LLMs",                  # Requirements
        "distributed training",  # Preferred
    ])

    print(f"\n  Original JD : {len(SAMPLE_JD):,} chars")
    print(f"  Cleaned JD  : {len(cleaned):,} chars  ({100*len(cleaned)//len(SAMPLE_JD)}% of original)")
    print(f"\n  Cleaned output:\n")
    for ln in cleaned.strip().split('\n'):
        print(f"    {ln}")

    if boilerplate_removed:
        ok("All boilerplate sections removed (About Us, Benefits, EEO, etc.)")
    else:
        fail("Some boilerplate still present in cleaned JD")

    if key_kept:
        ok("All key sections kept (Responsibilities, Requirements, Preferred)")
    else:
        fail("Some key content was incorrectly removed")

except Exception as e:
    fail(f"JD cleaning failed: {e}")
    import traceback; traceback.print_exc()


# ==============================================================================
# TEST 2: Tailor Crew (JD + Resume -> tailored text + .tex)
# ==============================================================================
section("TEST 2 — Tailor Crew (AI tailoring + .tex generation)")

openai_key = os.environ.get("OPENAI_API_KEY", "")
if not openai_key:
    # Try loading from hetzner .env
    env_file = _ROOT / "hetzner_worker" / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("OPENAI_API_KEY="):
                openai_key = line.split("=", 1)[1].strip()
                break

if not openai_key:
    warn("OPENAI_API_KEY not set — skipping crew test (set env var to run)")
    tex_path = None
    tailored_text = ""
else:
    try:
        from PHASE2_JOB_TAILOR.crew import ResumeCrew

        out_dir = Path(tempfile.mkdtemp(prefix="jobezee_test_"))
        print(f"  Output dir: {out_dir}")

        from backend.services.tailor_service import _clean_job_description
        clean_jd = _clean_job_description(SAMPLE_JD)

        crew = ResumeCrew(openai_api_key=openai_key)
        result = crew.run_tailoring_process(clean_jd, SAMPLE_RESUME, None, output_dir=out_dir)

        tailored_text = result.get("final_resume", "")
        score         = result.get("final_score", "N/A")
        latex_sum     = result.get("latex_summary", {})
        tex_path_str  = latex_sum.get("output_tex_path", "")
        tex_path      = Path(tex_path_str) if tex_path_str else None

        print(f"\n  Score: {score}")
        print(f"  Tailored text length: {len(tailored_text)} chars")
        print(f"  .tex path: {tex_path}")

        if tailored_text:
            ok(f"Got tailored resume text ({len(tailored_text)} chars)")
        else:
            fail("Crew returned empty tailored text")

        if tex_path and tex_path.exists():
            ok(f".tex file created: {tex_path.name}")
        else:
            fail(f".tex file missing (path: {tex_path})")

        # Check name preserved
        if "Mohammed Azeezulla" in tailored_text or "Azeezulla" in tailored_text:
            ok("Candidate name preserved in tailored resume")
        else:
            warn("Candidate name NOT found in tailored resume — check crew prompt")

    except Exception as e:
        fail(f"Crew tailoring failed: {e}")
        import traceback; traceback.print_exc()
        tailored_text = ""
        tex_path = None


# ==============================================================================
# TEST 3: pdflatex compilation
# ==============================================================================
section("TEST 3 — pdflatex: .tex -> .pdf")

pdflatex = shutil.which("pdflatex")
if not pdflatex:
    fail("pdflatex not found in PATH — PDF compilation will fail on this machine")
else:
    ok(f"pdflatex found: {pdflatex}")
    if tex_path and tex_path.exists():
        try:
            result = subprocess.run(
                [pdflatex, "-interaction=nonstopmode",
                 f"-output-directory={tex_path.parent}", str(tex_path)],
                capture_output=True, text=True, timeout=120, check=False,
            )
            pdf_path = tex_path.with_suffix(".pdf")
            if pdf_path.exists() and pdf_path.stat().st_size > 1000:
                ok(f"PDF compiled: {pdf_path.name} ({pdf_path.stat().st_size:,} bytes)")
                # Rename to company-specific name (like the bot does)
                named_pdf = tex_path.parent / "TestCompany_tailored_resume.pdf"
                shutil.copy2(pdf_path, named_pdf)
                ok(f"Renamed to: {named_pdf.name}")
            else:
                fail(f"pdflatex ran but no valid PDF produced")
                print(f"\n  --- pdflatex stdout (last 30 lines) ---")
                for ln in result.stdout.split('\n')[-30:]:
                    print(f"  {ln}")
                if result.stderr:
                    print(f"\n  --- pdflatex stderr ---")
                    print(result.stderr[:1000])
        except Exception as e:
            fail(f"pdflatex compilation error: {e}")
    else:
        warn("No .tex file from TEST 2 — skipping compilation (needs OPENAI_API_KEY)")


# ==============================================================================
# TEST 4: Frontend log-line visibility
# ==============================================================================
section("TEST 4 — Frontend log-line visibility")

# Simulate all the lines the bot prints during tailor flow
# and check if they match the parse() patterns (JS logic reimplemented in Python)
import re as _re

def parse_js(raw: str) -> tuple[str, str] | None:
    """Mirror of AutoApplyPage.tsx parse() function."""
    # noise
    if _re.search(r'DAILY_LIMIT_REACHED', raw, _re.I): return None
    if _re.search(r'runAiBot\.py started', raw, _re.I): return None
    if _re.search(r'importing open_chrome', raw, _re.I): return None
    if _re.search(r'\[JOBEZEE\] Saved LinkedIn session cookies found', raw, _re.I): return None
    if _re.search(r'\[JOBEZEE\] (experience_level|on_site|job_type|salary)', raw, _re.I): return None
    if _re.search(r'Extracted about company', raw, _re.I): return None
    if _re.search(r'Failed to scroll to About Company', raw, _re.I): return None
    if _re.search(r'HR info was not given', raw, _re.I): return None
    if _re.search(r'Time Posted:|Applicants:', raw, _re.I): return None
    if _re.search(r'Setting search location', raw, _re.I): return None
    if _re.search(r"Didn't find Sign in link", raw, _re.I): return None
    if _re.search(r'\[Search\] Typed|Typeahead not found|Feed step error', raw, _re.I): return None
    if _re.search(r'\[Filters\] (Looking|Found|Setting)', raw, _re.I): return None

    m = _re.search(r'Successfully saved "(.+?)\s*\|\s*(.+?)"\s*job', raw, _re.I)
    if m: return ('emerald', f'OK Applied — {m.group(1)} at {m.group(2)}')

    m = _re.search(r'Trying to Apply to "(.+?)\s*\|\s*(.+?)"\s*job', raw, _re.I)
    if m: return ('white', f'Applying -> {m.group(1)} at {m.group(2)}')

    m = _re.search(r'Already applied to "(.+?)\s*\|\s*(.+?)"\s*job', raw, _re.I)
    if m: return ('slate-600', f'Already applied — {m.group(1)} at {m.group(2)}')

    m = _re.search(r'[Ss]kipping "(.+?)\s*\|\s*(.+?)"', raw)
    if m: return ('slate-500', f'Skipped — {m.group(1)} at {m.group(2)}')

    if _re.search(r"title doesn.*t match|Blacklisted|previously rejected", raw, _re.I):
        m = _re.search(r'"(.+?)\s*\|\s*(.+?)"', raw)
        return ('slate-600', f'Skipped — {m.group(1)} at {m.group(2)}' if m else 'Skipped irrelevant job')

    if _re.search(r'Failed to apply|Failed to Easy apply|Easy apply failed', raw, _re.I):
        m = _re.search(r'"(.+?)\s*\|\s*(.+?)"', raw)
        return ('red', f'Failed — {m.group(1)} at {m.group(2)}' if m else 'Failed to apply')

    if _re.search(r'Injecting .+ cookies', raw, _re.I): return ('cyan', 'Restoring LinkedIn session…')
    if _re.search(r'Cookies injected', raw, _re.I): return ('cyan', 'LinkedIn session active OK')
    if _re.search(r'Cookie injection failed', raw, _re.I): return ('cyan', 'Session expired — logging in fresh…')
    if _re.search(r'logging in fresh', raw, _re.I): return ('cyan', 'Logging in to LinkedIn…')
    if _re.search(r'Login successful', raw, _re.I): return ('cyan', 'Logged in OK')
    if _re.search(r'login attempt failed|Couldn.*t Login', raw, _re.I): return ('red', 'Login failed — check credentials')
    if _re.search(r'waiting for manual login', raw, _re.I): return ('amber', 'Waiting for manual login…')

    if _re.search(r'Chrome session ready', raw, _re.I): return ('slate', 'Browser launched OK')
    if _re.search(r'Slot available.*starting bot', raw, _re.I): return ('cyan', 'Worker slot available — starting')
    if _re.search(r'Bot job accepted', raw, _re.I): return ('cyan', 'Bot started on worker OK')

    m = _re.search(r'\[Search\] Navigating to Jobs', raw, _re.I)
    if m:
        role = _re.search(r'for:\s*"(.+?)"', raw, _re.I)
        return ('blue', f'Searching LinkedIn for: {role.group(1) if role else "jobs"}')
    if _re.search(r'\[Search\] Ready', raw, _re.I): return ('blue', 'Search results loaded OK')
    if _re.search(r'\[Filters\] Filters applied', raw, _re.I): return ('blue', 'Filters applied OK')
    if _re.search(r'\[Jobs\] Job listings not found', raw, _re.I): return ('amber', 'No jobs found for this search term')

    if _re.search(r'\[Tailor\]', raw, _re.I):
        text = _re.sub(r'\[Tailor\]\s*', '', raw, flags=_re.I)
        return ('violet', f'Tailoring: {text}')

    if _re.search(r'\[Resume\]', raw, _re.I):
        return ('blue', raw.replace('[Resume] ', 'Resume: '))

    if _re.search(r'\[CAPTCHA\] Solved', raw, _re.I): return ('emerald', 'CAPTCHA solved OK')
    if _re.search(r'\[CAPTCHA\]', raw, _re.I): return ('amber', 'Handling verification…')

    if _re.search(r'daily.*apply.*limit|Easy Apply.*limit.*reached', raw, _re.I):
        return ('amber', 'LinkedIn daily Easy Apply limit reached')

    if _re.search(r'\[JOBEZEE\] ERROR:|WORKER ERROR', raw, _re.I):
        return ('red', _re.sub(r'\[JOBEZEE\]\s*', '', raw, flags=_re.I))
    if _re.search(r'\[ERROR\]', raw, _re.I):
        return ('red', _re.sub(r'\[ERROR\]\s*', '', raw, flags=_re.I))

    if _re.search(r'Bot stopped by user', raw, _re.I): return ('amber', 'Bot stopped by user')
    if _re.search(r'Bot finished', raw, _re.I): return ('slate', 'Bot finished')

    if _re.search(r'\[JOBEZEE\] Using name:', raw, _re.I): return ('slate', raw.replace('[JOBEZEE] ', ''))
    if _re.search(r'\[JOBEZEE\] search_terms', raw, _re.I):
        m = _re.search(r'search_terms\s*=\s*(.+)', raw)
        return ('slate', f'Roles: {m.group(1) if m else ""}')
    if _re.search(r'\[JOBEZEE\] tailor_resume', raw, _re.I): return ('slate', raw.replace('[JOBEZEE] ', ''))

    if _re.search(r'Jobs Easy Applied:', raw, _re.I): return ('emerald', raw.strip())
    if _re.search(r'Total applied', raw, _re.I): return ('emerald', raw.strip())
    if _re.search(r'Failed jobs:|Irrelevant jobs skipped', raw, _re.I): return ('slate', raw.strip())

    # catch-all for [TAG] lines
    m = _re.match(r'^\[([A-Z][A-Za-z0-9_\- ]+)\]\s+(.+)', raw)
    if m: return ('slate-500', f'{m.group(1)}: {m.group(2)}')

    return None

# All lines the bot actually prints during a tailor+apply run
BOT_LINES = [
    # startup
    "[JOBEZEE] Using name: Mohammed Azeezulla",
    "[JOBEZEE] search_terms = ['ai engineer']",
    "[JOBEZEE] tailor_resume = ON",
    "[Resume] Sending: MOHAMMED_AZEEZULLA_RESUME.pdf",
    "[JOBEZEE] Bot job accepted by Hetzner worker — streaming logs...",
    "[Bot] runAiBot.py started",
    "[Bot] importing open_chrome (starts Chrome)...",
    "[Bot] Chrome session ready",
    # login
    "[JOBEZEE] Injecting 42 saved LinkedIn session cookies...",
    "Cookies injected successfully",
    "Login successful!",
    # search
    '[Search] Navigating to Jobs search URL for: "ai engineer"',
    "[Search] Ready — URL: https://www.linkedin.com/jobs/search/?keywords=ai+engineer",
    "[Filters] Looking for \"All filters\" button...",
    "[Filters] Filters applied — Show results clicked",
    # job loop - skips
    'Skipping "Data Analyst | Boring Corp" — title doesn\'t match AI keywords. Job ID: 111!',
    'Already applied to "AI Engineer | Google" job. Job ID: 222!',
    # job loop - applying with tailor
    'Trying to Apply to "AI Engineer | OpenAI" job. Job ID: 333',
    "[Tailor] Tailoring resume for this job...",
    "[Tailor] JD: 2500 chars -> 1100 chars after cleaning",
    "[Tailor] Done (score: 87) | Name 'Mohammed Azeezulla' in tailored resume: YES",
    "[Tailor] PDF ready -> OpenAI_tailored_resume.pdf",
    'Successfully saved "AI Engineer | OpenAI" job. Job ID: 333 info',
    # another job
    'Trying to Apply to "ML Engineer | Anthropic" job. Job ID: 444',
    "[Tailor] Tailoring resume for this job...",
    "[Tailor] Done (score: 92) | Name 'Mohammed Azeezulla' in tailored resume: YES",
    "[Tailor] PDF ready -> Anthropic_tailored_resume.pdf",
    'Successfully saved "ML Engineer | Anthropic" job. Job ID: 444 info',
    # failed
    'Failed to Easy apply! "Senior Engineer | XYZ Corp" job. Job ID: 555',
    # end
    "Jobs Easy Applied: 2",
    "Irrelevant jobs skipped: 1",
    "[JOBEZEE] Bot finished (exit code 0)",
]

print(f"\n  {'RAW LINE':<55}  {'VISIBLE AS'}")
print(f"  {'-'*55}  {'-'*45}")
hidden = []
shown = []
for line in BOT_LINES:
    result = parse_js(line)
    display = line[:52] + "..." if len(line) > 55 else line.ljust(55)
    if result:
        color, text = result
        shown.append(line)
        print(f"  {display}  [{color}] {text}")
    else:
        hidden.append(line)
        print(f"  {display}  (hidden)")

print(f"\n  Shown  : {len(shown)}/{len(BOT_LINES)} lines")
print(f"  Hidden : {len(hidden)}/{len(BOT_LINES)} lines (noise)")

critical_visible = [
    'Trying to Apply to "AI Engineer | OpenAI" job. Job ID: 333',
    '[Tailor] PDF ready -> OpenAI_tailored_resume.pdf',
    'Successfully saved "AI Engineer | OpenAI" job. Job ID: 333 info',
]
for line in critical_visible:
    if parse_js(line):
        ok(f"VISIBLE: {line[:70]}")
    else:
        fail(f"HIDDEN (should be visible): {line[:70]}")

print()
print("  ================================")
print("  PIPELINE SUMMARY")
print("  ================================")
