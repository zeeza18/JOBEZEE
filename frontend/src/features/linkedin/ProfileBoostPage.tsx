import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, Camera, CheckCircle2, ChevronDown,
  ChevronUp, ClipboardCheck, Copy, FileText, Lightbulb, Loader2, Pencil,
  RefreshCw, Sparkles, Target, Upload, Zap,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BucketScore {
  id: string; label: string; score: number; max: number; pct: number
  strengths: string[]; gaps: string[]; evaluated?: boolean; note?: string
}
interface PriorityFix { section: string; issue: string; fix: string; impact: 'High' | 'Medium' | 'Low' }
interface HeadlineRewrite { current: string; improved: string; reason: string }
interface ImageResult { score: number; suggestions: string[]; observations: Record<string, boolean | null> }
interface ParsedSections {
  headline?: string; about?: string; experience?: string[]
  skills?: string[]; education?: string[]; has_recommendations?: boolean
}
interface BoostResult {
  overall_score: number; grade: string; overall_verdict: string; jd_fit_score: number
  buckets: BucketScore[]; top_strengths: string[]; top_gaps: string[]
  priority_fixes: PriorityFix[]; headline_rewrite: HeadlineRewrite | null
  about_tips: string[]; visual_notes: string[]
  profile_image?: ImageResult; cover_image?: ImageResult
  parsed_sections?: ParsedSections; pdf_text?: string
}
interface OptimizeResult {
  headline?:   { current: string; optimized: string; reason: string }
  about?:      { current: string; optimized: string; key_changes: string[] }
  experience?: Array<{ company: string; title: string; current_text: string; optimized_bullets: string[]; key_changes: string[] }>
  skills?:     { current: string[]; reordered: string[]; add_if_true: Array<{ skill: string; reason: string }> }
}
type Phase = 'input' | 'analyzing' | 'analyzed' | 'optimizing' | 'optimized'

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = 'jobezee_linkedin_boost'

interface PersistedState {
  result: BoostResult
  optimizeResult: OptimizeResult | null
  phase: 'analyzed' | 'optimized'
  targetRole: string
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch { return null }
}

function saveState(s: PersistedState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch { /* quota */ }
}

