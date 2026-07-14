import sys, os
sys.path.insert(0, ".")
from backend.services.resume_analysis_service import _resolve_claude_key
import anthropic

key = _resolve_claude_key()
print("KEY:", key[:20] if key else "NONE")

c = anthropic.Anthropic(api_key=key)
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
