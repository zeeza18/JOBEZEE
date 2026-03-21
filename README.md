# JOBEZEE

AI-powered job search co-pilot. Finds jobs, tailors your resume per application, and auto-applies — all running in the background while you do other things.

---

## What It Does

| Stage | What happens |
|---|---|
| **Search** | Scrapes LinkedIn, Indeed, Glassdoor, ZipRecruiter (+ Workday opt-in) every 3 hours for roles matching your profile |
| **Tailor** | 4-tool AI crew rewrites your resume to match the JD — keyword extraction, tailoring, ATS scoring, LaTeX export |
| **Auto-Apply** | Selenium bot logs into LinkedIn, fills Easy Apply forms, uploads the right resume, submits |
| **Track** | Every application lands in the Job Tracker with status, location, salary, posted date |
| **Confirm** | Gmail IMAP scanner watches your inbox and auto-advances pipeline status (applied → interview → offer) |

---

## Tech Stack

### Backend
| | |
|---|---|
| Runtime | Python 3.11+ |
| Framework | FastAPI + Uvicorn |
| Database | PostgreSQL (Neon serverless) via SQLAlchemy 2 async |
| Auth | JWT (python-jose) + bcrypt |
| AI — Tailor | OpenAI GPT-4o (keyword extract, evaluate, LaTeX) + Anthropic Claude Sonnet (tailor) |
| AI — Apply | OpenAI GPT-4o-mini (form Q&A) |
| Bot | Selenium + Chrome (LinkedIn Easy Apply) |
| Search | JobSpy multi-site scraper + custom Workday scraper |
| Streaming | Server-Sent Events (SSE) |

### Frontend
| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 3 |
| State | Zustand (persisted to localStorage) |
| Routing | React Router 7 |
| Animations | Framer Motion |
| Charts | Recharts |
| Forms | React Hook Form + Zod |

---

## Repository Layout

```
JOBEZEE/
├── backend/                         # FastAPI application
│   ├── main.py                      # Entry point, routers, background loops
│   ├── models.py                    # SQLAlchemy ORM models
│   ├── schemas.py                   # Pydantic request/response schemas
│   ├── auth.py                      # JWT auth helpers
│   ├── database.py                  # Async engine, session factory, migrations
│   ├── routers/
│   │   ├── auth.py                  # POST /api/auth/register|login
│   │   ├── profile.py               # GET/PUT /api/profile + resume upload
│   │   ├── jobs.py                  # GET /api/jobs + status update
│   │   ├── search.py                # POST /api/search/trigger + status poll
│   │   ├── tailor.py                # POST /api/tailor/run + SSE stream
│   │   ├── apply_auto.py            # LinkedIn bot launch + SSE stream
│   │   ├── applied_jobs.py          # Applied jobs CRUD + email scan
│   │   └── dashboard.py             # Stats aggregation
│   └── services/
│       ├── phase1_service.py        # JobSpy + Workday orchestration
│       ├── tailor_service.py        # PHASE2 crew thread runner
│       └── linkedin_bot_service.py  # Bot subprocess launcher + log streamer
│
├── PHASE1_JOB_SEARCH/               # Job discovery engine
│   ├── jobspy_discovery.py          # JobSpy multi-site scraper
│   ├── workday_discovery.py         # Custom Workday ATS scraper
│   └── smartextract_discovery.py
│
├── PHASE2_JOB_TAILOR/               # AI resume tailoring crew
│   ├── crew.py                      # Orchestrator — 2-round tailor loop
│   └── tools/
│       ├── tool1.py                 # Keyword extractor  (GPT-4o)
│       ├── tool2.py                 # Resume tailor      (Claude Sonnet)
│       ├── tool3.py                 # ATS evaluator      (GPT-4o)
│       ├── tool4.py                 # LaTeX formatter    (GPT-4o)
│       └── resume_analyzer.py       # Python keyword coverage verifier
│
├── PHASE3_AUTO_APPLY/               # ApplyPilot agent (Greenhouse, Workday, Indeed)
│
├── linkedin_bot/                    # LinkedIn Easy Apply Selenium bot
│   ├── runAiBot.py                  # Main bot loop
│   ├── linkedin_launcher.py         # Config patcher + subprocess entry point
│   └── config/
│       ├── search.py                # Search preferences + filters (defaults)
│       ├── secrets.py               # LinkedIn credentials + AI keys (defaults)
│       ├── settings.py              # Browser + file settings
│       └── questions.py             # Form Q&A defaults + resume path
│
├── applypilot/                      # Multi-site apply agent
│
└── frontend/                        # React SPA
    └── src/
        ├── features/
        │   ├── jobs/                # Job Tracker
        │   ├── apply/               # Auto Apply (LinkedIn bot + per-job apply)
        │   ├── tailor/              # Resume Tailor
        │   ├── applications/        # Kanban pipeline
        │   ├── profile/             # Profile editor
        │   └── portfolio/           # Public portfolio page
        ├── pages/
        │   ├── DashboardPage.tsx
        │   ├── SettingsPage.tsx
        │   └── OnboardingPage.tsx
        ├── lib/api.ts               # Typed API client
        └── store/                   # Zustand stores (auth, app, settings)
```

