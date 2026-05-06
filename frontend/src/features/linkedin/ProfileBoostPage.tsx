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
          <div key={step.id} className={`flex items-center gap-3 transition-all ${
            s === 'waiting' ? 'opacity-30' : ''
          }`}>
            <div className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full border-2 transition-all
              ${s === 'done'   ? 'border-emerald-400 bg-emerald-50' :
                s === 'active' ? 'border-cyan-500 bg-cyan-50' :
                                 'border-slate-200 bg-white'}">
              {s === 'done'
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                : s === 'active'
                  ? <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
                  : <span className="h-2 w-2 rounded-full bg-slate-200" />
              }
            </div>
            <span className={`text-sm font-medium ${
              s === 'done'   ? 'text-emerald-600' :
              s === 'active' ? 'text-cyan-700 font-semibold' :
                               'text-slate-400'
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
  const currentSet = new Set(
    current.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, ''))
  )
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
        file     ? 'border-emerald-300 bg-emerald-50' :
                   'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
      }`}
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

// ─── Overall badge ────────────────────────────────────────────────────────────

function OverallBadge({ score, grade, verdict }: { score: number; grade: string; verdict: string }) {
  const [color, bg] =
    score >= 80 ? ['text-emerald-600', 'bg-emerald-50 border-emerald-200'] :
    score >= 65 ? ['text-cyan-600',    'bg-cyan-50 border-cyan-200']       :
    score >= 50 ? ['text-amber-600',   'bg-amber-50 border-amber-200']     :
                  ['text-red-600',     'bg-red-50 border-red-200']
  return (
    <div className={`rounded-2xl border ${bg} px-5 py-4 flex items-center gap-4`}>
      <div className={`text-5xl sm:text-6xl font-black tabular-nums shrink-0 ${color}`}>{score}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">/ 100</p>
        <p className={`text-lg sm:text-xl font-bold ${color}`}>{grade}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{verdict}</p>
      </div>
    </div>
  )
}

// ─── Bucket card ──────────────────────────────────────────────────────────────

