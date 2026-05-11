"""
backfill_extractions.py — One-time script to extract resume metadata for
users who uploaded their resume before the Groq extraction hook existed.

Run on Hetzner:
    docker exec jobezee-backend-1 python scripts/backfill_extractions.py
"""
import asyncio
import base64
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


async def backfill() -> None:
    from backend.database import AsyncSessionLocal
    from backend.models import UserProfile
    from backend.services.extraction_service import pdf_to_text, extract_resume
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        profiles = (await db.execute(select(UserProfile))).scalars().all()
        updated = 0

        for p in profiles:
            email = getattr(p, 'email', '?') or '?'

            if p.resume_extraction:
                print(f"  Skip {email}: already extracted")
                continue
            if not p.resume_bytes:
                print(f"  Skip {email}: no resume bytes stored")
                continue

            try:
                pdf_bytes = base64.b64decode(p.resume_bytes)
                text = pdf_to_text(pdf_bytes)
                if not text or len(text.split()) < 20:
                    print(f"  Skip {email}: PDF text too short ({len(text.split())} words)")
                    continue

                extracted = extract_resume(text)
                if not extracted:
                    print(f"  Skip {email}: Groq returned None")
                    continue

                p.resume_extraction = extracted.model_dump()
                updated += 1
                print(f"  OK    {email}: title={extracted.title!r}  skills={len(extracted.skills)}")
            except Exception as exc:
                print(f"  Error {email}: {exc}")

        await db.commit()
        print(f"\nDone: {updated}/{len(profiles)} profiles updated")


if __name__ == "__main__":
    asyncio.run(backfill())
