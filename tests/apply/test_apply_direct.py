"""Quick test: run openai_runner directly with no location check."""
import sys, time
sys.path.insert(0, "src")

from applypilot import config
from applypilot.apply.chrome import launch_chrome, cleanup_worker, BASE_CDP_PORT
from applypilot.apply.openai_runner import run_openai_job
from applypilot.apply.dashboard import init_worker, update_state
from pathlib import Path
from datetime import datetime

config.ensure_dirs()
init_worker(0)

job = {
    "title": "Software Engineer",
    "url": "https://jobs.jobvite.com/tylertech/job/oN9IzfwX",
    "application_url": "https://jobs.jobvite.com/tylertech/job/oN9IzfwX",
    "site": "Tyler Technologies",
    "fit_score": 10,
    "full_description": "",
    "cover_letter_path": None,
}

resume_path = Path(r"C:\Users\azeez\.applypilot\tailored_resumes\MOHAMMED_AZEEZULLA.txt")
resume_text = resume_path.read_text(encoding="utf-8")

resume_pdf = r"C:\Users\azeez\.applypilot\tailored_resumes\MOHAMMED_AZEEZULLA.pdf"

prompt = f"""You are applying for a job on behalf of MOHAMMED AZEEZULLA.

APPLICANT PROFILE:
- Name: MOHAMMED AZEEZULLA
- Email: VERSATILE.ENGINE.2001@GMAIL.COM
- Phone: 9900609876
- Location: Dallas, TX, USA
- Work Authorization: Authorized to work in the US, no sponsorship needed

RESUME (excerpt):
{resume_text[:4000]}

TASK:
1. Navigate to: https://jobs.jobvite.com/tylertech/job/oN9IzfwX
2. Click Apply / Apply Now
3. Fill every required field using the applicant profile above.
4. Upload the resume PDF when a file upload field appears:
   - Step 1: browser_click the upload button/area.
   - Step 2: IMMEDIATELY call browser_file_upload with path: {resume_pdf}
   - NO other tool calls between click and upload.
   - If browser_file_upload returns "no modal state": use browser_evaluate with script `document.querySelector('input[type="file"]').click()` then immediately call browser_file_upload.
5. Submit the application.
6. After a successful submission output exactly one line: RESULT:APPLIED
   If blocked or unable to complete, output: RESULT:FAILED:reason

RULES:
- Skip location eligibility checks — apply regardless of location.
- Do NOT skip any required fields.
- This is a REAL run — do click Submit.
"""

worker_log = config.LOG_DIR / "worker-0.log"
ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
log_header = f"\n{'='*60}\n[{ts}] Tyler Tech direct test\n{'='*60}\n"

port = BASE_CDP_PORT
chrome_proc = launch_chrome(0, port=port, headless=False)
try:
    update_state(0, status="applying", job_title="Software Engineer",
                 company="Tyler Technologies", score=10,
                 start_time=time.time(), actions=0, last_action="starting")
    status, ms = run_openai_job(
        job=job, port=port, worker_id=0, model="gpt-4o",
        agent_prompt=prompt, worker_log=worker_log,
        log_header=log_header, dry_run=False,
    )
    print(f"\nResult: {status} ({ms}ms)")
finally:
    cleanup_worker(0, chrome_proc)
