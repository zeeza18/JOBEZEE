/**
 * In-memory API response cache — persists across React Router navigation.
 * Cleared only on full browser refresh (no localStorage persistence by design;
 * the server is the source of truth).
 *
 * Pattern: on mount, read cache → show instantly → fetch silently → update cache.
 */
import { create } from 'zustand'
import type { PulledJob, JobStats } from '../lib/api'

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

  // Actions
  setPulledJobs    : (jobs: PulledJob[]) => void
  setJobStats      : (stats: JobStats) => void
  setDashStats     : (stats: CachedDashStats) => void
  setDashProfile   : (profile: CachedProfile) => void
  setDashNews      : (news: CachedNews) => void
  setTailorResume  : (r: CachedTailorResume) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPortfolioData : (data: { profile: any; config: any | null }) => void
  updateJobStatus  : (id: string, status: string) => void
  mergeJobs        : (fresh: PulledJob[]) => void
}

export const useApiCache = create<ApiCacheState>((set) => ({
  pulledJobs    : [],
  jobStats      : null,
  dashStats     : null,
  dashProfile   : null,
  dashNews      : null,
  tailorResume  : null,
  portfolioData : null,

  setPulledJobs   : (jobs)    => set({ pulledJobs: jobs }),
  setJobStats     : (stats)   => set({ jobStats: stats }),
  setDashStats    : (stats)   => set({ dashStats: stats }),
  setDashProfile  : (profile) => set({ dashProfile: profile }),
  setDashNews     : (news)    => set({ dashNews: news }),
  setTailorResume : (r)       => set({ tailorResume: r }),
  setPortfolioData: (data)    => set({ portfolioData: data }),

  updateJobStatus: (id, status) =>
    set((s) => ({ pulledJobs: s.pulledJobs.map((j) => (j.id === id ? { ...j, status } : j)) })),

  mergeJobs: (fresh) =>
    set((s) => {
      const map = new Map(s.pulledJobs.map((j) => [j.id, j]))
      for (const j of fresh) map.set(j.id, j)
      return { pulledJobs: [...map.values()] }
    }),
}))
