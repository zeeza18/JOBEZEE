# JOBEZEE

**AI-powered job search co-pilot.** Discovers jobs worldwide, tailors your resume per role, and tracks everything in one place.

---

## What It Does

| Stage | Description |
|-------|-------------|
| **1. Discover** | Pulls jobs from Indeed, LinkedIn, Glassdoor, ZipRecruiter, and 120+ Workday employer portals every 3 hours — automatically |
| **2. Browse** | Filter and review pulled jobs by status, source, salary, location, and experience level |
| **3. Tailor** | 4-tool AI pipeline rewrites your resume per job (keyword extract → tailor → evaluate → PDF) |
| **4. Track** | Jobs move through New → Saved → Tailored → Applied with counts on every tab |

---

## Stack

**Frontend**
- React 19 + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Zustand (state), React Hook Form + Zod (forms)
- React Router v7

**Backend**
- FastAPI (async) + SQLAlchemy 2.0 + asyncpg
- Neon PostgreSQL (serverless)
- JWT auth in httpOnly cookies (access 1h / refresh 30d)
- Uvicorn ASGI

**AI / Discovery**
- `python-jobspy` — scrapes Indeed, LinkedIn, Glassdoor, ZipRecruiter, Google Jobs
- Workday direct JSON API — 120+ employer portals
- SmartExtract — Playwright + LLM for arbitrary career sites *(disabled by default)*
- Claude Sonnet 4.6 — resume tailoring
- GPT-4o — keyword extraction + resume evaluation

---

## Project Structure

```
JOBEZEE/
├── frontend/               # React 19 SPA
│   ├── src/
│   │   ├── features/       # jobs/, profile/ page features
│   │   ├── pages/          # Landing, Auth, Dashboard, Onboarding
│   │   ├── components/     # AppShell, SideNav, MobileDock, UI kit
│   │   ├── lib/api.ts      # Typed fetch client
│   │   └── store/          # Zustand stores (auth, app)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── main.py             # FastAPI app + 3-hour auto-search loop
│   ├── models.py           # SQLAlchemy ORM (4 tables)
│   ├── schemas.py          # Pydantic v2 request/response schemas
│   ├── auth.py             # JWT + cookie helpers
│   ├── database.py         # Async engine + auto-migration
│   ├── config.py           # Settings (pydantic-settings)
│   ├── routers/
│   │   ├── auth.py         # /api/auth/*
│   │   ├── profile.py      # /api/profile/*
│   │   ├── jobs.py         # /api/jobs/*
│   │   ├── search.py       # /api/search/*
│   │   └── tailor.py       # /api/tailor/*
│   └── services/
│       ├── phase1_service.py   # Phase 1 orchestrator (background task)
│       └── tailor_service.py   # Phase 2 orchestrator (SSE stream)
│
├── PHASE1_JOB_SEARCH/      # Job discovery library
│   ├── jobspy_discovery.py         # Indeed, LinkedIn, Glassdoor, ZipRecruiter
│   ├── workday_discovery.py        # 120+ Workday employer portals
│   ├── smartextract_discovery.py   # Playwright + LLM (optional)
│   ├── models.py                   # JobRecord, UserPreferences, SearchFilters
│   └── llm.py                      # Gemini / OpenAI client
│
├── PHASE2_JOB_TAILOR/      # Resume tailoring pipeline
│   ├── tools/              # Tool 1–4 (keyword, tailor, eval, LaTeX)
│   ├── prompt/             # LLM prompt templates
│   └── scripts/            # resume_crew.py orchestrator
│
├── local/                  # Gitignored — local profile JSON
│   └── sample_profile.json # Template (safe to commit)
├── uploads/                # Gitignored — uploaded resumes
├── job_outputs/            # Gitignored — per-job tailor output
├── requirements.txt
└── .env.example
```

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or Neon account — free tier works)
- OpenAI API key (for tailoring)

### 1. Clone & install

```bash
git clone https://github.com/your-username/JOBEZEE.git
cd JOBEZEE

# Python deps
pip install -r requirements.txt
pip install --no-deps python-jobspy
pip install pydantic tls-client requests markdownify regex

# Frontend deps
cd frontend && npm install && cd ..
```

