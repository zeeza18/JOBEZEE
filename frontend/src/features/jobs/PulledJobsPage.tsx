/**
 * Jobs page — Phase 1 pulled jobs with search, filter, tailor, and apply.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight, Ban, Bookmark, BookmarkCheck, Bot, Briefcase, Building2,
  CheckCircle2, ChevronRight, DollarSign, Download, Eye, EyeOff, Filter,
  Globe, GraduationCap, Loader2, MapPin, RefreshCw,
  Sparkles, Trash2, X, XCircle, Zap,
} from 'lucide-react'
import { applyApi, jobsApi, profileApi, searchApi, tailorApi, type JobStats, type PulledJob, type UserProfile } from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useApiCache } from '../../store/useApiCache'
// useApiCache.getState() reads store outside React without subscribing

// ─── Types ────────────────────────────────────────────────────────────────────

interface TailorJobState {
  tailorJobId : string
  status      : 'queued' | 'tailoring' | 'done' | 'error'
  score       : number | null
  filename    : string | null
  error       : string | null
  roundsDone  : number
  startedAt?  : number   // ms timestamp when tailoring began (for timeout detection)
  /** Called when user clicks Retry on an error card. */
  onRetry?    : () => void
}

interface ApplyJobState {
  applyJobId : string
  status     : 'applying' | 'applied' | 'failed' | 'error'
  result     : string | null
  error      : string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time  : 'Full-time',
  part_time  : 'Part-time',
  contract   : 'Contract',
  internship : 'Internship',
  temporary  : 'Temporary',
}

const SOURCE_COLORS: Record<string, string> = {
  indeed      : 'bg-blue-50 text-blue-600 border-blue-100',
  linkedin    : 'bg-sky-50 text-sky-700 border-sky-100',
  glassdoor   : 'bg-emerald-50 text-emerald-600 border-emerald-100',
  workday     : 'bg-purple-50 text-purple-600 border-purple-100',
  ziprecruiter: 'bg-orange-50 text-orange-600 border-orange-100',
}

function srcColor(src: string) {
  return SOURCE_COLORS[src?.toLowerCase()] ?? 'bg-slate-100 text-slate-500 border-slate-200'
}

function fmtSalary(job: PulledJob, convertHourly = false): string {
  if (job.salary_text) {
    if (convertHourly) {
      // Convert "$40 – $55/hr" style text to monthly estimate (× 40hr × 4wk)
      const rangeM = job.salary_text.match(/\$(\d+)\s*[-–]\s*\$(\d+)\s*\/?\s*hr/i)
      if (rangeM) {
        const lo = Math.round(parseInt(rangeM[1]) * 40 * 4 / 1000)
        const hi = Math.round(parseInt(rangeM[2]) * 40 * 4 / 1000)
        return `$${lo}k–$${hi}k/mo`
      }
      const singleM = job.salary_text.match(/\$(\d+)\s*\/?\s*hr/i)
      if (singleM) {
        const mo = Math.round(parseInt(singleM[1]) * 40 * 4 / 1000)
        return `$${mo}k+/mo`
      }
    }
    return job.salary_text
  }
  const sym = (job.salary_currency || 'USD') === 'USD' ? '$' : (job.salary_currency || '')
  if (job.salary_min && job.salary_max)
    return `${sym}${(job.salary_min / 1000).toFixed(0)}k – ${sym}${(job.salary_max / 1000).toFixed(0)}k`
  if (job.salary_min) return `${sym}${(job.salary_min / 1000).toFixed(0)}k+`
  if (job.salary_max) return `up to ${sym}${(job.salary_max / 1000).toFixed(0)}k`
  return ''
}

function fmtPosted(posted: string | null | undefined): string {
  if (!posted) return ''
  const d = new Date(posted)
  if (isNaN(d.getTime())) return posted
  const h = (Date.now() - d.getTime()) / 3_600_000
  if (h < 2)  return 'Just now'
  if (h < 24) return `${Math.floor(h)}h ago`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

/** Parse all salary-sized dollar amounts from text with their positions. */
function _parseDollarAmounts(desc: string): Array<{ val: number; text: string; index: number }> {
  const re = /\$([\d,]+)\s*([kK])?/g
  const out: Array<{ val: number; text: string; index: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(desc)) !== null) {
    const raw = parseInt(m[1].replace(/,/g, ''), 10)
    const val = m[2] ? raw * 1000 : raw
    if (val >= 10_000) out.push({ val, text: m[0], index: m.index })  // ignore < $10k (costs, fees, etc.)
  }
  return out
}

/** Extract salary range from job description when structured fields are empty.
 *  Works with any phrasing: "starts at $X … up to $Y", "$X – $Y", "between $X and $Y", etc.
 */
function extractDescSalary(desc: string): string {
  if (!desc) return ''
  const amounts = _parseDollarAmounts(desc)
  // Look for two amounts within 100 chars of each other that form a lo–hi range
  for (let i = 0; i < amounts.length - 1; i++) {
    const a = amounts[i], b = amounts[i + 1]
    if (b.index - a.index <= 100 && a.val !== b.val) {
      const lo = Math.min(a.val, b.val), hi = Math.max(a.val, b.val)
      const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
      return `${fmt(lo)} – ${fmt(hi)}`
    }
  }
  // Single amount fallback
  if (amounts.length > 0) return amounts[0].text
  return ''
}

/** Extract hours/week from description. e.g. "10-20 hours per week" → "10–20 hrs/wk" */
function extractHours(desc: string): string {
  if (!desc) return ''
  const m = desc.match(/(\d+)\s*[-–—to]+\s*(\d+)\s*hours?\s*(per|a|\/)\s*week/i)
  if (m) return `${m[1]}–${m[2]} hrs/wk`
  const m2 = desc.match(/(\d+)\+?\s*hours?\s*(per|a|\/)\s*week/i)
  if (m2) return `${m2[1]}+ hrs/wk`
  return ''
}

/** Extract hourly rate from description. e.g. "$55 per hour" → "$55/hr" */
function extractHourlyRate(desc: string): string {
  if (!desc) return ''
  // Range: $40 - $55 per hour
  const m = desc.match(/\$([\d,]+)\s*[-–—to]+\s*\$([\d,]+)\s*(per\s*hour|\/\s*hr|\/\s*hour)/i)
  if (m) return `$${m[1]}–$${m[2]}/hr`
  // Single: up to $55 per hour / $55/hr
  const m2 = desc.match(/(?:up\s+to\s+)?\$([\d,]+)\s*(per\s*hour|\/\s*hr|\/\s*hour)/i)
  if (m2) return `$${m2[1]}/hr`
  return ''
}

/** Extract minimum years of experience from job description. e.g. "4–7+ years" → "4+ yrs" */
function extractExp(desc: string): string {
  if (!desc) return ''
  // Match patterns like "4-7+ years", "4–7 years", "5+ years", "3 to 5 years"
  const m = desc.match(/(\d+)\s*[-–—to]+\s*(\d+)\+?\s*years?|\b(\d+)\+\s*years?/i)
  if (!m) return ''
  const min = m[1] ?? m[3]
  if (!min) return ''
  return `${min}+ yrs`
}

// ─── Preference-match scoring ─────────────────────────────────────────────────

/** Parse salary numbers from description text. Returns [lo, hi] or null. */
function parseDescSalaryNums(desc: string): [number, number] | null {
  if (!desc) return null
  const amounts = _parseDollarAmounts(desc)
  for (let i = 0; i < amounts.length - 1; i++) {
    const a = amounts[i], b = amounts[i + 1]
    if (b.index - a.index <= 100 && a.val !== b.val)
      return [Math.min(a.val, b.val), Math.max(a.val, b.val)]
  }
  if (amounts.length > 0) return [amounts[0].val, amounts[0].val]
  return null
}

/** Get [lo, hi] salary from job structured fields or description. */
function jobSalaryRange(job: PulledJob): [number, number] | null {
  const lo = job.salary_min ?? 0, hi = job.salary_max ?? 0
  if (lo > 0 || hi > 0) return [lo > 0 ? lo : hi, hi > 0 ? hi : lo]
  return parseDescSalaryNums(job.description || '')
}

/** 2 = in range, 1 = unknown (no salary info), 0 = clearly out of range. */
function salaryScore(job: PulledJob, userMin: number, userMax: number): 0 | 1 | 2 {
  if (!userMin && !userMax) return 2
  const range = jobSalaryRange(job)
  if (!range) return 1
  const [jLo, jHi] = range
  if (jHi > 0 && jHi < userMin) return 0
  if (userMax > 0 && jLo > userMax) return 0
  return 2
}

/** Parse minimum years of experience as a number from description. */
function extractExpNum(desc: string): number | null {
  if (!desc) return null
  const m = desc.match(/(\d+)\s*[-–—to]+\s*(\d+)\+?\s*years?|\b(\d+)\+\s*years?/i)
  if (!m) return null
  const min = parseInt(m[1] ?? m[3] ?? '', 10)
  return isNaN(min) ? null : min
}

/** Map experience_level label → approximate minimum years. */
const EXP_LEVEL_YEARS: Record<string, number> = {
  intern    : 0,
  junior    : 1,
  mid       : 3,
  senior    : 5,
  lead      : 7,
  executive : 10,
}

/**
 * Resolve user's experience as a year number.
 * Uses experience_level label first (intern/junior/mid/senior/lead/executive),
 * falls back to parsing years_experience text (e.g. "4", "3-5").
 */
