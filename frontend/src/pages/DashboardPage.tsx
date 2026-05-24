import React, { useEffect, useRef, useState } from 'react'
import {
  Briefcase, ChevronDown, Eye, ExternalLink, Flame,
  DollarSign, Loader2, Mail, RefreshCw, Settings2, TrendingDown, TrendingUp, User, Users,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useAuthStore } from '../store/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { useApiCache } from '../store/useApiCache'
import { jobsApi, type JobStats as _JobStats } from '../lib/api'

const BASE  = import.meta.env.VITE_API_URL || ''

async function apiFetch<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: 'include' })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

interface Profile {
  full_name      : string
  preferred_name : string
  desired_roles  : string[]
  years_experience: string
  avatar_url: string
  linkedin: string
  resume_url: string
}

interface BotStats {
  total_applied: number
  total_failed: number
  openings_count: number
  new_jobs_count: number
  saved_count: number
  pipeline: Record<string, number>
  recent_applied: { title: string; company: string; date_applied: string; link: string; work_style: string; status: string }[]
}

interface NewsItem {
  title: string; link: string; published: string; source: string; category: string; topic: string
}

const CATEGORY_COLORS: Record<string, string> = {
  hiring:      'bg-emerald-100 text-emerald-800 border-emerald-300',
  new_posting: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  layoffs:     'bg-red-100 text-red-700 border-red-300',
  salary:      'bg-amber-100 text-amber-800 border-amber-300',
  market:      'bg-violet-100 text-violet-800 border-violet-300',
}

const CATEGORY_LABELS: Record<string, string> = {
  hiring:      'Hiring',
  new_posting: 'New Jobs',
  layoffs:     'Layoffs',
  salary:      'Salary',
  market:      'Market',
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  hiring:      <Users        className="h-3 w-3" />,
  new_posting: <Briefcase    className="h-3 w-3" />,
  layoffs:     <TrendingDown className="h-3 w-3" />,
  salary:      <DollarSign   className="h-3 w-3" />,
  market:      <TrendingUp   className="h-3 w-3" />,
}

// ── Job Tracker helpers ───────────────────────────────────────────────────────
interface TrackedJob {
  job_id: string; title: string; company: string; url: string
  salary: string; date_posted: string; date_applied: string
  platform: string; work_style: string; status: string
  resume_used_url?: string
}