> **Why two pip commands?** `python-jobspy` pins an exact numpy version in its metadata that conflicts with pip's resolver, but works fine at runtime. `--no-deps` bypasses the resolver.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@host/db?ssl=require
JWT_SECRET=your-random-secret-here

# Required for resume tailoring
OPENAI_API_KEY=sk-...

# Optional — fallback LLM for SmartExtract
GOOGLE_API_KEY=AIza...

# CORS (adjust for production)
CORS_ORIGINS=http://localhost:5173

# Dev mode (full tracebacks in API responses)
DEBUG=true
```

```bash
cp frontend/.env.example frontend/.env
# VITE_API_URL=http://localhost:8001  (or wherever backend runs)
```

### 3. Run

```bash
# Terminal 1 — backend (port 8001)
cd JOBEZEE
python -m backend.run

# Terminal 2 — frontend (port 5173)
cd JOBEZEE/frontend
npm run dev
```

- App: `http://localhost:5173`
- API docs: `http://localhost:8001/docs`

---

## API Reference

### Auth (`/api/auth`)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Create account → sets JWT cookies |
| POST | `/login` | Authenticate → sets JWT cookies |
| POST | `/logout` | Clear cookies |
| GET | `/me` | Current user (requires auth) |
| POST | `/refresh` | Rotate access token from refresh cookie |

### Profile (`/api/profile`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Fetch profile (auto-creates blank if missing) |
| PUT | `/` | Full replace / create |
| POST | `/resume` | Upload resume file |
| POST | `/import-local` | Sync from `local/user_profile.json` → DB |
| GET | `/export-local` | Write DB profile → `local/user_profile.json` |

### Jobs (`/api/jobs`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List jobs (filters: `status`, `source`, `search`, `limit`, `offset`) |
| GET | `/stats` | Counts by status + available sources |
| GET | `/{id}/full-description` | On-demand full description fetch from source URL |
| PATCH | `/{id}/status` | Set status: `new` / `saved` / `applied` / `hidden` / `favourite` |

### Search (`/api/search`)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/trigger` | Start Phase 1 discovery (background task, returns session ID immediately) |
| GET | `/status/{session_id}` | Poll: `running` / `done` / `failed` + `jobs_found` |

**Trigger body (all optional):**
```json
{
  "roles": ["Software Engineer"],
  "locations": ["Remote"],
  "countries": ["USA"],
  "regions": ["europe"],
  "remote_pref": "remote",
  "hours_old": 72,
  "results_per_site": 50,
  "include_workday": false
}
```

### Tailor (`/api/tailor`)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/run-for-job` | Start tailoring for a pulled job ID |
| POST | `/run` | Start tailoring from raw text |
| GET | `/stream/{job_id}` | SSE stream of progress events |
| GET | `/status/{job_id}` | Poll result (score, PDF availability) |
| GET | `/resume/{job_id}` | Get final tailored text + score |
| GET | `/download/{job_id}` | Download PDF |
| GET | `/download-tex/{job_id}` | Download LaTeX source |

---

## Database Schema

Four tables, auto-created and auto-migrated on startup.

### `users`
`id` · `email` · `hashed_password` · `full_name` · `is_active` · `created_at`

### `user_profiles`
Primary key = `user.id` (1:1 with users).

Personal: `full_name` `preferred_name` `email` `phone` `address` `city` `state` `zip` `country` `linkedin` `github` `portfolio` `personal_website` `headline`

Job prefs: `desired_roles[]` `preferred_locations[]` `preferred_countries[]` `preferred_regions[]` `industries[]` `remote_preference` `job_type` `experience_level`

Compensation: `salary_min` `salary_max` `salary_currency` `salary_range_text`

Authorization: `work_authorization` `visa_sponsorship_required` `work_permit_type`

Experience: `current_job_title` `target_role` `years_experience` `education`

Skills: `skills_languages[]` `skills_frameworks[]` `skills_tools[]`

Resume preservation (AI never changes these): `resume_facts_companies[]` `resume_facts_projects[]` `resume_facts_schools[]` `resume_facts_metrics[]`

Search tuning: `hours_old` `results_per_site` `search_radius_miles`

Resume: `resume_filename` `resume_url`

### `pulled_jobs`
`id` · `user_profile_id` · `search_session_id` · `title` · `company` · `location` · `country` · `url` · `description` · `job_type` · `salary_min/max/currency/text` · `source` · `site` · `posted_at` · `skills[]` · `status` · `pulled_at`

