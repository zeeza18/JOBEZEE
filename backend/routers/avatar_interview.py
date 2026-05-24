"""
Avatar Interview API — TTS (edge_tts), STT (OpenAI Whisper), and AI conversation for Sophia.

Endpoints
─────────
POST /api/avatar/tts    — text → speech (Sophia voice, base64 mp3)
POST /api/avatar/stt    — audio file → transcript (OpenAI Whisper)
POST /api/avatar/chat   — AI conversation turn (Sophia persona + guided questions)
"""
from __future__ import annotations

import base64
import io
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from ..auth import get_current_user
from ..models import User
from ..config import get_settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/avatar", tags=["avatar-interview"])

SOPHIA_PERSONA = (
    "You are Sophia, a warm but professional HR interviewer at a top tech company. "
    "You are conducting a mock interview to help a candidate prepare. "
    "Ask one focused question at a time. React naturally to the candidate's answers — "
    "a brief genuine acknowledgement, then move to the next question. "
    "Keep every response under 60 words. No bullet points, no markdown, no lists. "
    "Be encouraging but realistic. This is practice for a real interview."
)


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    input: dict
    voice: dict = {}
    audioConfig: dict = {}


class ChatMessage(BaseModel):
    role: str   # "interviewer" | "candidate"
    text: str


class ChatRequest(BaseModel):
    questions: list[dict] = []      # pre-generated from /api/interview/generate
    history: list[ChatMessage] = []
    candidate_answer: str = ""
    round_type: str = "mid"


class CodingHintRequest(BaseModel):
    problem: str
    current_code: str
    hints: list[str] = []
    hint_index: int = 0


# ── TTS ───────────────────────────────────────────────────────────────────────

@router.post("/tts")
async def text_to_speech(req: TTSRequest) -> dict:
    """edge_tts → Sophia voice (en-US-JennyNeural). Returns {audioContent: base64}."""
    text = req.input.get("text", "").strip()
    if not text:
        return {"audioContent": "", "timepoints": []}
    try:
        import edge_tts  # lazy import — only needed at runtime
        communicate = edge_tts.Communicate(text, "en-US-JennyNeural")
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        return {"audioContent": base64.b64encode(buf.getvalue()).decode(), "timepoints": []}
    except Exception as exc:
        log.error("[Avatar TTS] %s", exc)
        raise HTTPException(502, f"TTS failed: {exc}")


# ── STT ───────────────────────────────────────────────────────────────────────