function resolveUserYears(expLevel: string, yearsText: string): number {
  const lvl = (expLevel || '').toLowerCase()
  if (EXP_LEVEL_YEARS[lvl] !== undefined) return EXP_LEVEL_YEARS[lvl]
  if (!yearsText) return 0
  const m = yearsText.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

/** 2 = user meets requirement, 1 = unknown requirement, 0 = user under-qualified. */
function expMatchScore(job: PulledJob, userYears: number): 0 | 1 | 2 {
  if (userYears === 0 && !job.description) return 2
  const required = extractExpNum(job.description || '')
  if (required === null) return 1
  return userYears >= required ? 2 : 0
}

function detectWorkMode(job: PulledJob): 'remote' | 'hybrid' | 'onsite' | 'unknown' {
  const text = [(job.location || ''), (job.title || '')].join(' ').toLowerCase()
  if (/\bremote\b/.test(text)) return 'remote'
  if (/\bhybrid\b/.test(text)) return 'hybrid'
  if (/\bon[\s-]?site\b|\bonsite\b|\bin[\s-]?person\b|\bin[\s-]?office\b/.test(text)) return 'onsite'
  return 'unknown'
}

/** 2 = matches preferred location, 1 = no location info, 0 = doesn't match. */
function locationMatchScore(job: PulledJob, prefLocs: string[]): 0 | 1 | 2 {
  if (!prefLocs || prefLocs.length === 0) return 2
  const loc = (job.location || '').toLowerCase()
  if (!loc) return 1
  const hasRemotePref = prefLocs.some(p => /remote/i.test(p))
  if (hasRemotePref && /remote/i.test(loc)) return 2
  if (prefLocs.some(p => loc.includes(p.toLowerCase()) || p.toLowerCase().includes(loc))) return 2
  return 0
}

/**
 * Count how many of (salary / location / experience) the job actually has info for.
 * Used as the primary sort tier: more info = shown higher.
 */
function jobInfoCount(job: PulledJob): number {
  let n = 0
  if (jobSalaryRange(job))                          n++  // has salary
  if ((job.location || '').trim())                  n++  // has location
  if (extractExpNum(job.description || '') !== null) n++  // has exp requirement
  return n
}

// ─── Lightweight markdown renderer ────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // Unescape ALL backslash sequences (markdownify escapes +, &, etc.)
  const unescaped = text.replace(/\\(.)/g, '$1')
  const parts: React.ReactNode[] = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\))/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(unescaped)) !== null) {
    if (m.index > last) parts.push(unescaped.slice(last, m.index))
    if (m[0].startsWith('**'))     parts.push(<strong key={m.index} className="font-semibold text-slate-900">{m[2]}</strong>)
    else if (m[0].startsWith('*')) parts.push(<em key={m.index}>{m[3]}</em>)
    else parts.push(<a key={m.index} href={m[5]} target="_blank" rel="noreferrer" className="text-cyan-600 underline">{m[4]}</a>)
    last = m.index + m[0].length
  }
  if (last < unescaped.length) parts.push(unescaped.slice(last))
  return parts
}

function JobDescription({ text }: { text: string }) {
  if (!text) return <p className="text-sm text-slate-400 italic">No description available.</p>

  const raw = text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // strip trailing backslash hard-line-breaks that markdownify adds
    .replace(/\\[ \t]*$/gm, '')
    // normalize lines that are pure asterisk-wrapped text → ## heading
    // e.g. "*Role Responsibilities**" or "**What You Need*" → "## Role Responsibilities"
    .replace(/^[*]{1,3}([^*\n]{2,60}?)[*]{1,3}[ \t]*$/gm, (_, content) => `## ${content.trim()}`)
    // ensure ## headings always start on their own line
    .replace(/([^\n])(#{1,3} )/g, '$1\n\n$2')

  const blocks = raw.split(/\n{2,}/)
  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed text-slate-700 font-normal">
      {blocks.map((block, bi) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        // ── Headings ────────────────────────────────────────────────────────
        const hm = trimmed.match(/^(#{1,3})\s+(.+)/)
        if (hm) {
          const lvl = hm[1].length
          const cls = lvl === 1
            ? 'text-sm font-bold text-slate-900 tracking-tight mt-1'
            : lvl === 2
            ? 'text-[13px] font-semibold text-slate-800 mt-0.5'
            : 'text-[13px] font-medium text-slate-700'
          return <p key={bi} className={cls}>{renderInline(hm[2])}</p>
        }

        // ── List blocks ──────────────────────────────────────────────────────
        const lines = trimmed.split('\n')
        const isList = lines.every(l => /^\s*[-*•]\s/.test(l) || l.trim() === '')
        if (isList) return (
          <ul key={bi} className="space-y-0.5 pl-1">
            {lines.filter(l => l.trim()).map((l, li) => (
              <li key={li} className="flex gap-2 items-start">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>{renderInline(l.replace(/^\s*[-*•]\s*/, ''))}</span>
              </li>
            ))}
          </ul>
        )

        // ── Mixed paragraph + bullets ────────────────────────────────────────
        const hasBullet = lines.some(l => /^\s*[-*•]\s/.test(l))
        if (hasBullet) return (
          <div key={bi} className="space-y-0.5">
            {lines.filter(l => l.trim()).map((l, li) => {
              const bm = l.match(/^\s*[-*•]\s*(.+)/)
              return bm
                ? <div key={li} className="flex gap-2 items-start">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>{renderInline(bm[1])}</span>
                  </div>
                : <p key={li} className="text-slate-700">{renderInline(l)}</p>
            })}
          </div>
        )

        // ── Plain paragraph ──────────────────────────────────────────────────
        return <p key={bi} className="text-slate-700">{renderInline(lines.map(l => l.trim()).join(' '))}</p>
      })}
    </div>
  )
}

// ─── Job Detail Drawer ────────────────────────────────────────────────────────

function JobDetailDrawer({
  job, onClose, onStatusChange, tailorState, onTailor, descCache, userProfile,
}: {
  job            : PulledJob
  onClose        : () => void
  onStatusChange : (id: string, s: string) => void
  tailorState?   : TailorJobState
  onTailor       : (job: PulledJob) => void
  descCache      : React.RefObject<Map<string, string>>
  userProfile?   : UserProfile | null
}) {
  const [updating, setUpdating]         = useState(false)
  const [fullDesc, setFullDesc]         = useState<string | null>(null)
  const [fetchingDesc, setFetchingDesc] = useState(false)
  const isSaved = job.status === 'saved' || job.status === 'favourite'

  // Check cache first — instant if pre-fetched, otherwise fetch live
  useEffect(() => {
    const cached = descCache.current.get(job.id)
    if (cached) {
      setFullDesc(cached)
      setFetchingDesc(false)
      return
    }
    setFullDesc(null)
    setFetchingDesc(true)
    jobsApi.fullDescription(job.id)
      .then(r => {
        if (r.description) {
          setFullDesc(r.description)
          descCache.current.set(job.id, r.description)
        }
      })
      .catch(() => {})
      .finally(() => setFetchingDesc(false))
  }, [job.id, descCache])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const update = async (status: string) => {
    setUpdating(true)
    await jobsApi.setStatus(job.id, status).catch(() => {})
    onStatusChange(job.id, status)
    setUpdating(false)
  }

  const META = [
    { label: 'Source',     value: job.site || job.source || '—' },
    { label: 'Job Type',   value: (JOB_TYPE_LABELS[job.job_type] ?? job.job_type) || '—' },
    { label: 'Posted',     value: job.posted_at || '—' },
    { label: 'Pulled',     value: job.pulled_at ? new Date(job.pulled_at).toLocaleDateString() : '—' },
    { label: 'Salary',     value: fmtSalary(job) || '—' },
    { label: 'Status',     value: job.status },
  ]

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-600 to-sky-700 p-6 pb-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${srcColor(job.site || job.source)}`}>
                  {job.site || job.source}
                </span>
                {job.job_type && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/80">
                    {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">{job.title}</h2>
              <p className="mt-1 text-sm text-white/75">
                {job.company}{job.location && <><span className="mx-1.5 opacity-50">·</span>{job.location}</>}
              </p>
            </div>
            <button onClick={onClose} className="flex-shrink-0 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          {fmtSalary(job) && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-sm font-semibold text-white">
              {fmtSalary(job)}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Details</p>
            <div className="grid grid-cols-2 gap-2.5">
              {META.map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800 capitalize truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Match score breakdown */}
          {job.match_score != null && (() => {
            const desc = job.description || ''

            // ── Salary: compare job salary vs user target ────────────────────
            const jobSalary    = fmtSalary(job) || extractDescSalary(desc)
            const salaryRange  = jobSalaryRange(job)
            const userSalMin   = userProfile?.salary_min ?? 0
            const salaryMet    = jobSalary && (!userSalMin || (salaryRange ? salaryRange[0] >= userSalMin : true))
            const salaryMiss   = jobSalary && userSalMin > 0 && salaryRange != null && salaryRange[1] < userSalMin

            // ── Experience: from resume_extraction, compare against JD ───────
            const resumeYears  = userProfile?.resume_extraction?.years_exp ?? 0
            const jdExpNum     = extractExpNum(desc) ?? 0
            const expMet       = jdExpNum > 0 && resumeYears > 0 && resumeYears >= jdExpNum
            const expMiss      = jdExpNum > 0 && resumeYears > 0 && resumeYears < jdExpNum
            const expLabel     = jdExpNum > 0 ? `${jdExpNum}+ yrs exp` : ''

            // ── Education: from resume_extraction ───────────────────────────
            const jdEdu        = detectJDEdu(desc)
            const userEduStr   = userProfile?.resume_extraction?.education ?? userProfile?.education ?? ''
            const userEduLvl   = eduLevel(userEduStr)
            const eduMatched   = jdEdu != null && userEduLvl >= jdEdu.level
            const eduMissing   = jdEdu != null && userEduLvl > 0 && userEduLvl < jdEdu.level

            // ── Sponsorship ──────────────────────────────────────────────────
            const sponsorship  = detectSponsorship(desc)

            const matchItems = [
              (salaryMet && !salaryMiss) ? { key: 'salary', label: jobSalary! } : null,
              expMet ? { key: 'exp', label: expLabel } : null,
              (jdEdu && eduMatched) ? { key: 'edu', label: jdEdu.label.replace(' req.', '') } : null,
              ...(job.matched_skills ?? []).map(s => ({ key: s, label: s })),
            ].filter(Boolean) as { key: string; label: string }[]

            const missingItems = [
              salaryMiss ? { key: 'salary', label: `Salary below target` } : null,
              expMiss ? { key: 'exp', label: expLabel } : null,
              (jdEdu && eduMissing) ? { key: 'edu', label: jdEdu.label } : null,
              ...(job.missing_skills ?? []).slice(0, 12).map(s => ({ key: s, label: s })),
            ].filter(Boolean) as { key: string; label: string }[]

            const sponsorColor = sponsorship === 'yes' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : sponsorship === 'no' ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-slate-50 border-slate-200 text-slate-500'
            const sponsorDot = sponsorship === 'yes' ? 'bg-emerald-400'
              : sponsorship === 'no' ? 'bg-rose-400' : 'bg-slate-300'
            const sponsorLabel = sponsorship === 'yes' ? 'Yes' : sponsorship === 'no' ? 'No' : 'Maybe'

            return (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                {/* Score header */}
                <div className="flex items-center gap-3">
                  <MatchScoreGauge score={job.match_score} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Resume Match</p>
                    <p className="text-xs text-slate-400">Based on your resume</p>
                  </div>
                </div>

                <div className="border-t border-slate-200" />

                {/* Matching */}
                {matchItems.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Matching</p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchItems.map(({ key, label }) => (
                        <span key={key} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing */}
                {missingItems.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-1.5">Missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingItems.map(({ key, label }) => (
                        <span key={key} className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-500">{label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sponsorship */}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sponsorship Likely</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sponsorColor}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sponsorDot}`} />
                    {sponsorLabel}
                  </span>
                </div>
              </div>
            )
          })()}

          {job.skills && job.skills.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Skills (from posting)</p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s) => (
                  <span key={s} className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs text-cyan-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          {job.url && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Job URL</p>
              <a href={job.url} target="_blank" rel="noreferrer"
                className="flex items-start gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700 hover:bg-cyan-100 transition break-all">
                <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {job.url}
              </a>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              {fetchingDesc
                ? <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading full description…</div>
                : <JobDescription text={fullDesc ?? job.description} />
              }
              {job.url && (
                <p className="mt-3 text-xs text-slate-400 italic">
                  <a href={job.url} target="_blank" rel="noreferrer" className="text-brand underline">View full posting ↗</a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-white p-4">
          {updating
            ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Updating…</div>
            : (
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => update(isSaved ? 'new' : 'saved')}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    isSaved ? 'border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-cyan-700'
                  }`}>
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {isSaved ? 'Saved' : 'Save'}
                </button>

                {job.status === 'hidden' ? (
                  <button onClick={() => update('new')}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-cyan-300 hover:text-cyan-700 transition">
                    <Eye className="h-4 w-4" /> Unhide
                  </button>
                ) : (
                  <button onClick={() => { update('hidden'); onClose() }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-red-300 hover:text-red-500 transition">
                    <EyeOff className="h-4 w-4" /> Hide
                  </button>
                )}

                {job.status === 'applied' && (
                  <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Applied
                  </span>
                )}

                {tailorState?.status === 'tailoring' ? (
                  <button disabled className="flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-500 px-3 py-2 text-sm font-medium text-white cursor-not-allowed animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Tailoring{tailorState.roundsDone === 1 ? '.' : tailorState.roundsDone === 2 ? '..' : tailorState.roundsDone >= 3 ? '...' : ''}
                  </button>
                ) : tailorState?.status === 'queued' ? (
                  <button disabled className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
                    <Loader2 className="h-4 w-4 animate-spin" /> Queued
                  </button>
                ) : tailorState?.status === 'done' ? (
                  <>
                    {tailorState.score != null && (
                      <span className={`flex items-center rounded-xl border px-3 py-2 text-sm font-bold ${
                        tailorState.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        tailorState.score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {tailorState.score}/100
                      </span>
                    )}
                    <a href={tailorApi.downloadPdfUrl(tailorState.tailorJobId)}
                       target="_blank" rel="noreferrer"
                       className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
                      <Download className="h-4 w-4" /> PDF
                    </a>
                    <a href={tailorApi.downloadDocxUrl(tailorState.tailorJobId)}
                       target="_blank" rel="noreferrer"
                       className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 transition">
                      <Download className="h-4 w-4" /> DOCX
                    </a>
                  </>
                ) : job.status !== 'applied' ? (
                  <button onClick={() => onTailor(job)}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition">
                    <Sparkles className="h-4 w-4" /> Tailor
                  </button>
                ) : null}

                {job.url && job.status !== 'applied' && (
                  <a href={job.url} target="_blank" rel="noreferrer"
                    onClick={async () => { await jobsApi.setStatus(job.id, 'applied').catch(() => {}); onStatusChange(job.id, 'applied'); onClose() }}
                    className="ml-auto flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
                    <ArrowUpRight className="h-4 w-4" /> Apply
                  </a>
                )}
                {job.url && job.status === 'applied' && (
                  <a href={job.url} target="_blank" rel="noreferrer"
                    className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                    <ArrowUpRight className="h-4 w-4" /> View Job
                  </a>
                )}
              </div>
            )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