function clearState() {
  try { localStorage.removeItem(LS_KEY) } catch { /* ok */ }
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const ANALYZE_STEPS: Array<{ id: string; label: string }> = [
  { id: 'extract',      label: 'Reading your profile'            },
  { id: 'photo_profile',label: 'Scoring your profile picture'    },
  { id: 'photo_cover',  label: 'Scoring your cover image'        },
  { id: 'scoring',      label: 'Scoring your sections'           },
  { id: 'done',         label: 'Finalising results'              },
]

type StepStatus = 'waiting' | 'active' | 'done'

function stepStatus(currentStep: string, stepId: string): StepStatus {
  const order = ANALYZE_STEPS.map(s => s.id)
  const cur = order.indexOf(currentStep)
  const idx = order.indexOf(stepId)
  if (idx < cur)  return 'done'
  if (idx === cur) return 'active'
  return 'waiting'
}

// ─── Step progress UI ─────────────────────────────────────────────────────────

function StepList({ currentStep }: { currentStep: string }) {
  const visible = currentStep === 'extract'
    ? ANALYZE_STEPS.filter(s => !s.id.startsWith('photo'))
    : ANALYZE_STEPS

  return (
    <div className="space-y-3">
      {visible.map(step => {
        const s = stepStatus(currentStep, step.id)
        return (
          <div key={step.id} className={`flex items-center gap-3 transition-all ${s === 'waiting' ? 'opacity-30' : ''}`}>
            <div className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-full border-2 transition-all ${
              s === 'done'   ? 'border-emerald-400 bg-emerald-50' :
              s === 'active' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'}`}>
              {s === 'done'   ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : s === 'active' ? <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
              :                  <span className="h-2 w-2 rounded-full bg-slate-200" />}
            </div>
            <span className={`text-sm font-medium ${
              s === 'done'   ? 'text-emerald-600' :
              s === 'active' ? 'text-cyan-700 font-semibold' : 'text-slate-400'
            }`}>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Word diff ────────────────────────────────────────────────────────────────

function WordDiff({ current, optimized }: { current: string; optimized: string }) {
  const currentSet = new Set(current.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')))
  return (
    <span>
      {optimized.split(/(\s+)/).map((chunk, i) => {
        if (/^\s+$/.test(chunk)) return <span key={i}>{chunk}</span>
        const clean = chunk.toLowerCase().replace(/[^a-z0-9]/g, '')
        const isNew = clean.length > 3 && !currentSet.has(clean)
        return <span key={i} className={isNew ? 'bg-cyan-100 text-cyan-900 rounded px-0.5' : ''}>{chunk}</span>
      })}
    </span>
  )
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({ accept, label, hint, icon: Icon, file, onFile, disabled }: {
  accept: string; label: string; hint: string; icon: React.ElementType
  file: File | null; onFile: (f: File) => void; disabled?: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      className={`rounded-xl border-2 border-dashed transition-all ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
        dragOver ? 'border-cyan-400 bg-cyan-50' :
        file     ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'}`}
      onDragOver={e => { if (disabled) return; e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { if (disabled) return; e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => { if (!disabled) ref.current?.click() }}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" disabled={disabled}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <div className="flex items-center gap-3 px-4 py-3">
        {file ? (
          <><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">Click to replace</p>
            </div></>
        ) : (
          <><Icon className="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p className="text-xs text-slate-400">{hint}</p>
            </div></>
        )}
      </div>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-600 transition px-2 py-1 rounded-lg hover:bg-cyan-50 shrink-0">
      {copied
        ? <><ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600">Copied!</span></>
        : <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>}
    </button>
  )
}

// ─── Optimized / Current cards (for optimized phase) ─────────────────────────

function OptimizedCard({ label, children, copyText }: { label: string; children: React.ReactNode; copyText?: string }) {
  return (
    <div className="rounded-xl border-2 border-cyan-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-50 border-b border-cyan-200">
        <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">{label}</span>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function CurrentCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden opacity-60">
      <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ onReanalyze, onReset }: { onReanalyze?: () => void; onReset?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">LinkedIn Profile Scorer</h1>
      </div>
      {(onReanalyze || onReset) && (
        <div className="flex gap-2 flex-wrap">
          {onReanalyze && (
            <button onClick={onReanalyze}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600 border border-slate-200 hover:border-cyan-300 rounded-xl px-3 py-2 transition">
              <RefreshCw className="h-3.5 w-3.5" />Re-analyze
            </button>
          )}
          {onReset && (
            <button onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 border border-slate-100 hover:border-slate-300 rounded-xl px-3 py-2 transition">
              New Analysis
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Score hero ───────────────────────────────────────────────────────────────

function ScoreHero({ score, grade, verdict, jdFitScore }: {
  score: number; grade: string; verdict: string; jdFitScore: number
}) {
  const [ringColor, textColor, bgGrad] =
    score >= 80 ? ['border-emerald-300', 'text-emerald-600', 'from-emerald-50 to-white'] :
    score >= 65 ? ['border-cyan-300',    'text-cyan-600',    'from-cyan-50 to-white']    :
    score >= 50 ? ['border-amber-300',   'text-amber-600',   'from-amber-50 to-white']   :
                  ['border-red-300',     'text-red-600',     'from-red-50 to-white']

  return (
    <div className={`rounded-2xl border bg-gradient-to-b ${bgGrad} border-slate-100 px-6 py-8`}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className={`shrink-0 h-28 w-28 rounded-full border-4 ${ringColor} bg-white flex flex-col items-center justify-center shadow-sm`}>
          <span className={`text-4xl font-black tabular-nums leading-none ${textColor}`}>{score}</span>
          <span className="text-xs text-slate-400 font-medium mt-0.5">/ 100</span>
        </div>
        <div className="text-center sm:text-left min-w-0">
          <p className={`text-2xl font-black ${textColor} mb-1`}>{grade}</p>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{verdict}</p>
          {jdFitScore > 0 && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs shadow-sm">
              <span className="text-slate-500 font-medium">JD Fit Score</span>
              <span className={`font-bold ${jdFitScore >= 80 ? 'text-emerald-600' : jdFitScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{jdFitScore}/100</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Strengths + Gaps ─────────────────────────────────────────────────────────

function StrengthsGaps({ strengths, gaps }: { strengths: string[]; gaps: string[] }) {
  if (!strengths.length && !gaps.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {strengths.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2.5">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Top Strengths</p>
          {strengths.map((s, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="text-emerald-500 shrink-0 font-bold mt-0.5">✓</span><span>{s}</span>
            </div>
          ))}
        </div>
      )}
      {gaps.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2.5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Top Gaps</p>
          {gaps.map((g, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="text-red-400 shrink-0 font-bold mt-0.5">✗</span><span>{g}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section divider ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

// ─── Bucket feedback card (right side) ───────────────────────────────────────

function BucketFeedback({ bucket, extra }: { bucket?: BucketScore; extra?: React.ReactNode }) {
  if (!bucket) return null
  const evaluated = bucket.evaluated !== false
  const textColor = !evaluated ? 'text-slate-400' :
    bucket.pct >= 80 ? 'text-emerald-600' : bucket.pct >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Feedback</span>
        {evaluated
          ? <span className={`text-lg font-black ${textColor}`}>{bucket.score}<span className="text-xs text-slate-400 font-normal">/{bucket.max}</span></span>
          : <span className="text-xs text-slate-400 italic">Not evaluated</span>}
      </div>
      {evaluated && <ScoreBar pct={bucket.pct} />}
      {bucket.strengths.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Strengths</p>
          {bucket.strengths.map((s, i) => (
            <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
              <span className="text-emerald-500 shrink-0">✓</span>{s}
            </p>
          ))}
        </div>
      )}
      {bucket.gaps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Gaps</p>
          {bucket.gaps.map((g, i) => (
            <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
              <span className="text-red-400 shrink-0">✗</span>{g}
            </p>
          ))}
        </div>
      )}
      {extra}
    </div>
  )
}

// ─── Section feedback row (left content + right feedback) ─────────────────────

function SectionFeedbackRow({ label, content, bucket, copyText, feedbackExtra }: {
  label: string; content: React.ReactNode; bucket?: BucketScore
  copyText?: string; feedbackExtra?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-800">{label}</span>
          {copyText && <CopyButton text={copyText} />}
        </div>
        <div className="px-4 py-4">{content}</div>
      </div>
      <BucketFeedback bucket={bucket} extra={feedbackExtra} />
    </div>
  )
}

// ─── Image feedback row ───────────────────────────────────────────────────────

function ImageFeedbackRow({ imageUrl, result, label, isBanner }: {
  imageUrl: string; result: ImageResult; label: string; isBanner?: boolean
}) {
  const scorePct = result.score
  const scoreColor = scorePct >= 80 ? 'text-emerald-600' : scorePct >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-800">{label}</span>
        </div>
        <div className="p-4 flex items-center justify-center bg-slate-50 min-h-[120px]">
          {isBanner
            ? <img src={imageUrl} alt={label} className="w-full rounded-lg object-cover max-h-36 border border-slate-200 shadow-sm" />
            : <img src={imageUrl} alt={label} className="h-32 w-32 rounded-full object-cover border-2 border-slate-200 shadow-sm" />}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">{label}</span>
          <span className={`text-lg font-black ${scoreColor}`}>{result.score}<span className="text-xs text-slate-400 font-normal">/100</span></span>
        </div>
        <ScoreBar pct={scorePct} />
        <div className="space-y-2">
          {result.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" /><span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Experience parser + renderer ────────────────────────────────────────────
//
// The backend joining logic:
//   • Non-date lines are accumulated until a date is found, then saved as one entry joined by " | "
//   • This means experience entries alternate:
//       entry[i]   = "Company — Title" (no date, pre-date header)
//       entry[i+1] = "Date | Location | ▸ bullet | ▸ bullet | ... | NextCompany — Title"
//   • The trailing "NextCompany — Title" at end of a date block is the next job's header

interface ParsedJob { company: string; title: string; meta: string; bullets: string[] }

function isDateStartEntry(s: string): boolean {
  const first = s.split(' | ')[0].trim()
  return /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{4})/i.test(first)
}

function splitCompanyTitle(s: string): [string, string] {
  // Try em dash / en dash first (LinkedIn format: "Company — Title")
  const dashMatch = s.match(/^(.+?)\s+[—–]\s+(.+)$/)
  if (dashMatch) return [dashMatch[1].trim(), dashMatch[2].trim()]
  // Try pipe
  const pipeIdx = s.indexOf(' | ')
  if (pipeIdx > 0) return [s.slice(0, pipeIdx).trim(), s.slice(pipeIdx + 3).trim()]
  return [s.trim(), '']
}

function isLikelyCompanyOrTitle(text: string): boolean {
  if (!text || text.length > 80 || text.length < 2) return false
  if (/^[a-z]/.test(text)) return false
  if (/^(and|the|with|for|in|at|on|by|of|to|a|an|or)\b/i.test(text)) return false
  if (/^\d/.test(text)) return false
  return true
}

function parseDateBlock(raw: string): { meta: string; bullets: string[]; trailing: string } {
  // Convert " | ▸ " and " | - " and " | • " to newlines so we can split on bullets
  const normalized = raw
    .replace(/\s*\|\s*▸\s*/g, '\n▸ ')
    .replace(/\s*\|\s*-\s+/g, '\n- ')
    .replace(/\s*\|\s*•\s*/g, '\n• ')

  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)
  const metaParts: string[] = []
  const bullets: string[] = []
  const pendingTrailing: string[] = []
  let inBullets = false

  for (const line of lines) {
    const isBullet = /^[▸\-•]/.test(line)

    if (isBullet) {
      // If we were accumulating potential trailing, these are actually bullet continuations
      if (pendingTrailing.length > 0 && bullets.length > 0) {
        bullets[bullets.length - 1] += ' ' + pendingTrailing.join(' ')
        pendingTrailing.length = 0
      }
      inBullets = true
      bullets.push(line.replace(/^[▸\-•]\s*/, '').trim())
    } else if (inBullets) {
      // Post-bullet non-bullet text — might be continuation OR next company's header
      const lastBullet = pendingTrailing.length > 0
        ? pendingTrailing[pendingTrailing.length - 1]
        : (bullets[bullets.length - 1] ?? '')
      const prevEndsSentence = /[.!?]$/.test(lastBullet.trim())

      if (prevEndsSentence && isLikelyCompanyOrTitle(line)) {
        pendingTrailing.push(line)
      } else if (pendingTrailing.length > 0) {
        // Not a company name → flush pending back as bullet continuation
        bullets[bullets.length - 1] += ' ' + pendingTrailing.join(' ') + ' ' + line
        pendingTrailing.length = 0
      } else if (bullets.length > 0) {
        // Inline continuation (PDF line wrap)
        bullets[bullets.length - 1] += ' ' + line
      }
    } else {
      // Pre-bullet: date range + location
      // Still need to clean up any remaining inline pipes
      metaParts.push(line.replace(/\s*\|\s*/g, ' · '))
    }
  }

  return {
    meta: metaParts.join(' · '),
    bullets,
    trailing: pendingTrailing.join(' | '),
  }
}

function buildJobList(entries: string[]): ParsedJob[] {
  const jobs: ParsedJob[] = []
  let pendingHeader = ''

  for (const entry of entries) {
    if (!isDateStartEntry(entry)) {
      if (pendingHeader) {
        const [company, title] = splitCompanyTitle(pendingHeader)
        jobs.push({ company, title, meta: '', bullets: [] })
      }
      pendingHeader = entry
    } else {
      const { meta, bullets, trailing } = parseDateBlock(entry)
      let company = '', title = ''
      if (pendingHeader) {
        ;[company, title] = splitCompanyTitle(pendingHeader)
        pendingHeader = ''
      }
      jobs.push({ company, title, meta, bullets })
      if (trailing) pendingHeader = trailing
    }
  }

  if (pendingHeader) {
    const [company, title] = splitCompanyTitle(pendingHeader)
    jobs.push({ company, title, meta: '', bullets: [] })
  }

  return jobs
}

function ExperienceContent({ entries }: { entries: string[] }) {
  const jobs = buildJobList(entries)
  if (!jobs.length) return <p className="text-xs text-slate-400 italic">No experience data parsed</p>

  return (
    <div className="space-y-5">
      {jobs.map((job, i) => (
        <div key={i} className={i > 0 ? 'pt-5 border-t border-slate-100' : ''}>
          <p className="text-sm font-bold text-slate-900 leading-snug">{job.company || '—'}</p>
          {job.title  && <p className="text-sm font-semibold text-cyan-700 mt-0.5">{job.title}</p>}
          {job.meta   && <p className="text-xs text-slate-500 mt-1">{job.meta}</p>}
          {job.bullets.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {job.bullets.map((b, j) => (
                <li key={j} className="flex gap-2 text-xs text-slate-700 leading-relaxed">
                  <span className="text-cyan-500 shrink-0 mt-0.5">▸</span><span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Education parser + renderer ──────────────────────────────────────────────
//
// Each array element is a raw PDF line.
// A school entry may span multiple lines:
//   "DePaul University"
//   "· (January 2024 - December 2026)"
// Or all on one line:
//   "University of Manchester — BSc Computer Science, 2018"

interface EduEntry { school: string; degree: string; dates: string }

function buildEducationList(entries: string[]): EduEntry[] {
  const result: EduEntry[] = []

  for (const raw of entries) {
    const line = raw.trim().replace(/^Page \d+ of \d+\s*/gi, '').trim()
    if (!line) continue

    const isAttachment = line.startsWith('·') || line.startsWith('(') || /^\d{4}/.test(line)
    const hasYear = /\b\d{4}\b/.test(line) && line.length < 80

    if ((isAttachment || (hasYear && result.length > 0 && !result[result.length - 1].dates)) && result.length > 0) {
      const clean = line.replace(/^·\s*/, '').replace(/[()]/g, '').trim()
      const last = result[result.length - 1]
      if (/\b\d{4}\b/.test(clean)) {
        last.dates = last.dates ? last.dates + ' ' + clean : clean
      } else {
        last.degree = last.degree ? last.degree + ' ' + clean : clean
      }
    } else {
      // Attempt "School — Degree, Year" format
      const dashMatch = line.match(/^(.+?)\s+[—–]\s+(.+)$/)
      if (dashMatch) {
        const school = dashMatch[1].trim()
        const rest = dashMatch[2].trim()
        const yearMatch = rest.match(/,?\s*(\d{4})\s*$/)
        const dates = yearMatch ? yearMatch[1] : ''
        const degree = yearMatch ? rest.replace(yearMatch[0], '').trim() : rest
        result.push({ school, degree, dates })
      } else {
        result.push({ school: line, degree: '', dates: '' })
      }
    }
  }

  return result
}

function EducationContent({ entries }: { entries: string[] }) {
  const list = buildEducationList(entries)
  if (!list.length) return <p className="text-xs text-slate-400 italic">No education data parsed</p>

  return (
    <div className="space-y-4">
      {list.map((e, i) => (
        <div key={i} className={i > 0 ? 'pt-4 border-t border-slate-100' : ''}>
          <p className="text-sm font-bold text-slate-900">{e.school}</p>
          {e.degree && <p className="text-sm text-slate-700 mt-0.5">{e.degree}</p>}
          {e.dates  && <p className="text-xs text-slate-500 mt-1">{e.dates}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Skills renderer ──────────────────────────────────────────────────────────
// Each entry is a raw PDF line; lines may contain comma-separated skills.
// We join all lines and split by comma to get individual skill chips.

function buildSkillsList(entries: string[]): string[] {
  const allText = entries.join(', ')
  return allText
    .split(',')
    .map(s => s.trim().replace(/[,;]+$/, ''))
    .filter(s => s.length > 0 && s.length < 60)
}

function SkillsContent({ entries }: { entries: string[] }) {
  const skills = buildSkillsList(entries)
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s, i) => (
        <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 leading-none">{s}</span>
      ))}
    </div>
  )
}

// ─── Priority fix card ────────────────────────────────────────────────────────

function FixCard({ fix, idx }: { fix: PriorityFix; idx: number }) {
  const c = fix.impact === 'High'
    ? 'bg-red-100 text-red-700 border-red-200'
    : fix.impact === 'Medium'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-blue-100 text-blue-700 border-blue-200'
  const cardBorder = fix.impact === 'High' ? 'border-red-100' : fix.impact === 'Medium' ? 'border-amber-100' : 'border-blue-100'

  return (
    <div className={`rounded-xl border ${cardBorder} bg-white p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold shrink-0">{idx + 1}</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{fix.section}</span>
        <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${c}`}>{fix.impact}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-snug">{fix.issue}</p>
      <div className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
        <span className="text-cyan-500 shrink-0 mt-0.5">→</span><span>{fix.fix}</span>
      </div>
    </div>
  )
}

// ─── Headline rewrite inline ──────────────────────────────────────────────────

function HeadlineRewriteInline({ rewrite }: { rewrite: HeadlineRewrite }) {
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1.5">
        <Pencil className="h-3 w-3" />Suggested Rewrite
      </p>
      <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
        <p className="text-xs text-slate-800 font-medium leading-relaxed">{rewrite.improved}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400 italic leading-relaxed">{rewrite.reason}</p>
        <CopyButton text={rewrite.improved} />
      </div>
    </div>
  )
}

// ─── Raw text fallback ────────────────────────────────────────────────────────

function RawTextFallback({ pdfText }: { pdfText: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition text-left"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-amber-800">Could not detect section headers</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-amber-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-amber-400 shrink-0" />}
      </button>
      <div className="px-4 pb-3 border-t border-amber-200">
        <p className="text-xs text-amber-700 mt-2 mb-2 leading-relaxed">
          Your PDF may use non-standard headers. The AI still scored your full text.
        </p>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-mono bg-white rounded-lg p-3 border border-amber-100">
          {open ? pdfText.slice(0, 2000) : pdfText.slice(0, 300)}
          {!open && pdfText.length > 300 && <span className="text-slate-400"> …</span>}
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 2500

export default function ProfileBoostPage() {
  const persisted = loadPersistedState()

  const [phase,          setPhase]          = useState<Phase>(persisted?.phase ?? 'input')
  const [pdfFile,        setPdfFile]        = useState<File | null>(null)
  const [profileImage,   setProfileImage]   = useState<File | null>(null)
  const [coverImage,     setCoverImage]     = useState<File | null>(null)
  const [targetRole,     setTargetRole]     = useState(persisted?.targetRole ?? '')
  const [jdText,         setJdText]         = useState('')
  const [currentStep,    setCurrentStep]    = useState('extract')
  const [result,         setResult]         = useState<BoostResult | null>(persisted?.result ?? null)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(persisted?.optimizeResult ?? null)
  const [error,          setError]          = useState<string | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [coverImageUrl,   setCoverImageUrl]   = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  useEffect(() => {
    if (!profileImage) { setProfileImageUrl(null); return }
    const url = URL.createObjectURL(profileImage)
    setProfileImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [profileImage])

  useEffect(() => {
    if (!coverImage) { setCoverImageUrl(null); return }
    const url = URL.createObjectURL(coverImage)
    setCoverImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [coverImage])

  // ── Submit → background job ───────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!pdfFile) return
    setError(null)
    setResult(null)
    setOptimizeResult(null)
    setCurrentStep('extract')
    setPhase('analyzing')
    clearState()

    const fd = new FormData()
    fd.append('profile_pdf', pdfFile)
    if (profileImage)      fd.append('profile_image',   profileImage)
    if (coverImage)        fd.append('cover_image',     coverImage)
    if (jdText.trim())     fd.append('job_description', jdText.trim())
    if (targetRole.trim()) fd.append('target_role',     targetRole.trim())

    let jobId: string
    try {
      const res = await fetch('/api/linkedin-boost/analyze', { method: 'POST', credentials: 'include', body: fd })
      const txt = await res.text()
      let data: Record<string, unknown>
      try { data = JSON.parse(txt) } catch { throw new Error(txt.slice(0, 200) || 'Server error') }
      if (!res.ok) throw new Error((data.detail as string) || 'Failed to start analysis')
      jobId = data.job_id as string
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('input')
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/status/${jobId}`, { credentials: 'include' })
        const txt = await res.text()
        let data: Record<string, unknown>
        try { data = JSON.parse(txt) } catch { throw new Error('Invalid server response') }
        if (!res.ok) throw new Error((data.detail as string) || 'Analysis failed')
        const status = data.status as string
        const step   = data.step as string | undefined
        if (step) setCurrentStep(step)
        if (status === 'done') {
          stopPolling()
          const r = data.result as BoostResult
          setResult(r)
          setPhase('analyzed')
          saveState({ result: r, optimizeResult: null, phase: 'analyzed', targetRole })
        }
      } catch (e: unknown) {
        stopPolling()
        setError(e instanceof Error ? e.message : String(e))
        setPhase('input')
      }
    }, POLL_INTERVAL)
  }, [pdfFile, profileImage, coverImage, jdText, targetRole])

  // ── Optimize → background job + polling ──────────────────────────────────

  const handleOptimize = useCallback(async () => {
    if (!result?.pdf_text) return
    setPhase('optimizing')
    setError(null)

    let jobId: string
    try {
      const res = await fetch('/api/linkedin-boost/optimize', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_text: result.pdf_text, score_result: result, target_role: targetRole }),
      })
      const txt = await res.text()
      let data: Record<string, unknown>
      try { data = JSON.parse(txt) } catch { throw new Error(txt.slice(0, 200) || 'Server error') }
      if (!res.ok) throw new Error((data.detail as string) || 'Failed to start optimization')
      jobId = data.job_id as string
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('analyzed')
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/optimize-status/${jobId}`, { credentials: 'include' })
        const txt = await res.text()
        let data: Record<string, unknown>
        try { data = JSON.parse(txt) } catch { throw new Error('Invalid server response') }
        if (!res.ok) throw new Error((data.detail as string) || 'Optimization failed')
        if (data.status === 'done') {
          stopPolling()
          const or = data.result as OptimizeResult
          setOptimizeResult(or)
          setPhase('optimized')
          if (result) saveState({ result, optimizeResult: or, phase: 'optimized', targetRole })
        }
      } catch (e: unknown) {
        stopPolling()
        setError(e instanceof Error ? e.message : String(e))
        setPhase('analyzed')
      }
    }, POLL_INTERVAL)
  }, [result, targetRole])

  const handleReanalyze = () => { stopPolling(); setPhase('input'); setResult(null); setOptimizeResult(null); setError(null); clearState() }
  const handleReset     = () => { stopPolling(); setPhase('input'); setResult(null); setOptimizeResult(null); setError(null); setPdfFile(null); setProfileImage(null); setCoverImage(null); setTargetRole(''); setJdText(''); clearState() }
  const getBucket = (id: string) => result?.buckets.find(b => b.id === id)
  const hasSections = (ps?: ParsedSections) => ps && (ps.headline || ps.about || (ps.experience?.length ?? 0) > 0 || (ps.skills?.length ?? 0) > 0)

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: INPUT
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'input') {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">LinkedIn Profile Scorer</h1>
          <p className="text-sm text-slate-400 mt-0.5">Upload your LinkedIn PDF — get an 8-bucket score + AI rewrites</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-6">
          <div className="space-y-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-600" />
                <p className="text-sm font-semibold text-slate-800">LinkedIn Profile PDF</p>
                <span className="ml-auto text-xs text-red-500 font-medium">required</span>
              </div>
              <DropZone accept=".pdf,.txt" label="Upload your LinkedIn PDF export"
                hint='LinkedIn → "Save to PDF" on your profile page'
                icon={Upload} file={pdfFile} onFile={setPdfFile} />
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-cyan-600" />
                <p className="text-sm font-semibold text-slate-800">
                  Photos <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Profile Photo</p>
                <DropZone accept="image/jpeg,image/png,image/webp" label="Upload profile photo"
                  hint="JPG, PNG, or WebP" icon={Camera} file={profileImage} onFile={setProfileImage} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Cover / Banner</p>
                <DropZone accept="image/jpeg,image/png,image/webp" label="Upload cover / banner"
                  hint="JPG, PNG, or WebP" icon={Upload} file={coverImage} onFile={setCoverImage} />
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-600" />
                <p className="text-sm font-semibold text-slate-800">
                  Target Role <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </p>
              </div>
              <input type="text" placeholder="e.g. Senior Data Engineer, Product Manager"
                value={targetRole} onChange={e => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-600" />
                <p className="text-sm font-semibold text-slate-800">
                  Job Description <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </p>
              </div>
              <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400"
                placeholder="Paste a job description for a JD fit score…"
                value={jdText} onChange={e => setJdText(e.target.value)} rows={4} />
            </Card>

            <Button onClick={handleAnalyze} disabled={!pdfFile}
              className="w-full py-3 text-sm flex items-center justify-center gap-2">
              <Zap className="h-4 w-4" />Analyze Profile
            </Button>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
          </div>

          <Card className="h-full flex flex-col items-center justify-center gap-4 py-16 text-center border-2 border-dashed border-slate-200 min-h-[280px]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Sparkles className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-600">No analysis yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Upload your LinkedIn PDF and click Analyze Profile
              </p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: ANALYZING
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'analyzing') {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Analyzing your profile…</h1>
        </div>
        <div className="flex justify-center">
          <Card className="p-8 w-full max-w-md">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
                <Sparkles className="h-6 w-6 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="w-full">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Progress</p>
                <StepList currentStep={currentStep} />
              </div>
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Each section is scored individually against recruiter criteria
              </p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: ANALYZED / OPTIMIZING
  // ══════════════════════════════════════════════════════════════════════════
  if ((phase === 'analyzed' || phase === 'optimizing') && result) {
    const ps = result.parsed_sections
    const hasImages = (profileImageUrl && result.profile_image) || (coverImageUrl && result.cover_image)

    return (
      <div className="space-y-6 pb-10">
        <PageHeader onReanalyze={handleReanalyze} onReset={handleReset} />

        {/* Score hero */}
        <ScoreHero
          score={result.overall_score}
          grade={result.grade}
          verdict={result.overall_verdict}
          jdFitScore={result.jd_fit_score}
        />

        {/* Strengths + Gaps */}
        {(result.top_strengths.length > 0 || result.top_gaps.length > 0) && (
          <StrengthsGaps strengths={result.top_strengths} gaps={result.top_gaps} />
        )}

        {/* ── Visual section ───────────────────────────────────────────── */}
        {hasImages && (
          <div className="space-y-4">
            <SectionLabel>Visual Profile</SectionLabel>
            {profileImageUrl && result.profile_image && (
              <ImageFeedbackRow imageUrl={profileImageUrl} result={result.profile_image} label="Profile Photo" />
            )}
            {coverImageUrl && result.cover_image && (
              <ImageFeedbackRow imageUrl={coverImageUrl} result={result.cover_image} label="Cover Banner" isBanner />
            )}
            {result.visual_notes.length > 0 && !profileImageUrl && !coverImageUrl && (
              <Card className="p-4 space-y-2">
                {result.visual_notes.map((n, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" /><span>{n}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {/* ── Profile sections ─────────────────────────────────────────── */}
        {hasSections(ps) ? (
          <div className="space-y-4">
            <SectionLabel>Profile Sections</SectionLabel>

            {ps?.headline && (
              <SectionFeedbackRow
                label="Headline"
                content={<p className="text-sm text-slate-800 font-medium leading-relaxed">{ps.headline}</p>}
                bucket={getBucket('headline')}
                copyText={ps.headline}
                feedbackExtra={result.headline_rewrite
                  ? <HeadlineRewriteInline rewrite={result.headline_rewrite} />
                  : undefined}
              />
            )}

            {ps?.about && (
              <SectionFeedbackRow
                label="About / Summary"
                content={<p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{ps.about}</p>}
                bucket={getBucket('about')}
                copyText={ps.about}
                feedbackExtra={result.about_tips.length > 0 ? (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Tips</p>
                    {result.about_tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
                        <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" /><span>{tip}</span>
                      </div>
                    ))}
                  </div>
                ) : undefined}
              />
            )}

            {ps?.experience && ps.experience.length > 0 && (
              <SectionFeedbackRow
                label="Experience"
                content={<ExperienceContent entries={ps.experience} />}
                bucket={getBucket('experience')}
                copyText={ps.experience.join('\n\n')}
              />
            )}

            {ps?.skills && ps.skills.length > 0 && (
              <SectionFeedbackRow
                label="Skills"
                content={<SkillsContent entries={ps.skills} />}
                bucket={getBucket('skills')}
                copyText={buildSkillsList(ps.skills).join(', ')}
              />
            )}

            {ps?.education && ps.education.length > 0 && (
              <SectionFeedbackRow
                label="Education"
                content={<EducationContent entries={ps.education} />}
                bucket={getBucket('completeness')}
                copyText={ps.education.join('\n')}
              />
            )}

            {ps?.has_recommendations && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">Recommendations section detected</p>
              </div>
            )}
          </div>
        ) : result.pdf_text ? (
          <div className="space-y-4">
            <SectionLabel>Extracted Text</SectionLabel>
            <RawTextFallback pdfText={result.pdf_text} />
          </div>
        ) : null}

        {/* ── AI Feedback ──────────────────────────────────────────────── */}
        {result.priority_fixes.length > 0 && (
          <div className="space-y-4">
            <SectionLabel>AI Feedback</SectionLabel>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Priority Fixes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.priority_fixes.map((fix, i) => <FixCard key={i} fix={fix} idx={i} />)}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {phase === 'optimizing' && (
          <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center bg-white rounded-2xl shadow-xl border border-slate-200 px-10 py-10">
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
                <Sparkles className="h-5 w-5 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Rewriting your sections…</p>
              <p className="text-xs text-slate-400">Optimizing for maximum recruiter impact</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE: OPTIMIZED
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'optimized' && optimizeResult && result) {
    return (
      <div className="space-y-5 pb-10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Optimized Profile</h1>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-cyan-200" />highlighted words are new
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setPhase('analyzed')}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 transition">
              <ArrowLeft className="h-3.5 w-3.5" />Back
            </button>
            <button onClick={handleReanalyze}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600 border border-slate-200 hover:border-cyan-300 rounded-xl px-3 py-2 transition">
              <RefreshCw className="h-3.5 w-3.5" />Re-analyze
            </button>
            <button onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 border border-slate-100 hover:border-slate-300 rounded-xl px-3 py-2 transition">
              New Analysis
            </button>
          </div>
        </div>

        <ScoreHero
          score={result.overall_score}
          grade={result.grade}
          verdict={result.overall_verdict}
          jdFitScore={result.jd_fit_score}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current</p>
            {optimizeResult.headline?.current && (
              <CurrentCard label="Headline">
                <p className="text-sm text-slate-600">{optimizeResult.headline.current}</p>
              </CurrentCard>
            )}
            {optimizeResult.about?.current && (
              <CurrentCard label="About">
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{optimizeResult.about.current}</p>
              </CurrentCard>
            )}
            {optimizeResult.experience?.map((exp, i) => (
              <CurrentCard key={i} label={`${exp.title} @ ${exp.company}`}>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{exp.current_text}</p>
              </CurrentCard>
            ))}
            {optimizeResult.skills?.current && optimizeResult.skills.current.length > 0 && (
              <CurrentCard label="Skills">
                <div className="flex flex-wrap gap-1.5">
                  {optimizeResult.skills.current.map((s, i) => (
                    <span key={i} className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </CurrentCard>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest">AI Optimized</p>

            {optimizeResult.headline && (
              <OptimizedCard label="Headline" copyText={optimizeResult.headline.optimized}>
                <p className="text-sm font-semibold text-slate-800 mb-2 leading-relaxed">
                  <WordDiff current={optimizeResult.headline.current} optimized={optimizeResult.headline.optimized} />
                </p>
                <p className="text-xs text-slate-400 italic">{optimizeResult.headline.reason}</p>
              </OptimizedCard>
            )}

            {optimizeResult.about && (
              <OptimizedCard label="About" copyText={optimizeResult.about.optimized}>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                  <WordDiff current={optimizeResult.about.current} optimized={optimizeResult.about.optimized} />
                </p>
                {optimizeResult.about.key_changes.length > 0 && (
                  <div className="space-y-1 border-t border-cyan-100 pt-2">
                    <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Key Changes</p>
                    {optimizeResult.about.key_changes.map((c, i) => (
                      <p key={i} className="text-xs text-slate-500 flex gap-1.5"><span className="text-cyan-500 shrink-0">+</span>{c}</p>
                    ))}
                  </div>
                )}
              </OptimizedCard>
            )}

            {optimizeResult.experience?.map((exp, i) => (
              <OptimizedCard key={i} label={`${exp.title} @ ${exp.company}`}
                copyText={exp.optimized_bullets.map(b => `• ${b}`).join('\n')}>
                <ul className="space-y-2 mb-3">
                  {exp.optimized_bullets.map((bullet, j) => (
                    <li key={j} className="text-xs text-slate-700 flex gap-2 leading-relaxed">
                      <span className="text-cyan-500 shrink-0 mt-0.5">•</span>
                      <WordDiff current={exp.current_text} optimized={bullet} />
                    </li>
                  ))}
                </ul>
                {exp.key_changes.length > 0 && (
                  <div className="space-y-1 border-t border-cyan-100 pt-2">
                    <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Key Changes</p>
                    {exp.key_changes.map((c, j) => (
                      <p key={j} className="text-xs text-slate-500 flex gap-1.5"><span className="text-cyan-500 shrink-0">+</span>{c}</p>
                    ))}
                  </div>
                )}
              </OptimizedCard>
            ))}

            {optimizeResult.skills && (
              <OptimizedCard label="Skills" copyText={optimizeResult.skills.reordered.join(', ')}>
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-2">Reordered for Impact</p>
                  <div className="flex flex-wrap gap-1.5">
                    {optimizeResult.skills.reordered.map((s, i) => {
                      const isNew = !optimizeResult.skills!.current.includes(s)
                      return <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${isNew ? 'bg-cyan-200 text-cyan-900 font-semibold' : 'bg-cyan-100 text-cyan-800'}`}>{s}</span>
                    })}
                  </div>
                </div>
                {optimizeResult.skills.add_if_true.length > 0 && (
                  <div className="border-t border-cyan-100 pt-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Consider Adding</p>
                    {optimizeResult.skills.add_if_true.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-xs font-semibold text-slate-700 shrink-0">{item.skill}:</span>
                        <span className="text-xs text-slate-500">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </OptimizedCard>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
