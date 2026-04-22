#!/usr/bin/env python3
"""Tool 3: Resume Evaluator with Original Detailed Prompt"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
from typing import Dict, List

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()


class ResumeEvaluator:
    """Evaluate tailored resume against JD requirements using Claude"""

    def __init__(self, api_key: str | None = None, fallback_key: str | None = None) -> None:
        resolved_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not resolved_key:
            raise ValueError("Anthropic API key is required.")
        self.client = Anthropic(api_key=resolved_key)
        self._fallback_key = (fallback_key or "").strip() or None
        self.model = "claude-sonnet-4-6"  # Sonnet for evaluation quality

        self.system_prompt = self._load_prompt('tool3_prompt.txt')

    def _call(self, **kwargs):
        try:
            return self.client.messages.create(**kwargs)
        except Exception as exc:
            if self._fallback_key and getattr(exc, "status_code", None) in (401, 402):
                print(f"[WARN] Primary key failed ({exc}), retrying with user fallback key...")
                return Anthropic(api_key=self._fallback_key).messages.create(**kwargs)
            raise

    def _load_prompt(self, filename: str) -> str:
        prompt_path = Path(__file__).resolve().parent.parent / 'prompt' / filename
        try:
            return prompt_path.read_text(encoding='utf-8')
        except FileNotFoundError as exc:
            raise FileNotFoundError(f"Prompt file '{filename}' is missing in {prompt_path.parent}") from exc
        except Exception as exc:
            raise RuntimeError(f"Unable to load prompt '{filename}': {exc}") from exc

    def evaluate_resume(
        self,
        job_description: str,
        tailored_resume: str,
        keywords: Dict[str, List[str]],
    ) -> Dict[str, object]:
        """Call OpenAI to evaluate the resume and return structured result"""

        print("Evaluating resume with Claude...")

        user_message = f"""Please evaluate this tailored resume against the job description:

JOB DESCRIPTION:
{job_description}

TAILORED RESUME:
{tailored_resume}

REFERENCE KEYWORDS (from Tool 1):
Keywords: {', '.join(keywords.get('keywords', []))}
Needs: {', '.join(keywords.get('needs', []))}
Results: {', '.join(keywords.get('results', []))}

