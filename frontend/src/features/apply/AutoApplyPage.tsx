import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Chrome, Link2, Loader2, Settings2, XCircle, Zap } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { applyApi } from '../../lib/api'
import { useSettingsStore } from '../../store/useSettingsStore'

type ApplyStatus = 'idle' | 'running' | 'complete' | 'error'

interface StreamEvent {
  line?   : string
  event?  : string
  status? : string
  result? : string
  error?  : string
  cost?   : number
}

interface Step {
  key   : string
  label : string
  sub   : string
}

const STEPS: Step[] = [
  { key: 'started',        label: 'Starting',         sub: 'Preparing your application'             },
  { key: 'opened',         label: 'Link Opened',      sub: 'Navigating to job listing'              },
  { key: 'filling',        label: 'Filling Form',     sub: 'AI agent filling your details'          },
  { key: 'resume',         label: 'Resume Added',     sub: 'Attaching your resume PDF'              },
  { key: 'submitting',     label: 'Submitting',       sub: 'Sending your application'               },
  { key: 'awaiting_email', label: 'Awaiting Email',   sub: 'Checking inbox for confirmation'        },
  { key: 'done',           label: 'Applied!',         sub: 'Confirmed by company email'             },
]

const STEP_INDEX: Record<string, number> = Object.fromEntries(
  STEPS.map((s, i) => [s.key, i])
)