@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """OpenAI Whisper API → transcript string."""
    cfg = get_settings()
    api_key = (cfg.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(503, "OPENAI_API_KEY not configured")

    audio_bytes = await audio.read()
    filename = audio.filename or "recording.webm"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": (filename, audio_bytes, audio.content_type or "audio/webm")},
                data={"model": "whisper-1", "language": "en"},
            )
        resp.raise_for_status()
        return {"transcript": resp.json().get("text", "").strip()}
    except httpx.HTTPStatusError as exc:
        log.error("[Avatar STT] OpenAI %s: %s", exc.response.status_code, exc.response.text[:200])
        raise HTTPException(502, f"STT failed: {exc.response.status_code}")
    except Exception as exc:
        log.error("[Avatar STT] %s", exc)
        raise HTTPException(502, f"STT failed: {exc}")


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def avatar_chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Sophia's next turn, guided by the pre-generated question list."""
    cfg = get_settings()
    api_key = (cfg.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(503, "OPENAI_API_KEY not configured")

    interviewer_turns = sum(1 for m in req.history if m.role == "interviewer")
    questions = req.questions or []

    # Detect code submission in the most recent candidate message
    last_candidate = next(
        (m.text for m in reversed(req.history) if m.role == "candidate"), ""
    )
    is_code_submission = last_candidate.startswith("[CODE SUBMITTED]")

    system = SOPHIA_PERSONA
    if is_code_submission:
        # Parse pass count from message like "[CODE SUBMITTED] 2/3 test cases passed."
        import re
        m = re.search(r"(\d)/3", last_candidate)
        passed_count = int(m.group(1)) if m else 0
        if passed_count == 3:
            reaction = (
                "The candidate submitted code and ALL 3 test cases passed. "
                "React with genuine excitement: 'Oh nice! All three test cases passed — well done!' "
                "Keep it under 25 words."
            )
        elif passed_count == 2:
            reaction = (
                "The candidate submitted code and 2/3 test cases passed. "
                "Say something like: 'Good effort! Two out of three — that last edge case is tricky, "
                "you were close.' Under 30 words."
            )
        elif passed_count == 1:
            reaction = (
                "The candidate submitted code and only 1/3 test cases passed. "
                "Say: 'You got one case right. The approach was almost there — "
                "let me move us forward.' Under 30 words."
            )
        else:
            reaction = (
                "The candidate submitted code and 0/3 test cases passed. "
                "Gently explain: 'None of the tests passed this time — that happens. "
                "The key is [brief 1-sentence approach hint]. Let's keep going.' Under 40 words."
            )
        system += f"\n\n{reaction}"

    if interviewer_turns < len(questions):
        next_q = questions[interviewer_turns].get("question", "")
        if next_q:
            if is_code_submission:
                system += f'\n\nAfter your reaction, naturally transition to: "{next_q}"'
            else:
                system += (
                    f'\n\nFor this turn, after a brief natural acknowledgement of the candidate\'s '
                    f'answer, ask exactly this question: "{next_q}"'
                )
    elif questions:
        system += (
            "\n\nAll interview questions have been asked. Give a warm, natural closing: "
            "thank the candidate, let them know the interview is now complete, and wish them well."
        )

    messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
    for msg in req.history:
        role = "assistant" if msg.role == "interviewer" else "user"
        messages.append({"role": role, "content": msg.text})

    if req.candidate_answer.strip():
        messages.append({"role": "user", "content": req.candidate_answer})

    if len(messages) == 1:
        messages.append({
            "role": "user",
            "content": "Please open the interview with a warm welcome and your first question.",
        })

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "gpt-4o-mini", "max_tokens": 150, "messages": messages},
            )
        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"].strip()
        return {"reply": reply}
    except Exception as exc:
        log.error("[Avatar Chat] %s", exc)
        raise HTTPException(502, f"Chat failed: {exc}")


# ── Coding hint ───────────────────────────────────────────────────────────────

@router.post("/coding-hint")
async def coding_hint(
    req: CodingHintRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return a short Sophia-style hint while the candidate is coding."""
    cfg = get_settings()
    api_key = (cfg.OPENAI_API_KEY or "").strip()

    if not api_key or req.hint_index >= len(req.hints):
        fallbacks = [
            "Mmhmm... keep thinking through it.",
            "You're on the right track — trust your instincts.",
            "Almost there, just think about the edge cases.",
        ]
        return {"hint": fallbacks[req.hint_index % len(fallbacks)]}

    raw_hint = req.hints[req.hint_index]
    prompt = (
        f"You are Sophia, a warm AI interviewer watching a candidate code in real-time.\n"
        f"Problem: {req.problem[:300]}\n"
        f"Candidate's current code:\n{req.current_code[:600]}\n\n"
        f"Rephrase this hint naturally, as if thinking aloud alongside them (max 20 words): {raw_hint}\n"
        "Sound like: 'Mmhmm...', 'Almost there...', 'What if...', 'Think about...'. "
        "No bullet points. No markdown. Just one short natural sentence."
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "gpt-4o-mini", "max_tokens": 60, "messages": [{"role": "user", "content": prompt}]},
            )
        resp.raise_for_status()
        hint = resp.json()["choices"][0]["message"]["content"].strip()
        return {"hint": hint}
    except Exception as exc:
        log.warning("[Avatar Coding Hint] %s", exc)
        return {"hint": raw_hint}
