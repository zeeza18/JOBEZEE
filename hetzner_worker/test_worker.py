"""
Test script — verifies the Hetzner worker is reachable and the Render callback works.
Run from the JOBEZEE root: python hetzner_worker/test_worker.py

Tests:
  1. Hetzner /health endpoint responds
  2. Render /api/apply/internal/log callback accepts a log line with correct secret
  3. Render /api/apply/internal/log rejects wrong secret with 401
"""
import json
import sys
import urllib.request
import urllib.error

WORKER_URL    = "http://5.161.60.37:8001"
RENDER_URL    = "https://jobezee-api.onrender.com"
WORKER_SECRET = "0KjGN4CyApHlkxsPpxIG9QlYQfcaZsnQCP2jbA1kKLE"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"

errors = 0


def _req(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=10)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return None, str(e)


# ── Test 1: Hetzner /health ───────────────────────────────────────────────────
print(f"\n{INFO} Test 1: Hetzner worker /health")
status, body = _req(f"{WORKER_URL}/health")
if status == 200 and body.get("status") == "ok":
    print(f"{PASS} Worker is up — active_jobs={body.get('active_jobs', 0)}")
else:
    print(f"{FAIL} Expected 200 ok, got status={status} body={body}")
    print(f"       -> Make sure you've run setup.sh on 5.161.60.37 first")
    errors += 1


# ── Test 2: Render /api/apply/internal/log — valid secret ───────────────────────
print(f"\n{INFO} Test 2: Render callback endpoint — valid secret")
payload = json.dumps({
    "job_id": "test-job-123",
    "line":   "[TEST] Hello from test_worker.py",
    "status": "running",
}).encode()
status, body = _req(
    f"{RENDER_URL}/api/apply/internal/log",
    data=payload,
    headers={
        "Authorization": f"Bearer {WORKER_SECRET}",
        "Content-Type":  "application/json",
    },
    method="POST",
)
if status == 200 and body.get("ok"):
    print(f"{PASS} Callback accepted (200 ok)")
else:
    print(f"{FAIL} Expected 200 ok, got status={status} body={body}")
    errors += 1


# ── Test 3: Render /api/apply/internal/log — wrong secret → 401 ─────────────────
print(f"\n{INFO} Test 3: Render callback endpoint — wrong secret → 401")
status, body = _req(
    f"{RENDER_URL}/api/apply/internal/log",
    data=payload,
    headers={
        "Authorization": "Bearer wrongsecret",
        "Content-Type":  "application/json",
    },
    method="POST",
)
if status == 401:
    print(f"{PASS} Correctly rejected with 401")
else:
    print(f"{FAIL} Expected 401, got status={status} body={body}")
    errors += 1


# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
if errors == 0:
    print(f"{PASS} All tests passed — Hetzner ↔ Render pipeline is wired up!")
else:
    print(f"{FAIL} {errors} test(s) failed")
    if errors == 3:
        print("\n  → Hetzner worker not running yet.")
        print("  → SSH into 5.161.60.37 and run: bash /opt/jobezee/hetzner_worker/setup.sh")
    sys.exit(1)
