"""
Interview API — AI-powered mock interview question generation using GPT-4o-mini.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import get_settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview", tags=["interview"])

ROUND_DESCRIPTIONS = {
    "phone": (
        "Phone Screen (15-20 min typical): Easy, conversational questions. Cover: "
        "work authorization / visa status, salary expectations, availability / start date, "
        "why they're interested in this specific role and company, general background fit. "
        "Keep questions simple and open-ended. No coding."
    ),
    "mid": (
        "Round 1 — Mid-Level Interview: Mix of behavioral and moderate technical questions. "
        "Include STAR-format behavioral prompts ('Tell me about a time...'), "
        "situational scenarios relevant to the JD, moderate technical conceptual questions "
        "(no live coding, but can ask how they would approach a problem). "
        "Can include sales scenarios if the role is sales-related."
    ),
    "technical": (
        "Technical Deep-Dive: Expert-level questions. Include: algorithm and data structure "
        "problems where candidate should write/describe code, system design questions, "
        "architecture tradeoffs, debugging scenarios, performance optimization. "
        "Questions should be hard — assume senior-level candidate."
    ),
    "hr": (
        "HR Round: Scenario-based behavioral questions focused on soft skills. Cover: "
        "conflict resolution, teamwork, leadership style, career goals and trajectory, "
        "values alignment, handling difficult situations, culture fit. "
        "Use open-ended prompts and follow-ups."
    ),
}

ROUND_LABELS = {
    "phone": "Phone Screen",
    "mid": "Round 1 (Mid-Level)",
    "technical": "Technical Round",
    "hr": "HR Round",
}


class GenerateRequest(BaseModel):
    job_description: str
    resume_text: str
    round_type: str       # phone | mid | technical | hr
    duration_minutes: int  # 5–60


@router.post("/generate")
async def generate_questions(req: GenerateRequest) -> dict:
    cfg = get_settings()
    api_key = (cfg.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(503, "OPENAI_API_KEY not configured on server")

    if req.round_type not in ROUND_DESCRIPTIONS:
        raise HTTPException(400, f"round_type must be one of: {list(ROUND_DESCRIPTIONS)}")

    if not (5 <= req.duration_minutes <= 60):
        raise HTTPException(400, "duration_minutes must be between 5 and 60")

    round_desc = ROUND_DESCRIPTIONS[req.round_type]
    round_label = ROUND_LABELS[req.round_type]

    # Estimate question count based on duration (avg 3–5 min per question)
    avg_mins_per_q = 3 if req.round_type == "phone" else 4 if req.round_type == "hr" else 5
    question_count = max(3, min(20, req.duration_minutes // avg_mins_per_q))

    jd_snippet   = req.job_description[:3000] if req.job_description else "(no JD provided)"
    resume_snippet = req.resume_text[:2000]    if req.resume_text      else "(no resume provided)"

    system_prompt = (
        "You are an expert technical recruiter generating realistic mock interview questions. "
        "You MUST respond with valid JSON only — no markdown fences, no extra text."
    )

    user_prompt = f"""Generate exactly {question_count} interview questions for a {round_label} interview.

Round description: {round_desc}

Job Description:
{jd_snippet}

Candidate Resume:
{resume_snippet}

Return a JSON object with this exact shape:
{{
  "job_title": "<extracted job title from JD>",
  "company": "<extracted company name from JD, or 'Unknown'>",
  "round": "{req.round_type}",
  "round_label": "{round_label}",
  "duration_minutes": {req.duration_minutes},
  "questions": [
    {{
      "id": 1,
      "question": "<the interview question>",
      "category": "<one of: background|fit|coding|system_design|behavioral|scenario|technical|hr>",
      "estimated_time_seconds": <estimated seconds to answer, between 60 and 600>
    }}
  ]
}}

Rules:
- Questions must be directly relevant to the JD and tailored to the candidate's resume
- No cheating assistance — only ask real interview questions an interviewer would ask
- Spread question types across the duration appropriately
- For technical rounds, include at least 2 concrete coding / algorithm problems
- estimated_time_seconds should reflect realistic interview pacing
"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2500,
                },
            )
        resp.raise_for_status()
        raw = resp.json()
        content = raw["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if model added them despite instructions
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        data: dict[str, Any] = json.loads(content)

        # Validate minimal structure
        if "questions" not in data or not isinstance(data["questions"], list):
            raise ValueError("Response missing 'questions' array")

        return data

    except httpx.HTTPStatusError as exc:
        log.error("[Interview] OpenAI HTTP error: %s %s", exc.response.status_code, exc.response.text[:300])
        raise HTTPException(502, f"OpenAI API error: {exc.response.status_code}")
    except (json.JSONDecodeError, ValueError) as exc:
        log.error("[Interview] JSON parse error: %s", exc)
        raise HTTPException(502, "Failed to parse AI response — please try again")
    except Exception as exc:
        log.exception("[Interview] Unexpected error: %s", exc)
        raise HTTPException(500, "Interview generation failed")
