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

    system = SOPHIA_PERSONA
    if interviewer_turns < len(questions):
        next_q = questions[interviewer_turns].get("question", "")
        if next_q:
            system += (
                f'\n\nFor this turn, after a brief natural acknowledgement of the candidate\'s '
                f'answer, ask exactly this question: "{next_q}"'
            )
    elif questions:
        # All questions done — close the interview
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
