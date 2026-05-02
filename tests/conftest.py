"""
Shared test setup — adds JOBEZEE repo root and apply/ to sys.path
so all test files can import discovery, tailor, apply.applypilot, etc.
"""
import sys
from pathlib import Path

REPO_ROOT  = Path(__file__).resolve().parent.parent
APPLY_ROOT = REPO_ROOT / "apply"

for p in (REPO_ROOT, APPLY_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))