Return ONLY valid JSON. No markdown, no extra text."""

        try:
            response = self._call(
                model=self.model,
                max_tokens=2500,
                temperature=0,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": user_message},
                ],
                timeout=90,
            )

            usage = response.usage
            evaluation_content = response.content[0].text
            print("Resume evaluation complete.")
            result = self._parse_evaluation_response(evaluation_content, tailored_resume)
            result["usage"] = {
                "model":          self.model,
                "input_tokens":   usage.input_tokens,
                "output_tokens": usage.output_tokens,
            }
            return result

        except Exception as exc:
            print(f"Error calling Claude for resume evaluation: {exc}")
            return {
                "score": 0,
                "keyword_analysis": {"found": [], "missing": [], "weak": []},
                "experience_evaluation": f"Error occurred during evaluation: {str(exc)}",
                "ats_optimization": "Could not evaluate due to error",
                "requirements_check": {"met": [], "missing": [], "partial": []},
                "feedback": f"Evaluation failed due to error: {str(exc)}",
                "recommendations": ["Please check Anthropic API connection and try again"],
                "raw_evaluation": f"Error: {str(exc)}"
            }

    def _parse_evaluation_response(self, response: str, resume_text: str = "") -> Dict[str, object]:
        """Parse JSON evaluation response from GPT-4o and remove false positives."""
        try:
            clean = response.strip()
            clean = re.sub(r'^```json\s*', '', clean, flags=re.IGNORECASE)
            clean = re.sub(r'^```\s*', '', clean)
            clean = re.sub(r'\s*```$', '', clean)
            clean = clean.strip()

            json_match = re.search(r'\{[\s\S]*\}', clean)
            if not json_match:
                raise ValueError("No JSON object found in response")

            parsed = json.loads(json_match.group(0))
            print("[TOOL3] Successfully parsed JSON evaluation")

            score = int(parsed.get("score", 0))
            replacements = parsed.get("replacements", [])
            insertions = parsed.get("insertions", [])
            orphaned_skills = parsed.get("orphaned_skills", [])
            weak_bullets = parsed.get("weak_bullets", [])
            formatting_issues = parsed.get("formatting_issues", [])
            action_items = parsed.get("action_items", [])
            genuine_gaps = parsed.get("genuine_gaps", [])

            # === POST-PROCESSING: Remove false positives ===

            # 1. Remove orphaned skills that ARE present in resume bullets
            orphaned_skills, score = self._verify_orphaned_skills(orphaned_skills, resume_text, score)

            # 2. Remove insertions where the text is already present in the resume
            insertions, score = self._verify_insertions(insertions, resume_text, score)

            # 3. Remove format fixes where old == new (no actual change)
            formatting_issues, score = self._verify_formatting_issues(formatting_issues, score)

            # 4. Remove action items that reference now-removed false positives
            removed_orphan_skills = {o["skill"] for o in parsed.get("orphaned_skills", [])} - \
                                    {o["skill"] for o in orphaned_skills}
            resume_lower = resume_text.lower() if resume_text else ""

            clean_action_items = []
            for item in action_items:
                t = item.get("type", "")

                if t == "orphan_fix":
                    # Skip if the orphan skill was already found in bullets
                    if any(skill.lower() in item.get("old", "").lower() or
                           skill.lower() in item.get("new", "").lower()
                           for skill in removed_orphan_skills):
                        continue

                elif t == "insertion":
                    # Derive the actually-inserted phrase: new minus old
                    new_val = item.get("new", "")
                    old_val = item.get("old", "")
                    inserted_part = new_val.replace(old_val, "").strip().lstrip(",").strip()
                    inserted_part = re.sub(r'^(and\s+|or\s+)', '', inserted_part,
                                          flags=re.IGNORECASE).strip()
                    # Skip if the inserted phrase is already in the resume
                    if len(inserted_part) >= 8 and inserted_part.lower() in resume_lower:
                        continue

                elif t == "format_fix":
                    # Skip if old == new (no actual change)
                    if item.get("old", "").strip() == item.get("new", "").strip():
                        continue

                clean_action_items.append(item)
            action_items = clean_action_items

            # Legacy keyword_analysis for backward compat with resume_crew.py
            keyword_analysis = {
                "found": [],
                "missing": [r["missing_keyword"] for r in replacements] +
                           [i["missing_keyword"] for i in insertions],
                "weak": [w.get("old_start", w.get("bullet_preview", "")) for w in weak_bullets],
                "orphaned": [o["skill"] for o in orphaned_skills],
            }

            return {
                "score": score,
                "replacements": replacements,
                "insertions": insertions,
                "orphaned_skills": orphaned_skills,
                "weak_bullets": weak_bullets,
                "formatting_issues": formatting_issues,
                "genuine_gaps": genuine_gaps,
                "action_items": action_items,
                # Legacy fields — used by resume_crew.py
                "keyword_analysis": keyword_analysis,
                "feedback": "\n".join(genuine_gaps),
                "recommendations": self._format_action_items(action_items),
                "raw_evaluation": response,
            }

        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON parsing failed: {e}")
            return self._fallback_result(response)
        except Exception as e:
            print(f"[ERROR] Could not parse evaluation: {e}")
            return self._fallback_result(response)

    def _verify_orphaned_skills(self, orphaned_skills: list, resume_text: str, score: int):
        """
        Remove false-positive orphaned skills.
        If a skill appears in ANY bullet in the resume, it is NOT orphaned.
        Adjusts score by +3 for each false positive removed.
        """
        if not resume_text:
            return orphaned_skills, score

        # Extract every bullet line from the resume
        bullet_lines = re.findall(r'[•\-–]\s*(.+)', resume_text)
        bullet_text_combined = " ".join(bullet_lines).lower()

        verified = []
        corrections = 0
        for orphan in orphaned_skills:
            skill = orphan.get("skill", "").strip()
            if not skill:
                verified.append(orphan)
                continue

            # Check for exact skill name anywhere in any bullet (case-insensitive)
            if skill.lower() in bullet_text_combined:
                corrections += 1
                print(f"[TOOL3] False orphan removed: '{skill}' IS present in a bullet")
            else:
                verified.append(orphan)

        adjusted_score = min(100, score + corrections * 3)
        if corrections:
            print(f"[TOOL3] Score corrected: {score} -> {adjusted_score} ({corrections} false orphan(s) removed)")
        return verified, adjusted_score

    def _verify_insertions(self, insertions: list, resume_text: str, score: int):
        """
        Remove false-positive insertions where the key phrase is already present in the resume.
        A suggested insertion is a false positive if what it wants to add already exists in
        the resume text (the evaluator wants to insert text that is already there).
        Adjusts score by +2 for each false positive removed.
        """
        if not resume_text:
            return insertions, score

        resume_lower = resume_text.lower()
        verified = []
        corrections = 0

        for ins in insertions:
            insert_text = ins.get("insert_text", "").strip()
            # Strip leading connectors to get the core phrase
            core = re.sub(r'^(and\s+|,\s*|or\s+)', '', insert_text, flags=re.IGNORECASE).strip()
            core_lower = core.lower()

            # Only check if there's a meaningful phrase (avoid false matches on short words)
            if len(core_lower) >= 8 and core_lower in resume_lower:
                corrections += 1
                print(f"[TOOL3] False insertion removed: '{insert_text}' already present in resume")
            else:
                verified.append(ins)

        adjusted_score = min(100, score + corrections * 2)
        if corrections:
            print(f"[TOOL3] Score corrected: {score} -> {adjusted_score} ({corrections} false insertion(s) removed)")
        return verified, adjusted_score

    def _verify_formatting_issues(self, formatting_issues: list, score: int):
        """
        Remove format fixes where old text == new text (no actual change needed).
        Adjusts score by +1 for each false format fix removed.
        """
        verified = []
        corrections = 0
        for issue in formatting_issues:
            fix = issue.get("fix", "")
            # Pattern: "Change X to Y" or "X → Y"
            # If old == new, it's a no-op
            if " → " in fix:
                parts = fix.split(" → ", 1)
                if len(parts) == 2 and parts[0].strip() == parts[1].strip():
                    corrections += 1
                    print(f"[TOOL3] False format fix removed: '{issue.get('issue', fix)}' (old == new)")
                    continue
            # Also catch "Change title to X" when title already IS X
            verified.append(issue)

        adjusted_score = min(100, score + corrections)
        if corrections:
            print(f"[TOOL3] Score corrected: {score} -> {adjusted_score} ({corrections} false format fix(es) removed)")
        return verified, adjusted_score

    def _format_action_items(self, action_items: list) -> list:
        """Format structured action items as precise instruction strings for Tool 2."""
        result = []
        for item in action_items:
            t = item.get("type", "")
            preview = item.get("bullet_preview", "")
            old = item.get("old", "")
            new = item.get("new", "")
            if t == "replacement":
                result.append(f"REPLACE: In bullet '{preview}...' → change '{old}' to '{new}'")
            elif t == "insertion":
                result.append(f"INSERT: In bullet '{preview}...' → change '{old}' to '{new}'")
            elif t == "orphan_fix":
                result.append(f"ORPHAN FIX: In bullet '{preview}...' → change '{old}' to '{new}'")
            elif t == "verb_fix":
                result.append(f"VERB FIX: In bullet '{preview}...' → change '{old}' to '{new}'")
            elif t == "format_fix":
                result.append(f"FORMAT FIX: {old} → {new}")
            else:
                result.append(f"FIX: In bullet '{preview}...' → change '{old}' to '{new}'")
        return result

    def _fallback_result(self, response: str) -> Dict[str, object]:
        """Return a safe empty result when parsing fails."""
        return {
            "score": 0,
            "replacements": [],
            "insertions": [],
            "orphaned_skills": [],
            "weak_bullets": [],
            "formatting_issues": [],
            "genuine_gaps": [],
            "action_items": [],
            "keyword_analysis": {"found": [], "missing": [], "weak": [], "orphaned": []},
            "feedback": response,
            "recommendations": [],
            "raw_evaluation": response,
        }

    def save_evaluation(self, evaluation_data: Dict[str, object], filename: str = "resume_evaluation.txt", output_dir=None) -> None:
        """Save the evaluation results to text and JSON files."""
        try:
            out = Path(output_dir) if output_dir else Path(__file__).resolve().parent.parent / 'output'
            out.mkdir(parents=True, exist_ok=True)
            filepath = out / filename

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write("RESUME EVALUATION REPORT\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"OVERALL SCORE: {evaluation_data.get('score', 0)}/100\n\n")

                replacements = evaluation_data.get('replacements', [])
                if replacements:
                    f.write("REPLACEMENTS (same-category tech swap):\n")
                    f.write("-" * 30 + "\n")
                    for r in replacements:
                        f.write(
                            f"- [{r.get('category', '')}] In bullet '{r.get('bullet_preview', '')}...' "
                            f"→ replace '{r.get('old_text', '')}' with '{r.get('new_text', '')}'\n"
                        )
                    f.write("\n")

                insertions = evaluation_data.get('insertions', [])
                if insertions:
                    f.write("INSERTIONS (add missing keywords):\n")
                    f.write("-" * 30 + "\n")
                    for ins in insertions:
                        f.write(
                            f"- In bullet '{ins.get('bullet_preview', '')}...' "
                            f"→ insert '{ins.get('insert_text', '')}' after '{ins.get('insert_after', '')}'\n"
                        )
                    f.write("\n")

                orphaned = evaluation_data.get('orphaned_skills', [])
                if orphaned:
                    f.write("ORPHANED SKILLS (in Skills but not in Experience):\n")
                    f.write("-" * 30 + "\n")
                    for o in orphaned:
                        f.write(
                            f"- '{o.get('skill', '')}' → add to bullet '{o.get('bullet_preview', '')}...' "
                            f"insert '{o.get('insert_text', '')}' after '{o.get('insert_after', '')}'\n"
                        )
                    f.write("\n")

                weak = evaluation_data.get('weak_bullets', [])
                if weak:
                    f.write("WEAK BULLETS:\n")
                    f.write("-" * 30 + "\n")
                    for w in weak:
                        f.write(
                            f"- '{w.get('bullet_preview', '')}...' "
                            f"→ change '{w.get('old_start', '')}' to '{w.get('new_start', '')}'\n"
                        )
                    f.write("\n")

                gaps = evaluation_data.get('genuine_gaps', [])
                if gaps:
                    f.write("GENUINE GAPS (cannot fix):\n")
                    f.write("-" * 30 + "\n")
                    for g in gaps:
                        f.write(f"- {g}\n")
                    f.write("\n")

                f.write("ACTION ITEMS:\n")
                f.write("-" * 30 + "\n")
                for i, rec in enumerate(evaluation_data.get('recommendations', []), 1):
                    f.write(f"{i}. {rec}\n")

            print(f"Evaluation report saved to {filepath}")

            # Save JSON version for machine processing
            json_path = filepath.with_suffix('.json')
            save_data = {k: v for k, v in evaluation_data.items() if k != 'raw_evaluation'}
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(save_data, f, indent=2, ensure_ascii=False)
            print(f"Evaluation JSON saved to {json_path}")

        except Exception as e:
            print(f"Warning: Could not save evaluation report - {e}")


if __name__ == "__main__":
    evaluator = ResumeEvaluator()
    sample_jd = "We need a Senior Software Engineer with Python, React, and AWS experience."
    sample_resume = "Built ML models in Python and deployed to AWS with React frontend."
    sample_keywords = {
        "keywords": ["Python", "AWS", "React"],
        "needs": ["deployment", "cloud"],
        "results": ["improved accuracy"],
    }
    output = evaluator.evaluate_resume(sample_jd, sample_resume, sample_keywords)
    print(f"Score: {output['score']}/100")
    print(f"Keywords Found: {output['keyword_analysis']['found']}")
    print(f"Keywords Missing: {output['keyword_analysis']['missing']}")
    evaluator.save_evaluation(output)
