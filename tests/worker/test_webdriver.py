"""
WebDriver smoke test — run this ON THE HETZNER SERVER after setup.sh completes.
Verifies Chrome + ChromeDriver + Xvfb are working correctly.

Usage:
  python /opt/jobezee/worker/test_webdriver.py
"""
import os, sys, subprocess, time

PASS = "[PASS]"
FAIL = "[FAIL]"
INFO = "[INFO]"
errors = 0

# ── Test 1: Chrome installed ──────────────────────────────────────────────────
print(f"\n{INFO} Test 1: Chrome installed")
try:
    out = subprocess.check_output(["google-chrome", "--version"], stderr=subprocess.DEVNULL).decode().strip()
    print(f"  {PASS} {out}")
except Exception as e:
    print(f"  {FAIL} {e}")
    errors += 1

# ── Test 2: Xvfb running ──────────────────────────────────────────────────────
print(f"\n{INFO} Test 2: Xvfb running on :99")
try:
    out = subprocess.check_output(["pgrep", "-a", "Xvfb"], stderr=subprocess.DEVNULL).decode().strip()
    if ":99" in out:
        print(f"  {PASS} {out}")
    else:
        print(f"  [WARN] Xvfb running but not on :99: {out}")
except Exception as e:
    print(f"  {FAIL} Xvfb not running: {e}")
    print(f"         -> Run: systemctl start xvfb")
    errors += 1

# ── Test 3: Selenium headless Chrome opens a page ─────────────────────────────
print(f"\n{INFO} Test 3: Selenium headless Chrome")
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service

    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1280,720")

    env_display = os.environ.get("DISPLAY", ":99")
    os.environ["DISPLAY"] = ":99"

    driver = webdriver.Chrome(options=opts)
    driver.get("https://www.google.com")
    title = driver.title
    driver.quit()

    if title:
        print(f"  {PASS} Chrome opened google.com — title: '{title}'")
    else:
        print(f"  {FAIL} Opened but got empty title")
        errors += 1
except Exception as e:
    print(f"  {FAIL} {e}")
    errors += 1

# ── Test 4: Worker service running ────────────────────────────────────────────
print(f"\n{INFO} Test 4: jobezee-worker service")
try:
    out = subprocess.check_output(
        ["systemctl", "is-active", "jobezee-worker"], stderr=subprocess.DEVNULL
    ).decode().strip()
    if out == "active":
        print(f"  {PASS} Service is active")
    else:
        print(f"  {FAIL} Service status: {out}")
        print(f"         -> Run: systemctl restart jobezee-worker")
        errors += 1
except Exception as e:
    print(f"  {FAIL} {e}")
    errors += 1

# ── Test 5: Worker HTTP health ────────────────────────────────────────────────
print(f"\n{INFO} Test 5: Worker HTTP /health")
try:
    import urllib.request, json
    r = urllib.request.urlopen("http://localhost:8001/health", timeout=5)
    body = json.loads(r.read())
    if body.get("status") == "ok":
        print(f"  {PASS} {body}")
    else:
        print(f"  {FAIL} Unexpected: {body}")
        errors += 1
except Exception as e:
    print(f"  {FAIL} {e}")
    errors += 1

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
if errors == 0:
    print(f"{PASS} All tests passed — Hetzner is ready!")
else:
    print(f"{FAIL} {errors} test(s) failed — check output above")
    sys.exit(1)
