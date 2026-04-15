/**
 * In-memory API response cache — persists across React Router navigation
 * AND across full browser refreshes via localStorage.
 *
 * Pattern: on mount, read localStorage → show instantly → fetch silently → update cache.
 */
import { create } from 'zustand'
import type { PulledJob, JobStats, UserProfile } from '../lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CachedProfile {
  full_name       : string
  preferred_name  : string
  desired_roles   : string[]
  years_experience: string
  avatar_url      : string
  linkedin        : string
  resume_url      : string
}

export interface CachedDashStats {
  total_applied  : number
  total_failed   : number
  openings_count : number
  new_jobs_count : number
  saved_count    : number
  pipeline       : Record<string, number>
  recent_applied : { title: string; company: string; date_applied: string; link: string; work_style: string; status: string }[]
}

export interface CachedNews {
  news    : { title: string; link: string; published: string; source: string; category: string; topic: string }[]
  country : string
  role    : string
}

export interface CachedTailorResume {
  text     : string
  filename : string | null
}

// ── localStorage helpers ───────────────────────────────────────────────────────

const LS_JOBS_KEY  = 'jz_jobs_cache'
const LS_STATS_KEY = 'jz_stats_cache'
// Max jobs to cache — keeps localStorage well under the 5 MB limit
const MAX_CACHED_JOBS = 300

function readJobsCache(): PulledJob[] {
  try {
    const raw = localStorage.getItem(LS_JOBS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as PulledJob[]
  } catch { return [] }
}

function writeJobsCache(jobs: PulledJob[]) {
  try {
    // Keep only the most recent MAX_CACHED_JOBS to cap storage size
    const toStore = jobs.length > MAX_CACHED_JOBS ? jobs.slice(0, MAX_CACHED_JOBS) : jobs
    localStorage.setItem(LS_JOBS_KEY, JSON.stringify(toStore))
  } catch { /* ignore quota errors */ }
}

function readStatsCache(): JobStats | null {
  try {
    const raw = localStorage.getItem(LS_STATS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as JobStats
  } catch { return null }
}

function writeStatsCache(stats: JobStats) {
  try { localStorage.setItem(LS_STATS_KEY, JSON.stringify(stats)) } catch {}
}

// ── Store ──────────────────────────────────────────────────────────────────────

interface ApiCacheState {
  // Jobs page
  pulledJobs    : PulledJob[]
  jobStats      : JobStats | null

  // Dashboard
  dashStats     : CachedDashStats | null
  dashProfile   : CachedProfile | null
  dashNews      : CachedNews | null

  // Tailor page
  tailorResume  : CachedTailorResume | null

  // Portfolio page (store as any to avoid heavy import)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  portfolioData : { profile: any; config: any | null } | null

  // Profile page
  profileForm   : Partial<UserProfile> | null

  // Actions
  setPulledJobs    : (jobs: PulledJob[]) => void
  setJobStats      : (stats: JobStats) => void
  setDashStats     : (stats: CachedDashStats) => void
  setDashProfile   : (profile: CachedProfile) => void
  setDashNews      : (news: CachedNews) => void
  setTailorResume  : (r: CachedTailorResume) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPortfolioData : (data: { profile: any; config: any | null }) => void
  setProfileForm   : (form: Partial<UserProfile>) => void
  updateJobStatus  : (id: string, status: string) => void
  mergeJobs        : (fresh: PulledJob[]) => void
}

export const useApiCache = create<ApiCacheState>((set) => ({
  // Seed from localStorage so the first render shows data instantly
  pulledJobs    : readJobsCache(),
  jobStats      : readStatsCache(),
  dashStats     : null,
  dashProfile   : null,
  dashNews      : null,
  tailorResume  : null,
  portfolioData : null,
  profileForm   : null,

  setPulledJobs: (jobs) => {
    writeJobsCache(jobs)
    set({ pulledJobs: jobs })
  },

  setJobStats: (stats) => {
    writeStatsCache(stats)
    set({ jobStats: stats })
  },

  setDashStats    : (stats)   => set({ dashStats: stats }),
  setDashProfile  : (profile) => set({ dashProfile: profile }),
  setDashNews     : (news)    => set({ dashNews: news }),
  setTailorResume : (r)       => set({ tailorResume: r }),
  setPortfolioData: (data)    => set({ portfolioData: data }),
  setProfileForm  : (form)    => set({ profileForm: form }),

  updateJobStatus: (id, status) => {
    set((s) => {
      const updated = s.pulledJobs.map((j) => (j.id === id ? { ...j, status } : j))
      writeJobsCache(updated)
      return { pulledJobs: updated }
    })
  },

  mergeJobs: (fresh) =>
    set((s) => {
      const map = new Map(s.pulledJobs.map((j) => [j.id, j]))
      for (const j of fresh) map.set(j.id, j)
      const merged = [...map.values()]
      writeJobsCache(merged)
      return { pulledJobs: merged }
    }),
}))
