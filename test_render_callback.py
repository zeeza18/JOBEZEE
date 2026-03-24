"""Quick test: Render callback endpoint only (no Hetzner needed)."""
import json, sys, urllib.request, urllib.error

RENDER_URL    = "https://jobezee-api.onrender.com"
WORKER_SECRET = "0KjGN4CyApHlkxsPpxIG9QlYQfcaZsnQCP2jbA1kKLE"
PASS = "[PASS]"
FAIL = "[FAIL]"
errors = 0

def req(url, data, headers):
    r = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        res = urllib.request.urlopen(r, timeout=10)
        return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, {}

payload = json.dumps({"job_id": "test-123", "line": "[TEST] render callback ok", "status": "running"}).encode()

# Test 1: correct secret -> 200
print("\nTest 1: callback with correct secret")
s, b = req(f"{RENDER_URL}/api/apply/internal/log", payload, {"Authorization": f"Bearer {WORKER_SECRET}", "Content-Type": "application/json"})
if s == 200 and b.get("ok"):
    print(f"  {PASS} Got 200 ok")
else:
    print(f"  {FAIL} Got {s} {b}")
    errors += 1

# Test 2: wrong secret -> 401
print("Test 2: callback with wrong secret")
s, b = req(f"{RENDER_URL}/api/apply/internal/log", payload, {"Authorization": "Bearer wrong", "Content-Type": "application/json"})
if s == 401:
    print(f"  {PASS} Got 401 Unauthorized")
else:
    print(f"  {FAIL} Expected 401, got {s} {b}")
    errors += 1

# Test 3: API health
print("Test 3: Render API /health")
r = urllib.request.Request(f"{RENDER_URL}/api/health")
try:
    res = urllib.request.urlopen(r, timeout=10)
    body = json.loads(res.read())
    print(f"  {PASS} API is up: {body}")
except Exception as e:
    print(f"  {FAIL} {e}")
    errors += 1

# Test 4: Hetzner worker
print("Test 4: Hetzner worker /health")
r = urllib.request.Request("http://5.161.60.37:8001/health")
try:
    res = urllib.request.urlopen(r, timeout=5)
    body = json.loads(res.read())
    print(f"  {PASS} Worker is up: {body}")
except Exception as e:
    print(f"  [SKIP] Worker not up yet (run setup.sh on Hetzner): {e}")

print(f"\n{'All Render tests passed!' if errors == 0 else str(errors) + ' test(s) failed'}")
sys.exit(errors)