function BucketCard({ bucket }: { bucket: BucketScore }) {
  const [open, setOpen] = useState(false)
  const evaluated = bucket.evaluated !== false
  const borderColor = !evaluated ? 'border-slate-200' :
    bucket.pct >= 80 ? 'border-emerald-200' : bucket.pct >= 60 ? 'border-amber-200' : 'border-red-200'
  const textColor = !evaluated ? 'text-slate-400' :
    bucket.pct >= 80 ? 'text-emerald-600' : bucket.pct >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className={`rounded-xl border ${borderColor} bg-white p-3.5 space-y-2`}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-slate-800">{bucket.label}</span>
            {evaluated
              ? <span className={`text-sm font-bold shrink-0 ${textColor}`}>{bucket.score}/{bucket.max}</span>
              : <span className="text-xs text-slate-400 italic shrink-0">Not evaluated</span>}
          </div>
          {evaluated ? <ScoreBar pct={bucket.pct} /> : <p className="text-xs text-slate-400">{bucket.note || 'Upload photos to evaluate'}</p>}
        </div>
        <button className="text-slate-400 hover:text-slate-700 shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {bucket.strengths.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Strengths</p>
              {bucket.strengths.map((s, i) => (
                <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed"><span className="text-emerald-500 shrink-0">✓</span>{s}</p>
              ))}
            </div>
          )}
          {bucket.gaps.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Gaps</p>
              {bucket.gaps.map((g, i) => (
                <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed"><span className="text-red-400 shrink-0">✗</span>{g}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Priority fix ─────────────────────────────────────────────────────────────

function FixCard({ fix, idx }: { fix: PriorityFix; idx: number }) {
  const c = fix.impact === 'High' ? 'bg-red-100 text-red-700' : fix.impact === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold shrink-0">{idx + 1}</span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{fix.section}</span>
        <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${c}`}>{fix.impact}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800">{fix.issue}</p>
      <div className="flex items-start gap-1.5 text-xs text-slate-600">
        <span className="text-cyan-500 shrink-0 mt-0.5">→</span><span>{fix.fix}</span>
      </div>
    </div>
  )
}

// ─── Image panel ──────────────────────────────────────────────────────────────

function ImagePanel({ label, result }: { label: string; result: ImageResult }) {
  const color = result.score >= 80 ? 'text-emerald-600' : result.score >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="space-y-1.5 pb-3 last:pb-0 border-b last:border-0 border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{result.score}/100</span>
      </div>
      {result.suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
          <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" /><span>{s}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({ label, text, score, max }: {
  label: string; text: string | string[] | undefined; score?: number; max?: number
}) {
  const [open, setOpen] = useState(false)
  if (!text || (Array.isArray(text) && text.length === 0)) return null
  const displayText = Array.isArray(text) ? text.join('\n\n') : text
  const pct = score !== undefined && max ? Math.round(score / max * 100) : undefined
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          {score !== undefined && max !== undefined && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
              pct! >= 80 ? 'bg-emerald-100 text-emerald-700' : pct! >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>{score}/{max}</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {pct !== undefined && <div className="pt-3 pb-2"><ScoreBar pct={pct} /></div>}
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mt-2">{displayText}</p>
        </div>
      )}
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

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-600 transition px-2 py-1 rounded-lg hover:bg-cyan-50">
      {copied
        ? <><ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600">Copied!</span></>
        : <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>}
    </button>
  )
}

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

// ─── Main page ────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 2500

export default function ProfileBoostPage() {
  const [phase,          setPhase]          = useState<Phase>('input')
  const [pdfFile,        setPdfFile]        = useState<File | null>(null)
  const [profileImage,   setProfileImage]   = useState<File | null>(null)
  const [coverImage,     setCoverImage]     = useState<File | null>(null)
  const [targetRole,     setTargetRole]     = useState('')
  const [jdText,         setJdText]         = useState('')
  const [currentStep,    setCurrentStep]    = useState('extract')
  const [result,         setResult]         = useState<BoostResult | null>(null)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  // ── Submit → background job ───────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!pdfFile) return
    setError(null)
    setResult(null)
    setOptimizeResult(null)
    setCurrentStep('extract')
    setPhase('analyzing')

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

    // Poll for progress
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/linkedin-boost/status/${jobId}`, { credentials: 'include' })
        const txt = await res.text()
        let data: Record<string, unknown>
        try { data = JSON.parse(txt) } catch { throw new Error('Invalid server response') }

        if (!res.ok) throw new Error((data.detail as string) || 'Analysis failed')

        const status = data.status as string
        const step   = data.step   as string | undefined

        if (step) setCurrentStep(step)

        if (status === 'done') {
          stopPolling()
          setResult(data.result as BoostResult)
          setPhase('analyzed')
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
          setOptimizeResult(data.result as OptimizeResult)
          setPhase('optimized')
        }
      } catch (e: unknown) {
        stopPolling()
        setError(e instanceof Error ? e.message : String(e))
        setPhase('analyzed')
      }
    }, POLL_INTERVAL)
  }, [result, targetRole])

  const handleReanalyze = () => { stopPolling(); setPhase('input'); setResult(null); setOptimizeResult(null); setError(null) }
  const handleReset     = () => { stopPolling(); setPhase('input'); setResult(null); setOptimizeResult(null); setError(null); setPdfFile(null); setProfileImage(null); setCoverImage(null); setTargetRole(''); setJdText('') }
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
          {/* LEFT — form */}
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

          {/* RIGHT — empty state */}
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
  // PHASE: ANALYZING — step-by-step progress
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'analyzing') {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Analyzing your profile…</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-6">
          {/* LEFT — steps */}
          <Card className="p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Progress</p>
            <StepList currentStep={currentStep} />
          </Card>

          {/* RIGHT — illustration */}
          <Card className="flex flex-col items-center justify-center gap-5 py-12 text-center min-h-[320px]">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
              <Sparkles className="h-8 w-8 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-700">
                {ANALYZE_STEPS.find(s => s.id === currentStep)?.label ?? 'Processing…'}
              </p>
              <p className="text-xs text-slate-400 mt-2 max-w-[220px] mx-auto leading-relaxed">
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

    return (
      <div className="space-y-5">
        <PageHeader onReanalyze={handleReanalyze} onReset={handleReset} />
        <OverallBadge score={result.overall_score} grade={result.grade} verdict={result.overall_verdict} />

        {result.jd_fit_score > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JD Fit Score</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-lg font-black ${result.jd_fit_score >= 80 ? 'text-emerald-600' : result.jd_fit_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{result.jd_fit_score}</span>
              <div className="w-24"><ScoreBar pct={result.jd_fit_score} /></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — current sections */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Profile</p>
            {hasSections(ps) ? (
              <>
                <SectionBlock label="Headline"        text={ps?.headline}   score={getBucket('headline')?.score}    max={getBucket('headline')?.max} />
                <SectionBlock label="About / Summary" text={ps?.about}      score={getBucket('about')?.score}      max={getBucket('about')?.max} />
                <SectionBlock label="Experience"      text={ps?.experience} score={getBucket('experience')?.score}  max={getBucket('experience')?.max} />
                <SectionBlock label="Skills"          text={ps?.skills}     score={getBucket('skills')?.score}     max={getBucket('skills')?.max} />
                <SectionBlock label="Education"       text={ps?.education}  score={getBucket('completeness')?.score} max={getBucket('completeness')?.max} />
                {ps?.has_recommendations && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700">Recommendations section detected</p>
                  </div>
                )}
              </>
            ) : (
              <RawTextFallback pdfText={result.pdf_text || ''} />
            )}
          </div>

          {/* RIGHT — feedback */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Feedback</p>

            {result.priority_fixes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Priority Fixes</p>
                {result.priority_fixes.map((fix, i) => <FixCard key={i} fix={fix} idx={i} />)}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Bucket Scores</p>
              {result.buckets.map(b => <BucketCard key={b.id} bucket={b} />)}
            </div>

            {result.headline_rewrite && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-cyan-600" />
                  <p className="text-sm font-semibold text-slate-800">Headline Rewrite</p>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Current</p>
                    <p className="text-xs text-slate-700">{result.headline_rewrite.current}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Improved</p>
                    <p className="text-xs text-slate-800 font-medium">{result.headline_rewrite.improved}</p>
                  </div>
                  <p className="text-xs text-slate-400 italic">{result.headline_rewrite.reason}</p>
                </div>
              </Card>
            )}

            {result.about_tips.length > 0 && (
              <Card className="p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-800">About Section Tips</p>
                {result.about_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" /><span>{tip}</span>
                  </div>
                ))}
              </Card>
            )}

            {(result.profile_image || result.cover_image || result.visual_notes.length > 0) && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-cyan-600" />
                  <p className="text-sm font-semibold text-slate-800">Visual Analysis</p>
                </div>
                {result.profile_image && <ImagePanel label="Profile Photo"  result={result.profile_image} />}
                {result.cover_image   && <ImagePanel label="Cover / Banner" result={result.cover_image} />}
                {result.visual_notes.map((n, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" /><span>{n}</span>
                  </div>
                ))}
              </Card>
            )}

            {(result.top_strengths.length > 0 || result.top_gaps.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {result.top_strengths.length > 0 && (
                  <Card className="p-3 space-y-2">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Top Strengths</p>
                    {result.top_strengths.map((s, i) => (
                      <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed"><span className="text-emerald-500 shrink-0">✓</span>{s}</p>
                    ))}
                  </Card>
                )}
                {result.top_gaps.length > 0 && (
                  <Card className="p-3 space-y-2">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Top Gaps</p>
                    {result.top_gaps.map((g, i) => (
                      <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed"><span className="text-red-400 shrink-0">✗</span>{g}</p>
                    ))}
                  </Card>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <Button onClick={handleOptimize} disabled={phase === 'optimizing'}
                className="w-full py-3 text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500">
                {phase === 'optimizing'
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Optimizing…</>
                  : <><Sparkles className="h-4 w-4" />Optimize Profile</>}
              </Button>
              <p className="text-xs text-slate-400 text-center mt-2">Rewrites headline, about, experience and skills</p>
              {error && (
                <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2 mt-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

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
      <div className="space-y-5">
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

        <OverallBadge score={result.overall_score} grade={result.grade} verdict={result.overall_verdict} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — current */}
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

          {/* RIGHT — optimized */}
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
