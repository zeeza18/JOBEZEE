#!/usr/bin/env python3
"""
Tool 4: LaTeX Resume Formatter
Converts the finalized tailored resume into LaTeX using the reference template.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional, Dict
import re

from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables so ANTHROPIC_API_KEY is available
load_dotenv()


class LatexResumeFormatter:
    """Generate a LaTeX resume document from the finalized tailored resume."""

    def __init__(self, api_key: str | None = None) -> None:
        resolved_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not resolved_key:
            raise ValueError("Anthropic API key is required.")
        self.client = Anthropic(api_key=resolved_key)
        self.model = "claude-sonnet-4-6"  # Sonnet for LaTeX quality
        self.system_prompt = self._load_prompt("tool4_prompt.txt")

        # Preload template example so we can reference it without re-reading on every call
        self.template_example = self._load_template_example()

    def _load_prompt(self, filename: str) -> str:
        prompt_path = Path(__file__).resolve().parent.parent / "prompt" / filename
        try:
            return prompt_path.read_text(encoding="utf-8")
        except FileNotFoundError as exc:
            raise FileNotFoundError(
                f"Prompt file '{filename}' is missing in {prompt_path.parent}"
            ) from exc
        except Exception as exc:
            raise RuntimeError(f"Unable to load prompt '{filename}': {exc}") from exc

    def _load_template_example(self) -> Optional[str]:
        """
        Load the current LaTeX template from docs/latex/main.tex so Tool 4 can mirror the structure.
        Falls back to backup template if main.tex doesn't exist.
        Returns None if no template is found; Tool 4 prompt already embeds the template skeleton.
        """
        project_root = Path(__file__).resolve().parent.parent
        template_paths = [
            project_root / "docs" / "latex" / "main.tex",
            project_root / "backup" / "main_20251015_152107.tex",
            project_root / "scripts" / "main.tex",
        ]
        for template_path in template_paths:
            if template_path.exists():
                try:
                    return template_path.read_text(encoding="utf-8")
                except Exception:
                    continue
        return None

    def _load_job_title(self, output_dir=None) -> str:
        """Load job_title from keyword_analysis.json produced by Tool 1."""
        base = Path(output_dir) if output_dir else Path(__file__).resolve().parent.parent / "output"
        json_path = base / "keyword_analysis.json"
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
            return data.get("job_title", "").strip()
        except Exception:
            return ""

    def _load_contact_links(self, resume_text: str = "") -> str:
        """
        Extract contact URLs from the resume header (first 2 lines) — injected by the
        backend from the user's profile before calling the crew. Falls back to config.json.
        """
        if resume_text:
            lines = resume_text.strip().split("\n")
            # Contact line is typically the 2nd non-empty line:
            # "phone | email | linkedin_url | portfolio_url | github_url | city"
            contact_line = ""
            non_empty = [l.strip() for l in lines if l.strip()]
            if len(non_empty) >= 2:
                contact_line = non_empty[1]

            parts = [p.strip() for p in contact_line.split("|")]
            links: dict = {}
            for part in parts:
                p = part.strip()
                if p.startswith("http") and "linkedin" in p.lower():
                    links["LinkedIn"] = p
                elif p.startswith("http") and ("github" in p.lower()):
                    links["GitHub"] = p
                elif p.startswith("http"):
                    links.setdefault("Portfolio", p)
                elif "@" in p:
                    links["Email"] = p

            if links:
                lines_out = "\n".join(f"  {k}: {v}" for k, v in links.items())
                return (
                    "CANDIDATE CONTACT LINKS — use these exact URLs in \\href commands, never bare \\underline:\n"
                    f"{lines_out}\n\n"
                )

        # Fall back to config.json (local RESUME-MAKER project)
        config_path = Path(__file__).resolve().parent.parent / "config.json"
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
            return (
                "CANDIDATE CONTACT LINKS — use these exact URLs in \\href commands, never bare \\underline:\n"
                f"  Email:     {config.get('email', '')}\n"
                f"  LinkedIn:  {config.get('linkedin', '')}\n"
                f"  Portfolio: {config.get('portfolio', '')}\n"
                f"  GitHub:    {config.get('github', '')}\n\n"
            )
        except Exception:
            return ""

    def format_to_latex(self, final_resume: str, template_hint: Optional[str] = None, output_dir=None) -> Dict[str, str]:
        """
        Use OpenAI to convert the final tailored resume text into LaTeX.

        Args:
            final_resume: The completed tailored resume text from Tool 2.
            template_hint: Optional string containing the reference template.

        Returns:
            Dict with keys `latex_document` and `raw_response`.
        """

        if not final_resume or len(final_resume.strip()) < 50:
            raise ValueError("Final resume content is too short or empty for LaTeX conversion.")

        job_title = self._load_job_title(output_dir=output_dir)
        job_title_line = f"JOB_TITLE: {job_title}\n\n" if job_title else ""
        contact_links = self._load_contact_links(final_resume)

        user_template = template_hint or self.template_example or ""
        user_message = (
            f"{job_title_line}"
            f"{contact_links}"
            "FINAL_RESUME:\n"
            f"{final_resume.strip()}\n\n"
            "REFERENCE_TEMPLATE:\n"
            f"{user_template.strip()}"
        )

        print("Generating LaTeX resume with Claude (Tool 4)...")

        raw_content = ""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": user_message},
                ],
                timeout=120,
            )

            raw_content = response.content[0].text or ""
            usage = response.usage
            latex_doc = self._extract_latex_source(raw_content)
            print("LaTeX resume generation complete.")

            # Basic sanity check to ensure output looks like LaTeX
            if not latex_doc.startswith("\\documentclass"):
                raise ValueError(
                    "Generated LaTeX does not start with \\documentclass. Please review the raw response."
                )

            return {
                "latex_document": latex_doc,
                "raw_response":   latex_doc,
                "usage": {
                    "model":          self.model,
                    "input_tokens":   usage.input_tokens,
                    "output_tokens": usage.output_tokens,
                },
            }

        except Exception as exc:
            print(f"Error calling Claude for LaTeX formatting: {exc}")
            return {
                "latex_document": "",
                "raw_response": raw_content or f"Error: {str(exc)}",
            }

    def _extract_latex_source(self, content: str) -> str:
        """Strip code fences or prose and isolate the LaTeX document."""
        if not content:
            return ""

        cleaned = content.strip()

        # Handle markdown code fences ```latex ... ```
        fence_match = re.search(r"```(?:latex)?\s*(.*?)```", cleaned, flags=re.DOTALL | re.IGNORECASE)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        # If prose precedes \documentclass, slice from there
        doc_start = cleaned.find("\\documentclass")
        if doc_start != -1:
            cleaned = cleaned[doc_start:].strip()

        # Ensure we end at \end{document}
        doc_end = cleaned.lower().rfind("\\end{document}")
        if doc_end != -1:
            cleaned = cleaned[: doc_end + len("\\end{document}")].strip()

        return cleaned

    def save_latex(self, latex_document: str, output_path: Path, create_backup: bool = True) -> None:
        """
        Persist the generated LaTeX document to disk.

        Args:
            latex_document: Full LaTeX source returned by Tool 4.
            output_path: Path where the LaTeX file should be written.
            create_backup: Whether to create a timestamped backup if the file already exists.
        """
        if not latex_document or not latex_document.strip():
            raise ValueError("Cannot save empty LaTeX document.")

        try:
            if create_backup and output_path.exists():
                from datetime import datetime

                backup_dir = output_path.parent / "backup"
                backup_dir.mkdir(exist_ok=True)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = backup_dir / f"{output_path.stem}_{timestamp}.tex"
                backup_path.write_text(output_path.read_text(encoding="utf-8"), encoding="utf-8")

            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(latex_document, encoding="utf-8")
            print(f"LaTeX resume saved to {output_path}")
        except Exception as exc:
            raise RuntimeError(f"Unable to save LaTeX document to {output_path}: {exc}") from exc


if __name__ == "__main__":
    formatter = LatexResumeFormatter()
    sample_resume = """
    Heading:
    Jane Doe | Applied AI Engineer | jane@example.com | 555-555-5555

    Experience:
    Company X — AI Engineer (2024-Present)
    - Built AI agents with Python and LangChain improving response accuracy by 25%
    """
    result = formatter.format_to_latex(sample_resume)
    latex_sample_path = Path(__file__).resolve().parent.parent / "output" / "sample_resume.tex"
    latex_sample_path.parent.mkdir(exist_ok=True)
    if result["latex_document"]:
        formatter.save_latex(result["latex_document"], latex_sample_path, create_backup=False)