// ─── Match Score helpers ──────────────────────────────────────────────────────

function boostScore(raw: number): number {
  return Math.min(raw + 0.10, 0.98)
}

function matchRingColor(pct: number): string {
  if (pct >= 0.70) return '#10b981'
  if (pct >= 0.50) return '#f59e0b'
  if (pct >= 0.30) return '#f97316'
  return '#f43f5e'
}

function matchLabelText(pct: number): string {
  if (pct >= 0.70) return 'GOOD MATCH'
  if (pct >= 0.50) return 'FAIR MATCH'
  if (pct >= 0.30) return 'WEAK MATCH'
  return 'LOW MATCH'
}

function matchLabelColor(pct: number): string {
  if (pct >= 0.70) return '#10b981'
  if (pct >= 0.50) return '#f59e0b'
  if (pct >= 0.30) return '#f97316'
  return '#f43f5e'
}

function detectH1B(desc: string): boolean {
  return /h[\s-]?1[\s-]?b|visa\s+sponsor|sponsor.*visa|will\s+sponsor|sponsorship\s+available/i.test(desc || '')
}

function detectSponsorship(desc: string): 'yes' | 'no' | 'maybe' {
  const d = (desc || '').toLowerCase()
  if (/(?:will|can|do|does)\s+(?:provide|offer|sponsor)|sponsorship\s+(?:is\s+)?(?:available|provided|offered)|h[\s-]?1[\s-]?b\s+(?:sponsor|ok|welcome|accepted)|visa\s+sponsorship\s+(?:available|provided)|open\s+to\s+(?:visa\s+)?sponsor/i.test(d)) return 'yes'
  if (/(?:will|can|do|does)\s+not\s+(?:provide|offer|sponsor)|no\s+(?:visa\s+)?sponsorship|must\s+(?:be\s+)?(?:authorized|eligible)\s+to\s+work|without\s+(?:the\s+need\s+for\s+)?(?:visa|employer)\s+sponsorship|not\s+(?:eligible|available)\s+for\s+sponsorship|(?:us\s+)?(?:citizen|permanent\s+resident)\s+only|authorization.*without.*sponsor/i.test(d)) return 'no'
  return 'maybe'
}

function eduLevel(edu: string): number {
  const e = (edu || '').toLowerCase()
  if (e.includes('phd') || e.includes('doctor')) return 5
  if (e.includes('master') || e.includes('mba') || e.includes('m.s')) return 4
  if (e.includes('bachelor') || e.includes('b.s') || e.includes('undergrad')) return 3
  if (e.includes('associate')) return 2
  return 0
}

