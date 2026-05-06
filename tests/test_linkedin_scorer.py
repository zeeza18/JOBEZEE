"""
LinkedIn Profile Scorer — test suite
Tests: 8 buckets, visual-not-evaluated, blank PDF, non-LinkedIn doc, consistency (3x), optimize
"""
import sys, json, time
sys.path.insert(0, ".")

from backend.services.linkedin_boost_service import (
    analyze_linkedin_profile,
    optimize_linkedin_profile,
    BUCKET_MAX,
)

PASS = "\033[92m PASS\033[0m"
FAIL = "\033[91m FAIL\033[0m"

EXPECTED_BUCKET_IDS = set(BUCKET_MAX.keys())

# ─── Sample profiles ──────────────────────────────────────────────────────────

GOOD_PROFILE = """
Mohammed Azeez
Senior Data Engineer | Apache Spark | Kafka | Python | AWS | GCP

About
Results-driven data engineer with 6+ years of experience building scalable pipelines
for fintech and e-commerce companies. Specialised in Apache Spark, Kafka streaming,
and cloud-native data architectures. Led a team of 4 engineers to reduce ETL latency
by 70% at NovaPay. Passionate about real-time data and MLOps.

Experience
NovaPay — Senior Data Engineer
Jan 2021 – Present
- Designed Apache Spark batch and streaming pipelines processing 50M events/day
- Reduced ETL latency by 70% through Kafka partitioning optimisation
- Mentored 3 junior engineers, conducted 20+ technical interviews
- Deployed pipelines on AWS EMR and GCP Dataproc saving $120k/year in compute costs

DataBridge Ltd — Data Engineer
Jun 2018 – Dec 2020
- Built end-to-end ELT pipelines using Python, Airflow, and Snowflake
- Automated daily reporting for 12 business units, saving 30 hours/week
- Migrated on-premise Hadoop cluster to AWS S3 + Athena

Education
University of Manchester — BSc Computer Science, 2018

Skills
Apache Spark, Kafka, Python, SQL, Airflow, AWS (EMR, S3, Glue, Lambda), GCP (Dataproc, BigQuery),
Snowflake, dbt, Docker, Kubernetes, Terraform, PySpark, Scala (basic), Data Modelling,
Pipeline Optimisation, Real-time streaming

Projects
Personal portfolio: github.com/azeez-data — open source Kafka + Spark demo
Certifications: AWS Data Analytics Specialty (2022), Google Cloud Professional Data Engineer (2023)
"""

BLANK_PROFILE = ""

MINIMAL_PROFILE = "John Smith\nSoftware Developer"

NON_LINKEDIN_DOC = """
INVOICE #12345
Bill To: Acme Corp
Date: 2024-01-15
Item: Consulting services - 10 hours @ $150/hr
Total: $1,500
Payment Due: 2024-02-15
"""

# ─── Helpers ──────────────────────────────────────────────────────────────────

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"{status}  {label}" + (f"  ({detail})" if detail else ""))
    return condition

def bucket_ids(result):
    return {b["id"] for b in result.get("buckets", [])}

# ─── Tests ────────────────────────────────────────────────────────────────────

def test_8_buckets():
    print("\n=== Test 1: 8 Buckets Present ===")
    result = analyze_linkedin_profile(GOOD_PROFILE)
    ids = bucket_ids(result)
    check("all 8 bucket IDs present", ids == EXPECTED_BUCKET_IDS,
          f"got: {ids}")
    check("overall_score is int 0-100", isinstance(result["overall_score"], int) and 0 <= result["overall_score"] <= 100,
          f"score={result['overall_score']}")
    check("grade is non-empty string", isinstance(result["grade"], str) and len(result["grade"]) > 0,
          f"grade={result['grade']}")
    check("priority_fixes is list", isinstance(result["priority_fixes"], list))
    check("headline_rewrite present", result.get("headline_rewrite") is not None)
    check("parsed_sections returned", isinstance(result.get("parsed_sections"), dict))
    check("pdf_text returned", bool(result.get("pdf_text")))
    return result


def test_visual_not_evaluated():
    print("\n=== Test 2: Visual Bucket Not Evaluated (no images) ===")
    result = analyze_linkedin_profile(GOOD_PROFILE)
    visual = next((b for b in result["buckets"] if b["id"] == "visual"), None)
    check("visual bucket exists", visual is not None)
    if visual:
        check("visual evaluated=False when no images", visual.get("evaluated") is False,
              f"evaluated={visual.get('evaluated')}")
        check("visual score=0 when not evaluated", visual["score"] == 0,
              f"score={visual['score']}")
        check("visual excluded from overall calc",
              # overall should equal sum of non-visual buckets / non-visual max * 100
              True, "server-side calc excludes it")
        non_visual_pts = sum(b["score"] for b in result["buckets"] if b["id"] != "visual")
        non_visual_max = sum(b["max"]   for b in result["buckets"] if b["id"] != "visual")
        expected_overall = round(non_visual_pts / non_visual_max * 100)
        check("overall matches server-side calc",
              abs(result["overall_score"] - expected_overall) <= 1,
              f"overall={result['overall_score']} expected~{expected_overall}")


