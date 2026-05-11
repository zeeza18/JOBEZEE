import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Camera, CheckCircle2, ClipboardCheck, Copy, FileText,
  Lightbulb, Loader2, Pencil, RefreshCw, Sparkles, Target, Upload, Zap,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BucketScore {
  id: string; label: string; score: number; max: number; pct: number
  strengths: string[]; gaps: string[]; evaluated?: boolean; note?: string
}
interface PriorityFix { section: string; issue: string; fix: string; example?: string; impact: 'High' | 'Medium' | 'Low' }
interface HeadlineRewrite { current: string; improved: string; reason: string }
interface ImageResult { score: number; suggestions: string[]; observations: Record<string, boolean | null> }
interface ParsedSections {
  headline?: string; about?: string; experience?: string[]
  skills?: string[]; inferred_skills?: string[]; education?: string[]; has_recommendations?: boolean
}
interface BoostResult {
  overall_score: number; grade: string; overall_verdict: string; jd_fit_score: number
  buckets: BucketScore[]; top_strengths: string[]; top_gaps: string[]
  priority_fixes: PriorityFix[]; headline_rewrite: HeadlineRewrite | null
  about_tips: string[]
  parsed_sections?: ParsedSections; pdf_text?: string
}
interface OptimizeResult {
  headline?:   { current: string; optimized: string; reason: string }
  about?:      { current: string; optimized: string; key_changes: string[] }
  experience?: Array<{ company: string; title: string; current_text: string; optimized_bullets: string[]; key_changes: string[] }>
  skills?:     { current: string[]; reordered: string[]; add_if_true: Array<{ skill: string; reason: string }> }
  education?:  { current: string; suggestions: string[]; missing_fields: string[] }
  proof?:      {
    recommendations: { action: string; who_to_ask: string[] }
    certifications:  { current: string[]; recommended: Array<{ name: string; issuer: string; reason: string }> }
    portfolio: string
  }
}

const stripBullet = (s: string) => s.replace(/^[-•*]\s+/, '').replace(/\s*[—–]\s*/g, '. ')

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY         = 'jobezee_linkedin_boost'
const LS_KEY_PHOTO   = 'jobezee_linkedin_photo'
const LS_KEY_COVER   = 'jobezee_linkedin_cover'

interface PersistedState {
  result: BoostResult
  optimizeResult: OptimizeResult | null
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

interface ImageCache {
  status: 'analyzing' | 'done' | 'error'
  dataUrl: string
  jobId?: string
  result?: ImageResult
  error?: string
}

function loadPhotoCache(): ImageCache | null {
  try { const r = localStorage.getItem(LS_KEY_PHOTO); return r ? JSON.parse(r) : null } catch { return null }
}
function savePhotoCache(cache: ImageCache | null) {
  try { cache ? localStorage.setItem(LS_KEY_PHOTO, JSON.stringify(cache)) : localStorage.removeItem(LS_KEY_PHOTO) } catch { /* quota */ }
}
function loadCoverCache(): ImageCache | null {
  try { const r = localStorage.getItem(LS_KEY_COVER); return r ? JSON.parse(r) : null } catch { return null }
}
function saveCoverCache(cache: ImageCache | null) {
  try { cache ? localStorage.setItem(LS_KEY_COVER, JSON.stringify(cache)) : localStorage.removeItem(LS_KEY_COVER) } catch { /* quota */ }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target!.result as string)
    reader.readAsDataURL(file)
  })
}


function clearState() {
  try { localStorage.removeItem(LS_KEY) } catch { /* ok */ }
}

async function saveToDb(state: PersistedState, images?: { photo_result?: ImageResult | null; cover_result?: ImageResult | null }): Promise<void> {
  try {
    await fetch('/api/linkedin-boost/save', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result:          state.result,
        optimize_result: state.optimizeResult,
        target_role:     state.targetRole,
        photo_result:    images?.photo_result ?? null,
        cover_result:    images?.cover_result ?? null,
      }),
    })
  } catch { /* fire-and-forget — localStorage is the fallback */ }
}

async function saveImageToDb(
  key: 'photo' | 'cover',
  imageResult: ImageResult,
  dataUrl: string,
): Promise<void> {
  try {
    await fetch('/api/linkedin-boost/save', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [`${key}_result`]:    imageResult,
        [`${key}_data_url`]:  dataUrl,
      }),
    })
  } catch { /* fire-and-forget */ }
}

async function clearImageFromDb(key: 'photo' | 'cover'): Promise<void> {
  try {
    await fetch('/api/linkedin-boost/save', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [`${key}_result`]: null, [`${key}_data_url`]: null }),
    })
  } catch { /* fire-and-forget */ }
}

interface DbState {
  result: BoostResult; optimizeResult: OptimizeResult | null; targetRole: string
  photoResult: ImageResult | null; coverResult: ImageResult | null
  photoDataUrl: string | null; coverDataUrl: string | null
}

async function loadFromDb(): Promise<DbState | null> {
  try {
    const res = await fetch('/api/linkedin-boost/saved', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.found) return null
    return {
      result:         data.result,
      optimizeResult: data.optimize_result ?? null,
      targetRole:     data.target_role ?? '',
      photoResult:    data.photo_result ?? null,
      coverResult:    data.cover_result ?? null,
      photoDataUrl:   data.photo_data_url ?? null,
      coverDataUrl:   data.cover_data_url ?? null,
    }
  } catch { return null }
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const ANALYZE_STEPS: Array<{ id: string; label: string }> = [
  { id: 'extract', label: 'Reading your profile'  },
  { id: 'scoring', label: 'Scoring your sections' },
  { id: 'done',    label: 'Finalising results'    },
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

function StepList({ currentStep }: { currentStep: string }) {
  return (
    <div className="space-y-3">
      {ANALYZE_STEPS.map(step => {
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

// ─── Optimized / Current cards ────────────────────────────────────────────────

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
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="px-4 py-3 opacity-70">{children}</div>
    </div>
  )
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ onReanalyze }: { onReanalyze?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">LinkedIn Profile Scorer</h1>
      </div>
      {onReanalyze && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={onReanalyze}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600 border border-slate-200 hover:border-cyan-300 rounded-xl px-3 py-2 transition">
            <RefreshCw className="h-3.5 w-3.5" />Re-analyze
          </button>
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
              <span className="text-emerald-500 shrink-0 font-bold mt-0.5">✓</span><span>{stripBullet(s)}</span>
            </div>
          ))}
        </div>
      )}
      {gaps.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2.5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Top Gaps</p>
          {gaps.map((g, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="text-red-400 shrink-0 font-bold mt-0.5">✗</span><span>{stripBullet(g)}</span>
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

// ─── Bucket feedback card ─────────────────────────────────────────────────────

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
              <span className="text-emerald-500 shrink-0">✓</span>{stripBullet(s)}
            </p>
          ))}
        </div>
      )}
      {bucket.gaps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Gaps</p>
          {bucket.gaps.map((g, i) => (
            <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
              <span className="text-red-400 shrink-0">✗</span>{stripBullet(g)}
            </p>
          ))}
        </div>
      )}
      {extra}
    </div>
  )
}

