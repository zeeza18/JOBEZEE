import React, { useLayoutEffect, useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LogoBrand from '../components/common/LogoBrand'
import {
  ArrowRight, CheckCircle2, ChevronRight, Bookmark,
  Mic2, PartyPopper, Play, Square, Search, Send,
  Shield, Star, Target, Trophy, Wand2, Zap,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const PLATFORM_TICKER_ITEMS = ['Indeed', 'LinkedIn', 'Glassdoor', 'ZipRecruiter', 'Workday']

// ─── Full-screen Confetti Burst ───────────────────────────────────────────────
function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pieces = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: ['#06b6d4','#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#f97316'][i % 8],
    x: 10 + Math.random() * 80,
    size: 6 + Math.random() * 9,
    isCircle: i % 3 === 0,
    isRibbon: i % 5 === 0,
  })), [])

  useEffect(() => {
    if (!containerRef.current) return
    const els = containerRef.current.querySelectorAll<HTMLElement>('.cb-piece')
    gsap.fromTo(els,
      { y: -20, x: 0, rotation: 0, opacity: 1, scale: 1 },
      {
        y:        () => window.innerHeight * (0.6 + Math.random() * 0.5),
        x:        () => (Math.random() - 0.5) * window.innerWidth * 0.9,
        rotation: () => (Math.random() - 0.5) * 900,
        opacity:  0,
        scale:    () => 0.3 + Math.random() * 0.8,
        duration: () => 2.2 + Math.random() * 1.8,
        delay:    () => Math.random() * 0.7,
        ease:     'power2.out',
      }
    )
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden flex justify-center">
      {pieces.map(p => (
        <div
          key={p.id}
          className="cb-piece absolute"
          style={{
            top: 0,
            left: `${p.x}%`,
            width:  p.size,
            height: p.isRibbon ? p.size * 3.5 : p.size,
            borderRadius: p.isCircle ? '50%' : '2px',
            background: p.color,
            opacity: 1,
          }}
        />
      ))}
    </div>
  )
}

// ─── Mockup: Jobs ────────────────────────────────────────────────────────────
const JOBS_DATA = [
  { t: 'Senior ML Engineer',     c: 'Google DeepMind', loc: 'Remote · USA',       s: '97%', sal: '$180k-$240k', sc: 'text-cyan-600 bg-cyan-50'     },
  { t: 'Staff Backend Engineer', c: 'Stripe',           loc: 'New York / Remote',  s: '91%', sal: '$160k-$210k', sc: 'text-sky-600 bg-sky-50'       },
  { t: 'AI Product Manager',     c: 'OpenAI',           loc: 'San Francisco',      s: '88%', sal: '$200k-$280k', sc: 'text-violet-600 bg-violet-50' },
  { t: 'Data Science Lead',      c: 'Spotify',          loc: 'Stockholm · Remote', s: '85%', sal: '€130k-€170k', sc: 'text-emerald-600 bg-emerald-50'},
]

function JobsMockup() {
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const toggle = useCallback((title: string) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }, [])

  return (
    <div className="mock-shell overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 w-full max-w-lg">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 rounded border border-slate-200 bg-white px-3 py-0.5 text-center text-[11px] text-slate-400">
          jobezee.org/jobs
        </div>
      </div>
      {/* Live stats bar */}
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-1.5">
        <span className="text-[10px] text-slate-400">Pulled <b className="text-slate-700">247</b></span>
        <span className="text-[10px] text-slate-400">Saved <b className="text-sky-600">{saved.size}</b></span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-cyan-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" /> Live
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        {/* Search bar */}
        <div className="mock-card-0 flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 py-2">
          <Search className="h-4 w-4 text-cyan-500 shrink-0" />
          <span className="truncate text-xs text-slate-500">Scanning Indeed · LinkedIn · Glassdoor · ZipRecruiter · Workday…</span>
          <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shrink-0" />
        </div>
        {/* Job cards */}
        {JOBS_DATA.map((j, i) => {
          const isSaved = saved.has(j.t)
          return (
            <div key={j.t}
              className={`mock-card-${i + 1} group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 shadow-sm transition-all duration-150 cursor-default
                hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl hover:shadow-slate-200/70
                ${isSaved
                  ? 'border-sky-200 bg-sky-50/40'
                  : 'border-slate-100 bg-white'}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{j.t}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-400">{j.c} · {j.loc}</p>
              </div>
              <div className="flex max-w-[44%] shrink-0 items-center justify-end gap-2">
                <span className="hidden text-[10px] text-slate-400 md:block">{j.sal}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${j.sc}`}>{j.s}</span>
                {/* Save button */}
                <button
                  onClick={() => toggle(j.t)}
                  className={`flex h-6 w-6 items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95
                    ${isSaved ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400 hover:bg-sky-50 hover:text-sky-500'}`}
                  title={isSaved ? 'Unsave' : 'Save job'}
                >
                  <Bookmark className={`h-3.5 w-3.5 transition-all ${isSaved ? 'fill-sky-500 stroke-sky-500' : ''}`} />
                </button>
              </div>
            </div>
          )
        })}
        <p className="text-center text-[9px] text-slate-300 pt-0.5">Tap <Bookmark className="inline h-2.5 w-2.5 -mt-px" /> to save a job</p>
      </div>
    </div>
  )
}