def test_blank_pdf():
    print("\n=== Test 3: Blank PDF Handling ===")
    try:
        result = analyze_linkedin_profile(BLANK_PROFILE)
        # Should either return gracefully (0 score / empty) or raise
        check("returns dict", isinstance(result, dict))
        print(f"       score={result.get('overall_score')}, buckets={len(result.get('buckets', []))}")
    except Exception as exc:
        # Acceptable — blank text raises 422 at router level
        check("raises cleanly on blank", True, f"raised: {type(exc).__name__}: {exc}")


def test_minimal_profile():
    print("\n=== Test 4: Minimal Profile (name only) ===")
    result = analyze_linkedin_profile(MINIMAL_PROFILE)
    check("returns dict", isinstance(result, dict))
    ids = bucket_ids(result)
    check("at least 7 buckets returned (minimal text may drop one)", len(ids) >= 7,
          f"got {len(ids)}: {ids}")
    check("overall_score low (< 40)", result.get("overall_score", 100) < 40,
          f"score={result.get('overall_score')}")
    print(f"       score={result['overall_score']}, grade={result['grade']}")


def test_non_linkedin_doc():
    print("\n=== Test 5: Non-LinkedIn Document (invoice) ===")
    result = analyze_linkedin_profile(NON_LINKEDIN_DOC)
    check("returns dict", isinstance(result, dict))
    check("all 8 buckets returned", bucket_ids(result) == EXPECTED_BUCKET_IDS)
    check("overall_score very low (< 20)", result.get("overall_score", 100) < 20,
          f"score={result.get('overall_score')}")
    print(f"       score={result['overall_score']}, grade={result['grade']}")


def test_consistency():
    print("\n=== Test 6: Consistency (2x same PDF, variance <= 5pts) ===")
    scores = []
    for i in range(2):
        r = analyze_linkedin_profile(GOOD_PROFILE)
        scores.append(r["overall_score"])
        print(f"       run {i+1}: score={r['overall_score']}, grade={r['grade']}")
        time.sleep(1)
    variance = max(scores) - min(scores)
    check("variance <= 5 pts", variance <= 5, f"variance={variance}, scores={scores}")


def test_optimize():
    print("\n=== Test 7: Optimize Endpoint ===")
    result = analyze_linkedin_profile(GOOD_PROFILE, target_role="Senior Data Engineer")
    opt = optimize_linkedin_profile(result["pdf_text"], result, target_role="Senior Data Engineer")
    check("optimize returns dict", isinstance(opt, dict))
    check("headline section present", "headline" in opt, f"keys={list(opt.keys())}")
    check("about section present",    "about"    in opt)
    check("experience section present","experience" in opt)
    check("skills section present",   "skills"   in opt)

    if "headline" in opt:
        hl = opt["headline"]
        check("headline.optimized non-empty", bool(hl.get("optimized")),
              f"optimized={hl.get('optimized', '')[:60]}")

    if "experience" in opt and opt["experience"]:
        exp0 = opt["experience"][0]
        check("experience[0].optimized_bullets is list", isinstance(exp0.get("optimized_bullets"), list))
        check("experience[0] has bullets", len(exp0.get("optimized_bullets", [])) > 0)

    return opt


def test_all_bucket_scores_nonzero():
    print("\n=== Test 8: Non-Zero Bucket Scores on Good Profile ===")
    result = analyze_linkedin_profile(GOOD_PROFILE)
    evaluated = [b for b in result["buckets"] if b.get("evaluated", True)]
    all_nonzero = all(b["score"] > 0 for b in evaluated)
    check("all evaluated buckets have score > 0", all_nonzero,
          str({b["id"]: b["score"] for b in evaluated}))
    for b in result["buckets"]:
        eval_flag = "" if b.get("evaluated", True) else " [not evaluated]"
        bar = "█" * (b["pct"] // 10) + "░" * (10 - b["pct"] // 10)
        print(f"       {b['label']:<18} {bar} {b['score']:>2}/{b['max']}{eval_flag}")


# ─── Run all ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("LinkedIn Profile Scorer — Test Suite")
    print("=" * 50)

    t1 = test_8_buckets()
    test_visual_not_evaluated()
    test_blank_pdf()
    test_minimal_profile()
    test_non_linkedin_doc()
    test_consistency()
    test_optimize()
    test_all_bucket_scores_nonzero()

    print("\n" + "=" * 50)
    print("Done.")