---

## Architecture

```mermaid
graph TB
    subgraph Browser["Browser — React SPA"]
        UI[Dashboard / Jobs / Tailor / Apply / Applications]
        Store[Zustand Store — localStorage persist]
    end

    subgraph API["FastAPI Backend  :8000"]
        Router[Routers]
        Auth[JWT Auth Middleware]
        BG[Background Tasks + SSE Streams]
    end

    subgraph Storage["PostgreSQL — Neon"]
        Users[(users)]
        Profiles[(user_profiles)]
        Jobs[(pulled_jobs)]
        Sessions[(search_sessions)]
        Apps[(applications)]
        Files[(File Storage — /uploads)]
    end

    subgraph P1["Phase 1 — Job Search"]
        JobSpy[JobSpy Scraper\nLinkedIn · Indeed · Glassdoor · ZipRecruiter]
        Workday[Custom Workday Scraper]
    end

    subgraph P2["Phase 2 — Resume Tailor"]
        T1[Tool 1 — Keyword Extract\nGPT-4o]
        T2[Tool 2 — Resume Tailor\nClaude Sonnet]
        T3[Tool 3 — ATS Evaluator\nGPT-4o]
        T4[Tool 4 — LaTeX Export\nGPT-4o]
    end

    subgraph P3["Phase 3 — Auto Apply"]
        LIBot[LinkedIn Easy Apply Bot\nSelenium + Chrome]
        Pilot[ApplyPilot Agent\nGreenhouse · Workday · Indeed]
    end

    subgraph Email["Email Scanner"]
        IMAP[Gmail IMAP — 30-min poll\nRegex + GPT status detection]
    end

    UI -->|REST + SSE| Router
    Router --> Auth
    Router <--> Storage
    Router -->|trigger| P1
    Router -->|trigger thread| P2
    Router -->|spawn subprocess| P3

    P1 -->|insert rows| Jobs
    P2 -->|PDF + LaTeX| Files
    P3 -->|SSE log parse on apply| Jobs

    IMAP -->|status update| Apps
    BG -->|every 3h auto-search| P1
    BG -->|every 30min| IMAP
```

---