function detectJDEdu(desc: string): { level: number; label: string } | null {
  const d = (desc || '').toLowerCase()
  if (/phd|doctorate|ph\.d/.test(d)) return { level: 5, label: 'PhD required' }
  if (/master'?s?|mba|m\.s\.|m\.eng/.test(d)) return { level: 4, label: "Master's req." }
  if (/bachelor'?s?|b\.s\.|undergraduate|4[\s-]year\s+degree/.test(d)) return { level: 3, label: "Bachelor's req." }
  if (/associate'?s?/.test(d)) return { level: 2, label: 'Associate req.' }
  return null
}

// Large gauge for the card right panel
function ScorePanel({ score, description }: { score: number; description: string }) {
  const R     = 22
  const circ  = 2 * Math.PI * R
  const boosted = boostScore(score)
  const dash  = circ * boosted
  const color = matchRingColor(boosted)
  const pct   = Math.round(boosted * 100)
  const label = matchLabelText(boosted)
  const lblColor = matchLabelColor(boosted)
  const h1b   = detectH1B(description)

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-3 py-4 w-[108px] shrink-0 rounded-r-xl border-l border-slate-100 bg-gradient-to-b from-slate-50 to-white">
      <div className="relative w-[56px] h-[56px]">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={R} fill="none" stroke="#e2e8f0" strokeWidth="5" />
          <circle cx="28" cy="28" r={R} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-slate-800 leading-none">
          {pct}%
        </span>
      </div>
      <span className="text-[10px] font-extrabold tracking-widest leading-none text-center"
        style={{ color: lblColor }}>{label}</span>
      {h1b && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-cyan-500 leading-none text-center">
          <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> H1B
        </span>
      )}
    </div>
  )
}

// Small inline gauge for the drawer header
function MatchScoreGauge({ score }: { score: number }) {
  const R    = 16
  const circ = 2 * Math.PI * R
  const boosted = boostScore(score)
  const dash = circ * boosted
  const color = matchRingColor(boosted)
  const pct  = Math.round(boosted * 100)
  return (
    <div className="flex flex-col items-center shrink-0 gap-0.5">
      <div className="relative w-11 h-11">
        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
          <circle cx="20" cy="20" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle cx="20" cy="20" r={R} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 leading-none">
          {pct}%
        </span>
      </div>
      <span className="text-[9px] font-bold tracking-wide leading-none"
        style={{ color: matchLabelColor(score) }}>{matchLabelText(score)}</span>
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job, tailorState, applyState, onStatusChange, onOpenDrawer, onTailor, onAutoApply,
  onDeleteTailor, convertHourly,
}: {
  job             : PulledJob
  tailorState?    : TailorJobState
  applyState?     : ApplyJobState
  onStatusChange  : (id: string, s: string) => void
  onOpenDrawer    : (job: PulledJob) => void
  onTailor        : (job: PulledJob) => void
  onAutoApply     : (job: PulledJob) => void
  onDeleteTailor  : (jobId: string) => void
  convertHourly?  : boolean
}) {
  const [updating, setUpdating] = useState(false)
  const isSaved = job.status === 'saved' || job.status === 'favourite'
  const salary      = fmtSalary(job, convertHourly) || extractDescSalary(job.description || '')
  const rawHourly   = extractHourlyRate(job.description || '')
  const hourlyRate  = !salary ? (convertHourly && rawHourly
    ? (() => {
        const m = rawHourly.match(/\$(\d+)–\$(\d+)/)
        if (m) return `$${Math.round(+m[1]*40*4/1000)}k–$${Math.round(+m[2]*40*4/1000)}k/mo`
        const s = rawHourly.match(/\$(\d+)/)
        return s ? `$${Math.round(+s[1]*40*4/1000)}k+/mo` : rawHourly
      })()
    : rawHourly) : ''
  const hoursPerWk  = extractHours(job.description || '')
  const exp         = extractExp(job.description || '')
  const posted      = fmtPosted(job.posted_at)
  const source = job.site || job.source || ''
  const typeLabel = JOB_TYPE_LABELS[job.job_type] || job.job_type || ''

  const setStatus = async (e: React.MouseEvent, status: string) => {
    e.stopPropagation()
    setUpdating(true)
    await jobsApi.setStatus(job.id, status).catch(() => {})
    onStatusChange(job.id, status)
    setUpdating(false)
  }

  return (
    <div
      className="group flex rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer w-full min-w-0 overflow-hidden"
      onClick={() => onOpenDrawer(job)}
    >
      {/* ── Left: main content ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="p-3 md:p-5 pb-2 md:pb-4 flex-1">
          {/* Row 1: company + source badge + status badge + quick-open */}
          <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
              <span className="text-xs md:text-sm font-semibold text-slate-500 truncate min-w-0">{job.company}</span>
              {source && (
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] md:text-xs font-medium capitalize ${srcColor(source)}`}>
                  {source}
                </span>
              )}
              {job.status === 'applied' && (
                <span className="shrink-0 flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Applied
                </span>
              )}
              {job.status === 'hidden' && (
                <span className="shrink-0 flex items-center gap-0.5 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                  <Ban className="h-2.5 w-2.5" /> Not Interested
                </span>
              )}
              {(job.status === 'new' || job.status === 'saved') && (
                <span className="shrink-0 flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  Not Applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {job.url && (
                <a href={job.url} target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition"
                  title="Open job posting">
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
              <button onClick={e => { e.stopPropagation(); onOpenDrawer(job) }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Row 2: title */}
          <h3 className="font-semibold text-slate-900 text-sm md:text-base leading-snug mb-2 line-clamp-2 break-words">
            {job.title}
          </h3>

          {/* Row 3: icon meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px] md:text-xs text-slate-500">
            {job.location && (
              <span className="flex items-center gap-1 min-w-0">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate">{job.location}</span>
              </span>
            )}
            {(() => {
              const wm = detectWorkMode(job)
              if (wm === 'remote') return (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3 shrink-0 text-slate-400" />Remote
                </span>
              )
              if (wm === 'hybrid') return (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0 text-slate-400" />Hybrid
                </span>
              )
              if (wm === 'onsite') return (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0 text-slate-400" />On-site
                </span>
              )
              return null
            })()}
            {typeLabel && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3 shrink-0 text-slate-400" />
                {typeLabel}
              </span>
            )}
            {exp && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3 shrink-0 text-slate-400" />
                {exp}
              </span>
            )}
            {(salary || hourlyRate) && (
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <DollarSign className="h-3 w-3 shrink-0 text-slate-400" />
                {salary || hourlyRate}
                {hoursPerWk && <span className="font-normal text-slate-400 ml-1">· {hoursPerWk}</span>}
              </span>
            )}
            {posted && <span className="text-slate-400">{posted}</span>}
          </div>
        </div>

      {/* Action footer */}
      <div className="border-t border-slate-100 px-3 md:px-5 py-2 flex items-center justify-between gap-1.5">
        {/* Save / Hide icon buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={e => setStatus(e, isSaved ? 'new' : 'saved')}
            disabled={updating}
            title={isSaved ? 'Remove from saved' : 'Save job'}
            className={`p-2 rounded-lg transition ${isSaved ? 'text-cyan-600 hover:text-cyan-700' : 'text-slate-400 hover:text-cyan-500'}`}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4 md:h-5 md:w-5" /> : <Bookmark className="h-4 w-4 md:h-5 md:w-5" />}
          </button>
          <button
            onClick={e => setStatus(e, job.status === 'hidden' ? 'new' : 'hidden')}
            disabled={updating}
            title={job.status === 'hidden' ? 'Unhide job' : 'Hide job'}
            className={`p-2 rounded-lg transition ${job.status === 'hidden' ? 'text-cyan-500 hover:text-cyan-700' : 'text-slate-400 hover:text-red-400'}`}
          >
            {job.status === 'hidden' ? <Eye className="h-4 w-4 md:h-5 md:w-5" /> : <EyeOff className="h-4 w-4 md:h-5 md:w-5" />}
          </button>
        </div>

        {/* Tailor + Apply buttons */}
        <div className="flex items-center gap-2 min-w-0">
          {job.status === 'applied' && (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-semibold text-emerald-700 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" /> Applied
            </span>
          )}
          {job.status === 'submitted' && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-semibold text-amber-700 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
            </span>
          )}

          {tailorState?.status === 'tailoring' ? (
            <button disabled
              className="flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-500 px-2 md:px-3 py-1.5 text-xs font-semibold text-white cursor-not-allowed shrink-0 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">
                Tailoring{tailorState.roundsDone === 1 ? '.' : tailorState.roundsDone === 2 ? '..' : tailorState.roundsDone >= 3 ? '...' : ''}
              </span>
            </button>
          ) : tailorState?.status === 'queued' ? (
            <button disabled
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 md:px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> <span className="hidden sm:inline">Queued</span>
            </button>
          ) : tailorState?.status === 'done' ? (
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              {tailorState.score != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  tailorState.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  tailorState.score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {tailorState.score}
                </span>
              )}
              <a href={tailorApi.downloadPdfUrl(tailorState.tailorJobId)}
                 target="_blank" rel="noreferrer"
                 onClick={e => e.stopPropagation()}
                 className="flex items-center gap-0.5 rounded-lg bg-slate-900 px-2 md:px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition shrink-0">
                <Download className="h-3 w-3" /> PDF
              </a>
              <a href={tailorApi.downloadDocxUrl(tailorState.tailorJobId)}
                 target="_blank" rel="noreferrer"
                 onClick={e => e.stopPropagation()}
                 className="flex items-center gap-0.5 rounded-lg border border-slate-200 px-2 md:px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 transition shrink-0">
                <Download className="h-3 w-3" /> DOCX
              </a>
              <button
                onClick={e => { e.stopPropagation(); onDeleteTailor(job.id) }}
                title="Remove tailored resume"
                className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : job.status !== 'applied' ? (
            <button onClick={e => { e.stopPropagation(); onTailor(job) }}
              className="flex items-center gap-1 rounded-lg bg-cyan-600 px-2 md:px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 transition shrink-0">
              <Sparkles className="h-3.5 w-3.5" /> <span className="hidden xs:inline sm:inline">Tailor</span>
            </button>
          ) : null}

          {/* Auto Apply button */}
          {!applyState && job.status !== 'applied' && job.url && (
            <button onClick={e => { e.stopPropagation(); onAutoApply(job) }}
              title="Auto-apply with AI agent"
              className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 md:px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition shrink-0">
              <Bot className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Auto Apply</span>
            </button>
          )}
          {applyState?.status === 'applying' && (
            <button disabled className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 md:px-3 py-1.5 text-xs font-semibold text-violet-500 cursor-not-allowed shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> <span className="hidden sm:inline">Applying…</span>
            </button>
          )}
          {applyState?.status === 'applied' && (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-semibold text-emerald-700 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Applied
            </span>
          )}
          {(applyState?.status === 'failed' || applyState?.status === 'error') && (
            <button onClick={e => { e.stopPropagation(); onAutoApply(job) }}
              title={applyState.error ?? 'Apply failed — retry?'}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-semibold text-red-600 hover:bg-red-100 transition shrink-0">
              <XCircle className="h-3.5 w-3.5" /> Retry
            </button>
          )}

        </div>
      </div>{/* end action footer */}
      </div>{/* end left column */}

      {/* ── Right: match score panel ───────────────────────────────────── */}
      {job.match_score != null && (
        <ScorePanel score={job.match_score} description={job.description || ''} />
      )}
    </div>
  )
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

type PostedAge = 'any' | 'today' | 'yesterday' | 'week' | 'older'

interface Filters {
  location   : string
  salaryMin  : number
  site       : string     // job board/source: linkedin / indeed / workday / greenhouse
  postedAge  : PostedAge
  workMode   : string     // 'any' | 'remote' | 'hybrid' | 'onsite'
  jobType    : string     // 'any' | 'full_time' | 'part_time' | 'contract' | 'internship'
  expLevel   : string     // 'any' | 'entry' | 'mid' | 'senior'
  sourceType : string     // 'any' | 'boards' | 'portals'
}

const EMPTY_FILTERS: Filters = {
  location: '', salaryMin: 0, site: '', postedAge: 'any',
  workMode: 'any', jobType: 'any', expLevel: 'any', sourceType: 'any',
}

const POSTED_OPTS: { value: PostedAge; label: string }[] = [
  { value: 'any',       label: 'Any time'  },
  { value: 'today',     label: 'Today'     },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week',      label: 'This week' },
  { value: 'older',     label: 'Week+'     },
]

const SITE_LABELS: Record<string, string> = {
  linkedin     : 'LinkedIn',
  indeed       : 'Indeed',
  glassdoor    : 'Glassdoor',
  zip_recruiter: 'ZipRecruiter',
  workday      : 'Workday',
  greenhouse   : 'Greenhouse',
}

function pill(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    active
      ? 'bg-cyan-600 border-cyan-600 text-white'
      : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-400 hover:text-cyan-600'
  }`
}

function FilterDrawer({
  open, filters, allLocations, allSites, onApply, onClose,
}: {
  open        : boolean
  filters     : Filters
  allLocations: string[]
  allSites    : string[]
  onApply     : (f: Filters) => void
  onClose     : () => void
}) {
  const [local, setLocal] = useState<Filters>(filters)
  useEffect(() => { setLocal(filters) }, [filters, open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setLocal(prev => ({ ...prev, [k]: v }))

  const selectCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-400 focus:bg-white focus:ring-1 focus:ring-cyan-200 appearance-none cursor-pointer'

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      {children}
    </div>
  )

  const activeCount = [
    !!local.location, !!local.site, local.salaryMin > 0,
    local.postedAge !== 'any', local.workMode !== 'any',
    local.jobType !== 'any', local.expLevel !== 'any', local.sourceType !== 'any',
  ].filter(Boolean).length

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-slate-900">Filters</span>
                {activeCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 && (
                  <button
                    onClick={() => { setLocal(EMPTY_FILTERS); onApply(EMPTY_FILTERS) }}
                    className="text-xs text-slate-500 hover:text-cyan-600 transition"
                  >
                    Reset all
                  </button>
                )}
                <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              <Section label="Location">
                <select value={local.location} onChange={e => set('location', e.target.value)} className={selectCls}>
                  <option value="">Any location</option>
                  {allLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Section>

              <Section label="Source">
                <select value={local.site} onChange={e => set('site', e.target.value)} className={selectCls}>
                  <option value="">All sources</option>
                  {allSites.map(s => <option key={s} value={s}>{SITE_LABELS[s] ?? s}</option>)}
                </select>
              </Section>

              <Section label="Source type">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'any',     label: 'All'             },
                    { value: 'boards',  label: 'Job boards'      },
                    { value: 'portals', label: 'Company portals' },
                  ].map(o => (
                    <button key={o.value} onClick={() => set('sourceType', o.value)} className={pill(local.sourceType === o.value)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Work mode">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'any',    label: 'Any'     },
                    { value: 'remote', label: 'Remote'  },
                    { value: 'hybrid', label: 'Hybrid'  },
                    { value: 'onsite', label: 'On-site' },
                  ].map(o => (
                    <button key={o.value} onClick={() => set('workMode', o.value)} className={pill(local.workMode === o.value)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Job type">
                <select value={local.jobType} onChange={e => set('jobType', e.target.value)} className={selectCls}>
                  <option value="any">Any type</option>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="temporary">Temporary</option>
                </select>
              </Section>

              <Section label="Experience level">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'any',    label: 'Any'       },
                    { value: 'entry',  label: 'Entry'     },
                    { value: 'mid',    label: 'Mid-level' },
                    { value: 'senior', label: 'Senior'    },
                  ].map(o => (
                    <button key={o.value} onClick={() => set('expLevel', o.value)} className={pill(local.expLevel === o.value)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section label="Min salary">
                <select value={local.salaryMin} onChange={e => set('salaryMin', Number(e.target.value))} className={selectCls}>
                  {[0, 50000, 80000, 100000, 120000, 150000, 200000].map(v => (
                    <option key={v} value={v}>{v === 0 ? 'Any' : `$${(v / 1000).toFixed(0)}k+`}</option>
                  ))}
                </select>
              </Section>

              <Section label="Date posted">
                <div className="flex flex-wrap gap-2">
                  {POSTED_OPTS.map(o => (
                    <button key={o.value} onClick={() => set('postedAge', o.value)} className={pill(local.postedAge === o.value)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Section>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-5 py-4 flex gap-3">
              <button
                onClick={() => { setLocal(EMPTY_FILTERS); onApply(EMPTY_FILTERS) }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 transition"
              >
                Reset
              </button>
              <button
                onClick={() => { onApply(local); onClose() }}
                className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ONE_HOUR       = 60 * 60 * 1000
const TAILOR_LS_KEY  = 'jz_pull_tailor'

export default function PulledJobsPage() {
  const { pushToast } = useAppStore()
  const { jobs: jobSettings, autoApply } = useSettingsStore()

  // ── Global API cache (survives React Router navigation) ──────────────────────
  const cache = useApiCache()

  // ── Data state — lazy-init from cache so re-visits show instantly ─────────────
  const [jobs, setJobs]               = useState<PulledJob[]>(() => cache.pulledJobs)
  const [stats, setStats]             = useState<JobStats | null>(() => cache.jobStats)
  const [loading, setLoading]         = useState(cache.pulledJobs.length === 0)
  const [searching, setSearching]     = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => { profileApi.get().then(setUserProfile).catch(() => {}) }, [])

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<'all' | 'new' | 'saved' | 'hidden' | 'applied' | 'tailored'>('all')
  const [filterOpen, setFilterOpen]     = useState(false)
  const [filters, setFilters]           = useState<Filters>(EMPTY_FILTERS)
  const [selectedJob, setSelectedJob]   = useState<PulledJob | null>(null)
  const [tailorJobs, setTailorJobs] = useState<Map<string, TailorJobState>>(() => {
    try {
      const raw = localStorage.getItem(TAILOR_LS_KEY)
      if (!raw) return new Map()
      const saved = JSON.parse(raw) as Record<string, TailorJobState>
      const map = new Map<string, TailorJobState>()
      for (const [id, state] of Object.entries(saved)) {
        if (state.status === 'done') {
          map.set(id, { ...state, roundsDone: state.roundsDone ?? 0 })
        } else if (state.status === 'tailoring' && state.tailorJobId) {
          // Will poll status on mount to see if completed while away
          map.set(id, { ...state, roundsDone: state.roundsDone ?? 0 })
        }
        // drop queued / tailoring without tailorJobId (API call never completed)
      }
      return map
    } catch { return new Map() }
  })
  const [applyJobs,  setApplyJobs]      = useState<Map<string, ApplyJobState>>(new Map())

  // ── Search session polling ────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState('')
  const [polling, setPolling]     = useState(false)

  const pollTimer          = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionJobsCount   = useRef(0)   // jobs found in the current search session only
  const esSources          = useRef<Map<string, EventSource>>(new Map())
  const autoSearchFired    = useRef(false) // fire auto-search only once per mount
  const descCache          = useRef<Map<string, string>>(new Map()) // pre-fetched JD cache

  // ── Load jobs + stats — first batch shows immediately, rest load in background ─
  const BATCH = 50

  // ── Background pre-fetch job descriptions (top N, 3 at a time) ──────────────
  const prefetchDescs = useCallback(async (jobList: PulledJob[]) => {
    const PREFETCH = 20
    const CONCURRENCY = 3
    const uncached = jobList.slice(0, PREFETCH).filter(j => !descCache.current.has(j.id))
    for (let i = 0; i < uncached.length; i += CONCURRENCY) {
      await Promise.all(
        uncached.slice(i, i + CONCURRENCY).map(async j => {
          try {
            const r = await jobsApi.fullDescription(j.id)
            if (r.description) descCache.current.set(j.id, r.description)
          } catch {}
        })
      )
    }
  }, [])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      // First batch + stats in parallel
      const [firstBatch, statsData] = await Promise.all([
        jobsApi.list({ limit: BATCH, offset: 0 }),
        jobsApi.stats(),
      ])
      setStats(statsData)
      cache.setJobStats(statsData)

      // On non-silent loads (first ever visit) show first batch immediately
      if (!silent) {
        setJobs(firstBatch)
        setLoading(false)
      }
      prefetchDescs(firstBatch)

      // Load all remaining batches
      const allJobs = [...firstBatch]
      if (firstBatch.length === BATCH) {
        let offset = BATCH
        while (true) {
          const batch = await jobsApi.list({ limit: BATCH, offset })
          if (batch.length === 0) break
          allJobs.push(...batch)
          if (!silent) {
            // Progressive reveal on first load
            setJobs(prev => {
              const existing = new Set(prev.map(j => j.id))
              const fresh = batch.filter(j => !existing.has(j.id))
              return fresh.length > 0 ? [...prev, ...fresh] : prev
            })
          }
          if (batch.length < BATCH) break
          offset += BATCH
        }
      }

      // Atomic update: on silent (cache-hit) reload, swap all-at-once so there's no flash
      if (silent) setJobs(allJobs)
      cache.setPulledJobs(allJobs)

    } catch {
      if (!silent) pushToast({ title: 'Could not load jobs', type: 'error' })
      if (!silent) setLoading(false)
    }
  }, [pushToast, prefetchDescs, cache])

  // On mount: if cache has jobs, skip spinner and load silently in background
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(cache.pulledJobs.length > 0) }, [])

  // ── Live background polling — check for new jobs every 60 s ─────────────────
  // Poll stats only (1 tiny request). Only do a full silent reload when the
  // total count actually changes (new jobs from the hourly background bot).
  useEffect(() => {
    const POLL_MS = 60_000
    const id = setInterval(async () => {
      try {
        const fresh = await jobsApi.stats()
        const cached = useApiCache.getState().jobStats
        const prevTotal = cached?.total ?? 0
        if (fresh.total !== prevTotal) {
          // New jobs arrived — reload list silently
          await load(true)
        } else {
          // No new jobs — just refresh counts in-place (instant, no list reload)
          setStats(fresh)
          cache.setJobStats(fresh)
        }
      } catch { /* ignore — next tick will retry */ }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [load, cache])


  // ── Incremental poll during search ───────────────────────────────────────────
  // New jobs land at position 0 (ordered by pulled_at desc), so offset-based
  // incremental fetching won't work. Instead: on each new batch detected, do a
  // silent full reload so the UI always reflects the DB state.
  const fetchNewBatch = useCallback(async (sid: string) => {
    try {
      const st = await searchApi.status(sid)
      if (st.jobs_found > sessionJobsCount.current) {
        sessionJobsCount.current = st.jobs_found
        await load(true)
      }
      if (st.status !== 'running') {
        setPolling(false)
        if (pollTimer.current) clearInterval(pollTimer.current)
        await load(true)   // final sync

        // After boards complete, silently fire Workday as a second session
        // so board results are always visible first
        try {
          const wd = await searchApi.trigger({ include_workday: true, workday_only: true, force_full_pull: true })
          sessionJobsCount.current = 0
          setSessionId(wd.session_id + ':workday')
          setPolling(true)
        } catch { /* 409 or unavailable — skip silently */ }
      }
    } catch {
      setPolling(false)
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [load])

  useEffect(() => {
    if (!polling || !sessionId) return
    if (pollTimer.current) clearInterval(pollTimer.current)
    const realSid = sessionId.replace(':workday', '')
    pollTimer.current = setInterval(() => fetchNewBatch(realSid), 5000)
    return () => { if (pollTimer.current) clearInterval(pollTimer.current) }
  }, [polling, sessionId, fetchNewBatch])

  // ── Trigger Phase 1 search ────────────────────────────────────────────────────
  // Phase A (boards) fires first. After it completes, Phase B (Workday) fires
  // automatically as a separate session so board results are visible first.
  const triggerSearch = useCallback(async () => {
    setSearching(true)
    try {
      // Always boards-only first — Workday fires after boards complete.
      // force_full_pull=true → bypass preference cache → 30-day pull for fresher results
      const res = await searchApi.trigger({ include_workday: false, workday_only: false, force_full_pull: true })
      const roleLabel = res.roles?.slice(0, 2).join(', ') || 'your roles'
      const locLabel  = res.locations?.slice(0, 2).join(', ') || 'your locations'
      sessionJobsCount.current = 0
      setSessionId(res.session_id)
      setPolling(true)
      pushToast({ title: `Searching for ${roleLabel}`, description: `in ${locLabel}`, type: 'success' })
    } catch (e: unknown) {
      // 409 = search already running — attach to the existing session and poll it
      const err = e as { status?: number; rawDetail?: { session_id?: string } }
      if (err?.status === 409 && err?.rawDetail?.session_id) {
        sessionJobsCount.current = 0
        setSessionId(err.rawDetail.session_id)
        setPolling(true)
      } else if (!String(e).includes('409')) {
        pushToast({ title: 'Search failed', description: String(e), type: 'error' })
      }
    } finally { setSearching(false) }
  }, [pushToast])

  // ── Clear all jobs then auto-trigger fresh search ────────────────────────────
  const [clearing, setClearing] = useState(false)
  const clearJobs = useCallback(async () => {
    if (!confirm('Clear all pulled jobs and start a fresh search?')) return
    setClearing(true)
    try {
      const res = await jobsApi.clearAll()
      setJobs([])
      setStats(null)
      sessionJobsCount.current = 0
      autoSearchFired.current = false
      pushToast({ title: `Cleared ${res.deleted} jobs — searching now…`, type: 'success' })
      await triggerSearch()
    } catch {
      pushToast({ title: 'Could not clear jobs', type: 'error' })
    } finally { setClearing(false) }
  }, [pushToast, triggerSearch])

  // ── Auto-search on first visit when DB is empty and profile has roles ─────────
  useEffect(() => {
    if (autoSearchFired.current) return
    if (loading) return
    if (userProfile === null) return
    if ((userProfile.desired_roles ?? []).length === 0) return
    if (jobs.length > 0) return
    autoSearchFired.current = true
    triggerSearch()
  }, [loading, userProfile, jobs.length, triggerSearch])

  // ── Silent reload every 1 hour to pick up cron-triggered jobs ───────────────
  // Backend cron runs every hour for all users. Frontend just silently reloads
  // the list so new jobs appear without user doing anything.
  useEffect(() => {
    const id = setInterval(() => {
      if (!polling && !searching) load(true)
    }, ONE_HOUR)
    return () => clearInterval(id)
  }, [polling, searching, load])

  // ── Status change ─────────────────────────────────────────────────────────────
  const handleStatusChange = (id: string, newStatus: string) => {
    const oldStatus = jobs.find(j => j.id === id)?.status
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j))
    cache.updateJobStatus(id, newStatus)   // keep global cache in sync
    setSelectedJob(prev => prev?.id === id ? { ...prev, status: newStatus } : prev)
    if (oldStatus && oldStatus !== newStatus) {
      setStats(s => {
        if (!s) return s
        const n = { ...s }
        if (oldStatus === 'new')                                      n.new     = Math.max(0, n.new - 1)
        else if (oldStatus === 'saved' || oldStatus === 'favourite')  n.saved   = Math.max(0, n.saved - 1)
        else if (oldStatus === 'hidden')                              n.hidden  = Math.max(0, (n.hidden || 0) - 1)
        else if (oldStatus === 'applied')                             n.applied = Math.max(0, (n.applied || 0) - 1)
        if (newStatus === 'new')       n.new++
        else if (newStatus === 'saved')    n.saved++
        else if (newStatus === 'hidden')   n.hidden  = (n.hidden  || 0) + 1
        else if (newStatus === 'applied')  n.applied = (n.applied || 0) + 1
        return n
      })
    }
  }

  // ── Tailor queue — max 2 simultaneous workers ────────────────────────────────
  const MAX_TAILOR_WORKERS = 2
  const tailorQueueRef  = useRef<PulledJob[]>([])
  const startTailorRef  = useRef<(job: PulledJob) => void>(() => {})

  /**
   * Attach an SSE listener to an already-running tailor job.
   * Used both for new jobs (just started) and on refresh (reconnect).
   * pulledJobId  = the job card's UUID (key in tailorJobs map)
   * tailorJobId  = the tailor record UUID (used for SSE + status API)
   * companyLabel = shown in toast (may be empty for restored jobs)
   * onDone       = called after SSE done+fetchStatus, e.g. to advance queue
   */
  const _attachSSE = useCallback((
    pulledJobId : string,
    tailorJobId : string,
    companyLabel: string,
    onDone      : () => void,
    since       = 0,
  ) => {
    const sseUrl = since > 0
      ? `${tailorApi.streamUrl(tailorJobId)}?since=${since}`
      : tailorApi.streamUrl(tailorJobId)
    const es = new EventSource(sseUrl)
    esSources.current.set(tailorJobId, es)
    let seenCount = since
    let reconnectAttempts = 0

    const _markError = (msg: string) => {
      // Keep error state so Retry button appears — user can re-trigger via TailorCard
      setTailorJobs(prev => {
        const next = new Map(prev)
        const cur = next.get(pulledJobId)
        next.set(pulledJobId, {
          tailorJobId: cur?.tailorJobId ?? tailorJobId ?? '',
          status: 'error',
          error: msg,
          score: null,
          filename: null,
          roundsDone: cur?.roundsDone ?? 0,
          onRetry: () => {
            const fullJob = jobs.find(j => j.id === pulledJobId)
            if (fullJob) {
              setTailorJobs(prev2 => { const n = new Map(prev2); n.delete(pulledJobId); return n })
              setTimeout(() => _startTailor(fullJob), 100)
            }
          },
        })
        return next
      })
      if (tailorJobId) tailorApi.dismissJob(tailorJobId).catch(() => {})
      pushToast({ title: 'Tailoring failed', description: msg, type: 'error' })
    }

    es.onmessage = (event) => {
      seenCount++
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'round_complete') {
          setTailorJobs(prev => {
            const next = new Map(prev)
            const cur = next.get(pulledJobId)
            if (cur) next.set(pulledJobId, {
              ...cur,
              roundsDone: (cur.roundsDone || 0) + 1,
              score: data.evaluation?.score != null ? Number(data.evaluation.score) : cur.score,
            })
            return next
          })
        } else if (data.event === 'done') {
          es.close()
          esSources.current.delete(tailorJobId)
          if (data.status === 'complete') {
            // Show "Tailoring..." (3 dots) while files are being packaged
            setTailorJobs(prev => {
              const next = new Map(prev)
              const cur = next.get(pulledJobId)
              if (cur) next.set(pulledJobId, { ...cur, roundsDone: 3 })
              return next
            })
            let _fetchAttempts = 0
            const fetchStatus = () =>
              tailorApi.status(tailorJobId).then(r => {
                if (r.status === 'complete') {
                  setTailorJobs(prev => {
                    const next = new Map(prev)
                    next.set(pulledJobId, { tailorJobId, status: 'done', score: r.score, filename: r.filename, error: null, roundsDone: 2 })
                    return next
                  })
                  if (companyLabel) pushToast({ title: `Resume tailored for ${companyLabel}`, type: 'success' })
                } else if (r.status === 'error') {
                  _markError(r.error || 'Tailoring failed')
                } else if (_fetchAttempts < 6) {
                  // Backend not yet updated — retry up to 6×2s=12s
                  _fetchAttempts++
                  setTimeout(fetchStatus, 2000)
                } else {
                  _markError('Could not confirm completion')
                }
              })
            fetchStatus().catch(() => setTimeout(() => fetchStatus().catch(() => _markError('Could not fetch result')), 2000))
          } else {
            _markError(data.error || 'Tailoring failed')
            if (companyLabel) pushToast({ title: `Tailoring failed for ${companyLabel}`, description: data.error, type: 'error' })
          }
          onDone()
        }
      } catch { /* ignore */ }
    }

    es.onerror = () => {
      es.close()
      esSources.current.delete(tailorJobId)
      // Try to reconnect SSE up to 3 times before falling back to polling
      if (reconnectAttempts < 3) {
        reconnectAttempts++
        setTimeout(() => {
          _attachSSE(pulledJobId, tailorJobId, companyLabel, onDone, seenCount)
        }, 3000)
        return
      }
      // Exhausted reconnects — poll only to detect terminal status
      const poll = setInterval(async () => {
        try {
          const s = await tailorApi.status(tailorJobId)
          if (s.status === 'complete' || s.status === 'error') {
            clearInterval(poll)
            setTailorJobs(prev => {
              const next = new Map(prev)
              if (s.status === 'complete') {
                next.set(pulledJobId, { tailorJobId, status: 'done', score: s.score, filename: s.filename, error: null, roundsDone: 2 })
                if (companyLabel) pushToast({ title: `Resume tailored for ${companyLabel}`, type: 'success' })
              } else {
                next.set(pulledJobId, {
                  tailorJobId,
                  status: 'error',
                  error: s.error || 'Failed',
                  score: null,
                  filename: null,
                  roundsDone: 0,
                  onRetry: () => {
                    const fullJob = jobs.find(j => j.id === pulledJobId)
                    if (fullJob) {
                      setTailorJobs(prev2 => { const n = new Map(prev2); n.delete(pulledJobId); return n })
                      setTimeout(() => _startTailor(fullJob), 100)
                    }
                  },
                })
                tailorApi.dismissJob(tailorJobId).catch(() => {})
                pushToast({ title: 'Tailoring failed', description: s.error || 'Failed', type: 'error' })
              }
              return next
            })
            onDone()
          }
        } catch { clearInterval(poll) }
      }, 5000)
    }
  }, [pushToast])

  const _startTailor = useCallback(async (job: PulledJob) => {
    setTailorJobs(prev => {
      const next = new Map(prev)
      const cur = next.get(job.id)
      next.set(job.id, { tailorJobId: cur?.tailorJobId ?? '', status: 'tailoring', score: null, filename: null, error: null, roundsDone: cur?.roundsDone ?? 0, startedAt: Date.now() })
      return next
    })

    const _startNext = () => {
      const nextJob = tailorQueueRef.current.shift()
      if (nextJob) startTailorRef.current(nextJob)
    }

    try {
      const res = await tailorApi.runForJob(job.id)
      const tailorJobId = res.job_id
      setTailorJobs(prev => {
        const next = new Map(prev)
        const cur = next.get(job.id)
        if (cur) next.set(job.id, { ...cur, tailorJobId })
        return next
      })
      _attachSSE(job.id, tailorJobId, job.company, _startNext)
    } catch (e: unknown) {
      setTailorJobs(prev => { const next = new Map(prev); next.delete(job.id); return next })
      pushToast({ title: 'Could not start tailoring', description: e instanceof Error ? e.message : 'Tailoring failed', type: 'error' })
      _startNext()
    }
  }, [pushToast, _attachSSE])

  useEffect(() => { startTailorRef.current = _startTailor }, [_startTailor])

  // ── Tailor SSE ────────────────────────────────────────────────────────────────
  const handleTailor = useCallback((job: PulledJob) => {
    const existing = tailorJobs.get(job.id)
    if (existing?.status === 'tailoring' || existing?.status === 'queued') {
      setActiveTab('tailored')
      return
    }

    setActiveTab('tailored')
    const activeCount = [...tailorJobs.values()].filter(s => s.status === 'tailoring').length
    if (activeCount < MAX_TAILOR_WORKERS) {
      _startTailor(job)
    } else {
      setTailorJobs(prev => {
        const next = new Map(prev)
        next.set(job.id, { tailorJobId: '', status: 'queued', score: null, filename: null, error: null, roundsDone: 0 })
        return next
      })
      tailorQueueRef.current.push(job)
    }
  }, [tailorJobs, _startTailor])

  // ── Delete tailored resume ────────────────────────────────────────────────────
  const handleDeleteTailor = useCallback((pulledJobId: string) => {
    setTailorJobs(prev => {
      const next = new Map(prev)
      next.delete(pulledJobId)
      return next
    })
    // Best-effort DB delete — don't block UI on result
    tailorApi.deleteTailorRecord(pulledJobId).catch(() => {})
  }, [])

  // ── Auto Apply SSE ───────────────────────────────────────────────────────────
  const handleAutoApply = useCallback(async (job: PulledJob) => {
    const existing = applyJobs.get(job.id)
    if (existing?.status === 'applying') return
    try {
      const res = await applyApi.runForJob(job.id, false, autoApply.tailorBeforeApply)
      const applyJobId = res.apply_job_id
      setApplyJobs(prev => {
        const next = new Map(prev)
        next.set(job.id, { applyJobId, status: 'applying', result: null, error: null })
        return next
      })
      pushToast({ title: `Auto-applying to ${job.company}…`, type: 'info' })
      const es = new EventSource(applyApi.streamUrl(applyJobId))
      esSources.current.set(applyJobId, es)
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.event === 'done') {
            es.close()
            esSources.current.delete(applyJobId)
            const confirmed  = data.result === 'applied'
            const submitted  = data.result === 'submitted'
            const newStatus: ApplyJobState['status'] = confirmed ? 'applied' : submitted ? 'applied' : 'failed'
            setApplyJobs(prev => {
              const next = new Map(prev)
              next.set(job.id, { applyJobId, status: newStatus, result: data.result, error: data.error ?? null })
              return next
            })
            if (confirmed) {
              jobsApi.setStatus(job.id, 'applied').catch(() => {})
              handleStatusChange(job.id, 'applied')
              pushToast({ title: `Applied to ${job.company}! Confirmed by email.`, type: 'success' })
            } else if (submitted) {
              jobsApi.setStatus(job.id, 'submitted').catch(() => {})
              handleStatusChange(job.id, 'submitted')
              pushToast({ title: `Submitted to ${job.company}`, description: 'Watching inbox for confirmation email…', type: 'success' })
            } else {
              pushToast({ title: `Auto-apply failed for ${job.company}`, description: data.result ?? data.error, type: 'error' })
            }
          }
        } catch { /* ignore */ }
      }
      es.onerror = () => {
        es.close()
        esSources.current.delete(applyJobId)
        setApplyJobs(prev => {
          const next = new Map(prev)
          const cur = next.get(job.id)
          if (cur?.status === 'applying') next.set(job.id, { ...cur, status: 'error', error: 'Connection lost' })
          return next
        })
      }
    } catch (e: unknown) {
      pushToast({ title: 'Could not start auto-apply', description: e instanceof Error ? e.message : String(e), type: 'error' })
    }
  }, [applyJobs, pushToast])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist tailor states across page refreshes ───────────────────────────────
  useEffect(() => {
    const obj: Record<string, TailorJobState> = {}
    tailorJobs.forEach((v, k) => { obj[k] = v })
    try { localStorage.setItem(TAILOR_LS_KEY, JSON.stringify(obj)) } catch {}
  }, [tailorJobs])

  // On mount: restore tailor state + reconnect SSE for any in-progress jobs
  const _restoredRef = useRef(false)
  useEffect(() => {
    if (_restoredRef.current) return
    _restoredRef.current = true

    // Build a set of pulled_job_ids that need SSE reconnect after DB merge
    const reconnect = (
      pulledJobId     : string,
      tailorJobId     : string,
      since           = 0,
      initialRoundsDone = 0,
    ) => {
      // First check if job already finished while we were away
      tailorApi.status(tailorJobId).then(s => {
        if (s.status === 'complete') {
          setTailorJobs(prev => {
            const next = new Map(prev)
            next.set(pulledJobId, { tailorJobId, status: 'done', score: s.score, filename: s.filename, error: null, roundsDone: 2 })
            return next
          })
        } else if (s.status === 'error') {
          setTailorJobs(prev => { const next = new Map(prev); next.delete(pulledJobId); return next })
          tailorApi.dismissJob(tailorJobId).catch(() => {})
        } else {
          // Restore correct dot count immediately so dots don't reset to 0
          if (initialRoundsDone > 0) {
            setTailorJobs(prev => {
              const next = new Map(prev)
              const cur = next.get(pulledJobId)
              if (cur) next.set(pulledJobId, { ...cur, roundsDone: initialRoundsDone })
              return next
            })
          }
          // Still running — reconnect to SSE, skip already-delivered events
          _attachSSE(pulledJobId, tailorJobId, '', () => {}, since)
        }
      }).catch(() => {
        // Status check failed — still try SSE; it handles reconnect internally
        _attachSSE(pulledJobId, tailorJobId, '', () => {}, since)
      })
    }

    tailorApi.myJobs().then(records => {
      const dbCovered = new Set<string>()

      setTailorJobs(prev => {
        const next = new Map(prev)
        for (const r of records) {
          dbCovered.add(r.pulled_job_id)
          const existing = next.get(r.pulled_job_id)
          if (r.status === 'error') {
            // Auto-dismiss failed tailor records — job goes back to Tailor button
            tailorApi.dismissJob(r.tailor_job_id).catch(() => {})
            continue
          }
          const dbStatus = r.status === 'complete' ? 'done' : 'tailoring'
          if (!existing || dbStatus === 'done') {
            next.set(r.pulled_job_id, {
              tailorJobId : r.tailor_job_id,
              status      : dbStatus,
              score       : r.score,
              filename    : r.filename,
              error       : null,
              // Restore correct dot count from DB (0 = no dots, 1 = ., 2 = .., ≥3 = ...)
              roundsDone  : dbStatus === 'done' ? 2 : (r.rounds_done ?? 0),
            })
          }
        }
        return next
      })

      // Reconnect SSE for DB-known in-progress jobs
      for (const r of records) {
        if (r.status === 'queued' || r.status === 'running') {
          // Pass progress_count so SSE skips already-delivered events (no double-counting)
          reconnect(r.pulled_job_id, r.tailor_job_id, r.progress_count ?? 0, r.rounds_done ?? 0)
        }
      }

      // Also reconnect for localStorage-based tailoring jobs not covered by DB
      // (jobs tailored before pulled_job_id column was added)
      tailorJobs.forEach((state, pulledJobId) => {
        if (state.status !== 'tailoring' || !state.tailorJobId) return
        if (dbCovered.has(pulledJobId)) return
        reconnect(pulledJobId, state.tailorJobId)
      })
    }).catch(() => {
      // myJobs API unavailable — reconnect all localStorage tailoring jobs
      tailorJobs.forEach((state, pulledJobId) => {
        if (state.status !== 'tailoring' || !state.tailorJobId) return
        reconnect(pulledJobId, state.tailorJobId)
      })
    })
  }, [_attachSSE]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ─────────────────────────────────────────────────────────────
  const allLocations = useMemo(() => {
    const SKIP = new Set(['remote', 'in-office', 'hybrid', 'on-site', 'onsite', 'worldwide', 'global', 'anywhere'])
    const extractCity = (raw: string): string => {
      // Strip trailing "(Remote)" or similar annotations
      const clean = raw.replace(/\s*\(.*?\)\s*/g, '').trim()
      if (!clean) return ''
      const parts = clean.split(',').map(p => p.trim()).filter(Boolean)
      if (parts.length === 0) return ''
      // If first part is a short country/state code (≤2 chars, e.g. "US", "CA"), take last part
      const city = parts[0].length <= 2 ? parts[parts.length - 1] : parts[0]
      if (!city || city.length <= 2) return ''
      if (SKIP.has(city.toLowerCase())) return ''
      return city
    }
    const cities = new Set<string>()
    for (const j of jobs) {
      if (!j.location) continue
      // Handle "City A | City B" multi-location strings
      for (const part of j.location.split(' | ')) {
        const city = extractCity(part)
        if (city) cities.add(city)
      }
    }
    return [...cities].sort()
  }, [jobs])

  const allSites = useMemo(() => {
    const present = new Set<string>()
    jobs.forEach(j => {
      if (j.source === 'workday' || j.source === 'greenhouse') present.add(j.source)
      else if (j.site) present.add(j.site)
    })
    const order = ['linkedin', 'indeed', 'glassdoor', 'zip_recruiter', 'workday', 'greenhouse']
    return order.filter(s => present.has(s))
  }, [jobs])

  const visible = useMemo(() => {
    const userMin    = userProfile?.salary_min ?? 0
    const userMax    = userProfile?.salary_max ?? 0
    const userYears  = resolveUserYears(userProfile?.experience_level ?? '', userProfile?.years_experience ?? '')
    const prefLocs   = userProfile?.preferred_locations ?? []

    return jobs.filter(j => {
      // Tab filter
      if (activeTab === 'new')      return Date.now() - new Date(j.pulled_at).getTime() < 48 * 3_600_000
      if (activeTab === 'saved')    return j.status === 'saved' || j.status === 'favourite'
      if (activeTab === 'hidden')   return j.status === 'hidden'
      if (activeTab === 'applied')  return j.status === 'applied'
      if (activeTab === 'tailored') return (tailorJobs.has(j.id) && tailorJobs.get(j.id)!.status !== 'error') || j.status === 'applied'
      // ALL: exclude hidden only
      if (j.status === 'hidden') return false

      // Panel filters
      if (filters.location) {
        // Match by extracted city (handle multi-location and varied formats)
        const SKIP = new Set(['remote', 'in-office', 'hybrid', 'on-site', 'onsite'])
        const extractCity = (raw: string) => {
          const clean = raw.replace(/\s*\(.*?\)\s*/g, '').trim()
          const parts = clean.split(',').map(p => p.trim()).filter(Boolean)
          if (!parts.length) return ''
          const city = parts[0].length <= 2 ? parts[parts.length - 1] : parts[0]
          return (!city || city.length <= 2 || SKIP.has(city.toLowerCase())) ? '' : city
        }
        const jobCities = (j.location || '').split(' | ').map(extractCity).filter(Boolean)
        if (!jobCities.includes(filters.location)) return false
      }
      if (filters.site) {
        if (filters.site === 'workday' || filters.site === 'greenhouse') {
          if (j.source !== filters.site) return false
        } else {
          if (j.site !== filters.site) return false
        }
      }
      if (filters.salaryMin > 0) {
        // Only apply salary filter if job has salary data; skip if completely unknown
        const hasSalary = (j.salary_min ?? 0) > 0 || (j.salary_max ?? 0) > 0 || !!j.salary_text
        if (hasSalary) {
          const lo = j.salary_min ?? 0, hi = j.salary_max ?? 0
          if (lo < filters.salaryMin && hi < filters.salaryMin) return false
        }
      }
      if (filters.postedAge !== 'any') {
        const dateStr = j.posted_at || j.pulled_at
        const h = dateStr ? (Date.now() - new Date(dateStr).getTime()) / 3_600_000 : NaN
        if (!isNaN(h)) {
          if (filters.postedAge === 'today'     && h > 24)          return false
          if (filters.postedAge === 'yesterday' && (h < 24 || h > 48)) return false
          if (filters.postedAge === 'week'      && h > 168)         return false
          if (filters.postedAge === 'older'     && h < 168)         return false
        }
      }

      // Work mode filter — scan location + title
      if (filters.workMode !== 'any') {
        const wm = detectWorkMode(j)
        if (wm !== 'unknown' && wm !== filters.workMode) return false
      }

      // Job type filter
      if (filters.jobType !== 'any') {
        if (j.job_type && j.job_type !== filters.jobType) return false
      }

      // Source type filter — boards (indeed/linkedin) vs portals (workday/greenhouse)
      if (filters.sourceType !== 'any') {
        const isPortal = j.source === 'workday' || j.source === 'greenhouse'
        if (filters.sourceType === 'boards'  && isPortal)  return false
        if (filters.sourceType === 'portals' && !isPortal) return false
      }

      // Experience level filter — uses extractExpNum from description
      if (filters.expLevel !== 'any') {
        const yrs = extractExpNum(j.description || '')
        if (yrs !== null) {
          if (filters.expLevel === 'entry'  && yrs > 2)              return false
          if (filters.expLevel === 'mid'    && (yrs < 2 || yrs > 6)) return false
          if (filters.expLevel === 'senior' && yrs < 6)              return false
        }
      }

      return true
    }).sort((a, b) => {
      // Saved float to top in ALL
      if (activeTab === 'all') {
        const aS = a.status === 'saved' || a.status === 'favourite' ? 1 : 0
        const bS = b.status === 'saved' || b.status === 'favourite' ? 1 : 0
        if (aS !== bS) return bS - aS
      }
      // Tailored tab: done > tailoring > queued > applied
      if (activeTab === 'tailored') {
        const statePriority = (s?: string) =>
          s === 'done' ? 3 : s === 'tailoring' ? 2 : s === 'queued' ? 1 : 0
        const ap = statePriority(tailorJobs.get(a.id)?.status)
        const bp = statePriority(tailorJobs.get(b.id)?.status)
        if (ap !== bp) return bp - ap
        const aApp = a.status === 'applied' ? 0 : 1
        const bApp = b.status === 'applied' ? 0 : 1
        if (aApp !== bApp) return bApp - aApp
      }
      // Primary: AI match score highest first (null = unscored, ranks last)
      const aScore = a.match_score ?? -1
      const bScore = b.match_score ?? -1
      if (bScore !== aScore) return bScore - aScore

      // Tiebreaker: most recently posted
      const aTime = a.posted_at ? new Date(a.posted_at).getTime() : 0
      const bTime = b.posted_at ? new Date(b.posted_at).getTime() : 0
      if (bTime !== aTime) return bTime - aTime

      // Within same score+time: jobs matching user preferences rank higher.
      const scoreA = salaryScore(a, userMin, userMax) + locationMatchScore(a, prefLocs) + expMatchScore(a, userYears)
      const scoreB = salaryScore(b, userMin, userMax) + locationMatchScore(b, prefLocs) + expMatchScore(b, userYears)
      return scoreB - scoreA
    })
  }, [jobs, activeTab, filters, userProfile, tailorJobs])

  // ── Tab counts ───────────────────────────────────────────────────────────────
  const allCount      = stats ? (stats.total - (stats.hidden || 0)) : 0
  const newCount      = stats?.new ?? 0
  const savedCount    = stats ? ((stats.saved || 0) + (stats.favourite || 0)) : 0
  const hiddenCount   = stats?.hidden ?? 0
  const appliedCount  = stats?.applied ?? 0
  const tailoredCount = useMemo(
    () => jobs.filter(j => (tailorJobs.has(j.id) && tailorJobs.get(j.id)!.status !== 'error') || j.status === 'applied').length,
    [jobs, tailorJobs],
  )

  const TABS = [
    { key: 'all'      as const, label: 'ALL',      count: allCount      },
    { key: 'new'      as const, label: 'NEW',       count: newCount      },
    { key: 'saved'    as const, label: 'SAVED',     count: savedCount    },
    { key: 'tailored' as const, label: 'TAILORED',  count: tailoredCount },
    { key: 'applied'  as const, label: 'APPLIED',   count: appliedCount  },
    { key: 'hidden'   as const, label: 'HIDDEN',    count: hiddenCount   },
  ]

  const hasActiveFilters = (
    !!filters.location || !!filters.site ||
    filters.salaryMin > 0 || filters.postedAge !== 'any' ||
    filters.workMode !== 'any' || filters.jobType !== 'any' ||
    filters.expLevel !== 'any' || filters.sourceType !== 'any'
  )

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-50 -mx-4 -mt-5 -mb-20 md:-mx-8 md:-mt-6 md:-mb-6 w-[calc(100%+2rem)] md:w-[calc(100%+4rem)]">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 z-20 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2 px-4 py-3">
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex-1 min-w-0 truncate">Jobs</h1>

          {polling && (
            <span className="flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-xs text-cyan-600 shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching…
            </span>
          )}

          {/* Filter button */}
          <button
            onClick={() => setFilterOpen(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition shrink-0 ${
              hasActiveFilters
                ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-sm">Filters</span>
            {hasActiveFilters && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white leading-none">
                {[
                  !!filters.location, !!filters.site, filters.salaryMin > 0,
                  filters.postedAge !== 'any', filters.workMode !== 'any',
                  filters.jobType !== 'any', filters.expLevel !== 'any',
                  filters.sourceType !== 'any',
                ].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Search trigger */}
          <button
            onClick={() => triggerSearch()}
            disabled={searching || polling}
            title="Trigger new job search"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-slate-300 transition disabled:opacity-50 shrink-0"
          >
            {searching || polling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Search</span>
          </button>

          {/* Clear all jobs */}
          <button
            onClick={clearJobs}
            disabled={clearing || searching || polling}
            title="Clear all jobs"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition disabled:opacity-50 shrink-0"
          >
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>

          {/* Refresh */}
          <button onClick={() => load()} disabled={loading} title="Refresh job list"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 transition disabled:opacity-50 shrink-0">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter drawer (portal) */}
        <FilterDrawer
          open={filterOpen}
          filters={filters}
          allLocations={allLocations}
          allSites={allSites}
          onApply={setFilters}
          onClose={() => setFilterOpen(false)}
        />

        {/* ── Tabs ── */}
        <div className="border-t border-slate-100">
          <div className="flex items-center overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-2.5 md:px-4 py-2.5 text-[11px] md:text-sm font-semibold tracking-wide border-b-2 transition-colors shrink-0 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-cyan-500 text-cyan-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-full px-1 py-0.5 text-[9px] md:text-[10px] font-bold ${
                    activeTab === tab.key ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>{/* end tabs border-t */}
      </div>{/* end sticky top bar */}

      {/* ── Job list — scrolls independently ── */}
      <div className="flex-1 overflow-y-auto w-full max-w-full px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-5 w-16 rounded-full bg-slate-100" />
                      <div className="h-5 w-20 rounded-full bg-slate-100" />
                      <div className="h-5 w-14 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <div className="h-5 w-20 rounded-full bg-slate-100" />
                    <div className="h-7 w-16 rounded-xl bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center select-none gap-4">
            {(polling || searching) && (activeTab === 'all' || activeTab === 'new') ? (
              <>
                {/* Animated job-card skeletons while pulling */}
                <div className="w-full max-w-xl space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                      style={{ opacity: 1 - i * 0.15, animation: `pulse 1.8s ease-in-out ${i * 0.15}s infinite` }}>
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 rounded bg-slate-100 animate-pulse" style={{ width: `${55 + i * 7}%` }} />
                          <div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: `${35 + i * 5}%` }} />
                          <div className="flex gap-2 pt-1">
                            <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
                            <div className="h-5 w-20 rounded-full bg-slate-100 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                  <span>Pulling jobs from LinkedIn, Indeed, Glassdoor and more…</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-slate-700">
                  {activeTab === 'saved'    ? 'No saved jobs yet'
                   : activeTab === 'hidden'  ? 'No hidden jobs'
                   : activeTab === 'applied' ? 'No applications yet'
                   : activeTab === 'tailored'? 'No tailored resumes yet'
                   : 'No jobs found'}
                </p>
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                  {activeTab === 'all' || activeTab === 'new'
                    ? 'Make sure your profile has at least one desired role, then hit Search.'
                    : activeTab === 'applied'
                    ? 'Jobs you apply to will show up here.'
                    : activeTab === 'tailored'
                    ? 'Tailor a resume for any job and it will appear here.'
                    : 'Try adjusting your filters or running a new search.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence initial={false}>
                {visible.map(job => (
                  <motion.div key={job.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <JobCard
                      job={job}
                      tailorState={tailorJobs.get(job.id)}
                      applyState={applyJobs.get(job.id)}
                      onStatusChange={handleStatusChange}
                      onOpenDrawer={setSelectedJob}
                      onTailor={handleTailor}
                      onAutoApply={handleAutoApply}
                      onDeleteTailor={handleDeleteTailor}
                      convertHourly={jobSettings.convertHourlyToMonthly}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ── Modals / drawers ── */}
      <AnimatePresence>
        {selectedJob && (
          <JobDetailDrawer
            key={selectedJob.id}
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onStatusChange={handleStatusChange}
            tailorState={tailorJobs.get(selectedJob.id)}
            onTailor={handleTailor}
            descCache={descCache}
            userProfile={userProfile}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
