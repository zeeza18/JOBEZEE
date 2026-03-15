# JOBEZEE Frontend

A Vite + React + TypeScript frontend for JOBEZEE — your job search OS. Tailwind (cyan-forward theme), zustand persistence to `localStorage`, mock data on first run.

## Quick start
```bash
cd C:\Users\azeez\PROJECTS\RESUME-MAKER\JOBEZEE\frontend
npm install
npm run dev
```

## Stack
- React 19 + Vite + TypeScript
- TailwindCSS (custom cyan theme) + motion accents via Framer Motion
- Routing: react-router-dom
- State: zustand (persisted to localStorage)
- Forms/validation: react-hook-form + zod (hooks ready)
- Icons: lucide-react, Charts: recharts

## Routes
- `/` landing
- `/onboarding` profile setup
- `/app` dashboard (AppShell layout)
- `/app/search` job search (mock filters + modal)
- `/app/tailor` resume tailoring (score, missing keywords, cover letter draft)
- `/app/apply` apply checklist + notes
- `/app/interview` interview prep + mock interview
- `/app/applications` kanban tracker
- `/app/profile` profile & resume library
- `/app/settings` preferences + reset
- `*` 404

## Project structure
- `src/routes` — route tree
- `src/store/useAppStore.ts` — slices, persistence, toasts
- `src/lib/mock.ts` — types + generated mock data
- `src/components/ui` — buttons, inputs, modal, toast, progress
- `src/components/layout` — AppShell, navs, footer, mobile dock
- `src/components/visuals` — animated bg, particles, transitions
- `src/features/*` — search, tailor, apply, interview, applications, profile
- `src/pages` — landing, onboarding, dashboard, settings, 404

## Theming
Tailwind configured in `tailwind.config.js` with cyan gradient palette, soft shadows, rounded corners, Space Grotesk typography. Global styles live in `src/styles/globals.css`.

## Persistence & mock data
Zustand persist saves state to `localStorage` (`jobezee-app`). On first run mock jobs, applications, resumes, and interview prep are generated in `src/lib/mock.ts`. Reset local data from Settings.

## Notes for backend wiring
- Replace `generateMockData` with API fetches; hydrate store via `useEffect` or `zustand` middleware.
- Swap local `saveApplication`/`saveTailorResult` with API calls, then update store on success.
- Toasts already wired for success/error messaging.

## Scripts
- `npm run dev` — start Vite dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview built bundle