## End-to-End Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Phase1
    participant Phase2
    participant LinkedInBot
    participant LinkedIn
    participant Gmail

    User->>Frontend: Complete profile + upload resume
    Frontend->>Backend: PUT /api/profile

    Note over Backend,Phase1: Every 3 hours automatically (or manual trigger)
    Backend->>Phase1: run_phase1_search(profile, session_id)
    Phase1->>LinkedIn: Scrape via JobSpy (LinkedIn, Indeed, Glassdoor, Zip)
    Phase1-->>Backend: Insert PulledJob rows (status = new)
    Backend-->>Frontend: Jobs page loads new results

    User->>Frontend: Click Tailor on a job card
    Frontend->>Backend: POST /api/tailor/run-for-job
    Backend->>Phase2: start_tailor_job_for_job() in thread
    Phase2->>Phase2: Tool1 keywords → Tool2 tailor x2 rounds → Tool3 score → Tool4 LaTeX
    Backend-->>Frontend: SSE stream — live log lines
    Frontend-->>User: ATS score + Download PDF / LaTeX

    User->>Frontend: Click LinkedIn Auto Apply
    Frontend->>Backend: POST /api/apply/linkedin-launch
    Backend->>LinkedInBot: Spawn subprocess linkedin_launcher.py
    LinkedInBot->>LinkedIn: Login → Search → Easy Apply loop
    LinkedInBot-->>Backend: stdout log stream
    Backend-->>Frontend: SSE /api/apply/linkedin-stream
    Note over Backend: On "Successfully saved" line — insert PulledJob(status=applied)

    Note over Backend,Gmail: Every 30 minutes automatically
    Gmail-->>Backend: IMAP scan for applied jobs
    Backend->>Backend: Detect status from email body (regex + GPT)
    Backend-->>Frontend: Job Tracker reflects updated status