// ─── Mockup: Tailor ──────────────────────────────────────────────────────────
const TAILOR_JOBS = [
  {
    title: 'AI Engineer',
    company: 'NVIDIA',
    score: 92,
    keywords: ['PyTorch', 'Computer Vision', 'MLOps', 'CUDA', 'Model Deployment', 'Vector Search', 'A/B Testing'],
    bullets: [
      'Built production AI pipelines for model training, evaluation, and low-latency deployment',
      'Optimized inference workflows across GPU-backed services while improving reliability and cost efficiency',
    ],
  },
  {
    title: 'Sales Lead',
    company: 'Salesforce',
    score: 89,
    keywords: ['Enterprise Sales', 'Pipeline Growth', 'CRM', 'Forecasting', 'Negotiation', 'Revenue Strategy', 'Team Leadership'],
    bullets: [
      'Led enterprise sales pipeline strategy, improving forecast accuracy and accelerating deal velocity',
      'Coached account executives on discovery, negotiation, and multi-stakeholder closing motions',
    ],
  },
  {
    title: 'Finance Manager',
    company: 'JPMorgan Chase',
    score: 94,
    keywords: ['FP&A', 'Budgeting', 'Forecasting', 'Variance Analysis', 'P&L Management', 'Financial Modeling', 'Stakeholder Reporting'],
    bullets: [
      'Managed monthly forecasting and variance analysis to guide budget decisions across business units',
      'Built financial models and executive reports that improved planning accuracy and margin visibility',
    ],
  },
]

