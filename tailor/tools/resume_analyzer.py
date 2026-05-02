#!/usr/bin/env python3
"""
Resume Analyzer — Python-only utility for objective resume analysis.
No LLM calls. Used to inject ground-truth data into Tool 2 prompts.
"""

from __future__ import annotations

import re
from typing import Dict, List


class ResumeAnalyzer:
    """Objective, deterministic analysis of resume text."""

    WEAK_VERBS = {
        'specialized', 'helped', 'assisted', 'worked', 'responsible',
        'participated', 'involved', 'supported', 'utilized', 'leveraged',
        'maintained', 'handled', 'performed', 'contributed', 'oversaw',
        'was involved', 'was responsible',
    }

    def get_bullets(self, resume_text: str) -> List[str]:
        """Return all bullet lines (text after the bullet marker)."""
        return re.findall(r'[•\-–]\s*(.+)', resume_text)

    def verify_keyword_coverage(
        self, keywords: List[str], resume_text: str
    ) -> Dict[str, List[str]]:
        """
        Objectively determine which JD keywords are and aren't in bullet text.
        Returns:
            in_bullets: keywords found in at least one bullet
            missing_from_bullets: keywords not found in any bullet
        """
        bullets = self.get_bullets(resume_text)
        bullet_text = ' '.join(bullets).lower()

        in_bullets: List[str] = []
        missing: List[str] = []
        for kw in keywords:
            if kw.lower() in bullet_text:
                in_bullets.append(kw)
            else:
                missing.append(kw)

        return {'in_bullets': in_bullets, 'missing_from_bullets': missing}

    def detect_orphaned_skills(self, resume_text: str) -> List[str]:
        """
        Find skills that appear in the Skills section but have NO backing mention
        in any Experience/Projects bullet.

        Handles both plain lists and parenthetical sub-items like:
            Cloud & Infra: AWS (Lambda, S3, EC2), GCP
        """
        # Known major section headers — stop collecting Skills lines when we hit one
        _section_re = re.compile(
            r'^\s*(EXPERIENCE|EDUCATION|PROJECTS?|CERTIFICATIONS?|AWARDS?|PUBLICATIONS?|SUMMARY)\s*$',
            re.IGNORECASE,
        )
        _skills_re = re.compile(r'^\s*SKILLS?\s*$', re.IGNORECASE)

        lines = resume_text.splitlines()
        in_skills = False
        skills_lines: List[str] = []

        for line in lines:
            if _skills_re.match(line):
                in_skills = True
                continue
            if in_skills:
                if _section_re.match(line):
                    break  # Hit next section — stop
                if line.strip():
                    skills_lines.append(line)

        if not skills_lines:
            return []

        skills_block = '\n'.join(skills_lines)

        # Strip row headers ("Languages:", "Cloud & Infra:", etc.)
        skills_content = re.sub(r'^[^:]+:\s*', '', skills_block, flags=re.MULTILINE)

        skill_tokens: set = set()

        # 1. Extract items inside parentheses individually
        for paren_match in re.finditer(r'\(([^)]+)\)', skills_content):
            for item in paren_match.group(1).split(','):
                token = item.strip().rstrip('.')
                if len(token) >= 2:
                    skill_tokens.add(token)

        # 2. Remove parenthetical blocks then get top-level comma/newline items
        top_level = re.sub(r'\([^)]*\)', '', skills_content)
        for item in re.split(r'[,\n]', top_level):
            token = item.strip().rstrip('.')
            # Require at least 2 chars, skip whitespace-only tokens
            if len(token) >= 2 and token.strip():
                skill_tokens.add(token)

        # 3. Check each skill token against bullet text (whole-word aware)
        bullets = self.get_bullets(resume_text)
        bullet_text = ' '.join(bullets).lower()

        orphaned = []
        for skill in sorted(skill_tokens):
            skill_lower = skill.lower()
            # Skip tokens that are obviously not tech terms (all lowercase common words)
            if re.match(r'^[a-z]{1,3}$', skill_lower):
                continue
            # Check presence as substring (handles compound forms like "LangChain" in "LangChain-based")
            if skill_lower not in bullet_text:
                orphaned.append(skill)
        return orphaned

    def check_bullet_quality(self, resume_text: str) -> List[str]:
        """
        Return bullets that start with a weak verb.
        Each entry is the first ~60 chars of the offending bullet.
        """
        bullets = self.get_bullets(resume_text)
        weak: List[str] = []
        for bullet in bullets:
            first_word = bullet.split()[0].lower().rstrip(',') if bullet.split() else ''
            if first_word in self.WEAK_VERBS:
                preview = bullet[:60] + ('...' if len(bullet) > 60 else '')
                weak.append(preview)
        return weak

    def full_analysis(
        self, keywords: List[str], resume_text: str
    ) -> Dict[str, object]:
        """Run all checks and return a combined report."""
        coverage = self.verify_keyword_coverage(keywords, resume_text)
        return {
            'confirmed_in_bullets': coverage['in_bullets'],
            'confirmed_missing_from_bullets': coverage['missing_from_bullets'],
            'confirmed_orphaned_skills': self.detect_orphaned_skills(resume_text),
            'weak_bullets': self.check_bullet_quality(resume_text),
        }