**Status values:** `new` `saved` `applied` `hidden` `favourite`

### `search_sessions`
`id` (8-char) · `status` · `jobs_found` · `error` · `started_at` · `finished_at`

---

## Phase 1 — Job Discovery

The `PHASE1_JOB_SEARCH` module is a standalone library. It runs as a FastAPI background task and can also be used independently.

### Sources

**Phase A — Job boards** (via `python-jobspy`)
- Indeed, LinkedIn, Glassdoor, ZipRecruiter, Google Jobs
- 35+ country-specific Indeed domains for global search
- Results per site: configurable (default 50, max 100)

**Phase B — Workday portals** (direct JSON API, optional)
- 120+ employer career portals: Google, Meta, Amazon, Microsoft, Apple, Salesforce, Stripe, and more
- Grouped by region (North America, Europe, APAC, Middle East) and industry

**Phase C — SmartExtract** (Playwright + LLM, disabled by default)
- Playwright headless browser for sites that block scrapers
- LLM (Gemini or OpenAI) extracts structured job data from rendered HTML
- Enable by setting `GOOGLE_API_KEY` or `OPENAI_API_KEY` and removing the `if True:` guard in `phase1_service.py`

### Deduplication
- Within a search run: URL-based dedup across titles and sources
- Across runs: existing URLs in DB are skipped — no duplicates ever accumulate
- Old jobs keep their status (saved, applied, etc.) untouched

### Auto-search
Every 3 hours, the backend automatically triggers Phase A for every user who has at least one `desired_role` set. Workday is opt-in (toggle in the search panel).

---

## Phase 2 — Resume Tailoring

4-tool iterative pipeline:

```
Job Description
      │
      ▼
Tool 1: Keyword Extractor (GPT-4o)
  → ATS keywords, required skills, role-specific patterns
      │
      ▼
Tool 2: Resume Tailor (Claude Sonnet 4.6)          ┐
  → Rewrite resume sections to match job            │ 2 iterations
      │                                             │
      ▼                                             │
Tool 3: Resume Evaluator (GPT-4o)                  │
  → Score 0–100 + detailed feedback for next pass  ┘
      │
      ▼ (best-scoring iteration)
Tool 4: LaTeX Formatter
  → Convert to LaTeX → pdflatex → PDF
```

**Rules:**
- Facts (companies, projects, schools, metrics) are never fabricated or modified
- Content is reorganized and rephrased, not invented
- Two evaluation rounds pick the best output

Progress streams live via SSE to the frontend during tailoring.

---

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | LandingPage | Dark marketing page |
| `/auth` | AuthPage | Login / register |
| `/onboarding` | OnboardingPage | First-time setup wizard |
| `/app` | DashboardPage | Summary stats + quick actions |
| `/app/pulled-jobs` | PulledJobsPage | Browse, filter, tailor, track |
| `/app/profile` | ProfilePage | Full preferences form |
| `/app/tailor` | TailorPage | Manual resume tailoring |
| `/app/apply` | ApplyPage | *(placeholder)* |
| `/app/interview` | InterviewPage | *(placeholder)* |
| `/app/applications` | ApplicationsPage | *(placeholder)* |
| `/app/settings` | SettingsPage | *(placeholder)* |

### Jobs Page Tabs

| Tab | Shows |
|-----|-------|
| **All** | Every non-hidden job |
| **New** | Freshly pulled, unreviewed (`status = new`) |
| **Saved** | Bookmarked for later |
| **Tailored** | Resume tailored this session + applied jobs |
| **Applied** | Jobs you've applied to (auto-set when Apply is clicked) |
| **Hidden** | Dismissed jobs (click again to unhide) |

---

## Local Profile Sync

For power users who prefer editing JSON:

```bash
# Export DB profile to local JSON
GET /api/profile/export-local

# Edit local/user_profile.json
# (gitignored, safe to store personal data)

# Import back into DB
POST /api/profile/import-local
```

`local/sample_profile.json` is a template showing all available fields.

---

## Contributing

1. Fork and create a feature branch
2. `npm run lint` in `frontend/` before committing frontend changes
3. `npx tsc --noEmit` to catch type errors
4. Keep the cyan brand palette (`#06b6d4`) — don't change it

---

## License

MIT