function TailorMockup() {
  const [jobIdx, setJobIdx] = useState(0)
  const job = TAILOR_JOBS[jobIdx]

  const handleTailor = useCallback(() => {
    setJobIdx(current => {
      const choices = TAILOR_JOBS.map((_, index) => index).filter(index => index !== current)
      return choices[Math.floor(Math.random() * choices.length)]
    })
  }, [])

  return (
    <div className="mock-shell overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 w-full max-w-lg">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 rounded border border-slate-200 bg-white px-3 py-0.5 text-center text-[11px] text-slate-400">
          jobezee.org/tailor
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-violet-100 p-1.5"><Wand2 className="h-4 w-4 text-violet-600" /></div>
            <div>
              <p className="text-xs font-bold text-slate-800">{job.title} · {job.company}</p>
              <p className="text-[10px] text-slate-400">AI tailoring in progress…</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-cyan-500 score-number">{job.score}</p>
            <p className="text-[10px] text-slate-400">ATS Score</p>
          </div>
        </div>
        {/* Score bar */}
        <div className="rounded-full bg-slate-100 h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 transition-[width] duration-700 ease-out"
            style={{ width: `${job.score}%` }}
          />
        </div>
        <button
          type="button"
          onClick={handleTailor}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-violet-100 transition hover:-translate-y-px hover:shadow-lg"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Tailor
        </button>
        {/* Keyword chips */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Keywords added by AI</p>
          <div className="flex flex-wrap gap-1.5">
            {job.keywords.map((k) => (
              <span key={k} className="keyword-chip rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">{k}</span>
            ))}
          </div>
        </div>
        {/* Bullets */}
        <div className="space-y-1.5">
          {job.bullets.map((b) => (
            <div key={b} className="tailor-bullet flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-snug text-slate-600">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Mockup: Apply ───────────────────────────────────────────────────────────
const APPLY_JOBS = [
  { t: 'Senior ML Engineer',     c: 'Microsoft',        loc: 'Redmond · Remote' },
  { t: 'Staff Backend Engineer', c: 'Stripe',           loc: 'New York'      },
  { t: 'AI Product Manager',     c: 'OpenAI',           loc: 'Remote'        },
]

function MicrosoftLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`grid grid-cols-2 gap-0.5 ${className}`} aria-label="Microsoft">
      <span className="block bg-[#f25022]" />
      <span className="block bg-[#7fba00]" />
      <span className="block bg-[#00a4ef]" />
      <span className="block bg-[#ffb900]" />
    </span>
  )
}

function ApplyMockup() {
  const [jobIdx, setJobIdx]   = useState(0)
  const [applied, setApplied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [count, setCount]     = useState(0)

  const job = APPLY_JOBS[jobIdx]

  const handleApply = useCallback(() => {
    if (applied || loading) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setApplied(true)
      setCount(c => c + 1)
    }, 900)
  }, [applied, loading])

  const handleNext = useCallback(() => {
    setApplied(false)
    setLoading(false)
    setJobIdx(i => (i + 1) % APPLY_JOBS.length)
  }, [])

  return (
    <div className="mock-shell overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 w-full max-w-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 rounded border border-slate-200 bg-white px-3 py-0.5 text-center text-[11px] text-slate-400">
          jobezee.org/apply
        </div>
        {count > 0 && (
          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">{count} sent</span>
        )}
      </div>
      <div className="p-5 text-center space-y-4">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all duration-500 ${applied ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-200' : 'border border-slate-100 bg-white shadow-slate-200'}`}>
          {applied ? <CheckCircle2 className="h-7 w-7 text-white" /> : <MicrosoftLogo className="h-7 w-7" />}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{job.t}</p>
          <p className="text-xs text-slate-400">{job.c} · {job.loc}</p>
        </div>
        <div className="space-y-1.5 text-left">
          {[
            { l: 'Name & Contact',  v: 'Pre-filled from profile' },
            { l: 'Resume',          v: 'AI-tailored (92% ATS score)' },
            { l: 'Cover Letter',    v: 'Generated & attached' },
          ].map((r) => (
            <div key={r.l} className="apply-row flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-[11px] text-slate-500">{r.l}</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />{r.v}
              </span>
            </div>
          ))}
        </div>

        {!applied ? (
          <button
            onClick={handleApply}
            className="apply-btn w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3 text-sm font-bold text-white shadow-md shadow-cyan-200 transition hover:shadow-lg hover:-translate-y-px active:scale-95 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting…
              </span>
            ) : 'Apply Now - 1 Click'}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="sent-badge flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">Application Submitted!</span>
            </div>
            <button onClick={handleNext} className="w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">
              Try next job →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mockup: Track ───────────────────────────────────────────────────────────
const COL_META = [
  { label: 'Applied',      color: 'border-t-sky-400',     badge: 'bg-sky-100 text-sky-700'         },
  { label: 'R1 Interview', color: 'border-t-violet-400',  badge: 'bg-violet-100 text-violet-700'   },
  { label: 'R2 Interview', color: 'border-t-cyan-500',    badge: 'bg-cyan-100 text-cyan-700'       },
  { label: 'Offer',        color: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
]
const INIT_CARDS = [
  { id: 'a', t: 'Backend Eng',   c: 'Stripe',          col: 0 },
  { id: 'b', t: 'Data Lead',     c: 'Spotify',         col: 0 },
  { id: 'c', t: 'ML Engineer',   c: 'Hugging Face',    col: 1 },
  { id: 'd', t: 'Product Mgr',   c: 'OpenAI',          col: 1 },
  { id: 'e', t: 'Senior ML Eng', c: 'Google DeepMind', col: 2 },
  { id: 'f', t: 'Staff Eng',     c: 'Anthropic',       col: 3 },
]

function TrackMockup() {
  const [cards, setCards] = useState(INIT_CARDS)
  const advance  = useCallback((id: string) => setCards(p => p.map(c => c.id === id && c.col < 3 ? { ...c, col: c.col + 1 } : c)), [])
  const reset    = useCallback(() => setCards(INIT_CARDS), [])
  const offerCnt = cards.filter(c => c.col === 3).length
  const cols     = COL_META.map((m, ci) => ({ ...m, cards: cards.filter(c => c.col === ci) }))

  return (
    <div className="mock-shell overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 w-full max-w-2xl">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 rounded border border-slate-200 bg-white px-3 py-0.5 text-center text-[11px] text-slate-400">
          jobezee.org/applications
        </div>
        <button onClick={reset} className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-400 hover:bg-slate-50 transition">Reset</button>
      </div>
      {offerCnt >= 2 && (
        <div className="flex items-center justify-center gap-1.5 bg-emerald-50 border-b border-emerald-100 py-1.5">
          <PartyPopper className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[11px] font-bold text-emerald-700">{offerCnt} offers! You're crushing it.</span>
        </div>
      )}
      <div className="overflow-x-auto -mx-1 px-1">
      <div className="grid grid-cols-4 gap-2 p-3 min-w-[380px]">
        {cols.map((col, ci) => (
          <div key={col.label} className={`track-col-${ci} rounded-xl border-t-2 border border-slate-100 ${col.color} bg-slate-50/50 p-2`}>
            <div className="mb-2 flex items-center justify-between px-0.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none">{col.label}</p>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${col.badge}`}>{col.cards.length}</span>
            </div>
            <div className="space-y-1.5 min-h-[28px]">
              {col.cards.map(j => (
                <div key={j.id} onClick={() => advance(j.id)}
                  className={`group rounded-lg border px-2 py-1.5 shadow-sm transition-all cursor-pointer hover:shadow-md hover:-translate-y-px select-none
                    ${ci === 3 ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100 bg-white'}`}>
                  <p className="text-[10px] font-semibold text-slate-800 leading-snug">{j.t}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{j.c}</p>
                  {ci < 3
                    ? <p className="text-[8px] text-slate-300 mt-0.5 group-hover:text-cyan-400 transition-colors">tap to advance →</p>
                    : <p className="text-[8px] text-emerald-500 mt-0.5 font-semibold">Offer ✓</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>
      <p className="text-center text-[9px] text-slate-300 pb-2">Tap any card to move it forward</p>
    </div>
  )
}

// ─── Wave bar delays for natural randomness ──────────────────────────────────
const WAVE_DELAYS = [0, 0.15, 0.3, 0.08, 0.22, 0.37, 0.12, 0.28, 0.05, 0.18, 0.33, 0.1, 0.25, 0.42, 0.07, 0.2]
const WAVE_HEIGHTS = [10, 14, 18, 12, 16, 20, 13, 17, 11, 15, 19, 12, 16, 10, 18, 14]

// ─── Mockup: AI Interview Coach ───────────────────────────────────────────────
function InterviewMockup() {
  const [active, setActive] = useState(false)
  const [secs, setSecs]     = useState(0)

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div className="mock-shell overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 w-full max-w-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 rounded border border-slate-200 bg-white px-3 py-0.5 text-center text-[11px] text-slate-400">
          jobezee.org/interview
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Sophia avatar + info */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src="/sophia.png"
              alt="AI Interviewer"
              className="h-14 w-14 rounded-full object-cover object-top shadow-md ring-2 ring-cyan-200"
            />
            {active && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">AI Interview Coach</p>
            <p className="text-[11px] text-slate-400">{active ? 'Voice Mode · Active' : 'Ready to start'}</p>
          </div>
          <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">Behavioural</span>
        </div>

        {/* Question */}
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 px-4 py-3">
          <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide mb-1.5">Question 2 of 5</p>
          <p className="text-xs leading-relaxed text-slate-700">
            "Tell me about a time you led a project under tight deadlines. How did you prioritise?"
          </p>
        </div>

        {/* Waveform / Start button */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors
            ${active ? 'bg-cyan-500 shadow-cyan-200' : 'bg-slate-200'}`}>
            <Mic2 className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
          </div>

          <div className="flex-1">
            <p className="text-[11px] font-semibold text-slate-700">{active ? 'Listening…' : 'Press Start'}</p>
            {/* Animated waveform bars */}
            <div className="mt-1.5 flex items-center gap-[3px]" style={{ height: 20 }}>
              {WAVE_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-full origin-bottom transition-colors
                    ${active ? 'bg-cyan-400' : 'bg-slate-200'}`}
                  style={{
                    height: h,
                    animation: active
                      ? `wave-bar ${0.6 + (i % 4) * 0.1}s ${WAVE_DELAYS[i]}s ease-in-out infinite`
                      : 'none',
                    transform: active ? undefined : 'scaleY(0.25)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <span className="shrink-0 font-mono text-sm font-bold text-slate-700 tabular-nums">
            {mm}:{ss}
          </span>
        </div>

        {/* Start / Stop */}
        <button
          onClick={() => { setActive(a => !a); if (active) setSecs(0) }}
          className={`notification-badge flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold tracking-wide transition-all hover:-translate-y-px active:scale-95
            ${active
              ? 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:shadow-md'
              : 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-200 hover:shadow-lg hover:shadow-cyan-200'}`}
        >
          {active
            ? <><Square className="h-3.5 w-3.5 fill-slate-400 stroke-slate-400" /> End Session</>
            : <><Play  className="h-3.5 w-3.5 fill-white stroke-white" /> Start Practice Session</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Mockup: Celebrate ───────────────────────────────────────────────────────
function CelebrateMockup({ onCelebrate }: { onCelebrate: () => void }) {
  const [burst, setBurst] = useState(false)

  const trigger = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setBurst(true)
    onCelebrate()
    setTimeout(() => setBurst(false), 200)
  }, [onCelebrate])

  return (
    <div className="mock-shell relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 w-full max-w-sm p-6 text-center space-y-4">
      {/* GSAP-driven confetti pieces (scroll anim) */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="confetti-piece absolute pointer-events-none"
          style={{
            width: 8, height: 8,
            borderRadius: i % 3 === 0 ? '50%' : 2,
            background: ['#06b6d4','#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444'][i % 6],
            left: `${10 + (i * 73) % 80}%`,
            top: `${5 + (i * 47) % 60}%`,
            opacity: 0,
          }}
        />
      ))}

      {/* Clickable trophy - triggers full-screen burst */}
      <button
        type="button"
        onClick={trigger}
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-200 transition-transform active:scale-90 hover:scale-105 ${burst ? 'scale-90' : ''}`}
        title="Click to celebrate!"
      >
        <Trophy className="h-8 w-8 text-white" />
      </button>

      <div>
        <p className="text-xl font-black text-slate-900">Offer Received!</p>
        <p className="text-sm text-slate-500 mt-0.5">Senior ML Engineer · Google DeepMind</p>
      </div>
      <div className="offer-card rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left space-y-1.5">
        {[
          { l: 'Base Salary', v: '$220,000 / yr' },
          { l: 'Equity',      v: '$400k RSU (4yr)' },
          { l: 'Bonus',       v: '20% annual target' },
          { l: 'Start Date',  v: 'June 16, 2026' },
        ].map((r) => (
          <div key={r.l} className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">{r.l}</span>
            <span className="text-[11px] font-bold text-emerald-700">{r.v}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
        <span className="text-xs text-slate-500 ml-1">JobEzee got me here</span>
      </div>
      <p className="flex items-center justify-center gap-1 text-[9px] text-slate-300">
        <Trophy className="h-2.5 w-2.5" />
        Tap the trophy to celebrate
      </p>
    </div>
  )
}

// ─── Scene wrapper ────────────────────────────────────────────────────────────
function Scene({
  id, label, headline, sub, accent,
  mockup, reverse = false,
}: {
  id: string
  label: string
  headline: string
  sub: string
  accent: string
  mockup: React.ReactNode
  reverse?: boolean
}) {
  return (
    <section
      id={id}
      className={`scene scene-${id} relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-4 sm:px-6 py-12 md:py-20`}
    >
      {/* Soft bg blob */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-32 ${reverse ? 'right-0' : 'left-0'} h-[600px] w-[600px] rounded-full bg-cyan-50/60 blur-3xl`} />
      </div>

      <div className={`relative mx-auto flex w-full max-w-6xl flex-col items-center gap-8 md:gap-12 lg:flex-row lg:gap-20 ${reverse ? 'lg:flex-row-reverse' : ''}`}>
        {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          <span className={`s-label inline-block rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${accent}`}>
            {label}
          </span>
          <h2 className="s-head mt-3 sm:mt-4 text-3xl sm:text-4xl font-black leading-[1.1] tracking-tight text-slate-900 md:text-5xl"
            dangerouslySetInnerHTML={{ __html: headline }} />
          <p className="s-desc mx-auto mt-3 sm:mt-5 max-w-md text-sm sm:text-base md:text-lg leading-relaxed text-slate-500 lg:mx-0">{sub}</p>
        </div>
        {/* Mockup */}
        <div className="s-mockup flex w-full flex-1 items-center justify-center overflow-hidden">
          {mockup}
        </div>
      </div>
    </section>
  )
}

const HERO_DASHBOARD_JOBS = [
  { t: 'Senior ML Engineer',     c: 'Google DeepMind', loc: 'Remote · USA',       sal: '$180k-$240k', status: 'New' },
  { t: 'Staff Backend Engineer', c: 'Stripe',          loc: 'NY / Remote',        sal: '$160k-$210k', status: 'Saved' },
  { t: 'AI Product Manager',     c: 'OpenAI',          loc: 'San Francisco',      sal: '$200k-$280k', status: 'Applied' },
  { t: 'Data Science Lead',      c: 'Spotify',         loc: 'Stockholm · Remote', sal: '€130k-€170k', status: 'New' },
]

const HERO_DASHBOARD_TABS = ['Dashboard', 'Jobs', 'Tailor', 'Apply', 'Interview']
const HERO_DEMO_FLOW = ['Dashboard', 'Jobs', 'Tailor', 'Apply', 'Interview'] as const
const HERO_AUTO_STEP_MS = 4200
const HERO_USER_IDLE_MS = 12000
const HERO_DEMO_MESSAGES: Record<string, string> = {
  Dashboard: 'Live overview',
  Jobs: 'Finding matched jobs',
  Tailor: 'Rewriting resume',
  Apply: 'Preparing application',
  Interview: 'Practicing with Sophia',
}
const HERO_STATUS_ORDER = ['New', 'Saved', 'Applied', 'Interview'] as const

function heroStatusStyle(status: string) {
  if (status === 'Saved') return 'bg-sky-50 text-sky-700 border-sky-200'
  if (status === 'Applied') return 'bg-violet-50 text-violet-700 border-violet-200'
  if (status === 'Interview') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-cyan-50 text-cyan-700 border-cyan-200'
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const previousValueRef = useRef(value)

  useEffect(() => {
    const from = previousValueRef.current
    previousValueRef.current = value
    const delta = value - from
    if (delta === 0) {
      setDisplay(value)
      return
    }

    let frame = 0
    const frames = 28
    const timer = window.setInterval(() => {
      frame += 1
      const progress = 1 - Math.pow(1 - frame / frames, 3)
      setDisplay(Math.round(from + delta * progress))

      if (frame >= frames) {
        window.clearInterval(timer)
        setDisplay(value)
      }
    }, 20)

    return () => window.clearInterval(timer)
  }, [value])

  return <>{display}</>
}

function HeroDashboardMockup() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [jobs, setJobs] = useState(HERO_DASHBOARD_JOBS)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set(['Staff Backend Engineer']))
  const [tailored, setTailored] = useState(false)
  const [applied, setApplied] = useState(false)
  const activeTabRef = useRef(activeTab)
  const lastInteractionRef = useRef(0)

  const applyDemoState = useCallback((tab: string) => {
    if (tab === 'Dashboard') {
      setJobs(HERO_DASHBOARD_JOBS)
      setSavedJobs(new Set(['Staff Backend Engineer']))
      setTailored(false)
      setApplied(false)
    }

    if (tab === 'Jobs') {
      setSavedJobs(new Set(['Senior ML Engineer', 'Staff Backend Engineer']))
    }

    if (tab === 'Tailor') {
      setTailored(true)
    }

    if (tab === 'Apply') {
      setApplied(true)
    }

    if (tab === 'Interview') {
      setJobs(prev => prev.map(job => (
        job.t === 'AI Product Manager' ? { ...job, status: 'Interview' } : job
      )))
    }
  }, [])

  const moveToTab = useCallback((tab: string, source: 'auto' | 'user' = 'user') => {
    if (source === 'user') lastInteractionRef.current = Date.now()
    activeTabRef.current = tab
    setActiveTab(tab)
    applyDemoState(tab)
  }, [applyDemoState])

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (lastInteractionRef.current && Date.now() - lastInteractionRef.current < HERO_USER_IDLE_MS) return

      const currentIndex = HERO_DEMO_FLOW.indexOf(activeTabRef.current as typeof HERO_DEMO_FLOW[number])
      const nextTab = HERO_DEMO_FLOW[((currentIndex < 0 ? 0 : currentIndex) + 1) % HERO_DEMO_FLOW.length]
      moveToTab(nextTab, 'auto')
    }, HERO_AUTO_STEP_MS)

    return () => window.clearInterval(timer)
  }, [moveToTab])

  const advanceJob = useCallback((title: string) => {
    lastInteractionRef.current = Date.now()
    setJobs(prev => prev.map(job => {
      if (job.t !== title) return job
      const current = HERO_STATUS_ORDER.indexOf(job.status as typeof HERO_STATUS_ORDER[number])
      return { ...job, status: HERO_STATUS_ORDER[(current + 1) % HERO_STATUS_ORDER.length] }
    }))
  }, [])

  const toggleSavedJob = useCallback((title: string) => {
    lastInteractionRef.current = Date.now()
    setSavedJobs(prev => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }, [])

  const openTailorForJob = useCallback(() => {
    moveToTab('Tailor')
    setTailored(true)
  }, [moveToTab])

  const dashboardStats = [
    { l: 'Jobs Pulled', v: 247, color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-100' },
    { l: 'Saved',       v: jobs.filter(job => job.status === 'Saved').length,     color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100' },
    { l: 'Applied',     v: jobs.filter(job => job.status === 'Applied').length,   color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100' },
    { l: 'Interviews',  v: jobs.filter(job => job.status === 'Interview').length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ]

  const renderDashboard = () => (
    <>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {dashboardStats.map((s) => (
          <div key={s.l} className={`rounded-xl border ${s.border} ${s.bg} p-3 text-left`}>
            <p className="text-[10px] text-slate-500">{s.l}</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${s.color}`}>
              <AnimatedCounter value={s.v} />
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {jobs.map((j) => (
          <div
            key={j.t}
            onClick={openTailorForJob}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl hover:shadow-slate-200/70"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{j.t}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">{j.c} · {j.loc}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-[10px] font-medium text-slate-400 md:block">{j.sal}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${heroStatusStyle(j.status)}`}>{j.status}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  const renderJobs = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50/50 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-cyan-500" />
        <span className="truncate text-xs text-slate-500">Scanning Indeed · LinkedIn · Glassdoor · ZipRecruiter · Workday...</span>
        <span className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-cyan-500" />
      </div>
      {jobs.map((j) => {
        const isSaved = savedJobs.has(j.t)
        return (
          <button
            key={j.t}
            type="button"
            onClick={openTailorForJob}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl hover:shadow-slate-200/70"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{j.t}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">{j.c} · {j.loc}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-[10px] font-medium text-slate-400 md:block">{j.sal}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleSavedJob(j.t)
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition hover:-translate-y-0.5 hover:shadow-md ${isSaved ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'}`}
                title={isSaved ? 'Saved' : 'Save job'}
              >
                <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-sky-500 stroke-sky-500' : ''}`} />
              </button>
            </div>
          </button>
        )
      })}
    </div>
  )

  const renderTailor = () => (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-h-[190px] rounded-xl border border-slate-100 bg-slate-50 p-4 text-left">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Job Description</p>
          <p className="text-xs font-semibold text-slate-800">AI Engineer · NVIDIA</p>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Build model deployment pipelines, optimize GPU inference, ship production AI systems, and collaborate with platform teams on reliable ML infrastructure.</p>
        </div>
        <div className="min-h-[190px] rounded-xl border border-slate-100 bg-slate-50 p-4 text-left">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Resume</p>
          <p className="text-xs font-semibold text-slate-800">Azeez_Resume.pdf</p>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">{tailored ? 'ATS score 94. Keywords added, bullets rewritten, and cover letter generated for this role.' : 'Original resume ready for keyword matching, bullet rewrite, ATS scoring, and cover letter generation.'}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          lastInteractionRef.current = Date.now()
          setTailored(true)
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-100 transition hover:-translate-y-1 hover:shadow-lg"
      >
        <Wand2 className="h-3.5 w-3.5" />
        {tailored ? 'Tailored Resume Ready' : 'Tailor Resume'}
      </button>
    </div>
  )

  const renderApply = () => (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl font-black text-slate-700 shadow-lg shadow-slate-200">
        G
      </div>
      <p className="mt-4 text-sm font-bold text-slate-800">AI Engineer · Google</p>
      <p className="mt-1 text-xs text-slate-400">Mountain View · Hybrid · $185k-$245k</p>
      <div className="mt-4 space-y-1.5 text-left">
        {['Profile auto-filled', 'Tailored resume attached', 'Cover letter attached'].map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
            {item}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          lastInteractionRef.current = Date.now()
          setApplied(true)
        }}
        className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-md transition hover:-translate-y-1 ${applied ? 'bg-emerald-500 shadow-emerald-100' : 'bg-gradient-to-r from-cyan-500 to-sky-500 shadow-cyan-100'}`}
      >
        {applied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
        {applied ? 'Application Sent' : 'Apply to Google'}
      </button>
    </div>
  )

  const renderInterview = () => (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-[10px] font-semibold text-white/60">Sophia Interview Coach</span>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Live</span>
      </div>
      <div className="flex min-h-[190px] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-2xl font-black text-white shadow-xl shadow-cyan-900/40">S</div>
        <p className="mt-4 text-sm font-bold text-white">Sophia</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/50">Tell me about a project where you used AI to solve a business problem.</p>
        <div className="mt-5 flex items-center gap-3">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
            <Mic2 className="h-4 w-4" />
          </button>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-950/40 transition hover:bg-red-400" title="End call">
            <Square className="h-4 w-4 fill-white" />
          </button>
        </div>
      </div>
    </div>
  )

  const renderActivePanel = () => {
    if (activeTab === 'Jobs') return renderJobs()
    if (activeTab === 'Tailor') return renderTailor()
    if (activeTab === 'Apply') return renderApply()
    if (activeTab === 'Interview') return renderInterview()
    return renderDashboard()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="ml-4 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-center text-xs text-slate-400">
          jobezee.org/{activeTab.toLowerCase()}
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-cyan-600 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
          {HERO_DEMO_MESSAGES[activeTab]}
        </div>
      </div>
      <div className="flex">
        <div className="hidden w-44 shrink-0 border-r border-slate-100 bg-slate-50/80 p-3 md:block">
          <div className="mb-4 flex items-center gap-2 px-2 py-1">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-cyan-500 to-sky-500" />
            <span className="text-xs font-bold text-slate-700">JobEzee</span>
          </div>
          {HERO_DASHBOARD_TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => moveToTab(item)}
              className={`mb-0.5 w-full rounded-md px-2.5 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 hover:bg-white hover:text-cyan-600 hover:shadow-sm ${
                item === activeTab ? 'bg-cyan-500/10 text-cyan-600' : 'text-slate-400'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex min-h-[280px] flex-1 flex-col justify-center p-3 sm:p-4 md:min-h-[370px] md:p-5">
          <div key={activeTab} className="animate-[hero-panel-in_420ms_ease-out]">
            {renderActivePanel()}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate      = useNavigate()
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const [bursts, setBursts]    = useState<number[]>([])
  const fireConfetti           = useCallback(() => setBursts(prev => [...prev, Date.now()]), [])
  const clearBurst             = useCallback((id: number) => setBursts(prev => prev.filter(b => b !== id)), [])

  useLayoutEffect(() => {
    const isMobile = window.innerWidth < 768
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      // ── Progress bar ──
      gsap.to('#lp-progress', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { start: 'top top', end: 'bottom bottom', scrub: 0 },
      })

      const pinDuration = isMobile ? 0 : 400

      // ── Hero mockup entrance ──
      gsap.from('.hero-mockup', { y: 60, duration: 1.2, ease: 'power3.out', delay: 0.6 })

      // ─ Scene: Jobs ─
      const jobsTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scene-jobs',
          start: 'top top',
          end: `+=${pinDuration}`,
          pin: !isMobile,
          scrub: 0.3,
          anticipatePin: 1,
        },
      })
      jobsTl
        .from('.scene-jobs .s-label', { y: 30, duration: 0.3 })
        .from('.scene-jobs .s-head',  { y: 40, duration: 0.4 }, '<0.1')
        .from('.scene-jobs .s-desc',  { y: 20, duration: 0.3 }, '<0.2')
        .from('.scene-jobs .mock-card-0', { scale: 0.99, duration: 0.3 }, '<0.2')
        .from('.scene-jobs .mock-card-1', { scale: 0.98, duration: 0.35, ease: 'power2.out' }, '<0.15')
        .from('.scene-jobs .mock-card-2', { scale: 0.98, duration: 0.35, ease: 'power2.out' }, '<0.12')
        .from('.scene-jobs .mock-card-3', { scale: 0.98, duration: 0.35, ease: 'power2.out' }, '<0.12')
        .from('.scene-jobs .mock-card-4', { scale: 0.98, duration: 0.35, ease: 'power2.out' }, '<0.12')

      // ─ Scene: Tailor ─
      const tailorTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scene-tailor',
          start: 'top top',
          end: `+=${pinDuration}`,
          pin: !isMobile,
          scrub: 0.3,
          anticipatePin: 1,
        },
      })
      tailorTl
        .from('.scene-tailor .s-label',    { y: 24, duration: 0.3 })
        .from('.scene-tailor .s-head',     { y: 36, duration: 0.4 }, '<0.1')
        .from('.scene-tailor .s-desc',     { y: 18, duration: 0.3 }, '<0.15')
        .from('.scene-tailor .mock-shell', { x: 48, duration: 0.5 }, '<0.1')

      // ─ Scene: Apply ─
      const applyTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scene-apply',
          start: 'top top',
          end: `+=${pinDuration * 0.8}`,
          pin: !isMobile,
          scrub: 0.3,
          anticipatePin: 1,
        },
      })
      applyTl
        .from('.scene-apply .s-label', { y: 30, duration: 0.3 })
        .from('.scene-apply .s-head',  { y: 40, duration: 0.4 }, '<0.1')
        .from('.scene-apply .s-desc',  { y: 20, duration: 0.3 }, '<0.2')
        .from('.scene-apply .mock-shell', { y: 40, duration: 0.5 }, '<0.1')
        .from('.scene-apply .apply-row', { x: -20, stagger: 0.1, duration: 0.3 }, '<0.3')
        .to('.scene-apply .apply-btn', { scale: 0.95, duration: 0.08 }, '<0.5')
        .to('.scene-apply .apply-btn', { scale: 1, duration: 0.08 }, '<0.1')
        .set('.scene-apply .sent-badge', { display: 'flex' })
        .from('.scene-apply .sent-badge', { scale: 0.8, duration: 0.4 }, '<')

      // ─ Scene: Track ─
      const trackTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scene-track',
          start: 'top top',
          end: `+=${pinDuration}`,
          pin: !isMobile,
          scrub: 0.3,
          anticipatePin: 1,
        },
      })
      trackTl
        .from('.scene-track .s-label', { y: 30, duration: 0.3 })
        .from('.scene-track .s-head',  { y: 40, duration: 0.4 }, '<0.1')
        .from('.scene-track .s-desc',  { y: 20, duration: 0.3 }, '<0.2')
        .from('.scene-track .track-col-0', { y: 40, duration: 0.4 }, '<0.2')
        .from('.scene-track .track-col-1', { y: 40, duration: 0.4 }, '<0.1')
        .from('.scene-track .track-col-2', { y: 40, duration: 0.4 }, '<0.1')
        .from('.scene-track .track-col-3', { y: 40, duration: 0.4 }, '<0.1')

      // ─ Scene: Interview ─
      const interviewTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scene-interview',
          start: 'top top',
          end: `+=${pinDuration * 0.8}`,
          pin: !isMobile,
          scrub: 0.3,
          anticipatePin: 1,
        },
      })
      interviewTl
        .from('.scene-interview .s-label', { y: 30, duration: 0.3 })
        .from('.scene-interview .s-head',  { y: 40, duration: 0.4 }, '<0.1')
        .from('.scene-interview .s-desc',  { y: 20, duration: 0.3 }, '<0.2')
        .from('.scene-interview .mock-shell', { scale: 0.9, duration: 0.5 }, '<0.1')
        .from('.scene-interview .notification-badge', { y: 20, duration: 0.4 }, '<0.5')

      // ─ Scene: Celebrate ─
      const celebrateTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.scene-celebrate',
          start: 'top top',
          end: `+=${pinDuration}`,
          pin: !isMobile,
          scrub: 0.3,
          anticipatePin: 1,
        },
      })
      celebrateTl
        .from('.scene-celebrate .s-label', { y: 30, duration: 0.3 })
        .from('.scene-celebrate .s-head',  { y: 40, duration: 0.4 }, '<0.1')
        .from('.scene-celebrate .s-desc',  { y: 20, duration: 0.3 }, '<0.2')
        .from('.scene-celebrate .mock-shell', { scale: 0.85, duration: 0.6, ease: 'back.out(1.4)' }, '<0.1')
        .from('.scene-celebrate .confetti-piece', {
          y: -60,
          rotation: 'random(-200,200)',
          autoAlpha: 0,
          stagger: { each: 0.04, from: 'random' },
          duration: 0.5,
        }, '<0.3')
        .from('.scene-celebrate .offer-card', { y: 20, duration: 0.4 }, '<0.4')

    }, wrapperRef)

    return () => {
      ctx.revert()
    }
  }, [])

  return (
    <div ref={wrapperRef} className="relative overflow-x-hidden bg-white text-slate-900">
      {bursts.map(id => <ConfettiBurst key={id} onDone={() => clearBurst(id)} />)}

      {/* ── Scroll progress bar ── */}
      <div id="lp-progress"
        className="fixed top-0 left-0 z-50 h-[3px] w-full origin-left scale-x-0 bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500"
      />

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center px-6 py-4 backdrop-blur-md bg-white/80 border-b border-slate-100/60">
        <LogoBrand size="lg" variant="light" />
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 sm:px-6 pb-12 sm:pb-16 pt-20 sm:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-100/60 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-40 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-6 sm:gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
          <div className="text-center lg:text-left">
            <h1 className="text-[2.1rem] font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.04] lg:text-7xl">
              AI won't take your job.<br />
              <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
                It'll get you one.
              </span>
            </h1>
            <p className="mx-auto mt-4 sm:mt-6 max-w-xl text-sm sm:text-base md:text-lg leading-relaxed text-slate-500 lg:mx-0">
              JobEzee finds matched jobs, tailors your resume, applies faster, and prepares you for interviews so you can focus on landing the offer.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <button onClick={() => navigate('/auth')}
                className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 sm:px-10 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-300">
                Start for Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => navigate('/auth')}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                Sign in →
              </button>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-xs sm:text-sm text-slate-400 lg:justify-start">
              {[
                { icon: <Shield className="h-4 w-4 text-cyan-500" />,       text: 'Secure' },
                { icon: <Zap className="h-4 w-4 text-cyan-500" />,          text: 'AI-tailored' },
                { icon: <CheckCircle2 className="h-4 w-4 text-cyan-500" />, text: 'Interview-ready' },
              ].map((item) => (
                <span key={item.text} className="flex items-center gap-1.5">{item.icon} {item.text}</span>
              ))}
            </div>
          </div>

          {/* Hero dashboard */}
          <div className="hero-mockup relative mx-auto w-full max-w-4xl px-0 sm:px-0">
            <HeroDashboardMockup />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-slate-400 xl:flex">
          <span className="text-xs font-medium tracking-widest uppercase">Scroll to explore</span>
          <div className="flex h-8 w-5 items-start justify-center rounded-full border-2 border-slate-300 p-1">
            <div className="h-2 w-0.5 animate-bounce rounded-full bg-cyan-500" />
          </div>
        </div>
      </section>

      {/* ── Board ticker ── */}
      <div className="overflow-hidden border-y border-slate-100 bg-slate-50 py-3 sm:py-4">
        <p className="mb-2 sm:mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Searches across all major platforms globally
        </p>
        <div className="flex w-max animate-[scroll_20s_linear_infinite] whitespace-nowrap" style={{ willChange: 'transform' }}>
          {[0, 1].map((track) => (
            <div key={track} className="flex shrink-0 items-center">
              {Array.from({ length: 3 }).flatMap((_, repeat) =>
                PLATFORM_TICKER_ITEMS.flatMap((b) => [
                  <span key={`${track}-${repeat}-${b}`} className="shrink-0 px-7 text-sm font-semibold text-slate-400">{b}</span>,
                  <span key={`${track}-${repeat}-${b}-dot`} className="shrink-0 self-center h-1 w-1 rounded-full bg-slate-300" />,
                ])
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── SCENE 1: Jobs ── */}
      <Scene
        id="jobs"
        label="Global Job Discovery"
        headline="Indeed. LinkedIn. Glassdoor.<br /><span class='bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent'>ZipRecruiter. Workday. All at once.</span>"
        sub="JobEzee pulls from Indeed, LinkedIn, Glassdoor, ZipRecruiter, and 80+ Workday company portals across 74 countries, ranked by your fit score, deduplicated, live."
        accent="border-cyan-200 bg-cyan-50 text-cyan-700"
        mockup={<JobsMockup />}
      />

      {/* ── SCENE 2: Tailor ── */}
      <Scene
        id="tailor"
        label="Resume Tailoring Engine"
        headline="AI rewrites your resume<br /><span class='bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent'>for every single role.</span>"
        sub="Upload once. For each job, our AI fills keyword gaps, rewrites your bullet points for ATS, scores your match, and generates a tailored cover letter in under 30 seconds."
        accent="border-violet-200 bg-violet-50 text-violet-700"
        mockup={<TailorMockup />}
        reverse
      />

      {/* ── SCENE 3: Apply ── */}
      <Scene
        id="apply"
        label="One-Click Apply"
        headline="Your profile auto-fills<br /><span class='bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent'>every application form.</span>"
        sub="Name, phone, salary expectations, visa status, tailored resume, and cover letter are pre-filled and attached. You click Apply. JobEzee does the rest."
        accent="border-emerald-200 bg-emerald-50 text-emerald-700"
        mockup={<ApplyMockup />}
      />

      {/* ── SCENE 4: Track ── */}
      <Scene
        id="track"
        label="Application Tracker"
        headline="Know exactly where<br /><span class='bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent'>every opportunity stands.</span>"
        sub="A clean Kanban dashboard tracks every role from Saved → Applied → Interview → Offer. No spreadsheet. No guessing. Total clarity over your entire job search."
        accent="border-sky-200 bg-sky-50 text-sky-700"
        mockup={<TrackMockup />}
        reverse
      />

      {/* ── SCENE 5: AI Interview Coach ── */}
      <Scene
        id="interview"
        label="AI Interview Coach"
        headline="Practice with an AI interviewer.<br /><span class='bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent'>Walk in ready.</span>"
        sub="JobEzee's AI interview coach runs real practice sessions with voice mode, role-specific questions, behavioural and technical rounds. It listens, evaluates your answers, and gives feedback so you're prepared for every interview."
        accent="border-violet-200 bg-violet-50 text-violet-700"
        mockup={<InterviewMockup />}
      />

      {/* ── SCENE 6: Celebrate ── */}
      <Scene
        id="celebrate"
        label="Offer Received"
        headline="You got the offer.<br /><span class='bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent'>JobEzee got you there.</span>"
        sub="From your first search to your signed offer letter, every step is automated, optimized, and tracked. This is what winning a job search looks like in 2026."
        accent="border-amber-200 bg-amber-50 text-amber-700"
        mockup={<CelebrateMockup onCelebrate={fireConfetti} />}
        reverse
      />

      {/* ── FINAL CTA ── */}
      <section className="bg-gradient-to-b from-cyan-50/50 to-white border-t border-slate-100 px-4 sm:px-6 py-16 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 sm:mb-6 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 shadow-xl shadow-cyan-200">
            <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Your next role is{' '}
            <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">
              one scroll away.
            </span>
          </h2>
          <p className="mx-auto mt-4 sm:mt-5 max-w-lg text-sm sm:text-base md:text-lg text-slate-500">
            Set up your profile in 3 minutes. Let JobEzee's AI handle searching, tailoring,
            and tracking. You show up to interviews. We handle everything else.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => navigate('/auth')}
              className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 sm:px-10 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-300">
              Create Free Account
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => navigate('/auth')}
              className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-6 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Sign in →
            </button>
          </div>
          <p className="mt-4 text-xs sm:text-sm text-slate-400">No credit card required · Free to get started</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 bg-white px-4 sm:px-6 py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 md:flex-row">
          <LogoBrand size="sm" variant="light" />
          <p className="text-xs sm:text-sm text-center text-slate-400">
            © 2026 JobEzee · Built with React 19, FastAPI &amp; PostgreSQL
          </p>
          <div className="flex gap-6 text-xs sm:text-sm text-slate-400">
            <Link to="/privacy" className="transition hover:text-slate-700">Privacy</Link>
            <Link to="/terms" className="transition hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
