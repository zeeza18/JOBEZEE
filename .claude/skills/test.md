# Test Skill

**Trigger:** `/test` or invoked automatically after building/fixing any feature.

## What this skill does

After building or fixing anything, automatically write a focused test, save it to the right place, run it, and iterate until passing — without the user having to ask.

## Module → test folder mapping

| Module changed | Test folder |
|---|---|
| `discovery/` | `tests/discovery/` |
| `tailor/` | `tests/tailor/` |
| `apply/` | `tests/apply/` |
| `backend/` | `tests/backend/` |
| `worker/` | `tests/worker/` |
| `linkedin/` | `tests/linkedin/` |
| API endpoint | `tests/backend/` |

## Test file conventions

- Filename: `tests/{module}/test_{feature_name}.py`
- Must run standalone: `python tests/{module}/test_{feature_name}.py`
- No pytest required — plain Python with explicit PASS/FAIL prints
- First line comment: `# Test: {what this verifies}`
- Import path: always `import sys, sys.path.insert(0, str(Path(__file__).resolve().parents[2]))` then import module
- End with: `print("PASS: {description}")` or `print("FAIL: {reason}"); sys.exit(1)`

## Example test file structure

```python
# Test: discovery package imports and returns JobRecord instances
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from discovery import JobRecord, deduplicate

jobs = [JobRecord(title="Engineer", company="Acme", ...)]
deduped = deduplicate(jobs)
assert len(deduped) == 1
print("PASS: discovery.deduplicate works correctly")
```

## Workflow

1. Identify which module was just changed
2. Create `tests/{module}/test_{feature}.py`
3. Run: `python tests/{module}/test_{feature}.py`
4. If FAIL → fix the test or the code, run again
5. If PASS → leave the test file, report success to user

## For API endpoint tests

Test via HTTP against the running backend (localhost:8000):
```python
import requests
r = requests.get("http://localhost:8000/api/health")
assert r.status_code == 200
print("PASS: /api/health returns 200")
```

## Important

- Never delete passing test files — they become regression tests
- Keep tests focused and fast (< 5 seconds)
- If a test requires credentials or DB, mark it with `# Requires: DB` at top and skip gracefully