```

---

## Database Schema

```mermaid
erDiagram
    users {
        string id PK
        string email UK
        string hashed_password
        string full_name
        bool is_active
        datetime created_at
    }

    user_profiles {
        uuid id PK
        string full_name
        string email
        json desired_roles
        json preferred_locations
        json work_modes
        json job_types
        json experience_levels
        float salary_min
        float salary_max
        string remote_preference
        string experience_level
        string resume_url
        string linkedin_email
        string linkedin_password
        string openai_api_key
        string anthropic_api_key
        json skills_languages
        json skills_frameworks
        json skills_tools
        string years_experience
        datetime updated_at
    }

    pulled_jobs {
        uuid id PK
        uuid user_profile_id FK
        string search_session_id
        string title
        string company
        string location
        string url
        text description
        string salary_text
        float salary_min
        float salary_max
        string source
        string site
        string posted_at
        json skills
        string status
        datetime pulled_at
    }

    search_sessions {
        string id PK
        string user_id FK
        string status
        int jobs_found
        datetime started_at
        datetime finished_at
    }

    resumes {
        uuid id PK
        string user_id FK
        string filename
        string storage_url
        bool is_base
        string label
        datetime created_at
    }

    applications {
        uuid id PK
        string user_id FK
        uuid job_id FK
        uuid pulled_job_id
        uuid resume_id FK
        string platform
        string status
        datetime applied_at
        datetime email_confirmed_at
    }

    application_emails {
        uuid id PK
        uuid application_id FK
        string user_id FK
        string subject
        text body_snippet
        string detected_status
        datetime received_at
    }

    job_listings {
        uuid id PK
        string title
        string company
        string url UK
        text description
        float salary_min
        float salary_max
        string source
        string site
        string posted_at
        datetime first_seen_at
    }

    user_job_states {
        uuid id PK
        string user_id FK
        uuid job_id FK
        string status
        datetime updated_at
    }

    tool_usage {
        uuid id PK
        string user_id FK
        string tool
        string model
        int tokens_in
        int tokens_out
        float cost_usd
        datetime created_at
    }

    users ||--o{ user_profiles : "has one"
    users ||--o{ pulled_jobs : "owns"
    users ||--o{ search_sessions : "triggers"
    users ||--o{ applications : "submits"
    users ||--o{ resumes : "uploads"
    users ||--o{ application_emails : "receives"
    users ||--o{ user_job_states : "tracks"
    users ||--o{ tool_usage : "incurs"
    pulled_jobs ||--o{ applications : "applied via"
    job_listings ||--o{ user_job_states : "tracked by"
    job_listings ||--o{ applications : "applied to"
    resumes ||--o{ applications : "used in"
    applications ||--o{ application_emails : "linked to"
```

---

## Phase 2 — Tailor Crew Detail

```mermaid
flowchart TD
    JD([Job Description]) --> T1
    Resume([Current Resume]) --> PreAnalysis

    subgraph Crew["2-Round Iterative Crew"]
        T1["Tool 1 — Keyword Extractor\nGPT-4o\n\nOutputs: keywords · needs · results\nCompany name · Job title"]

        T1 --> PreAnalysis["Python Pre-Analysis\n\nVerify keyword coverage in bullets\nDetect orphaned skills\nFlag weak action verbs"]

        PreAnalysis --> T2R1

        T2R1["Tool 2 — Resume Tailor  Round 1\nClaude Sonnet\n\nInsert missing keywords\nRewrite weak bullets\nPreserve all factual claims"]

        T2R1 --> PostR1["Post-Analysis Round 1\nPython ground-truth check\nWhat was actually inserted vs claimed"]

        PostR1 --> T3R1["Tool 3 — ATS Evaluator  Round 1\nGPT-4o\n\nScore 0-100\nList orphaned skills\nPrecise insertion instructions\nReplacement suggestions"]

        T3R1 -->|"Accumulated feedback\norph skills + insertions\nmissing keyword list"| T2R2

        T2R2["Tool 2 — Resume Tailor  Round 2\nClaude Sonnet\n\nApply Round 1 feedback exactly\nLock Round 1 improvements\nFix remaining gaps"]

        T2R2 --> PostR2["Post-Analysis Round 2\nFinal ground-truth keyword coverage"]

        PostR2 --> T3R2["Tool 3 — ATS Evaluator  Round 2\nGPT-4o\n\nFinal score\nRemaining recommendations"]
    end

    T3R2 --> Best{"Best scored\nround selected"}
    Best --> T4["Tool 4 — LaTeX Formatter\nGPT-4o\n\nGenerates docs/latex/main.tex\nProduction-ready PDF via pdflatex"]
    T4 --> Output(["final_tailored_resume.pdf\nfinal_tailored_resume.tex\nkeyword_analysis.txt\nevaluation_round_1.txt\nevaluation_round_2.txt\nprocess_summary.txt"])
```

---

## LinkedIn Bot Flow

```mermaid
flowchart TD
    A([POST /api/apply/linkedin-launch]) --> B["Build Config Overrides\n\nsearch_terms ← desired_roles\nexperience_level ← profile levels\nwork mode · job type · salary\ntitle_keywords = disabled\ncurrent_experience = -1"]

    B --> C["Write overrides.json to temp file\nPassed via --config flag"]

    C --> D["Spawn Subprocess\nlinkedin_launcher.py --config overrides.json"]

    D --> E["Patch config modules in-memory\nbefore runAiBot.py imports them\n\nconfig.search · config.secrets\nconfig.settings · config.questions"]

    E --> F["Login to LinkedIn\nUsing stored credentials"]

    F --> G["Search Loop\nFor each search_term in desired_roles"]

    G --> H["Read job card\nTitle · Company · Job ID · Time Posted"]

    H --> I{"title_keywords\ncheck"}
    I -->|"disabled — always pass"| J["Pull full Job Description\nExpand to full text"]
    I -->|"if enabled — no keyword match"| Skip1(["Skip — title mismatch"])

    J --> K{"current_experience\ncheck"}
    K -->|"disabled -1 — always pass"| L{"tailor_before_apply?"}
    K -->|"if enabled — exceeds limit"| Skip2(["Skip — exp mismatch"])

    L -->|yes| M["Run PHASE2 Crew\nKeyword extract → Tailor → Score → LaTeX\nUse tailored PDF for this application"]
    L -->|no| N

    M --> N["Fill Easy Apply Form\nAI answers each question via GPT-4o-mini\nUpload resume PDF\nHandle multi-step modals"]

    N --> O["Submit Application"]

    O --> P["Log: Successfully saved\nTitle | Company job. Job ID: 123456"]

    P --> Q["SSE Event Generator detects line\nParse: title · company · job ID\nLook back for Time Posted line\nExtract: location · posted_at · salary"]

    Q --> R(["INSERT pulled_jobs\nstatus = applied\nsource = linkedin\nlocation · posted_at · salary_text"])
```

---

## How Applied Jobs Reach the Tracker

```mermaid
flowchart LR
    A["Bot stdout\n\nSuccessfully saved\nForward Deployed Engineer | Epic\nJob ID: 4388737345"] --> B

    B["SSE Event Generator\n/api/apply/linkedin-stream\n\nStreams all log lines to frontend\nWatches for 'successfully saved'"] --> C

    C["Context Parser\n_extract_from_context\n\nScans back through recent lines\nto find this job's block"] --> D

    D{"URL already\nin DB?"}
    D -->|yes — dedup| E(["Skip\nNo duplicate on SSE reconnect"])
    D -->|no| F

    F["INSERT pulled_jobs\n\ntitle: Forward Deployed Engineer\ncompany: Epic Placement\nlocation: Denver Metropolitan Area\nposted_at: now - 10h\nsalary_text: from any $ in log block\nstatus: applied\nsource: linkedin\nurl: linkedin.com/jobs/view/4388737345"]

    F --> G(["Job Tracker — APPLIED tab\nShows title · company · location\nsalary · posted date · platform"])
```

---

## Background Loops

Two async tasks start automatically at server startup:

**Auto Search** — every 3 hours, triggers Phase 1 for all users with `desired_roles` configured. Skips users with a search already running. Workday excluded from auto-runs (opt-in only).

**Email Scan** — every 30 minutes, checks Gmail IMAP for all jobs with `status = applied`. Detects status keywords using regex first, GPT-4o-mini fallback. Auto-updates job pipeline status.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT access token |

### Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile/` | Fetch profile (auto-creates if missing) |
| PUT | `/api/profile/` | Update all profile fields |
| POST | `/api/profile/resume` | Upload resume PDF |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs/` | List pulled jobs — paginated, filterable by status/source/search |
| GET | `/api/jobs/stats` | Count by status (new / saved / applied / hidden) |
| PUT | `/api/jobs/{id}/status` | Set status |
| GET | `/api/jobs/{id}/description` | Full JD text |

### Search
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/search/trigger` | Start Phase 1 job discovery |
| GET | `/api/search/status/{session_id}` | Poll session status + jobs found |

### Tailor
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tailor/run` | Tailor resume against pasted JD |
| POST | `/api/tailor/run-for-job` | Tailor for a pulled job UUID |
| GET | `/api/tailor/stream/{job_id}` | SSE live log stream |
| GET | `/api/tailor/resume/{job_id}` | Fetch tailored resume text + ATS score |
| GET | `/api/tailor/download-pdf/{job_id}` | Download tailored resume PDF |
| GET | `/api/tailor/download-tex/{job_id}` | Download LaTeX source |

### Auto Apply
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/apply/linkedin-launch` | Launch LinkedIn Easy Apply bot |
| GET | `/api/apply/linkedin-stream/{job_id}` | SSE log stream + DB writes on apply |
| GET | `/api/apply/linkedin-status/{job_id}` | Poll bot status |
| POST | `/api/apply/linkedin-stop/{job_id}` | Kill bot subprocess |
| POST | `/api/apply/run-for-job` | Auto-apply to a specific pulled job |
| POST | `/api/apply/run-for-url` | Auto-apply to a pasted job URL |
| GET | `/api/apply/stream/{apply_job_id}` | SSE log stream for single-job apply |

### Applied Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/applied-jobs/` | All applied jobs |
| PUT | `/api/applied-jobs/{id}/status` | Manually advance pipeline status |
| POST | `/api/applied-jobs/scan-email` | Trigger manual Gmail inbox scan |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Aggregated counts — applied / interview / offer / rejected |

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Marketing page |
| `/auth` | Auth | Login / Register |
| `/onboarding` | Onboarding | First-run profile setup wizard |
| `/app` | Dashboard | Stats + recent applications |
| `/app/jobs` | Job Tracker | All scraped jobs — search, filter, tailor, apply |
| `/app/apply` | Auto Apply | LinkedIn bot launcher + per-job / per-URL apply |
| `/app/tailor` | Resume Tailor | Paste JD → AI tailored resume + ATS score |
| `/app/applications` | Applications | Kanban pipeline (applied → interview → offer) |
| `/app/profile` | Profile | Edit preferences + upload resume |
| `/app/portfolio` | Portfolio | Public portfolio generator |
| `/app/settings` | Settings | Credentials, API keys, preferences |
| `/portfolio/:id` | Public Portfolio | Shareable public portfolio page |

---

## Environment Variables

### Backend — `JOBEZEE/.env`

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname

# JWT
SECRET_KEY=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:5173

# File storage
UPLOAD_DIR=uploads

# AI keys (fallback — users can override per-account in Settings)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Debug
DEBUG=true
```

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Google Chrome (Selenium bot)
- PostgreSQL — Neon free tier works fine

### Backend

```bash
cd JOBEZEE

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" asyncpg \
    "python-jose[cryptography]" bcrypt pydantic-settings python-multipart \
    aiofiles httpx openai anthropic pdfplumber selenium jobspy openpyxl

cp .env.example .env              # fill in DATABASE_URL and SECRET_KEY

python -m backend.run
# API at http://localhost:8000
# Swagger at http://localhost:8000/docs
```

### Frontend

```bash
cd JOBEZEE/frontend

npm install
npm run dev
# App at http://localhost:5173
```

---

## LinkedIn Bot — Config Override System

The bot never needs its config files edited manually. The backend service (`linkedin_bot_service.py`) reads the user profile and builds a JSON override dict. `linkedin_launcher.py` patches each config module **in-memory** before `runAiBot.py` imports them — so every run is fully driven by the DB profile.

```mermaid
flowchart LR
    DB[("user_profiles\nDB row")] --> Service["linkedin_bot_service.py\nbuild_config_overrides()"]
    Service --> JSON["overrides.json\n temp file"]
    JSON --> Launcher["linkedin_launcher.py\n--config overrides.json"]
    Launcher --> Patch["_patch_module()\nsetattr on config.search\nconfig.secrets\nconfig.settings\nconfig.questions"]
    Patch --> Bot["runAiBot.py\nruns with patched config"]
```

| Profile Field | Becomes | Bot Effect |
|---|---|---|
| `desired_roles` | `search_terms` | LinkedIn search queries |
| `experience_levels` | `experience_level` | Experience level filter checkboxes |
| `work_modes` | `on_site` | Remote / Hybrid / On-site filter |
| `job_types` | `job_type` | Full-time / Contract filter |
| `salary_min` | `salary` | Minimum salary filter bracket |
| `preferred_locations` | `location` | City-level filter (US stripped — LinkedIn defaults to US) |
| `linkedin_email` | `secrets.username` | Login email |
| `linkedin_password` | `secrets.password` | Login password |
| `openai_api_key` | env `OPENAI_API_KEY` | AI form Q&A answers |
| `anthropic_api_key` | env `ANTHROPIC_API_KEY` | Resume tailoring |

**Always-on service overrides (cannot be changed from config files):**

| Override | Value | Why |
|---|---|---|
| `title_keywords` | `[]` | Disabled — LinkedIn filters handle role relevance |
| `current_experience` | `-1` | Disabled — don't skip jobs based on JD text year-parsing |
| `search_location` | `""` | Don't attempt to set the search bar location (causes click errors on LinkedIn) |
