import asyncio, sys, json, tempfile, subprocess, os
sys.path.insert(0, '..')
from backend.config import get_settings
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from cryptography.fernet import Fernet, InvalidToken

async def get_creds():
    s = get_settings()
    engine = create_async_engine(s.DATABASE_URL)
    async with engine.connect() as conn:
        r = await conn.execute(text(
            "SELECT linkedin_email, linkedin_password, openai_api_key "
            "FROM user_profiles WHERE email='mohammedazeezulla6996@gmail.com' LIMIT 1"
        ))
        row = r.fetchone()
    await engine.dispose()
    return row[0], row[1], row[2]

s = get_settings()
li_email, li_pass_raw, openai_key = asyncio.run(get_creds())

key = s.CREDENTIALS_KEY.strip()
fernet = Fernet(key.encode()) if key else None
try:
    li_pass = fernet.decrypt(li_pass_raw.encode()).decode() if fernet else li_pass_raw
except InvalidToken:
    li_pass = li_pass_raw

openai_key = openai_key or os.environ.get('OPENAI_API_KEY', '')
print(f'Login: {li_email} | pass len: {len(li_pass)} | openai: {"set" if openai_key else "MISSING"}')

overrides = {
    "secrets": {
        "username": li_email, "password": li_pass,
        "use_AI": True, "ai_provider": "openai",
        "llm_api_url": "https://api.openai.com/v1/",
        "llm_model": "gpt-4o-mini",
        "llm_api_key": openai_key,
        "stream_output": False,
    },
    "settings": {
        "run_in_background": False, "safe_mode": False,
        "disable_extensions": True, "tailor_resume": False,
        "jobezee_root": "C:/Users/azeez/PROJECTS/RESUME-MAKER/JOBEZEE",
    },
    "search": {
        "search_terms": ["AI ENGINEER"],
        "title_keywords": [], "current_experience": -1,
        "experience_level": ["Entry level"],
        "on_site": ["Remote"], "job_type": ["Full-time"],
        "salary": "", "location": [], "search_location": "",
        "easy_apply_only": True, "sort_by": "Most recent",
        "date_posted": "Any time", "companies": [],
    },
}

with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
    json.dump(overrides, f)
    tmp = f.name

bot_dir = os.path.join(os.path.dirname(__file__), '..', 'linkedin_bot')
result = subprocess.run(
    [sys.executable, '-u', 'linkedin_launcher.py', '--config', tmp],
    cwd=bot_dir, timeout=90, capture_output=True, text=True
)
out = result.stdout
print(out[-5000:] if len(out) > 5000 else out)
if result.stderr:
    print("STDERR:", result.stderr[-500:])