const AutoApplyPage = () => {
  const { autoApply, deductApplyCost } = useSettingsStore()

  const [url, setUrl]               = useState('')
  const [dryRun, setDryRun]         = useState(false)
  const [, setApplyJobId]           = useState<string | null>(null)
  const [status, setStatus]         = useState<ApplyStatus>('idle')
  const [lines, setLines]           = useState<string[]>([])
  const [result, setResult]         = useState<string | null>(null)
  const [, setCost]                 = useState<number | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(-1)

  const warmPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persistent browser status
  const [browserAlive,    setBrowserAlive]    = useState<boolean | null>(null)
  const [browserStarting, setBrowserStarting] = useState(false)

  // Hetzner worker status
  const [workerStatus, setWorkerStatus] = useState<'ok' | 'unreachable' | 'timeout' | 'error' | 'not_configured' | null>(null)
  const [workerJobs, setWorkerJobs] = useState({ active: 0, queued: 0, max: 2 })

  useEffect(() => {
    const checkWorker = async () => {
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/apply/worker-status`, { credentials: 'include' })
        const d = await r.json()
        setWorkerStatus(d.status)
        setWorkerJobs({ active: d.active_jobs ?? 0, queued: d.queued_jobs ?? 0, max: d.max_concurrent ?? 2 })
      } catch { setWorkerStatus('unreachable') }
    }
    checkWorker()
    const t = setInterval(checkWorker, 30_000)
    return () => clearInterval(t)
  }, [])

  const esRef  = useRef<EventSource | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [lines])

  // Poll browser status every 5 seconds
  useEffect(() => {
    const checkBrowser = async () => {
      try {
        const s = await applyApi.browserStatus()
        setBrowserAlive(s.alive)
      } catch { setBrowserAlive(false) }
    }
    checkBrowser()
    const interval = setInterval(checkBrowser, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => () => {
    esRef.current?.close()
    if (warmPollRef.current) clearInterval(warmPollRef.current)
  }, [])

  const handleBrowserStart = async () => {
    setBrowserStarting(true)
    try {
      await applyApi.browserStart()
      let tries = 0
      const poll = setInterval(async () => {
        tries++
        try {
          const s = await applyApi.browserStatus()
          if (s.alive) { setBrowserAlive(true); setBrowserStarting(false); clearInterval(poll) }
        } catch { /* continue */ }
        if (tries > 20) { setBrowserStarting(false); clearInterval(poll) }
      }, 1500)
    } catch { setBrowserStarting(false) }
  }

  const addLine = (line: string) => setLines(prev => [...prev, line])

  const processLine = (raw: string) => {
    if (raw.startsWith('STEP:')) {
      const key = raw.slice(5).toLowerCase()
      const idx = STEP_INDEX[key]
      if (idx !== undefined) setActiveStep(idx)
      return
    }
    addLine(raw)
  }

  const openStream = (id: string) => {
    const es = new EventSource(applyApi.streamUrl(id))
    esRef.current = es
    es.onmessage = (e) => {
      const data: StreamEvent = JSON.parse(e.data)
      if (data.line) {
        processLine(data.line)
      } else if (data.event === 'done') {
        setStatus(data.status === 'error' ? 'error' : 'complete')
        setResult(data.result ?? null)
        setCost(data.cost ?? null)
        if (data.error) setError(data.error)
        if (data.status !== 'error') setActiveStep(STEPS.length - 1)
        es.close()
      }
    }
    es.onerror = () => {
      es.close()
      const interval = setInterval(async () => {
        try {
          if (!id) return
          const s = await applyApi.status(id)
          if (s.status === 'complete') {
            setStatus('complete')
            setResult(s.result)
            setCost(s.cost)
            setActiveStep(STEPS.length - 1)
            clearInterval(interval)
          } else if (s.status === 'error') {
            setStatus('error')
            setError(s.error)
            clearInterval(interval)
          }
        } catch { clearInterval(interval) }
      }, 3000)
    }
  }

  const handleRun = async () => {
    if (!url.trim()) return
    setStatus('running')
    setLines([])
    setResult(null)
    setCost(null)
    setError(null)
    setApplyJobId(null)
    setActiveStep(-1)
    esRef.current?.close()
    try {
      const data = await applyApi.runForUrl(url.trim(), dryRun, autoApply.tailorBeforeApply)
      setApplyJobId(data.apply_job_id)
      openStream(data.apply_job_id)
      if (!dryRun) deductApplyCost()
    } catch (err: any) {
      setStatus('error')
      setError(err.message ?? 'Failed to start apply job')
    }
  }

  // Suppress unused warning — workerStatus/workerJobs kept for future use in this page
  void workerStatus
  void workerJobs

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Apply by URL</h1>
          <p className="text-xs text-slate-400 mt-0.5">Lever, Greenhouse, Workday, Jobvite and more</p>
        </div>
        <div className="flex items-center gap-2">
          {browserAlive === null ? (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </span>
          ) : browserAlive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Browser ready
            </span>
          ) : (
            <button onClick={handleBrowserStart} disabled={browserStarting}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 transition disabled:opacity-50">
              {browserStarting ? <><Loader2 className="h-3 w-3 animate-spin" /> Starting…</> : <><Chrome className="h-3 w-3" /> Start Browser</>}
            </button>
          )}
          <a href="/app/settings"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-300 transition">
            <Settings2 className="h-3 w-3" />
            {autoApply.tailorBeforeApply ? <span className="text-violet-600">Tailor → Apply</span> : <span className="text-cyan-600">Direct Apply</span>}
          </a>
        </div>
      </div>

      {/* ── Apply by URL card ── */}
      <Card className="overflow-hidden p-0">
        {/* Card header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 md:px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-100 shrink-0">
            <Link2 className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">Apply by URL</p>
            <p className="text-xs text-slate-400">Lever, Greenhouse, Workday, Jobvite and more</p>
          </div>
          {/* dry run toggle — right side on desktop, wraps below on mobile */}
          <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
            <span className="text-xs text-slate-500">Dry run</span>
            <button type="button" onClick={() => setDryRun(v => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${dryRun ? 'bg-cyan-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${dryRun ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </label>
        </div>

        {/* URL input + button — row on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 px-4 md:px-6 py-4 md:py-5">
          <input
            type="url"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100 transition"
            placeholder="https://jobs.lever.co/company/abc123"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={status === 'running'}
            onKeyDown={e => { if (e.key === 'Enter') handleRun() }}
          />
          <button onClick={handleRun} disabled={status === 'running' || !url.trim()}
            className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 transition">
            {status === 'running' ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying…</> : <><Zap className="h-4 w-4" /> Apply Now</>}
          </button>
        </div>

        {/* Progress + log — only when active */}
        {status !== 'idle' && (
          <div className="border-t border-slate-100 px-4 md:px-6 py-4 space-y-4">
            {/* Step pills */}
            <div className="flex flex-wrap gap-2">
              {STEPS.map((step, idx) => {
                const isDone   = activeStep > idx || (status === 'complete' && idx === STEPS.length - 1)
                const isActive = idx === activeStep && status === 'running'
                const isFailed = status === 'error' && idx === activeStep
                return (
                  <span key={step.key}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all
                      ${isDone   ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isFailed ? 'bg-red-50 text-red-600 border-red-200'
                      : isActive ? 'bg-cyan-50 text-cyan-700 border-cyan-300'
                      : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                    {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                    {isDone && <CheckCircle2 className="h-3 w-3" />}
                    {step.label}
                  </span>
                )
              })}
            </div>

            {/* Log */}
            {lines.length > 0 && (
              <div ref={logRef}
                className="h-48 overflow-y-auto rounded-xl bg-slate-950 px-3 py-3 text-xs leading-relaxed space-y-0.5">
                {lines.map((line, i) => {
                  // ── Opening / trying to apply ──────────────────────────
                  const tryingMatch = line.match(/Trying to Apply to "(.+?) \| (.+?)"/i)
                  if (tryingMatch) {
                    return (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-cyan-400 animate-pulse shrink-0">▶</span>
                        <span className="text-slate-300">
                          Opening <span className="text-white font-semibold">{tryingMatch[1]}</span>
                          <span className="text-slate-500"> at </span>
                          <span className="text-cyan-300">{tryingMatch[2]}</span>
                        </span>
                      </div>
                    )
                  }
                  // ── Applied / submitted ────────────────────────────────
                  if (/applied|submitted/i.test(line) && /success|confirm|✓/i.test(line)) {
                    return (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-emerald-400 shrink-0">✓</span>
                        <span className="text-emerald-300 font-semibold">{line.trim()}</span>
                      </div>
                    )
                  }
                  // ── Already applied (skipped) ──────────────────────────
                  const alreadyMatch = line.match(/Already applied to "(.+?) \| (.+?)"/i)
                  if (alreadyMatch) {
                    return (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-slate-500 shrink-0">↩</span>
                        <span className="text-slate-500">
                          Skipped <span className="text-slate-400">{alreadyMatch[1]}</span>
                          <span className="text-slate-600"> at </span>
                          <span className="text-slate-400">{alreadyMatch[2]}</span>
                          <span className="text-slate-600"> — already applied</span>
                        </span>
                      </div>
                    )
                  }
                  // ── Skipping / ignored ─────────────────────────────────
                  const skipMatch = line.match(/Skipping(?:\s+previously\s+rejected)?\s+"(.+?) \| (.+?)"(?:\s+job)?\s*[—–-]?\s*(.*)/i)
                  if (skipMatch || /Skipping.*job/i.test(line)) {
                    const title   = skipMatch?.[1] ?? ''
                    const company = skipMatch?.[2] ?? ''
                    const reason  = (skipMatch?.[3] ?? '')
                      .replace(/Job ID:.*$/i, '').trim()
                      .replace(/title doesn['']t match AI keywords/i, 'role mismatch')
                      .replace(/Blacklisted Company/i, 'blacklisted')
                      .replace(/previously rejected/i, 'rejected before')
                    return (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-amber-500 shrink-0">✕</span>
                        <span className="text-slate-400">
                          {title ? (
                            <><span className="text-slate-300">{title}</span><span className="text-slate-600"> at </span><span className="text-slate-300">{company}</span></>
                          ) : 'Role'}{' '}
                          <span className="text-amber-500/80">ignored{reason ? ` — ${reason}` : ''}</span>
                        </span>
                      </div>
                    )
                  }
                  // ── JD / experience failed ─────────────────────────────
                  if (/\[JD\] FAILED/i.test(line)) {
                    const detail = line.replace(/\[JD\] FAILED\s*--?\s*/i, '').replace(/Job ID:.*$/i, '').trim()
                    return (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-amber-500 shrink-0">✕</span>
                        <span className="text-amber-500/80">Role ignored — {detail || 'requirements not met'}</span>
                      </div>
                    )
                  }
                  // ── Search context ─────────────────────────────────────
                  const searchMatch = line.match(/\[Search\] Navigating.*for:\s*"(.+?)"/i)
                  if (searchMatch) {
                    return (
                      <div key={i} className="flex items-center gap-2 py-0.5 border-t border-slate-800 mt-1 pt-1">
                        <span className="text-slate-600 shrink-0">⌕</span>
                        <span className="text-slate-500">Searching <span className="text-slate-400">{searchMatch[1]}</span></span>
                      </div>
                    )
                  }
                  // ── Jobs found count ───────────────────────────────────
                  const foundMatch = line.match(/\[Jobs\] Found (\d+) job listings/i)
                  if (foundMatch) {
                    return (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-slate-600 shrink-0">◈</span>
                        <span className="text-slate-500"><span className="text-slate-300">{foundMatch[1]}</span> roles found</span>
                      </div>
                    )
                  }
                  // ── Default: dim raw line ──────────────────────────────
                  return (
                    <div key={i} className="text-slate-600 font-mono break-all">{line}</div>
                  )
                })}
                {status === 'running' && (
                  <div className="flex gap-1.5 pt-1 text-cyan-400"><span className="animate-pulse">●</span><span className="text-slate-500">working…</span></div>
                )}
              </div>
            )}

            {/* Result banner */}
            {status === 'complete' && result && (
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3
                ${result === 'applied' ? 'bg-emerald-50 border-emerald-200'
                : result === 'submitted' ? 'bg-amber-50 border-amber-200'
                : 'bg-red-50 border-red-200'}`}>
                {result === 'applied' || result === 'submitted' || result === 'dry_run_done'
                  ? <CheckCircle2 className={`h-5 w-5 shrink-0 ${result === 'applied' ? 'text-emerald-500' : result === 'submitted' ? 'text-amber-500' : 'text-cyan-500'}`} />
                  : <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
                <div className="flex-1">
                  <p className={`text-sm font-bold ${result === 'applied' ? 'text-emerald-700' : result === 'submitted' ? 'text-amber-700' : 'text-red-700'}`}>
                    {result === 'applied' ? 'Applied — Confirmed!' : result === 'submitted' ? 'Submitted — watching inbox…' : result === 'dry_run_done' ? 'Dry run complete' : result === 'captcha' ? 'Blocked by CAPTCHA' : 'Application failed'}
                  </p>
                  {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
                </div>
                <button onClick={() => { setStatus('idle'); setLines([]); setResult(null); setUrl(''); setActiveStep(-1) }}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                  Reset
                </button>
              </div>
            )}
            {status === 'error' && error && !result && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        )}
      </Card>

    </div>
  )
}

export default AutoApplyPage
