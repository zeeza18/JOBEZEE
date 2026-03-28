#!/usr/bin/env python3
"""
Resume Crew - Complete 3-tool iterative process
Tool 1: Keyword Extractor → Tool 2: Resume Tailor → Tool 3: Resume Evaluator
Runs 2 iterations: Tool2→Tool3→Tool2→Tool3
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from .tools.tool1 import KeywordExtractor
from .tools.tool2 import ResumeTailor
from .tools.tool3 import ResumeEvaluator
from .tools.tool4 import LatexResumeFormatter
from .tools.resume_analyzer import ResumeAnalyzer

_MODULE_ROOT = Path(__file__).resolve().parent   # PHASE2_JOB_TAILOR/
_OUTPUT_DIR  = _MODULE_ROOT / "output"


class ResumeCrew:
    """Complete resume processor with all 3 tools and iterative process"""

    def __init__(self, openai_api_key: str | None = None):
        """Initialize the crew with all 3 tools.

        Args:
            openai_api_key: Per-request OpenAI key so concurrent users don't
                            race on os.environ (if omitted, falls back to env var).
        """
        self.keyword_extractor = KeywordExtractor(api_key=openai_api_key)
        self.resume_tailor = ResumeTailor()
        self.resume_evaluator = ResumeEvaluator(api_key=openai_api_key)
        self.latex_formatter = LatexResumeFormatter(api_key=openai_api_key)
        self.analyzer = ResumeAnalyzer()
        self.process_log = []

    def log_step(self, step, data):
        """Log each step of the process"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "step": step,
            "data": data
        }
        self.process_log.append(log_entry)
        print(f"[STEP] {step}")

    def save_process_log(self, output_dir=None):
        """Save the complete process log"""
        try:
            out = Path(output_dir) if output_dir else _OUTPUT_DIR
            out.mkdir(parents=True, exist_ok=True)
            log_file = out / 'process_log.json'
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(self.process_log, f, indent=2, ensure_ascii=False)
            print(f"[OK] Process log saved to {log_file}")
        except Exception as e:
            print(f"[WARN] Could not save process log - {e}")

    def save_content(self, content, filename, output_dir=None):
        """Save content to file"""
        try:
            out = Path(output_dir) if output_dir else _OUTPUT_DIR
            out.mkdir(parents=True, exist_ok=True)
            filepath = out / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] Saved {filename}")
        except Exception as e:
            print(f"[WARN] Could not save {filename} - {e}")

    def run_tailoring_process(
        self,
        job_description,
        current_resume,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
        output_dir: Optional[Path] = None,
    ):
        """
        Complete 3-tool iterative process:
        1. Tool 1: Extract keywords once
        2. Iterate 3 times: Tool 2 (tailor) → Tool 3 (evaluate) → feedback → repeat
        """

        print("[PHASE 1] Keyword Extraction with GPT-4o (Tool 1)")
        print("=" * 60)

        # TOOL 1: Extract keywords from job description (run once)
        self.log_step("TOOL 1: Extracting keywords from job description", {})

        try:
            keyword_analysis = self.keyword_extractor.extract_keywords(job_description)

            # Save the keyword analysis
            self.keyword_extractor.save_analysis(keyword_analysis, output_dir=output_dir)

            self.log_step("Keywords extracted successfully", {
                "keywords_count": len(keyword_analysis.get('keywords', [])),
                "needs_count": len(keyword_analysis.get('needs', [])),
                "results_count": len(keyword_analysis.get('results', []))
            })

            print(f"[OK] Extracted {len(keyword_analysis.get('keywords', []))} keywords")
            print(f"[OK] Identified {len(keyword_analysis.get('needs', []))} needs")
            print(f"[OK] Found {len(keyword_analysis.get('results', []))} result patterns")

        except Exception as e:
            raise RuntimeError(f"Keyword extraction failed (check OpenAI API key): {e}") from e

        if progress_callback:
            progress_callback({
                "event": "keywords_extracted",
                "status": "keywords_extracted",
                "keyword_analysis": keyword_analysis,
                "job_description": job_description,
                "original_resume": current_resume
            })

        print(f"\n[STEP] PHASE 2: Iterative Tailoring Process (3 Rounds)")
        print("=" * 60)
        print("Each round: Tool 2 (Tailor) → Tool 3 (Evaluate) → Feedback")

        # Track resumes and evaluations across rounds
        latest_resume = current_resume
        best_resume = current_resume
        best_score = -1
        best_round = 0
        best_evaluation = None
        all_evaluations = []

        # === MEMORY: Track changes across rounds ===
        locked_changes = []  # Changes that improved score (don't undo)
        cumulative_keyword_status = {
            "successfully_inserted": [],
            "still_missing": list(keyword_analysis.get('keywords', [])),  # Start with all keywords as missing
            "already_present": []
        }
        all_tailoring_results = []  # Store full Tool 2 results for analysis

        # === PRE-ANALYSIS: Python-verified keyword coverage on ORIGINAL resume ===
        print("\n[ANALYZER] Running Python pre-analysis on original resume...")
        all_keywords = (
            keyword_analysis.get('keywords', []) +
            keyword_analysis.get('needs', [])
        )
        pre_analysis = self.analyzer.full_analysis(all_keywords, current_resume)
        print(f"[ANALYZER] Missing from bullets: {len(pre_analysis['confirmed_missing_from_bullets'])} keywords")
        print(f"[ANALYZER] Orphaned skills: {len(pre_analysis['confirmed_orphaned_skills'])}")
        print(f"[ANALYZER] Weak verb bullets: {len(pre_analysis['weak_bullets'])}")

        # Run 2 iterations of Tool2 → Tool3
        for round_num in range(1, 3):
            print(f"\n{'='*20} ROUND {round_num} {'='*20}")

            # TOOL 2: Tailor Resume
            print(f"[Tailor] Round {round_num} - Tailoring resume...")
            print("-" * 40)

            self.log_step(f"ROUND {round_num} - TOOL 2: Tailoring resume", {})

            # Get feedback from ALL previous rounds (accumulate unfixed issues)
            feedback = None
            if round_num > 1 and all_evaluations:
                feedback_parts = []

                # Collect ALL orphaned skills from ALL previous rounds (they often get missed)
                all_orphaned = {}  # skill -> fix instruction
                for prev_eval in all_evaluations:
                    for o in prev_eval.get('orphaned_skills', []):
                        skill = o.get('skill', '')
                        if skill and skill not in all_orphaned:
                            all_orphaned[skill] = (
                                f"  - '{skill}' → In bullet '{o.get('bullet_preview', '')}...' "
                                f"insert '{o.get('insert_text', '')}' after '{o.get('insert_after', '')}'"
                            )
                    # Legacy compat
                    for item in prev_eval.get('keyword_analysis', {}).get('orphaned', []):
                        if item and item not in all_orphaned:
                            all_orphaned[item] = f"  - '{item}' → add to relevant Experience bullet"

                # Python-verified missing keywords — highest priority, at the TOP
                py_missing = pre_analysis.get('confirmed_missing_from_bullets', [])
                if py_missing:
                    feedback_parts.insert(0, f"[PYTHON-VERIFIED] KEYWORDS STILL MISSING FROM ALL BULLETS: {', '.join(py_missing)}")
                    feedback_parts.insert(1, "  → These were objectively verified as absent. Insert each into the most relevant bullet.\n")

                # Python-verified orphaned skills — also at top
                py_orphaned = pre_analysis.get('confirmed_orphaned_skills', [])
                if py_orphaned:
                    feedback_parts.insert(2, f"[PYTHON-VERIFIED] ORPHANED SKILLS (Skills section but no bullet): {', '.join(py_orphaned)}")
                    feedback_parts.insert(3, "  → Insert each by exact name into a relevant Experience bullet.\n")

                if all_orphaned:
                    feedback_parts.append("ORPHANED SKILLS — MUST FIX (add to Experience bullets, keep in Skills):")
                    feedback_parts.extend(all_orphaned.values())

                # Latest round structured feedback (most precise)
                previous_eval = all_evaluations[-1]

                # Replacements: same-category tech swaps
                replacements = previous_eval.get('replacements', [])
                if replacements:
                    feedback_parts.append("\nREPLACEMENTS (same-category tech swap — do exactly as stated):")
                    for r in replacements:
                        feedback_parts.append(
                            f"  - [{r.get('category', '')}] In bullet '{r.get('bullet_preview', '')}...' "
                            f"→ replace '{r.get('old_text', '')}' with '{r.get('new_text', '')}'"
                        )

                # Insertions: add missing keywords
                insertions = previous_eval.get('insertions', [])
                if insertions:
                    feedback_parts.append("\nINSERTIONS (insert missing keywords exactly as stated):")
                    for ins in insertions:
                        feedback_parts.append(
                            f"  - In bullet '{ins.get('bullet_preview', '')}...' "
                            f"→ insert '{ins.get('insert_text', '')}' after '{ins.get('insert_after', '')}'"
                        )

                # Genuine gaps (unfakeable — for context only)
                gaps = previous_eval.get('genuine_gaps', [])
                if gaps:
                    feedback_parts.append(f"\nGENUINE GAPS (context only, cannot fix): {'; '.join(gaps)}")

                # Precise action items from Tool 3
                recommendations = previous_eval.get('recommendations', [])
                if recommendations:
                    feedback_parts.append("\nPRECISE ACTION ITEMS (follow exactly):")
                    feedback_parts.extend([f"  {i+1}. {r}" for i, r in enumerate(recommendations)])

                feedback = "\n".join(feedback_parts)
                print(f"[INFO] Using accumulated feedback from Rounds 1-{round_num-1}")
                print(f"[MEMORY] Locked changes from previous rounds: {len(locked_changes)}")
                print(f"[MEMORY] Keywords already inserted: {len(cumulative_keyword_status['successfully_inserted'])}")

            try:
                tailored_data = self.resume_tailor.tailor_resume(
                    original_resume=latest_resume,
                    keywords=keyword_analysis,
                    job_description=job_description,
                    feedback=feedback,
                    round_number=round_num,
                    locked_changes=locked_changes if round_num > 1 else None,
                    previous_keyword_status=cumulative_keyword_status if round_num > 1 else None,
                    pre_analysis=pre_analysis
                )

                # Save this version
                version_filename = f"tailored_resume_round_{round_num}.txt"
                self.resume_tailor.save_tailored_resume(tailored_data, version_filename, output_dir=output_dir)

                # Update current best
                latest_resume = tailored_data.get('tailored_resume', latest_resume)

                # Store full tailoring result for memory tracking
                all_tailoring_results.append(tailored_data)

                # === POST-ANALYSIS: update pre_analysis with ground-truth after Tool 2 ===
                post_coverage = self.analyzer.verify_keyword_coverage(all_keywords, latest_resume)
                still_missing = post_coverage['missing_from_bullets']
                still_orphaned = self.analyzer.detect_orphaned_skills(latest_resume)
                pre_analysis = {
                    'confirmed_in_bullets': post_coverage['in_bullets'],
                    'confirmed_missing_from_bullets': still_missing,
                    'confirmed_orphaned_skills': still_orphaned,
                    'weak_bullets': self.analyzer.check_bullet_quality(latest_resume),
                }
                print(f"[ANALYZER] Post Round {round_num}: {len(still_missing)} keywords still missing, "
                      f"{len(still_orphaned)} orphaned skills")

                # Update cumulative keyword status — use Python post-analysis as ground truth
                # (more reliable than LLM self-report in keyword_status)
                for kw in post_coverage['in_bullets']:
                    if kw not in cumulative_keyword_status['successfully_inserted']:
                        cumulative_keyword_status['successfully_inserted'].append(kw)
                    if kw in cumulative_keyword_status['still_missing']:
                        cumulative_keyword_status['still_missing'].remove(kw)
                # Sync still_missing with Python ground truth
                cumulative_keyword_status['still_missing'] = still_missing

                # Also capture LLM self-reported insertions for display
                round_keyword_status = tailored_data.get('keyword_status', {})
                newly_inserted = round_keyword_status.get('successfully_inserted', [])

                self.log_step(f"ROUND {round_num} - Resume tailored", {
                    "tailored_resume_length": len(latest_resume.split()),
                    "changes_made": len(tailored_data.get('change_log', [])),
                    "keywords_inserted_this_round": len(newly_inserted),
                    "total_keywords_inserted": len(cumulative_keyword_status['successfully_inserted']),
                    "has_feedback": feedback is not None
                })

                print(f"[OK] Round {round_num} tailoring complete!")
                print(f"[INFO] Changes made: {len(tailored_data.get('change_log', []))}")
                print(f"[MEMORY] Keywords inserted this round: {newly_inserted}")

            except Exception as e:
                print(f"[ERROR] Error in Round {round_num} tailoring: {e}")
                tailored_data = {
                    "tailored_resume": latest_resume,
                    "change_log": [f"Error: {str(e)}"]
                }

            # TOOL 3: Evaluate Resume
            print(f"\n[STATS] Round {round_num} - Tool 3: Evaluating Resume")
            print("-" * 40)

            self.log_step(f"ROUND {round_num} - TOOL 3: Evaluating resume", {})

            try:
                evaluation = self.resume_evaluator.evaluate_resume(
                    job_description=job_description,
                    tailored_resume=latest_resume,
                    keywords=keyword_analysis
                )

                # Save this evaluation
                eval_filename = f"evaluation_round_{round_num}.txt"
                self.resume_evaluator.save_evaluation(evaluation, eval_filename, output_dir=output_dir)

                all_evaluations.append(evaluation)

                self.log_step(f"ROUND {round_num} - Evaluation complete", {
                    "score": evaluation.get('score', 0),
                    "recommendations_count": len(evaluation.get('recommendations', []))
                })

                print(f"[STATS] Round {round_num} Score: {evaluation.get('score', 0)}/100")
                print(f"[TIP] Recommendations: {len(evaluation.get('recommendations', []))}")

                # Show top recommendations
                for i, rec in enumerate(evaluation.get('recommendations', [])[:2], 1):
                    print(f"   {i}. {rec[:80]}...")

            except Exception as e:
                print(f"[ERROR] Error in Round {round_num} evaluation: {e}")
                evaluation = {
                    "score": 0,
                    "feedback": f"Error: {str(e)}",
                    "recommendations": []
                }
                all_evaluations.append(evaluation)

            score_value = evaluation.get("score", 0)
            try:
                score_value = float(score_value)
            except (TypeError, ValueError):
                score_value = 0

            # === MEMORY: Lock in changes if score improved ===
            if score_value > best_score:
                # Score improved! Lock in the changes from this round
                if all_tailoring_results:
                    current_tailoring = all_tailoring_results[-1]
                    change_log = current_tailoring.get('change_log', [])

                    for change in change_log:
                        if isinstance(change, dict):
                            desc = change.get('description', '')
                        else:
                            desc = str(change)

                        locked_changes.append({
                            "round": round_num,
                            "description": desc,
                            "score_before": best_score,
                            "score_after": score_value
                        })

                    print(f"[MEMORY] Score improved {best_score} → {score_value}! Locking {len(change_log)} changes.")

                best_score = score_value
                best_resume = latest_resume
                best_evaluation = evaluation
                best_round = round_num
            else:
                print(f"[MEMORY] Score did not improve ({score_value} <= {best_score}). Changes NOT locked.")

            if progress_callback:
                progress_callback({
                    "event": "round_complete",
                    "status": f"round_{round_num}_complete",
                    "round": round_num,
                    "keyword_analysis": keyword_analysis,
                    "tailored_resume": latest_resume,
                    "change_log": tailored_data.get('change_log', []),
                    "evaluation": evaluation,
                    "all_evaluations": list(all_evaluations),
                })

        if best_round == 0 and all_evaluations:
            best_round = len(all_evaluations)
            best_evaluation = all_evaluations[-1]
            try:
                best_score = float(best_evaluation.get('score', 0))
            except (TypeError, ValueError):
                best_score = 0
            best_resume = latest_resume

        if isinstance(best_score, (int, float)):
            best_score = int(round(best_score))
        else:
            best_score = 0

        print(f"\n[PHASE 3] Final Results & Summary")
        print("=" * 60)

        # Save inputs
        self.save_content(job_description, "job_description.txt", output_dir=output_dir)
        self.save_content(current_resume, "original_resume.txt", output_dir=output_dir)

        # Save final best resume
        self.save_content(best_resume, "final_tailored_resume.txt", output_dir=output_dir)

        # TOOL 4: Convert final resume to LaTeX
        latex_summary = {"status": "skipped"}
        try:
            latex_result = self.latex_formatter.format_to_latex(best_resume, output_dir=output_dir)
            latex_document = latex_result.get("latex_document", "")
            latex_summary["raw_response_length"] = len(latex_result.get("raw_response", ""))

            if latex_document:
                docs_latex_path = _MODULE_ROOT.parent / "docs" / "latex" / "main.tex"
                output_tex_path = (Path(output_dir) if output_dir else _OUTPUT_DIR) / "final_tailored_resume.tex"

                # Ensure docs/latex directory exists
                docs_latex_path.parent.mkdir(parents=True, exist_ok=True)

                self.latex_formatter.save_latex(latex_document, docs_latex_path, create_backup=True)
                self.latex_formatter.save_latex(latex_document, output_tex_path, create_backup=False)

                latex_summary.update({
                    "status": "success",
                    "main_tex_path": str(docs_latex_path),
                    "output_tex_path": str(output_tex_path),
                    "latex_length": len(latex_document.split())
                })
            else:
                latex_summary.update({
                    "status": "failure",
                    "error": latex_result.get("raw_response", "Empty LaTeX output")
                })
        except Exception as exc:
            latex_summary.update({
                "status": "error",
                "error": str(exc)
            })
            print(f"Warning: Tool 4 LaTeX generation failed - {exc}")

        self.log_step("TOOL 4: LaTeX resume conversion", latex_summary)

        # Create summary report
        self._create_summary_report(keyword_analysis, all_evaluations, best_resume, best_round, best_score, output_dir=output_dir)

        # Log final results with memory state
        self.log_step("Complete process finished", {
            "jd_length": len(job_description.split()),
            "original_resume_length": len(current_resume.split()),
            "final_resume_length": len(best_resume.split()),
            "final_score": best_score,
            "best_round": best_round,
            "total_rounds": 2,
            "keyword_analysis": keyword_analysis,
            "all_evaluations": all_evaluations,
            "best_evaluation": best_evaluation,
            "memory_state": {
                "locked_changes_count": len(locked_changes),
                "keywords_inserted": cumulative_keyword_status['successfully_inserted'],
                "keywords_still_missing": cumulative_keyword_status['still_missing']
            }
        })

        # Print memory summary
        print(f"\n[MEMORY] Final Keyword Status:")
        print(f"   Inserted: {len(cumulative_keyword_status['successfully_inserted'])} keywords")
        print(f"   Missing:  {len(cumulative_keyword_status['still_missing'])} keywords")
        print(f"   Locked:   {len(locked_changes)} changes preserved across rounds")

        # Save process log
        self.save_process_log(output_dir=output_dir)

        # Show final summary
        final_score = best_score
        print(f"[BEST] Best Score: {best_score}/100 (Round {best_round or 1})")
        print(f"[PROGRESS] Score Progress: {' → '.join([str(eval.get('score', 0)) for eval in all_evaluations])}")
        print(f"[OK] Final Resume: {len(best_resume.split())} words")

        print("\nOutput Files Created:")
        print("   - job_description.txt - Your input JD")
        print("   - original_resume.txt - Your original resume")
        print("   - keyword_analysis.txt - Extracted keywords (Tool 1)")
        print("   - tailored_resume_round_1.txt - Round 1 resume")
        print("   - evaluation_round_1.txt - Round 1 evaluation")
        print("   - tailored_resume_round_2.txt - Round 2 resume")
        print("   - evaluation_round_2.txt - Round 2 evaluation")
        print("   - final_tailored_resume.txt - Best final resume")
        if latex_summary.get("status") == "success":
            print(f"   - docs/latex/main.tex - LaTeX resume from best round (Round {best_round})")
            print("   - output/final_tailored_resume.tex - LaTeX export copy")
        else:
            print("   - docs/latex/main.tex - Not updated (Tool 4 encountered an issue)")
        print("   - process_summary.txt - Complete summary report")
        print("   - process_log.json - Detailed process log")

        if progress_callback:
            progress_callback({
                "event": "process_complete",
                "status": "processing_done",
                "final_score": best_score,
                "best_round": best_round,
                "latex_summary": latex_summary,
            })

        return {
            "job_description": job_description,
            "original_resume": current_resume,
            "final_resume": best_resume,
            "keyword_analysis": keyword_analysis,
            "all_evaluations": all_evaluations,
            "final_score": final_score,
            "best_round": best_round,
            "best_evaluation": best_evaluation,
            "status": "complete_2_tool_process_finished",
            "latex_summary": latex_summary,
            "memory_state": {
                "locked_changes": locked_changes,
                "cumulative_keyword_status": cumulative_keyword_status,
                "all_tailoring_results": [
                    {k: v for k, v in r.items() if k != 'raw_response'}
                    for r in all_tailoring_results
                ]
            }
        }

    def _create_summary_report(self, keyword_analysis, all_evaluations, final_resume, best_round, best_score, output_dir=None):
        """Create a comprehensive summary report"""
        try:
            out = Path(output_dir) if output_dir else _OUTPUT_DIR
            out.mkdir(parents=True, exist_ok=True)
            filepath = out / 'process_summary.txt'

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write("RESUME AUTOMATION PROCESS SUMMARY\n")
                f.write("=" * 60 + "\n\n")

                # Process Overview
                f.write("PROCESS OVERVIEW\n")
                f.write("-" * 30 + "\n")
                f.write("[OK] Tool 1: Keyword Extraction - COMPLETED\n")
                f.write("[OK] Tool 2: Resume Tailoring - COMPLETED\n")
                f.write("[OK] Tool 3: Resume Evaluation - COMPLETED\n\n")

                # Keywords Summary
                f.write("[TARGET] KEYWORDS EXTRACTED\n")
                f.write("-" * 30 + "\n")
                f.write(f"Keywords: {len(keyword_analysis.get('keywords', []))}\n")
                f.write(f"Needs: {len(keyword_analysis.get('needs', []))}\n")
                f.write(f"Results: {len(keyword_analysis.get('results', []))}\n\n")

                # Score Progress
                f.write("[PROGRESS] SCORE PROGRESSION\n")
                f.write("-" * 30 + "\n")
                for i, eval_data in enumerate(all_evaluations, 1):
                    score = eval_data.get('score', 0)
                    f.write(f"Round {i}: {score}/100\n")

                if len(all_evaluations) > 1:
                    improvement = all_evaluations[-1].get('score', 0) - all_evaluations[0].get('score', 0)
                    f.write(f"\nTotal Improvement: +{improvement} points\n")

                if best_round:
                    f.write(f"Best Round: Round {best_round} (Score: {best_score}/100)\n")

                f.write("\n" + "=" * 60 + "\n")
                f.write("FINAL RECOMMENDATIONS\n")
                f.write("=" * 60 + "\n")

                final_eval = None
                if best_round and 0 < best_round <= len(all_evaluations):
                    final_eval = all_evaluations[best_round - 1]
                elif all_evaluations:
                    final_eval = all_evaluations[-1]

                if final_eval:
                    for i, rec in enumerate(final_eval.get('recommendations', []), 1):
                        f.write(f"{i}. {rec}\n")
                else:
                    f.write("No recommendations available.\n")

                f.write(f"\nProcess completed successfully!\n")
                f.write(f"Final resume ready for submission.\n")

            print(f"[STATS] Summary report saved to {filepath}")

        except Exception as e:
            print(f"[WARN] Could not create summary report - {e}")