const STATUS_CFG: Record<string, { label: string; cls: string; spinning?: boolean }> = {
  applying:     { label: 'Applying…',    cls: 'bg-amber-100 text-amber-800 border-amber-200', spinning: true },
  applied:      { label: 'Applied',      cls: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  interview_r1: { label: 'Interview R1', cls: 'bg-violet-100 text-violet-800 border-violet-200' },
  interview_r2: { label: 'Interview R2', cls: 'bg-violet-200 text-violet-900 border-violet-300' },
  interview_r3: { label: 'Interview R3', cls: 'bg-purple-200 text-purple-900 border-purple-300' },
  offer:        { label: 'Offer',        cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected:     { label: 'Rejected',     cls: 'bg-red-100 text-red-700 border-red-200' },
  ghosted:      { label: 'Ghosted',      cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  failed:       { label: 'Failed',       cls: 'bg-orange-100 text-orange-700 border-orange-200' },
}
const ALL_STATUSES = Object.keys(STATUS_CFG)

const PLATFORM_CFG: Record<string, { label: string; cls: string }> = {
  linkedin:   { label: 'LinkedIn',   cls: 'bg-[#0A66C2] text-white' },
  workday:    { label: 'Workday',    cls: 'bg-blue-100 text-blue-800 border border-blue-200' },
  greenhouse: { label: 'Greenhouse', cls: 'bg-teal-100 text-teal-800 border border-teal-200' },
  lever:      { label: 'Lever',      cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  indeed:     { label: 'Indeed',     cls: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
}
function getPlatform(raw: string) {
  const s = raw.toLowerCase()
  for (const [key, cfg] of Object.entries(PLATFORM_CFG)) {
    if (s.includes(key)) return cfg
  }
  return { label: raw || 'Company', cls: 'bg-slate-100 text-slate-600 border border-slate-200' }
}
function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` }
  catch { return null }
}

// ── Stat card (square KPI tile) ───────────────────────────────────────────────
interface StatCardProps {
  count: number | null
  sub?: string
  label: string
  loading?: boolean
  accent: string
  textColor: string
  onClick: () => void
  onSettings?: () => void
  showSettings?: boolean
}
function StatCard({ count, sub, label, loading, accent, textColor, onClick, onSettings, showSettings }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative w-full h-[88px] rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-0.5 overflow-hidden group"
    >
      {/* top accent bar */}
      <span className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent}`} />

      {/* settings icon — only for Applied (daily goal) */}
      {showSettings && onSettings && (
        <button
          onClick={e => { e.stopPropagation(); onSettings() }}
          className="absolute top-3 right-3 rounded-full p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
          title="Settings"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* number */}
      {loading ? (
        <Loader2 className={`h-7 w-7 animate-spin ${textColor} opacity-40`} />
      ) : (
        <span className={`text-3xl font-black leading-none ${textColor}`}>
          {count ?? 0}
        </span>
      )}

      {/* sub-label (e.g. "12 new") */}
      {!loading && sub && (
        <span className="rounded-full bg-cyan-50 border border-cyan-200 px-1.5 py-px text-[9px] font-semibold text-cyan-600 leading-none">
          {sub}
        </span>
      )}

      {/* label */}
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    </button>
  )
}

// ── Daily goal popover ─────────────────────────────────────────────────────────
function DailyGoalPopover({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [goal, setGoal] = useState<string>(() => localStorage.getItem('daily_apply_goal') ?? '10')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const save = () => {
    localStorage.setItem('daily_apply_goal', goal)
    onClose()
  }

  return (
    <div ref={ref} className="absolute right-0 top-8 z-50 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-700">Daily Apply Goal</p>
      <div className="flex items-center gap-2">
        <input
          type="number" min={1} max={100}
          value={goal}
          onChange={e => setGoal(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <button onClick={save}
          className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 px-2 py-1 text-xs font-semibold text-white hover:shadow-md transition-all">
          Save
        </button>
      </div>
      <p className="text-[10px] text-slate-400">Email notifications coming soon.</p>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const navigate = useNavigate()
  const { user }  = useAuthStore()
  const cache     = useApiCache()

  // ── Init from cache — shows instantly on re-visit, no spinner ────────────────
  const [profile,      setProfile]      = useState<Profile | null>(() => cache.dashProfile as Profile | null)
  const [botStats,     setBotStats]     = useState<BotStats | null>(() => cache.dashStats as BotStats | null)
  const [jobStats,     setJobStats]     = useState<_JobStats | null>(() => cache.jobStats as _JobStats | null)
  const [news,         setNews]         = useState<NewsItem[]>(() => cache.dashNews?.news ?? [])
  const [newsCtx,      setNewsCtx]      = useState<{ country: string; role: string } | null>(() =>
    cache.dashNews ? { country: cache.dashNews.country, role: cache.dashNews.role } : null
  )
  const [profileLoad,  setProfileLoad]  = useState(!cache.dashProfile)
  const [statsLoad,    setStatsLoad]    = useState(!cache.dashStats)
  const [newsLoad,     setNewsLoad]     = useState(!cache.dashNews)
  const [goalOpen,      setGoalOpen]      = useState(false)
  const [linkedinAvatar, setLinkedinAvatar] = useState<string | null>(null)
  const [liSyncing,      setLiSyncing]      = useState(false)
  const [trackedJobs,   setTrackedJobs]   = useState<TrackedJob[]>([])
  const [trackerLoad,   setTrackerLoad]   = useState(true)
  const [openStatusId,  setOpenStatusId]  = useState<string | null>(null)

  const syncLinkedinAvatar = async () => {
    setLiSyncing(true)
    try {
      const res = await apiFetch<{ avatar_url: string | null }>('/api/profile/linkedin-avatar')
      if (res.avatar_url) setLinkedinAvatar(res.avatar_url)
      else alert("LinkedIn profile is private or photo not accessible.")
    } catch { /* silent */ }
    setLiSyncing(false)
  }

  const saveLinkedinAvatar = async () => {
    if (!linkedinAvatar) return
    setLiSyncing(true)
    try {
      const r = await fetch(`${BASE}/api/profile/avatar-from-url`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkedinAvatar }),
      })
      if (r.ok) {
        const d = await r.json()
        setProfile(p => p ? { ...p, avatar_url: d.avatar_url } : p)
        setLinkedinAvatar(null)
      }
    } catch { /* silent */ }
    setLiSyncing(false)
  }

  const loadTracker = () => {
    setTrackerLoad(true)
    apiFetch<{ jobs: TrackedJob[] }>('/api/applied-jobs')
      .then(r => { setTrackedJobs(r.jobs); setTrackerLoad(false) })
      .catch(() => setTrackerLoad(false))
  }

  const updateStatus = async (jobId: string, status: string) => {
    setTrackedJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, status } : j))
    setOpenStatusId(null)
    await fetch(`${BASE}/api/applied-jobs/${jobId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {})
  }

  const load = async (silent = false) => {
    if (!silent) { setProfileLoad(true); setStatsLoad(true); setNewsLoad(true) }

    apiFetch<Profile>('/api/profile/').then(p => {
      setProfile(p)
      cache.setDashProfile(p as any)
      setProfileLoad(false)
    }).catch(() => setProfileLoad(false))

    apiFetch<BotStats>('/api/dashboard/stats').then(s => {
      setBotStats(s)
      cache.setDashStats(s as any)
      setStatsLoad(false)
    }).catch(() => setStatsLoad(false))

    jobsApi.stats().then(s => {
      setJobStats(s)
      cache.setJobStats(s as any)
    }).catch(() => {})

    apiFetch<{ news: NewsItem[]; country: string; role: string }>('/api/dashboard/news').then(r => {
      setNews(r.news); setNewsCtx({ country: r.country, role: r.role }); setNewsLoad(false)
      cache.setDashNews({ news: r.news, country: r.country, role: r.role })
    }).catch(() => setNewsLoad(false))
  }

  const scanEmails = () => {
    fetch(`${BASE}/api/applied-jobs/scan-emails`, {
      method: 'POST', credentials: 'include',
    }).then(() => loadTracker()).catch(() => {})
  }

  useEffect(() => {
    const hasCached = !!cache.dashProfile && !!cache.dashStats && !!cache.dashNews
    load(hasCached)   // silent (no spinner) if cache hit; full load on first visit
    loadTracker()
    scanEmails()

    // Background-prefetch jobs list so navigating to /jobs is instant
    if (useApiCache.getState().pulledJobs.length === 0) {
      ;(async () => {
        try {
          const cache2 = useApiCache.getState()
          const [statsData, page1] = await Promise.all([
            jobsApi.stats(),
            jobsApi.list({ limit: 50, offset: 0 }),
          ])
          cache2.setJobStats(statsData as any)
          setJobStats(statsData as _JobStats)
          // Fetch remaining pages
          const total = (statsData as _JobStats).total ?? 0
          if (total > 50) {
            const pages = Math.ceil(total / 50)
            const rest = await Promise.all(
              Array.from({ length: pages - 1 }, (_, i) =>
                jobsApi.list({ limit: 50, offset: (i + 1) * 50 })
              )
            )
            cache2.setPulledJobs([...page1, ...rest.flat()])
          } else {
            cache2.setPulledJobs(page1)
          }
        } catch { /* silent — jobs page will load normally */ }
      })()
    }

    // Live stats refresh every 60 s — keeps Openings/Applied counts current
    const statsInterval = setInterval(async () => {
      try {
        const s = await apiFetch<BotStats>('/api/dashboard/stats')
        setBotStats(s)
        cache.setDashStats(s as any)
      } catch { /* ignore */ }
    }, 60_000)

    const emailInterval = setInterval(scanEmails, 30 * 60 * 1000)
    return () => { clearInterval(statsInterval); clearInterval(emailInterval) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const _pname       = profile?.preferred_name || (profile?.full_name?.includes('@') ? '' : profile?.full_name) || ''
  const displayName  = _pname || user?.preferred_name || (user?.full_name?.includes('@') ? '' : user?.full_name) || 'You'
  const _ACRONYMS    = new Set(['ai','ml','ui','ux','api','ios','hr','it','sql','aws','gcp','llm'])
  const fmtRole      = (r: string) => r.split(' ').map(w => _ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const primaryRole  = profile?.desired_roles?.[0] ? fmtRole(profile.desired_roles[0]) : null
  const yearsExp     = profile?.years_experience ?? null
  const avatarUrl    = profile?.avatar_url
    ? (profile.avatar_url.startsWith('http') || profile.avatar_url.startsWith('data:')
        ? profile.avatar_url
        : `${BASE}${profile.avatar_url}`)
    : null

  return (
    <div className="flex flex-col gap-4 md:h-[calc(100vh-108px)] md:overflow-hidden">

      {/* ── Page title ──────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>

      {/* ── Profile hero card ───────────────────────────────────────── */}
      <Card className="overflow-hidden shrink-0">
        <div className="bg-gradient-to-r from-white via-cyan-50/30 to-sky-50/20 px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">

          {/* Avatar + Name — always a single row, flex-1 on desktop */}
          <div className="flex items-center gap-5 min-w-0 md:flex-1">
            <div className="shrink-0">
              {(linkedinAvatar || avatarUrl) ? (
                <img src={linkedinAvatar ?? avatarUrl!} alt="avatar"
                  className={`h-24 w-24 rounded-full object-cover ring-[3px] shadow-md ${linkedinAvatar ? 'ring-violet-400' : 'ring-cyan-300'}`} />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-200 flex items-center justify-center shadow">
                  <User className="h-10 w-10 text-slate-400" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {profileLoad ? (
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
                </div>
              ) : (
                <>
                  <p data-ctx="profile-name" className="text-xl font-bold text-slate-900 leading-tight">{displayName}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {primaryRole && (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-full px-3 py-0.5">
                        <Briefcase className="h-3.5 w-3.5" />{primaryRole}
                      </span>
                    )}
                    {yearsExp && <span className="text-sm text-slate-400">{yearsExp} yrs exp</span>}
                  </div>
                </>
              )}
            </div>
            {/* LinkedIn sync — desktop only */}
            {!avatarUrl && !linkedinAvatar && profile?.linkedin && (
              <button onClick={syncLinkedinAvatar} disabled={liSyncing}
                className="hidden md:flex shrink-0 text-[10px] font-semibold text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-full px-2.5 py-1 transition-colors">
                {liSyncing ? '…' : 'LinkedIn photo'}
              </button>
            )}
            {linkedinAvatar && (
              <button onClick={saveLinkedinAvatar} disabled={liSyncing}
                className="shrink-0 text-[10px] font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-full px-2.5 py-1 transition-colors">
                {liSyncing ? '…' : 'Save photo'}
              </button>
            )}
          </div>

          {/* Divider — desktop only */}
          <div className="hidden md:block self-stretch w-px bg-slate-200 shrink-0" />

          {/* Stat cards:
              Mobile  → full-width row, each card flex-1
              Desktop → fixed-width cards (w-28), shrink-0 */}
          <div className="flex items-center gap-3 md:shrink-0">
            <div className="flex-1 md:flex-none md:w-32">
              <StatCard
                count={jobStats ? jobStats.total - (jobStats.saved ?? 0) - (jobStats.hidden ?? 0) - (jobStats.favourite ?? 0) : null}
                sub={botStats?.new_jobs_count ? `${botStats.new_jobs_count} new` : undefined}
                label="Openings" loading={statsLoad || jobStats === null}
                accent="from-cyan-400 to-sky-500" textColor="text-cyan-600"
                onClick={() => navigate('/jobs')} />
            </div>
            <div className="flex-1 md:flex-none md:w-32">
              <StatCard
                count={botStats?.saved_count ?? null}
                label="Saved" loading={statsLoad}
                accent="from-violet-400 to-purple-500" textColor="text-violet-600"
                onClick={() => navigate('/jobs')} />
            </div>
            <div className="flex-1 md:flex-none md:w-32 relative">
              <span data-ctx="applied-count" className="hidden">{botStats?.total_applied ?? 0}</span>
              <StatCard count={botStats?.total_applied ?? null} label="Applied" loading={statsLoad}
                accent="from-emerald-400 to-teal-500" textColor="text-emerald-600"
                onClick={() => navigate('/app/applications')} onSettings={() => setGoalOpen(p => !p)} showSettings />
              {goalOpen && <DailyGoalPopover onClose={() => setGoalOpen(false)} />}
            </div>
          </div>

        </div>
      </Card>

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4 flex-1 min-h-0 md:overflow-hidden">

        {/* ── Job Tracker ── */}
        <Card className="md:col-span-2 flex flex-col p-0 overflow-hidden md:h-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
            <p className="text-sm font-bold text-slate-800">Job Tracker</p>
            {trackerLoad && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            <span data-ctx="tracker-count" className="text-xs text-slate-400">{trackedJobs.length} jobs</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <Mail className="h-3 w-3" />
              </span>
              <button onClick={loadTracker} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* Scroll hint — right fade, mobile only */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-20 md:hidden" />
            <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 md:hidden">
              <span className="text-[9px] font-semibold text-slate-400 rotate-90 tracking-widest select-none">scroll</span>
            </div>
          <div className="absolute inset-0 overflow-x-auto overflow-y-auto" style={{WebkitOverflowScrolling:'touch'}}>
            <table className="min-w-[700px] w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Company','Job Title','Salary','Posted','Applied','Platform','Status','Resume',''].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {trackedJobs.map((job) => {
                    const sc   = STATUS_CFG[job.status]  ?? STATUS_CFG.applied
                    const plat = getPlatform(job.platform)
                    const fav  = getFavicon(job.url)
                    const isOpen = openStatusId === job.job_id
                    return (
                      <tr key={job.job_id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Company */}
                        <td className="px-3 py-2.5 min-w-[130px] max-w-[160px]">
                          <div className="flex items-center gap-2">
                            {fav
                              ? <img src={fav} alt="" className="h-4 w-4 rounded shrink-0" onError={e => (e.currentTarget.style.display='none')} />
                              : <div className="h-4 w-4 rounded bg-slate-200 shrink-0" />
                            }
                            <a href={job.url} target="_blank" rel="noopener noreferrer"
                              className="font-semibold text-slate-800 hover:text-cyan-600 truncate transition-colors">
                              {job.company || '—'}
                            </a>
                          </div>
                        </td>
                        {/* Title */}
                        <td className="px-3 py-2.5 min-w-[160px] max-w-[200px]">
                          <p className="truncate text-slate-700 font-medium">{job.title || '—'}</p>
                          {job.work_style && <p className="text-slate-400 text-[10px]">{job.work_style}</p>}
                        </td>
                        {/* Salary */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 min-w-[90px]">
                          {job.salary || <span className="text-slate-300">—</span>}
                        </td>
                        {/* Posted */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-400 min-w-[80px]">{job.date_posted || '—'}</td>
                        {/* Applied */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 font-medium min-w-[90px]">{job.date_applied || '—'}</td>
                        {/* Platform */}
                        <td className="px-3 py-2.5 min-w-[90px]">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${plat.cls}`}>
                            {plat.label}
                          </span>
                        </td>
                        {/* Status — inline dropdown */}
                        <td className="px-3 py-2.5 min-w-[120px] relative">
                          <button onClick={() => setOpenStatusId(isOpen ? null : job.job_id)}
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-[10px] ${sc.cls} hover:opacity-80 transition-opacity`}>
                            {sc.spinning && <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />}
                            {sc.label}
                            <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                          </button>
                          {isOpen && (
                            <div className="absolute left-2 top-9 z-50 w-36 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 py-1">
                              {ALL_STATUSES.map(s => (
                                <button key={s} onClick={() => updateStatus(job.job_id, s)}
                                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors ${STATUS_CFG[s].cls} bg-transparent border-none`}>
                                  {STATUS_CFG[s].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        {/* Resume used */}
                        <td className="px-3 py-2.5 min-w-[80px]">
                          {(job.resume_used_url || profile?.resume_url) ? (
                            <a
                              href={job.resume_used_url
                                ? (job.resume_used_url.startsWith('http') ? job.resume_used_url : `${BASE}${job.resume_used_url}`)
                                : `${BASE}/api/profile/resume/download`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors"
                              title={job.resume_used_url ? "View tailored resume used for this job" : "View your current resume"}
                            >
                              <Eye className="h-3 w-3" />
                              {job.resume_used_url ? 'Tailored' : 'Resume'}
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-2.5">
                          {job.url ? (
                            <a href={job.url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-cyan-50 transition-colors text-slate-300 hover:text-cyan-500"
                              title="Open job posting">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="p-1.5 text-slate-200"><ExternalLink className="h-3.5 w-3.5" /></span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {(trackerLoad || trackedJobs.length === 0) && [
                    ['Google', 'Software Engineer', '$120k–$160k', 'Mar 12', 'Mar 14', 'LinkedIn'],
                    ['OpenAI', 'ML Engineer', '$180k–$220k', 'Mar 11', 'Mar 13', 'Indeed'],
                    ['Stripe', 'Backend Engineer', '$140k–$180k', 'Mar 10', 'Mar 12', 'LinkedIn'],
                    ['Vercel', 'Frontend Engineer', '—', 'Mar 09', 'Mar 11', 'Glassdoor'],
                    ['Anthropic', 'AI Researcher', '$200k+', 'Mar 08', 'Mar 10', 'LinkedIn'],
                    ['Meta', 'Data Engineer', '$160k–$200k', 'Mar 07', 'Mar 09', 'Indeed'],
                    ['Netflix', 'Platform Engineer', '$170k–$210k', 'Mar 06', 'Mar 08', 'LinkedIn'],
                    ['Apple', 'iOS Engineer', '$150k–$190k', 'Mar 05', 'Mar 07', 'Glassdoor'],
                    ['Microsoft', 'Cloud Engineer', '$130k–$170k', 'Mar 04', 'Mar 06', 'LinkedIn'],
                  ].map(([co, title, sal, posted, applied, plat], i) => (
                    <tr key={`ghost-${i}`} className={`border-b border-slate-50 ${trackerLoad ? 'animate-pulse' : 'opacity-30'}`}>
                      <td className="px-3 py-3 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded bg-slate-200 shrink-0" />
                          <span className="font-semibold text-slate-400 text-xs">{co}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 min-w-[160px]"><span className="text-slate-400 text-xs">{title}</span></td>
                      <td className="px-3 py-3 whitespace-nowrap"><span className="text-slate-400 text-xs">{sal}</span></td>
                      <td className="px-3 py-3 whitespace-nowrap"><span className="text-slate-400 text-xs">{posted}</span></td>
                      <td className="px-3 py-3 whitespace-nowrap"><span className="text-slate-400 text-xs">{applied}</span></td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5">{plat}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold px-2.5 py-0.5 border border-slate-200">—</span>
                      </td>
                      <td className="px-3 py-3"><span className="text-slate-200 text-[10px]">—</span></td>
                      <td className="px-3 py-3">
                        <div className="p-1.5"><ExternalLink className="h-3.5 w-3.5 text-slate-200" /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>{/* inner scroll div */}
          </div>{/* outer relative wrapper */}
        </Card>

        {/* News feed — scrollable */}
        <Card className="p-4 md:p-5 flex flex-col gap-3 overflow-hidden md:h-full">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500 shrink-0" />
            <p className="text-sm font-bold text-slate-800">Trending News</p>
            {newsLoad && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 ml-auto" />}
            {!newsLoad && newsCtx && (
              <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />{newsCtx.country}
              </span>
            )}
          </div>

          {/* Mobile: horizontal scroll row of cards; Desktop: vertical scrollable list */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* Scroll hint — right fade, mobile only */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-white to-transparent z-10 md:hidden" />
          <div className="
            flex flex-row gap-3 overflow-x-auto pb-2 -mx-1 px-1
            md:flex-col md:overflow-x-hidden md:overflow-y-auto md:gap-2 md:pb-0 md:mx-0 md:px-0
            md:absolute md:inset-0
            [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200
          ">
            {newsLoad ? (
              [1,2,3,4,5,6].map(i => (
                <div key={i} className="h-[80px] w-[220px] shrink-0 rounded-xl bg-slate-100 animate-pulse md:w-auto md:h-[72px]" />
              ))
            ) : news.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 w-full">Could not load news.</p>
            ) : news.map((item, i) => {
              const colorClass = CATEGORY_COLORS[item.category] ?? 'bg-slate-100 text-slate-700 border-slate-300'
              const shortTopic = CATEGORY_LABELS[item.category] ?? item.category ?? 'News'
              const isTop3 = i < 3
              return (
                <a key={i} data-ctx="news-item" href={item.link} target="_blank" rel="noopener noreferrer"
                  className={`group flex flex-col gap-1.5 rounded-xl border p-3 transition-all hover:shadow-sm shrink-0 w-[220px] md:w-auto
                    ${isTop3 ? 'border-orange-100 bg-orange-50/40 hover:border-orange-200' : 'border-slate-100 bg-white hover:border-cyan-200 hover:bg-cyan-50/30'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isTop3 && <Flame className="h-3 w-3 text-orange-400 shrink-0" />}
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
                        {CATEGORY_ICONS[item.category]}
                        {shortTopic}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.published && (
                        <span className="text-[10px] text-slate-300">
                          {new Date(item.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-cyan-500 transition-colors" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2 group-hover:text-cyan-700 transition-colors">
                    {item.title}
                  </p>
                  {item.source && <span className="text-[10px] text-slate-400">{item.source}</span>}
                </a>
              )
            })}
          </div>{/* scroll row */}
          </div>{/* relative wrapper */}
        </Card>
      </div>


    </div>
  )
}

export default DashboardPage
