# Contributing to JOBEZEE

## Project structure

```
jobezee/
├── backend/      FastAPI API server (deployed on Render)
├── frontend/     React + TypeScript UI (deployed on Vercel)
├── discovery/    Job discovery — Indeed, LinkedIn, Workday, Greenhouse
├── tailor/       Resume tailoring — Claude AI + CrewAI
├── apply/        Auto-apply pipeline — Selenium browser automation
├── linkedin/     LinkedIn bot — direct messaging and job search
├── worker/       Hetzner VPS worker — async heavy jobs
├── tests/        All tests, organised by module
└── scripts/      Utility and maintenance scripts
```

## Development setup

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn backend.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Running tests

```bash
python tests/discovery/test_phase1.py
python tests/backend/test_bot_login.py
```

## Branch naming

- `feat/` — new features
- `fix/` — bug fixes
- `chore/` — maintenance (deps, config, docs)

## Pull requests

- Keep PRs focused — one feature or fix per PR
- Include a test in `tests/{module}/` if touching backend code
- Do not push `.env` files or personal resume PDFs