// ─── Section feedback row ─────────────────────────────────────────────────────

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
// BUG FIX: removed duplicate {label} from right card — it was appearing 3× total
// (left header + img alt when broken + right header). Now only left card has label.

function ImageFeedbackRow({ imageUrl, result, label, isBanner }: {
  imageUrl?: string; result: ImageResult; label: string; isBanner?: boolean
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
          {imageUrl ? (
            isBanner
              ? <img src={imageUrl} alt="" className="w-full rounded-lg object-cover max-h-36 border border-slate-200 shadow-sm" />
              : <img src={imageUrl} alt="" className="h-32 w-32 rounded-full object-cover border-2 border-slate-200 shadow-sm" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              {isBanner
                ? <div className="w-full max-w-[180px] h-16 rounded-lg bg-slate-200 flex items-center justify-center"><Upload className="h-6 w-6" /></div>
                : <div className="h-20 w-20 rounded-full bg-slate-200 flex items-center justify-center"><Camera className="h-6 w-6" /></div>}
              <span className="text-xs">Re-upload to preview</span>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 h-full">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Feedback</span>
          <span className={`text-lg font-black ${scoreColor}`}>{result.score}<span className="text-xs text-slate-400 font-normal">/100</span></span>
        </div>
        <ScoreBar pct={scorePct} />
        <div className="space-y-2">
          {result.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" /><span>{stripBullet(s)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Experience parser ────────────────────────────────────────────────────────
//
// Backend joins PDF lines with " | " and splits entries at date boundaries:
//   entry[i]   = "Company — Title"           (pre-date header)
//   entry[i+1] = "Date | Location | •bullet | •bullet | NextCompany | NextTitle"
//
// Problems to fix:
//   1. Inline " | " inside bullets are PDF line-wrap artifacts → replace with space
//   2. Trailing "NextCompany | Title | —" at end of last bullet → extract as header
//   3. "Page N of N" appearing inside meta or bullets → strip
//   4. Standalone "—" lines from PDF → strip from company/title

interface ParsedJob { company: string; title: string; meta: string; bullets: string[] }

function isDateStartEntry(s: string): boolean {
  const first = s.split(' | ')[0].trim()
  return /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{4})/i.test(first)
}

function isLikelyCompanyOrTitle(text: string): boolean {
  if (!text || text.length < 2) return false
  if (text.split(/\s+/).length > 6) return false   // too many words = text fragment
  if (/^[a-z]/.test(text)) return false              // starts lowercase = continuation
  if (/^(and|or|with|for|in|at|on|by|of|to|a|an|the|that|which)\b/i.test(text)) return false
  if (/^\d/.test(text)) return false
  if (/^Page \d+ of \d+$/i.test(text)) return false  // page markers
  if (/\.\s/.test(text)) return false                 // mid-sentence period
  if (text.split(',').length > 2) return false        // multiple commas = sentence fragment
  return true
}

function splitCompanyTitle(s: string): [string, string] {
  // Strip trailing " | —" or " —" artifacts (LinkedIn PDF separator lines)
  const cleaned = s.replace(/(\s*\|\s*[—–]+\s*)+$/, '').replace(/\s*[—–]+\s*$/, '').trim()
  // Try em/en dash separator first: "Company — Title"
  const dashMatch = cleaned.match(/^(.+?)\s+[—–]\s+(.+)$/)
  if (dashMatch) return [dashMatch[1].trim(), dashMatch[2].trim()]
  // Fall back to pipe
  const pipeIdx = cleaned.indexOf(' | ')
  if (pipeIdx > 0) return [cleaned.slice(0, pipeIdx).trim(), cleaned.slice(pipeIdx + 3).trim()]
  return [cleaned, '']
}

// Split a bullet line into the actual bullet text and any trailing company/title header
// that got appended because it appeared after the last bullet in a date block.
function extractBulletAndTrailing(bulletLine: string): { bullet: string; trailing: string } {
  const content = bulletLine.replace(/^[▸\-•]\s*/, '').trim()
  const segments = content.split(' | ')
  const bulletParts: string[] = []
  const trailingParts: string[] = []
  let sentenceEnded = false

  for (const seg of segments) {
    const trimmed = seg.trim()
    if (!trimmed) continue

    // Skip page markers entirely
    if (/^Page \d+ of \d+$/i.test(trimmed)) continue

    if (trailingParts.length > 0) {
      trailingParts.push(trimmed)
      continue
    }
    if (sentenceEnded && isLikelyCompanyOrTitle(trimmed)) {
      trailingParts.push(trimmed)
      continue
    }
    bulletParts.push(trimmed)
    if (/[.!?]$/.test(trimmed)) sentenceEnded = true
  }

  return {
    bullet: bulletParts.join(' '),
    trailing: trailingParts.join(' | '),
  }
}

function parseDateBlock(raw: string): { meta: string; bullets: string[]; trailing: string } {
  // Strip page markers first so they don't pollute meta or bullets
  const cleaned = raw.replace(/\s*\|\s*Page \d+ of \d+\s*/gi, ' | ')

  // Normalise: pipe-before-bullet → newline+bullet (handles ▸, •, -)
  const normalized = cleaned
    .replace(/\s*\|\s*▸\s*/g, '\n▸ ')
    .replace(/\s*\|\s*•\s*/g, '\n• ')
    .replace(/\s*\|\s*-\s+/g, '\n- ')

  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)
  const metaParts: string[] = []
  const bullets: string[] = []
  let trailing = ''
  let inBullets = false

  for (const line of lines) {
    const isBullet = /^[▸•\-]/.test(line)
    if (isBullet) {
      inBullets = true
      const { bullet, trailing: t } = extractBulletAndTrailing(line)
      if (bullet) bullets.push(bullet)
      if (t) trailing = t  // last bullet wins — it carries the next company
    } else if (!inBullets) {
      const metaLine = line.replace(/\s*\|\s*/g, ' · ').trim()
      if (metaLine) metaParts.push(metaLine)
    }
    // Non-bullet lines AFTER bullets started are ignored (they'd be next-company
    // headers already captured via extractBulletAndTrailing's trailing logic)
  }

  return { meta: metaParts.join(' · '), bullets, trailing }
}

function buildJobList(entries: string[]): ParsedJob[] {
  const jobs: ParsedJob[] = []
  let pendingHeader = ''

  for (const entry of entries) {
    if (!isDateStartEntry(entry)) {
      if (pendingHeader) {
        const [c, t] = splitCompanyTitle(pendingHeader)
        jobs.push({ company: c, title: t, meta: '', bullets: [] })
      }
      pendingHeader = entry
    } else {
      const { meta, bullets, trailing } = parseDateBlock(entry)
      let company = '', title = ''
      if (pendingHeader) { ;[company, title] = splitCompanyTitle(pendingHeader); pendingHeader = '' }
      jobs.push({ company, title, meta, bullets })
      if (trailing) pendingHeader = trailing
    }
  }
  if (pendingHeader) {
    const [c, t] = splitCompanyTitle(pendingHeader)
    jobs.push({ company: c, title: t, meta: '', bullets: [] })
  }
  return jobs
}

function ExperienceContent({ entries }: { entries: string[] }) {
  const jobs = buildJobList(entries)
  if (!jobs.length) return <p className="text-xs text-slate-400 italic">No experience parsed</p>
  return (
    <div className="space-y-5">
      {jobs.map((job, i) => (
        <div key={i} className={i > 0 ? 'pt-5 border-t border-slate-100' : ''}>
          <p className="text-sm font-bold text-slate-900 leading-snug">{job.company || 'Unknown Company'}</p>
          {job.title && <p className="text-sm font-semibold text-cyan-700 mt-0.5">{job.title}</p>}
          {job.meta  && <p className="text-xs text-slate-500 mt-1">{job.meta}</p>}
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

// ─── Education parser ─────────────────────────────────────────────────────────
// Each entry is one raw PDF line. LinkedIn PDFs often split school info across
// multiple lines:  "DePaul University" + "· (January 2024 - December 2026)"
// Or all on one:   "University of Manchester — BSc Computer Science, 2018"

interface EduEntry { school: string; degree: string; dates: string }

function buildEducationList(entries: string[]): EduEntry[] {
  const result: EduEntry[] = []
  for (const raw of entries) {
    const line = raw.trim().replace(/^Page \d+ of \d+\s*/gi, '').trim()
    if (!line) continue
    const isAttachment = line.startsWith('·') || line.startsWith('(')
    const hasYear = /\b\d{4}\b/.test(line) && line.length < 80
    if ((isAttachment || (hasYear && result.length > 0 && !result[result.length - 1].dates)) && result.length > 0) {
      const clean = line.replace(/^·\s*/, '').replace(/[()]/g, '').trim()
      const last = result[result.length - 1]
      if (/\b\d{4}\b/.test(clean)) { last.dates = last.dates ? last.dates + ' ' + clean : clean }
      else { last.degree = last.degree ? last.degree + ' ' + clean : clean }
    } else if (!isAttachment) {
      const dashMatch = line.match(/^(.+?)\s+[—–]\s+(.+)$/)
      if (dashMatch) {
        const school = dashMatch[1].trim()
        const rest   = dashMatch[2].trim()
        const yrMatch = rest.match(/,?\s*(\d{4})\s*$/)
        result.push({ school, degree: yrMatch ? rest.replace(yrMatch[0], '').trim() : rest, dates: yrMatch ? yrMatch[1] : '' })
      } else {
        result.push({ school: line, degree: '', dates: '' })
      }
    }
  }
  return result
}

function EducationContent({ entries }: { entries: string[] }) {
  const list = buildEducationList(entries)
  if (!list.length) return <p className="text-xs text-slate-400 italic">No education parsed</p>
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

// ─── Skills parser ────────────────────────────────────────────────────────────
// Skills entries are raw PDF lines. They can be comma-separated skill lists OR
// they can bleed into About-section text. We stop processing at the first
// sentence-like fragment and filter out language declarations.

function buildSkillsList(entries: string[]): string[] {
  const skills: string[] = []
  for (const rawEntry of entries) {
    const entry = rawEntry.trim()
    if (!entry) continue
    // Sentence break = About text bleeding in → stop
    if (/\.\s+[A-Z]/.test(entry)) break
    if (/^(Experienced|Proficient|Strong background|Background|Languages)\b/i.test(entry)) break
    // Skip language lines
    if (/\b(English|Hindi|Spanish|French|German|Arabic|Mandarin|Chinese|Japanese)\s*\(/i.test(entry)) continue
    const parts = entry.split(',').map(s => s.trim().replace(/[,;.]+$/, '').trim())
    for (const part of parts) {
      if (!part || part.length < 2 || part.length > 60) continue
      if (/^[a-z]/.test(part)) continue
      if (/^(and|or|with|for|the|in|on|at|by|of|to|a|an|including)\b/i.test(part)) continue
      if (/[.!?]/.test(part)) continue
      skills.push(part)
    }
  }
  return [...new Set(skills)]
}

function SkillsContent({ entries }: { entries: string[] }) {
  const skills = buildSkillsList(entries)
  if (!skills.length) return <p className="text-xs text-slate-400 italic">No skills parsed</p>
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
      {fix.example && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500 leading-relaxed font-mono">
          {fix.example}
        </div>
      )}
    </div>
  )
}

// ─── Headline rewrite ─────────────────────────────────────────────────────────

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
        <p className="text-xs text-slate-400 italic leading-relaxed flex-1">{rewrite.reason}</p>
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
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-amber-800">Could not detect section headers</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-amber-200">
          <p className="text-xs text-amber-700 mt-2 mb-2 leading-relaxed">Your PDF may use non-standard headers. The AI still scored your full text.</p>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-mono bg-white rounded-lg p-3 border border-amber-100">
            {pdfText.slice(0, 2000)}{pdfText.length > 2000 && <span className="text-slate-400"> …</span>}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Inline optimize results ──────────────────────────────────────────────────

function InlineOptimizeResults({ or }: { or: OptimizeResult }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-sm bg-cyan-200" />highlighted words are new additions
      </p>

      {or.headline && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CurrentCard label="Current Headline">
            <p className="text-sm text-slate-600 leading-relaxed">{or.headline.current}</p>
          </CurrentCard>
          <OptimizedCard label="Recommended Headline" copyText={or.headline.optimized}>
            <p className="text-sm font-semibold text-slate-800 mb-2 leading-relaxed">
              <WordDiff current={or.headline.current} optimized={or.headline.optimized} />
            </p>
            <p className="text-xs text-slate-400 italic">{or.headline.reason}</p>
          </OptimizedCard>
        </div>
      )}

      {or.about && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CurrentCard label="Current About">
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{or.about.current}</p>
          </CurrentCard>
          <OptimizedCard label="Recommended About" copyText={or.about.optimized}>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
              <WordDiff current={or.about.current} optimized={or.about.optimized} />
            </p>
            {or.about.key_changes.length > 0 && (
              <div className="border-t border-cyan-100 pt-2 space-y-1">
                <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Key Changes</p>
                {or.about.key_changes.map((c, i) => (
                  <p key={i} className="text-xs text-slate-500 flex gap-1.5"><span className="text-cyan-500">+</span>{c}</p>
                ))}
              </div>
            )}
          </OptimizedCard>
        </div>
      )}

      {or.experience?.map((exp, i) => (
        <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CurrentCard label={`Current: ${exp.title} @ ${exp.company}`}>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{exp.current_text}</p>
          </CurrentCard>
          <OptimizedCard label={`Recommended: ${exp.title} @ ${exp.company}`}
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
              <div className="border-t border-cyan-100 pt-2 space-y-1">
                <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Key Changes</p>
                {exp.key_changes.map((c, j) => (
                  <p key={j} className="text-xs text-slate-500 flex gap-1.5"><span className="text-cyan-500">+</span>{c}</p>
                ))}
              </div>
            )}
          </OptimizedCard>
        </div>
      ))}

      {or.skills && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CurrentCard label="Current Skills">
            <div className="flex flex-wrap gap-1.5">
              {or.skills.current.map((s, i) => (
                <span key={i} className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </CurrentCard>
          <OptimizedCard label="Recommended Skills" copyText={or.skills.reordered.join(', ')}>
            <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-2">Reordered for Impact</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {or.skills.reordered.map((s, i) => {
                const isNew = !or.skills!.current.includes(s)
                return <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${isNew ? 'bg-cyan-200 text-cyan-900 font-semibold' : 'bg-cyan-100 text-cyan-800'}`}>{s}</span>
              })}
            </div>
            {or.skills.add_if_true.length > 0 && (
              <div className="border-t border-cyan-100 pt-2 space-y-1.5">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Consider Adding</p>
                {or.skills.add_if_true.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-xs font-semibold text-slate-700 shrink-0">{item.skill}:</span>
                    <span className="text-xs text-slate-500">{item.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </OptimizedCard>
        </div>
      )}

      {or.education && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CurrentCard label="Current Education">
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{or.education.current || 'Not detected'}</p>
          </CurrentCard>
          <OptimizedCard label="Education Improvements">
            {or.education.missing_fields.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Missing Fields</p>
                <div className="flex flex-wrap gap-1.5">
                  {or.education.missing_fields.map((f, i) => (
                    <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
            {or.education.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Suggestions</p>
                {or.education.suggestions.map((s, i) => (
                  <p key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-cyan-500 shrink-0">→</span>{s}</p>
                ))}
              </div>
            )}
          </OptimizedCard>
        </div>
      )}

      {or.proof && (
        <div className="space-y-4">
          {/* Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CurrentCard label="Recommendations">
              <p className="text-xs text-slate-400 italic">No recommendations detected in profile</p>
            </CurrentCard>
            <OptimizedCard label="How to Get Recommendations">
              {or.proof.recommendations.who_to_ask.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-1.5">Who to Ask</p>
                  <div className="space-y-1">
                    {or.proof.recommendations.who_to_ask.map((w, i) => (
                      <p key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="text-cyan-500 shrink-0">•</span>{w}</p>
                    ))}
                  </div>
                </div>
              )}
              {or.proof.recommendations.action && (
                <p className="text-xs text-slate-500 border-t border-cyan-100 pt-2">{or.proof.recommendations.action}</p>
              )}
            </OptimizedCard>
          </div>

          {/* Certifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CurrentCard label="Current Certifications">
              {or.proof.certifications.current.length > 0
                ? <div className="space-y-1">{or.proof.certifications.current.map((c, i) => (
                    <p key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-emerald-500 shrink-0">✓</span>{c}</p>
                  ))}</div>
                : <p className="text-xs text-slate-400 italic">None detected</p>
              }
            </CurrentCard>
            <OptimizedCard label="Recommended Certifications">
              <div className="space-y-3">
                {or.proof.certifications.recommended.map((c, i) => (
                  <div key={i} className="border-b border-cyan-100 last:border-0 pb-2 last:pb-0">
                    <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                    <p className="text-[10px] text-cyan-700 mb-0.5">{c.issuer}</p>
                    <p className="text-[10px] text-slate-500">{c.reason}</p>
                  </div>
                ))}
              </div>
            </OptimizedCard>
          </div>

          {/* Portfolio */}
          {or.proof.portfolio && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Portfolio / GitHub</p>
              <p className="text-xs text-slate-700">{or.proof.portfolio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shared types ─────────────────────────────────────────────────────────────

type ImagePhase   = 'idle' | 'analyzing' | 'done' | 'error'
type ProfilePhase = 'input' | 'analyzing' | 'analyzed' | 'optimizing'
type Tab          = 'profile' | 'photo' | 'cover'

// ─── Analyze button (consistent style across all tabs) ────────────────────────

function AnalyzeBtn({ onClick, disabled, loading, label }: {
  onClick: () => void; disabled: boolean; loading: boolean; label: string
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:cursor-not-allowed">
      {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</> : <><Zap className="h-4 w-4" />{label}</>}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 2500

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'photo',   label: 'Photo'   },
  { id: 'cover',   label: 'Cover'   },
]

interface ExpEntry  { company: string; title: string; dates: string; bullets: string }
interface EduEntry  { school: string; degree: string; dates: string }
interface ManualForm {
  headline: string; about: string
  experience: ExpEntry[]; education: EduEntry[]
  skills: string; certifications: string; projects: string
  recommendations: string; awards: string
}
const emptyExp  = (): ExpEntry  => ({ company: '', title: '', dates: '', bullets: '' })
const emptyEdu  = (): EduEntry  => ({ school: '', degree: '', dates: '' })
const emptyForm = (): ManualForm => ({
  headline: '', about: '', experience: [emptyExp()], education: [emptyEdu()],
  skills: '', certifications: '', projects: '', recommendations: '', awards: '',
})

function buildManualText(f: ManualForm): string {
  const lines: string[] = []
  if (f.headline) lines.push(f.headline, '')
  if (f.about) { lines.push('Summary', f.about, '') }
  const exps = f.experience.filter(e => e.company || e.title || e.bullets)
  if (exps.length) {
    lines.push('Experience')
    exps.forEach(e => {
      if (e.company || e.title) lines.push([e.company, e.title].filter(Boolean).join(' | '))
      if (e.dates) lines.push(e.dates)
      if (e.bullets) e.bullets.split('\n').forEach(b => lines.push(b.trim() ? `• ${b.trim().replace(/^[•\-*]\s*/, '')}` : ''))
      lines.push('')
    })
  }
  const edus = f.education.filter(e => e.school)
  if (edus.length) {
    lines.push('Education')
    edus.forEach(e => {
      lines.push(e.school)
      if (e.degree || e.dates) lines.push([e.degree, e.dates].filter(Boolean).join(' · '))
      lines.push('')
    })
  }
  if (f.skills) { lines.push('Skills', f.skills, '') }
  if (f.certifications) { lines.push('Certifications', f.certifications, '') }
  if (f.projects) { lines.push('Projects', f.projects, '') }
  if (f.recommendations) { lines.push('Recommendations', f.recommendations, '') }
  if (f.awards) { lines.push('Awards', f.awards, '') }
  return lines.join('\n')
}

export default function ProfileBoostPage() {
  const persisted = loadPersistedState()

  // Active tab
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // ── Profile (PDF) state ──────────────────────────────────────────────────
  const [profilePhase,   setProfilePhase]   = useState<ProfilePhase>(persisted ? 'analyzed' : 'input')
  const [inputMode,      setInputMode]      = useState<'pdf' | 'manual'>('pdf')
  const [manualForm,     setManualForm]     = useState<ManualForm>(emptyForm())
  const [pdfFile,        setPdfFile]        = useState<File | null>(null)
  const [targetRole,     setTargetRole]     = useState(persisted?.targetRole ?? '')
  const [jdText,         setJdText]         = useState('')
  const [currentStep,    setCurrentStep]    = useState('extract')
  const [result,         setResult]         = useState<BoostResult | null>(persisted?.result ?? null)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(persisted?.optimizeResult ?? null)
  const [profileError,   setProfileError]   = useState<string | null>(null)

  // ── Photo state (fully independent) ─────────────────────────────────────
  const [profileImage,    setProfileImage]    = useState<File | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(() => loadPhotoCache()?.dataUrl ?? null)
  const [photoPhase,      setPhotoPhase]      = useState<ImagePhase>(() => { const c = loadPhotoCache(); return c ? (c.status === 'done' ? 'done' : 'analyzing') : 'idle' })
  const [photoResult,     setPhotoResult]     = useState<ImageResult | null>(() => loadPhotoCache()?.result ?? null)
  const [photoError,      setPhotoError]      = useState<string | null>(null)

  // ── Cover state (fully independent) ─────────────────────────────────────
  const [coverImage,    setCoverImage]    = useState<File | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(() => loadCoverCache()?.dataUrl ?? null)
  const [coverPhase,    setCoverPhase]    = useState<ImagePhase>(() => { const c = loadCoverCache(); return c ? (c.status === 'done' ? 'done' : 'analyzing') : 'idle' })
  const [coverResult,   setCoverResult]   = useState<ImageResult | null>(() => loadCoverCache()?.result ?? null)
  const [coverError,    setCoverError]    = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  useEffect(() => () => stopPolling(), [])

  // Load from DB on mount when localStorage has nothing (e.g. different machine)
  useEffect(() => {
    const hasProfileCache = !!persisted
    const hasPhotoCache   = !!loadPhotoCache()?.result
    const hasCoverCache   = !!loadCoverCache()?.result
    if (hasProfileCache && hasPhotoCache && hasCoverCache) return
    loadFromDb().then(dbState => {
      if (!dbState) return
      if (!hasProfileCache && dbState.result) {
        setResult(dbState.result)
        setOptimizeResult(dbState.optimizeResult)
        setTargetRole(dbState.targetRole)
        setProfilePhase('analyzed')
        saveState({ result: dbState.result, optimizeResult: dbState.optimizeResult, targetRole: dbState.targetRole })
      }
      if (!hasPhotoCache && dbState.photoResult) {
        setPhotoResult(dbState.photoResult)
        setPhotoPhase('done')
        if (dbState.photoDataUrl) setProfileImageUrl(dbState.photoDataUrl)
        savePhotoCache({ status: 'done', dataUrl: dbState.photoDataUrl ?? '', result: dbState.photoResult })
      }
      if (!hasCoverCache && dbState.coverResult) {
        setCoverResult(dbState.coverResult)
        setCoverPhase('done')
        if (dbState.coverDataUrl) setCoverImageUrl(dbState.coverDataUrl)
        saveCoverCache({ status: 'done', dataUrl: dbState.coverDataUrl ?? '', result: dbState.coverResult })
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profileImage) return  // no file selected — keep cached dataUrl if present
    const url = URL.createObjectURL(profileImage)
    setProfileImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [profileImage])

  useEffect(() => {
    if (!coverImage) return  // no file selected — keep cached dataUrl if present
    const url = URL.createObjectURL(coverImage)
    setCoverImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [coverImage])

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function safeJson(res: Response): Promise<Record<string, unknown>> {
    const txt = await res.text()
    try { return JSON.parse(txt) } catch { throw new Error(txt.slice(0, 200) || 'Server error') }
  }

  // ── Image polling helpers ─────────────────────────────────────────────────

  const pollPhoto = useCallback((jobId: string, dataUrl: string) => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/photo-status/${jobId}`, { credentials: 'include' })
        const data = await safeJson(res)
        if (data.status === 'done') {
          clearInterval(iv)
          const pr = data.result as unknown as ImageResult
          setPhotoResult(pr); setPhotoPhase('done')
          savePhotoCache({ status: 'done', dataUrl, result: pr })
          saveImageToDb('photo', pr, dataUrl)
        } else if (data.status === 'error') {
          clearInterval(iv)
          setPhotoError(data.error as string); setPhotoPhase('error')
          savePhotoCache(null)
        }
      } catch { /* network blip — keep polling */ }
    }, 2500)
  }, [])

  const pollCover = useCallback((jobId: string, dataUrl: string) => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/cover-status/${jobId}`, { credentials: 'include' })
        const data = await safeJson(res)
        if (data.status === 'done') {
          clearInterval(iv)
          const cr = data.result as unknown as ImageResult
          setCoverResult(cr); setCoverPhase('done')
          saveCoverCache({ status: 'done', dataUrl: dataUrl, result: cr })
          saveImageToDb('cover', cr, dataUrl)
        } else if (data.status === 'error') {
          clearInterval(iv)
          setCoverError(data.error as string); setCoverPhase('error')
          saveCoverCache(null)
        }
      } catch { /* network blip — keep polling */ }
    }, 2500)
  }, [])

  // Resume polling for any in-progress image jobs on mount
  useEffect(() => {
    const pc = loadPhotoCache()
    if (pc?.status === 'analyzing' && pc.jobId) pollPhoto(pc.jobId, pc.dataUrl)
    const cc = loadCoverCache()
    if (cc?.status === 'analyzing' && cc.jobId) pollCover(cc.jobId, cc.dataUrl)
  }, [pollPhoto, pollCover])

  // ── Analyze Photo ─────────────────────────────────────────────────────────

  const handlePhotoAnalyze = useCallback(async () => {
    if (!profileImage) return
    setPhotoPhase('analyzing'); setPhotoError(null); setPhotoResult(null)
    const dataUrl = await fileToDataUrl(profileImage)
    setProfileImageUrl(dataUrl)
    savePhotoCache({ status: 'analyzing', dataUrl })
    const fd = new FormData()
    fd.append('profile_image', profileImage)
    try {
      const res = await fetch('/api/linkedin-boost/analyze-photo', { method: 'POST', credentials: 'include', body: fd })
      const data = await safeJson(res)
      if (!res.ok) throw new Error((data.detail as string) || 'Photo analysis failed')
      const jobId = data.job_id as string
      savePhotoCache({ status: 'analyzing', dataUrl, jobId })
      pollPhoto(jobId, dataUrl)
    } catch (e: unknown) { setPhotoError(e instanceof Error ? e.message : String(e)); setPhotoPhase('error') }
  }, [profileImage, pollPhoto])

  // ── Analyze Cover ─────────────────────────────────────────────────────────

  const handleCoverAnalyze = useCallback(async () => {
    if (!coverImage) return
    setCoverPhase('analyzing'); setCoverError(null); setCoverResult(null)
    const dataUrl = await fileToDataUrl(coverImage)
    setCoverImageUrl(dataUrl)
    saveCoverCache({ status: 'analyzing', dataUrl })
    const fd = new FormData()
    fd.append('cover_image', coverImage)
    try {
      const res = await fetch('/api/linkedin-boost/analyze-cover', { method: 'POST', credentials: 'include', body: fd })
      const data = await safeJson(res)
      if (!res.ok) throw new Error((data.detail as string) || 'Cover analysis failed')
      const jobId = data.job_id as string
      saveCoverCache({ status: 'analyzing', dataUrl, jobId })
      pollCover(jobId, dataUrl)
    } catch (e: unknown) { setCoverError(e instanceof Error ? e.message : String(e)); setCoverPhase('error') }
  }, [coverImage, pollCover])

  // ── Analyze Profile ───────────────────────────────────────────────────────

  const handleProfileAnalyze = useCallback(async () => {
    if (!pdfFile) return
    setProfileError(null); setResult(null); setOptimizeResult(null)
    setCurrentStep('extract'); setProfilePhase('analyzing'); clearState()

    const fd = new FormData()
    fd.append('profile_pdf', pdfFile)
    if (jdText.trim())     fd.append('job_description', jdText.trim())
    if (targetRole.trim()) fd.append('target_role',     targetRole.trim())

    let jobId: string
    try {
      const res = await fetch('/api/linkedin-boost/analyze', { method: 'POST', credentials: 'include', body: fd })
      const data = await safeJson(res)
      if (!res.ok) throw new Error((data.detail as string) || 'Failed to start analysis')
      jobId = data.job_id as string
    } catch (e: unknown) { setProfileError(e instanceof Error ? e.message : String(e)); setProfilePhase('input'); return }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/status/${jobId}`, { credentials: 'include' })
        const data = await safeJson(res)
        if (!res.ok) throw new Error((data.detail as string) || 'Analysis failed')
        const step = data.step as string | undefined
        if (step) setCurrentStep(step)
        if (data.status === 'done') {
          stopPolling()
          const r = data.result as BoostResult
          setResult(r); setProfilePhase('analyzed')
          const state = { result: r, optimizeResult: null, targetRole }
          saveState(state)
          saveToDb(state)
        }
      } catch (e: unknown) { stopPolling(); setProfileError(e instanceof Error ? e.message : String(e)); setProfilePhase('input') }
    }, POLL_INTERVAL)
  }, [pdfFile, jdText, targetRole])

  // ── Manual analyze ────────────────────────────────────────────────────────

  const handleManualAnalyze = useCallback(async () => {
    const text = buildManualText(manualForm).trim()
    if (!text) return
    const file = new File([text], 'profile.txt', { type: 'text/plain' })
    setPdfFile(file)
    setProfileError(null); setResult(null); setOptimizeResult(null)
    setCurrentStep('extract'); setProfilePhase('analyzing'); clearState()

    const fd = new FormData()
    fd.append('profile_pdf', file)
    if (jdText.trim())     fd.append('job_description', jdText.trim())
    if (targetRole.trim()) fd.append('target_role',     targetRole.trim())

    let jobId: string
    try {
      const res = await fetch('/api/linkedin-boost/analyze', { method: 'POST', credentials: 'include', body: fd })
      const data = await safeJson(res)
      if (!res.ok) throw new Error((data.detail as string) || 'Failed to start analysis')
      jobId = data.job_id as string
    } catch (e: unknown) { setProfileError(e instanceof Error ? e.message : String(e)); setProfilePhase('input'); return }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/status/${jobId}`, { credentials: 'include' })
        const data = await safeJson(res)
        if (!res.ok) throw new Error((data.detail as string) || 'Analysis failed')
        const step = data.step as string | undefined
        if (step) setCurrentStep(step)
        if (data.status === 'done') {
          stopPolling()
          const r = data.result as BoostResult
          setResult(r); setProfilePhase('analyzed')
          const state = { result: r, optimizeResult: null, targetRole }
          saveState(state)
          saveToDb(state)
        }
      } catch (e: unknown) { stopPolling(); setProfileError(e instanceof Error ? e.message : String(e)); setProfilePhase('input') }
    }, POLL_INTERVAL)
  }, [manualForm, jdText, targetRole])

  // ── Optimize ──────────────────────────────────────────────────────────────

  const handleOptimize = useCallback(async () => {
    if (!result?.pdf_text) return
    setProfilePhase('optimizing'); setProfileError(null)

    let jobId: string
    try {
      const res = await fetch('/api/linkedin-boost/optimize', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_text: result.pdf_text, score_result: result, target_role: targetRole }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error((data.detail as string) || 'Failed to start optimization')
      jobId = data.job_id as string
    } catch (e: unknown) { setProfileError(e instanceof Error ? e.message : String(e)); setProfilePhase('analyzed'); return }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/optimize-status/${jobId}`, { credentials: 'include' })
        const data = await safeJson(res)
        if (!res.ok) throw new Error((data.detail as string) || 'Optimization failed')
        if (data.status === 'done') {
          stopPolling()
          const or = data.result as OptimizeResult
          setOptimizeResult(or); setProfilePhase('analyzed')
          if (result) {
            const state = { result, optimizeResult: or, targetRole }
            saveState(state)
            saveToDb(state)
          }
        }
      } catch (e: unknown) { stopPolling(); setProfileError(e instanceof Error ? e.message : String(e)); setProfilePhase('analyzed') }
    }, POLL_INTERVAL)
  }, [result, targetRole])

  const handleReanalyze = () => {
    stopPolling(); setProfilePhase('input'); setResult(null); setOptimizeResult(null); setProfileError(null); clearState()
  }
  const getBucket = (id: string) => result?.buckets.find(b => b.id === id)
  const hasSections = (ps?: ParsedSections) => ps && (ps.headline || ps.about || (ps.experience?.length ?? 0) > 0 || (ps.skills?.length ?? 0) > 0)

  // ── Tab status helpers ────────────────────────────────────────────────────

  const tabBusy = (t: Tab) => {
    if (t === 'profile') return profilePhase === 'analyzing' || profilePhase === 'optimizing'
    if (t === 'photo')   return photoPhase === 'analyzing'
    if (t === 'cover')   return coverPhase === 'analyzing'
    return false
  }
  const tabDone = (t: Tab) => {
    if (t === 'profile') return profilePhase === 'analyzed' || profilePhase === 'optimizing'
    if (t === 'photo')   return photoPhase === 'done'
    if (t === 'cover')   return coverPhase === 'done'
    return false
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-0 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">LinkedIn Profile Scorer</h1>
        </div>
        {profilePhase !== 'input' && (
          <button onClick={handleReanalyze}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600 border border-slate-200 hover:border-cyan-300 rounded-xl px-3 py-2 transition">
            <RefreshCw className="h-3.5 w-3.5" />Re-analyze Profile
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 mb-5">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}>
            {tab.label}
            {tabBusy(tab.id) && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500" />}
            {tabDone(tab.id) && !tabBusy(tab.id) && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      <div className={activeTab === 'profile' ? 'space-y-5' : 'hidden'}>
        {(profilePhase === 'input' || profilePhase === 'analyzing') && (
          <Card className="p-5 space-y-4">
            {profilePhase === 'analyzing' ? (
              <div className="flex flex-col items-center gap-6 py-6">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
                  <Sparkles className="h-5 w-5 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="w-full max-w-xs">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Progress</p>
                  <StepList currentStep={currentStep} />
                </div>
                <p className="text-xs text-slate-400">You can switch tabs — analysis keeps running</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mode switcher */}
                <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1">
                  {(['pdf', 'manual'] as const).map(m => (
                    <button key={m} onClick={() => setInputMode(m)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${inputMode === m ? 'bg-white shadow text-cyan-700 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                      {m === 'pdf' ? <><Upload className="h-3.5 w-3.5" />Upload PDF</> : <><Pencil className="h-3.5 w-3.5" />Fill manually</>}
                    </button>
                  ))}
                </div>

                {inputMode === 'pdf' ? (
                  <>
                    <DropZone accept=".pdf,.txt" label="Upload your LinkedIn PDF export"
                      hint='LinkedIn → "Save to PDF" on your profile page'
                      icon={Upload} file={pdfFile} onFile={setPdfFile} />
                  </>
                ) : (
                  <div className="space-y-3">
                    {/* Headline */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Headline</p>
                      <input type="text" placeholder="e.g. AI Engineer | GenAI, LLMs & RAG | AWS"
                        value={manualForm.headline}
                        onChange={e => setManualForm(f => ({ ...f, headline: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                    </div>
                    {/* About */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">About / Summary</p>
                      <textarea rows={3} placeholder="Your professional summary…"
                        value={manualForm.about}
                        onChange={e => setManualForm(f => ({ ...f, about: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                    </div>
                    {/* Experience */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Experience</p>
                      <div className="space-y-3">
                        {manualForm.experience.map((exp, i) => (
                          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" placeholder="Company" value={exp.company}
                                onChange={e => setManualForm(f => { const ex = [...f.experience]; ex[i] = { ...ex[i], company: e.target.value }; return { ...f, experience: ex } })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-slate-400" />
                              <input type="text" placeholder="Title" value={exp.title}
                                onChange={e => setManualForm(f => { const ex = [...f.experience]; ex[i] = { ...ex[i], title: e.target.value }; return { ...f, experience: ex } })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-slate-400" />
                            </div>
                            <input type="text" placeholder="Dates (e.g. Jan 2023 – Present)" value={exp.dates}
                              onChange={e => setManualForm(f => { const ex = [...f.experience]; ex[i] = { ...ex[i], dates: e.target.value }; return { ...f, experience: ex } })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-slate-400" />
                            <textarea rows={3} placeholder="Bullet points (one per line)"
                              value={exp.bullets}
                              onChange={e => setManualForm(f => { const ex = [...f.experience]; ex[i] = { ...ex[i], bullets: e.target.value }; return { ...f, experience: ex } })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-slate-400" />
                            {manualForm.experience.length > 1 && (
                              <button onClick={() => setManualForm(f => ({ ...f, experience: f.experience.filter((_, j) => j !== i) }))}
                                className="text-xs text-red-400 hover:text-red-600 transition">Remove</button>
                            )}
                          </div>
                        ))}
                        {manualForm.experience.length < 5 && (
                          <button onClick={() => setManualForm(f => ({ ...f, experience: [...f.experience, emptyExp()] }))}
                            className="text-xs text-cyan-600 hover:text-cyan-800 transition">+ Add experience</button>
                        )}
                      </div>
                    </div>
                    {/* Education */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Education</p>
                      <div className="space-y-2">
                        {manualForm.education.map((edu, i) => (
                          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                            <input type="text" placeholder="School / University" value={edu.school}
                              onChange={e => setManualForm(f => { const ed = [...f.education]; ed[i] = { ...ed[i], school: e.target.value }; return { ...f, education: ed } })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-slate-400" />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" placeholder="Degree / Field" value={edu.degree}
                                onChange={e => setManualForm(f => { const ed = [...f.education]; ed[i] = { ...ed[i], degree: e.target.value }; return { ...f, education: ed } })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-slate-400" />
                              <input type="text" placeholder="Dates (e.g. 2020–2024)" value={edu.dates}
                                onChange={e => setManualForm(f => { const ed = [...f.education]; ed[i] = { ...ed[i], dates: e.target.value }; return { ...f, education: ed } })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition placeholder-slate-400" />
                            </div>
                            {manualForm.education.length > 1 && (
                              <button onClick={() => setManualForm(f => ({ ...f, education: f.education.filter((_, j) => j !== i) }))}
                                className="text-xs text-red-400 hover:text-red-600 transition">Remove</button>
                            )}
                          </div>
                        ))}
                        {manualForm.education.length < 3 && (
                          <button onClick={() => setManualForm(f => ({ ...f, education: [...f.education, emptyEdu()] }))}
                            className="text-xs text-cyan-600 hover:text-cyan-800 transition">+ Add education</button>
                        )}
                      </div>
                    </div>
                    {/* Skills */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Skills <span className="text-slate-300">(comma-separated)</span></p>
                      <input type="text" placeholder="Python, LangChain, AWS, Docker, PyTorch…"
                        value={manualForm.skills}
                        onChange={e => setManualForm(f => ({ ...f, skills: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                    </div>
                    {/* Certifications */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Certifications</p>
                      <textarea rows={2} placeholder="One per line, e.g. AWS Solutions Architect – Amazon (2024)"
                        value={manualForm.certifications}
                        onChange={e => setManualForm(f => ({ ...f, certifications: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                    </div>
                    {/* Projects */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Projects</p>
                      <textarea rows={2} placeholder="Project names and brief descriptions…"
                        value={manualForm.projects}
                        onChange={e => setManualForm(f => ({ ...f, projects: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                    </div>
                    {/* Recommendations */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Recommendations</p>
                      <textarea rows={2} placeholder="Paste any recommendation text you have…"
                        value={manualForm.recommendations}
                        onChange={e => setManualForm(f => ({ ...f, recommendations: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                    </div>
                    {/* Awards */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">Awards / Honors</p>
                      <textarea rows={2} placeholder="Any awards, honors, or publications…"
                        value={manualForm.awards}
                        onChange={e => setManualForm(f => ({ ...f, awards: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                    </div>
                  </div>
                )}

                {/* Target role + JD (shared) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />Target Role
                    </p>
                    <input type="text" placeholder="e.g. AI Engineer, Product Manager"
                      value={targetRole} onChange={e => setTargetRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />Job Description
                    </p>
                    <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400"
                      placeholder="Paste a job description for a JD fit score…"
                      value={jdText} onChange={e => setJdText(e.target.value)} rows={3} />
                  </div>
                </div>
                {inputMode === 'pdf'
                  ? <AnalyzeBtn onClick={handleProfileAnalyze} disabled={!pdfFile} loading={false} label="Analyze Profile" />
                  : <AnalyzeBtn onClick={handleManualAnalyze} disabled={!buildManualText(manualForm).trim()} loading={false} label="Score My Profile" />
                }
                {profileError && (
                  <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{profileError}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {(profilePhase === 'analyzed' || profilePhase === 'optimizing') && result && (() => {
          const ps = result.parsed_sections
          return (
            <div className="space-y-6">
              <ScoreHero score={result.overall_score} grade={result.grade} verdict={result.overall_verdict} jdFitScore={result.jd_fit_score} />
              {(result.top_strengths.length > 0 || result.top_gaps.length > 0) && (
                <StrengthsGaps strengths={result.top_strengths} gaps={result.top_gaps} />
              )}
              {hasSections(ps) ? (
                <div className="space-y-4">
                  <SectionLabel>Profile Sections</SectionLabel>
                  {ps?.headline && (
                    <SectionFeedbackRow label="Headline"
                      content={<p className="text-sm text-slate-800 font-medium leading-relaxed">{ps.headline}</p>}
                      bucket={getBucket('headline')} copyText={ps.headline}
                      feedbackExtra={result.headline_rewrite ? <HeadlineRewriteInline rewrite={result.headline_rewrite} /> : undefined}
                    />
                  )}
                  {ps?.about && (
                    <SectionFeedbackRow label="About / Summary"
                      content={<p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{ps.about}</p>}
                      bucket={getBucket('about')} copyText={ps.about}
                      feedbackExtra={result.about_tips.length > 0 ? (
                        <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Tips</p>
                          {result.about_tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
                              <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" /><span>{stripBullet(tip)}</span>
                            </div>
                          ))}
                        </div>
                      ) : undefined}
                    />
                  )}
                  {ps?.experience && ps.experience.length > 0 && (
                    <SectionFeedbackRow label="Experience"
                      content={<ExperienceContent entries={ps.experience} />}
                      bucket={getBucket('experience')} copyText={ps.experience.join('\n\n')} />
                  )}
                  {(ps?.inferred_skills?.length || ps?.skills?.length) ? (
                    <SectionFeedbackRow label="Skills"
                      content={
                        ps.inferred_skills?.length
                          ? <div className="flex flex-wrap gap-1.5">
                              {ps.inferred_skills.map((s, i) => (
                                <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 leading-none">{s}</span>
                              ))}
                            </div>
                          : <SkillsContent entries={ps.skills!} />
                      }
                      bucket={getBucket('skills')}
                      copyText={ps.inferred_skills?.length ? ps.inferred_skills.join(', ') : buildSkillsList(ps.skills!).join(', ')} />
                  ) : null}
                  {ps?.education && ps.education.length > 0 && (
                    <SectionFeedbackRow label="Education"
                      content={<EducationContent entries={ps.education} />}
                      bucket={getBucket('education')} copyText={ps.education.join('\n')} />
                  )}
                  {ps?.has_recommendations && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700">Recommendations section detected</p>
                    </div>
                  )}
                </div>
              ) : result.pdf_text ? (
                <div className="space-y-4"><SectionLabel>Extracted Text</SectionLabel><RawTextFallback pdfText={result.pdf_text} /></div>
              ) : null}

              {result.priority_fixes.length > 0 && (
                <div className="space-y-4">
                  <SectionLabel>Priority Fixes</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {result.priority_fixes.map((fix, i) => <FixCard key={i} fix={fix} idx={i} />)}
                  </div>
                </div>
              )}

              {result.pdf_text && (
                <div className="space-y-4">
                  <SectionLabel>Optimize Profile</SectionLabel>
                  {!optimizeResult && profilePhase !== 'optimizing' && (
                    <div className="flex flex-col items-center gap-3 py-6 rounded-xl border border-slate-200 bg-slate-50">
                      <p className="text-sm text-slate-500 text-center max-w-sm">
                        Let AI rewrite your headline, about, experience and skills for maximum recruiter impact.
                      </p>
                      <button onClick={handleOptimize}
                        className="px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold flex items-center gap-2 transition">
                        <Sparkles className="h-4 w-4" />Optimize My Profile
                      </button>
                    </div>
                  )}
                  {profilePhase === 'optimizing' && (
                    <div className="flex items-center justify-center gap-3 py-8 rounded-xl border border-cyan-200 bg-cyan-50">
                      <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                      <span className="text-sm font-medium text-cyan-700">Rewriting your sections…</span>
                    </div>
                  )}
                  {optimizeResult && <InlineOptimizeResults or={optimizeResult} />}
                </div>
              )}

              {profileError && (
                <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{profileError}</span>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── PHOTO TAB ── */}
      <div className={activeTab === 'photo' ? 'space-y-4' : 'hidden'}>
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-semibold text-slate-800">Profile Photo</p>
            {photoPhase === 'done' && photoResult && (
              <span className={`ml-auto text-base font-black ${photoResult.score >= 80 ? 'text-emerald-600' : photoResult.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {photoResult.score}<span className="text-xs font-normal text-slate-400">/100</span>
              </span>
            )}
          </div>

          {photoPhase === 'done' && photoResult ? (
            <>
              <ImageFeedbackRow imageUrl={profileImageUrl ?? undefined} result={photoResult} label="Profile Photo" />
              <div className="flex items-center gap-4">
                <button onClick={() => { setPhotoPhase('idle'); setPhotoResult(null); setProfileImage(null); setProfileImageUrl(null); savePhotoCache(null); clearImageFromDb('photo') }}
                  className="text-xs text-slate-400 hover:text-red-500 transition">Clear</button>
                <button onClick={() => { setPhotoPhase('idle'); setPhotoResult(null); savePhotoCache(null) }}
                  className="text-xs text-slate-400 hover:text-cyan-600 transition">Replace photo →</button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <DropZone accept="image/jpeg,image/png,image/webp" label="Upload your profile photo"
                hint="JPG, PNG, or WebP" icon={Camera} file={profileImage}
                onFile={f => { setProfileImage(f); setPhotoPhase('idle'); setPhotoResult(null); setPhotoError(null) }} />
              <AnalyzeBtn onClick={handlePhotoAnalyze} disabled={!profileImage} loading={photoPhase === 'analyzing'} label="Analyze Photo" />
              {photoError && (
                <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{photoError}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── COVER TAB ── */}
      <div className={activeTab === 'cover' ? 'space-y-4' : 'hidden'}>
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-semibold text-slate-800">Cover Banner</p>
            {coverPhase === 'done' && coverResult && (
              <span className={`ml-auto text-base font-black ${coverResult.score >= 80 ? 'text-emerald-600' : coverResult.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {coverResult.score}<span className="text-xs font-normal text-slate-400">/100</span>
              </span>
            )}
          </div>

          {coverPhase === 'done' && coverResult ? (
            <>
              <ImageFeedbackRow imageUrl={coverImageUrl ?? undefined} result={coverResult} label="Cover Banner" isBanner />
              <div className="flex items-center gap-4">
                <button onClick={() => { setCoverPhase('idle'); setCoverResult(null); setCoverImage(null); setCoverImageUrl(null); saveCoverCache(null); clearImageFromDb('cover') }}
                  className="text-xs text-slate-400 hover:text-red-500 transition">Clear</button>
                <button onClick={() => { setCoverPhase('idle'); setCoverResult(null); saveCoverCache(null) }}
                  className="text-xs text-slate-400 hover:text-cyan-600 transition">Replace banner →</button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <DropZone accept="image/jpeg,image/png,image/webp" label="Upload your cover / banner"
                hint="JPG, PNG, or WebP" icon={Upload} file={coverImage}
                onFile={f => { setCoverImage(f); setCoverPhase('idle'); setCoverResult(null); setCoverError(null) }} />
              <AnalyzeBtn onClick={handleCoverAnalyze} disabled={!coverImage} loading={coverPhase === 'analyzing'} label="Analyze Cover" />
              {coverError && (
                <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{coverError}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
