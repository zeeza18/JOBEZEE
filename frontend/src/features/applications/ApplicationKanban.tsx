/**
 * Application Kanban — reads from real /api/applied-jobs (PostgreSQL).
 * Columns: Applying → Applied → Interview → Offer → Rejected
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || ''

interface TrackedJob {
  job_id: string
  title: string
  company: string
  url: string
  salary: string
  date_applied: string
  platform: string
  status: string
}

const COLUMNS: { key: string; label: string; accent: string; dot: string }[] = [
  { key: 'applying',     label: 'Applying',    accent: 'border-t-amber-400',   dot: 'bg-amber-400' },
  { key: 'applied',      label: 'Applied',     accent: 'border-t-cyan-400',    dot: 'bg-cyan-400' },
  { key: 'interview_r1', label: 'Interview',   accent: 'border-t-violet-400',  dot: 'bg-violet-400' },
  { key: 'interview_r2', label: 'Round 2',     accent: 'border-t-violet-500',  dot: 'bg-violet-500' },
  { key: 'interview_r3', label: 'Final Round', accent: 'border-t-purple-500',  dot: 'bg-purple-500' },
  { key: 'offer',        label: 'Offer',       accent: 'border-t-emerald-400', dot: 'bg-emerald-400' },
  { key: 'rejected',     label: 'Rejected',    accent: 'border-t-red-400',     dot: 'bg-red-400' },
]

const VALID_STATUSES = [
  'applying', 'applied', 'interview_r1', 'interview_r2',
  'interview_r3', 'offer', 'rejected', 'ghosted', 'failed',
]

const NEXT_STATUS: Record<string, string> = {
  applying:     'applied',
  applied:      'interview_r1',
  interview_r1: 'interview_r2',
  interview_r2: 'interview_r3',
  interview_r3: 'offer',
  offer:        'offer',
  rejected:     'rejected',
}

export function ApplicationKanban() {
  const [jobs,    setJobs]    = useState<TrackedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [moving,  setMoving]  = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch(`${BASE}/api/applied-jobs`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setJobs(d.jobs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const moveForward = async (job: TrackedJob) => {
    const next = NEXT_STATUS[job.status] ?? job.status
    if (next === job.status) return
    setMoving(job.job_id)
    setJobs(prev => prev.map(j => j.job_id === job.job_id ? { ...j, status: next } : j))
    await fetch(`${BASE}/api/applied-jobs/${job.job_id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    }).catch(() => {})
    setMoving(null)
  }

  const jobsFor = (key: string) => jobs.filter(j => j.status === key)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">{jobs.length} applications · click a card to advance its stage</p>
        <button onClick={load} disabled={loading}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {COLUMNS.map(col => {
            const colJobs = jobsFor(col.key)
            return (
              <div key={col.key}
                className={`rounded-xl border-t-2 border border-slate-100 bg-slate-50/60 p-3 ${col.accent}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <p className="text-xs font-semibold text-slate-700">{col.label}</p>
                  </div>
                  <span className="rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {colJobs.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[60px]">
                  {colJobs.map(job => (
                    <motion.div key={job.job_id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
                      onClick={() => moveForward(job)}
                    >
                      {moving === job.job_id && (
                        <Loader2 className="h-3 w-3 animate-spin text-slate-400 mb-1" />
                      )}
                      <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{job.title || '—'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{job.company || '—'}</p>
                      {job.date_applied && (
                        <p className="text-[10px] text-slate-400 mt-1">{job.date_applied}</p>
                      )}
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-2.5 w-2.5" /> Open
                        </a>
                      )}
                    </motion.div>
                  ))}
                  {colJobs.length === 0 && (
                    <p className="text-[10px] text-slate-300 text-center pt-4">empty</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
