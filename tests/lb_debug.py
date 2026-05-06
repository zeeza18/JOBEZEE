import sys, os
sys.path.insert(0, ".")
from backend.services.resume_analysis_service import _resolve_opusmax_key, OPUSMAX_BASE_URL
import anthropic

key = _resolve_opusmax_key()
print("KEY:", key[:20] if key else "NONE")
print("BASE_URL:", OPUSMAX_BASE_URL)

kw = {}
if key and key.startswith("sk-ant-opm"):
    kw["base_url"] = OPUSMAX_BASE_URL
c = anthropic.Anthropic(api_key=key, **kw)
try:
    r = c.messages.create(
        model="claude-opus-4-7",
        max_tokens=50,
        messages=[{"role": "user", "content": "reply with just the word: ok"}]
    )
    txt = next((b.text for b in r.content if hasattr(b, "text")), "")
    print("API OK:", txt[:80])
except Exception as e:
    print("API FAIL:", type(e).__name__, str(e)[:300])
