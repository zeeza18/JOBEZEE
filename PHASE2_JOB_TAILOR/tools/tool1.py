#!/usr/bin/env python3
"""
Tool 1: Keyword Extractor
Uses Anthropic Claude API to extract keywords, needs, and results from Job Description
"""

import json
import os
import re
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class KeywordExtractor:
    """Extract keywords from Job Description using Claude"""

    def __init__(self, api_key: str | None = None):
        """Initialize Anthropic client"""
        resolved_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not resolved_key:
            raise ValueError("Anthropic API key is required.")
        self.client = Anthropic(api_key=resolved_key)
        self.model = "claude-haiku-4-5-20251001"  # Fast + cheap for keyword extraction

        self.system_prompt = self._load_prompt('tool1_prompt.txt')

    def _load_prompt(self, filename: str) -> str:
        prompt_path = Path(__file__).resolve().parent.parent / 'prompt' / filename
        try:
            return prompt_path.read_text(encoding='utf-8')
        except FileNotFoundError as exc:
            raise FileNotFoundError(f"Prompt file '{filename}' is missing in {prompt_path.parent}") from exc
        except Exception as exc:
            raise RuntimeError(f"Unable to load prompt '{filename}': {exc}") from exc

    def extract_keywords(self, job_description):
        """
        Extract keywords from job description using Claude

        Args:
            job_description (str): The job description text

        Returns:
            dict: Contains keywords, needs, and results
        """

        print("[PHASE 1] Analyzing Job Description with Claude...")

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": f"Please analyze this Job Description and return JSON:\n\n{job_description}"}
                ]
            )

            analysis = response.content[0].text

            print("[OK] Claude analysis complete!")

            parsed_result = self._parse_openai_response(analysis)

            return parsed_result

        except Exception as e:
            print(f"[ERROR] Error calling Claude: {e}")
            raise RuntimeError(f"Keyword extraction failed — check Anthropic API key: {e}") from e

    def _parse_openai_response(self, analysis):
        """Parse OpenAI JSON response into structured format."""
        result = {
            "company_name": "UNKNOWN_COMPANY",
            "job_title": "",
            "keywords": [],
            "needs": [],
            "results": [],
            "raw_analysis": analysis,
        }

        _INVALID_NAMES = {'', 'N_A', 'NA', 'NONE', 'UNKNOWN', 'UNKNOWN_COMPANY',
                          'UNNAMED', 'UNNAMED_COMPANY', 'NOT_MENTIONED', 'NOT_PROVIDED',
                          'NOT_SPECIFIED', 'COMPANY_NAME', 'EXACT_COMPANY_NAME'}

        try:
            # Strip markdown code fences if present
            clean_response = analysis.strip()
            clean_response = re.sub(r'^```json\s*', '', clean_response, flags=re.IGNORECASE)
            clean_response = re.sub(r'^```\s*', '', clean_response)
            clean_response = re.sub(r'\s*```$', '', clean_response)
            clean_response = clean_response.strip()

            # Extract JSON object (handles any text before/after)
            json_match = re.search(r'\{[\s\S]*\}', clean_response)
            if not json_match:
                raise ValueError("No JSON object found in response")

            json_str = json_match.group(0)
            parsed = json.loads(json_str)

            print(f"[TOOL1] Successfully parsed JSON response")

            # Extract company_name
            raw_name = parsed.get('company_name', '').strip()
            normalized = re.sub(r'[^A-Z0-9]', '_', raw_name.upper()).strip('_')
            if normalized and normalized not in _INVALID_NAMES:
                result['company_name'] = normalized
            print(f"[TOOL1] Company: {result['company_name']}")

            # Extract job_title
            raw_title = parsed.get('job_title', '').strip()
            if raw_title:
                result['job_title'] = raw_title
            print(f"[TOOL1] Job Title: {result['job_title']}")

            # Extract arrays (with validation)
            for field in ['keywords', 'needs', 'results']:
                items = parsed.get(field, [])
                if isinstance(items, list):
                    # Filter out empty strings and ensure all items are strings
                    result[field] = [str(item).strip() for item in items if item and str(item).strip()]
                print(f"[TOOL1] {field.capitalize()}: {len(result[field])} items")

        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON parsing failed: {e}")
            print(f"[ERROR] Raw response: {analysis[:500]}...")
            # Fallback: try to extract what we can
            result['keywords'] = [f"JSON parse error - raw response saved"]

        except Exception as e:
            print(f"[ERROR] Could not parse response: {e}")
            result['keywords'] = [f"Parse error: {str(e)}"]

        return result

    def save_analysis(self, analysis, filename="keyword_analysis.txt", output_dir=None):
        """Save the keyword analysis to text file and keyword_analysis.json."""
        try:
            output_dir = Path(output_dir) if output_dir else Path(__file__).resolve().parent.parent / 'output'
            output_dir.mkdir(parents=True, exist_ok=True)

            # --- human-readable text file ---
            filepath = output_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write("KEYWORD EXTRACTION ANALYSIS\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"COMPANY NAME: {analysis.get('company_name', 'UNKNOWN_COMPANY')}\n")
                f.write("=" * 50 + "\n\n")
                f.write("KEYWORDS:\n")
                for keyword in analysis.get('keywords', []):
                    f.write(f"• {keyword}\n")
                f.write("\nNEEDS:\n")
                for need in analysis.get('needs', []):
                    f.write(f"• {need}\n")
                f.write("\nRESULTS:\n")
                for result in analysis.get('results', []):
                    f.write(f"• {result}\n")
                f.write("\n" + "=" * 50 + "\n")
                f.write("RAW ANALYSIS:\n")
                f.write(analysis.get('raw_analysis', ''))
            print(f"[OK] Analysis saved to {filepath}")

            # --- machine-readable JSON (used by download endpoint for filename) ---
            json_path = output_dir / 'keyword_analysis.json'
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "company_name": analysis.get('company_name', 'UNKNOWN_COMPANY'),
                    "job_title": analysis.get('job_title', ''),
                    "keywords": analysis.get('keywords', []),
                    "needs": analysis.get('needs', []),
                    "results": analysis.get('results', []),
                }, f, indent=2)
            print(f"[OK] Analysis JSON saved to {json_path}")

        except Exception as e:
            print(f"[WARN] Could not save analysis - {e}")

# Test function
if __name__ == "__main__":
    # Test the keyword extractor
    extractor = KeywordExtractor()

    # Test with sample JD
    sample_jd = """
    We are seeking a Senior Software Engineer with 5+ years of experience in Python, React, and AWS.
    Responsibilities include developing scalable web applications, optimizing database performance,
    and collaborating with cross-functional teams. Required: Bachelor's degree in Computer Science,
    proficiency in SQL, experience with Docker and Kubernetes.
    """

    result = extractor.extract_keywords(sample_jd)
    print("Test Result:", result)
    extractor.save_analysis(result)
