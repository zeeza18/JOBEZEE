import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Chrome, Link2, Linkedin, Loader2, Settings2, XCircle, Zap } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { applyApi, linkedinApi } from '../../lib/api'
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
  const [, setApplyJobId] = useState<string | null>(null)
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

  // ── LinkedIn bot state ──────────────────────────────────────────────────────
  const LI_JOB_KEY = 'jobezee_li_job_id'
  const _initLiJobId = localStorage.getItem(LI_JOB_KEY)

  const [liStatus,  setLiStatus]  = useState<'idle' | 'running' | 'complete' | 'error'>(_initLiJobId ? 'running' : 'idle')
  const [liLines,   setLiLines]   = useState<string[]>([])
  const [liResult,  setLiResult]  = useState<string | null>(null)
  const [liError,   setLiError]   = useState<string | null>(null)
  const [liJobId,   setLiJobId]   = useState<string | null>(_initLiJobId)
  const [liStopping,         setLiStopping]         = useState(false)
  const [liScreenshot,       setLiScreenshot]       = useState<string | null>(null)
  const [liScreenshotLoading, setLiScreenshotLoading] = useState(false)
  const liEsRef  = useRef<EventSource | null>(null)
  const liLogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (liLogRef.current) liLogRef.current.scrollTop = liLogRef.current.scrollHeight
  }, [liLines])

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

  // Open (or reopen) the LinkedIn SSE stream — replays all lines from start on reconnect
  const openLinkedInStream = (id: string) => {
    liEsRef.current?.close()
    const es = new EventSource(linkedinApi.streamUrl(id))
    liEsRef.current = es
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data)
      if (ev.line) {
        setLiLines(prev => [...prev, ev.line])
      } else if (ev.event === 'done') {
        setLiStatus(ev.status === 'error' ? 'error' : 'complete')
        setLiResult(ev.result ?? null)
        if (ev.error) setLiError(ev.error)
        es.close()
        localStorage.removeItem(LI_JOB_KEY)
      }
    }
    // On SSE disconnect: try to reconnect once after 3 s, then fall back to polling
    es.onerror = () => {
      es.close()
      setTimeout(() => {
        linkedinApi.status(id).then(s => {
          if (s.status === 'running') {
            // Bot still running — reopen the stream
            openLinkedInStream(id)
          } else if (s.status === 'complete') {
            setLiStatus('complete')
            setLiResult(s.result)
            localStorage.removeItem(LI_JOB_KEY)
          } else if (s.status === 'error') {
            setLiStatus('error')
            setLiError(s.error ?? 'Bot encountered an error')
            localStorage.removeItem(LI_JOB_KEY)
          }
        }).catch(() => { /* backend gone — leave UI as-is */ })
      }, 3000)
    }
  }

  // On mount: reconnect to any bot that was running before navigation
  useEffect(() => {
    const savedId = localStorage.getItem(LI_JOB_KEY)
    if (!savedId) return
    linkedinApi.status(savedId)
      .then(s => {
        if (s.status === 'running') {
          setLiJobId(savedId)
          setLiStatus('running')
          setLiLines([])  // will be replayed by SSE from position 0
          openLinkedInStream(savedId)
        } else {
          // Finished while away — show final state then clear
          setLiJobId(savedId)
          setLiStatus(s.status === 'error' ? 'error' : 'complete')
          if (s.error) setLiError(s.error)
          localStorage.removeItem(LI_JOB_KEY)
        }
      })
      .catch(() => localStorage.removeItem(LI_JOB_KEY))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => {
    esRef.current?.close()
    liEsRef.current?.close()
    if (warmPollRef.current) clearInterval(warmPollRef.current)
    // NOTE: do NOT clear LI_JOB_KEY here — bot keeps running on the server
  }, [])

  const handleBrowserStart = async () => {
    setBrowserStarting(true)
    try {
      await applyApi.browserStart()
      // Poll until alive
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


  const handleLinkedInStop = async () => {
    if (!liJobId) return
    setLiStopping(true)
    try {
      await linkedinApi.stop(liJobId)
    } catch { /* ignore — stream will close on its own */ }
    setLiStopping(false)
    setLiStatus('error')
    setLiError('Stopped by user')
    liEsRef.current?.close()
    localStorage.removeItem(LI_JOB_KEY)
  }

  const handleScreenshot = async () => {
    setLiScreenshotLoading(true)
    try {
      const data = await linkedinApi.screenshot()
      if (data.image_b64) setLiScreenshot(`data:image/png;base64,${data.image_b64}`)
      else setLiScreenshot(null)
    } catch { setLiScreenshot(null) }
    finally { setLiScreenshotLoading(false) }
  }

  const handleLinkedIn = async () => {
    setLiStatus('running')
    setLiLines([])
    setLiResult(null)
    setLiError(null)
    setLiJobId(null)
    try {
      const data = await linkedinApi.launch(false, autoApply.tailorBeforeApply)
      setLiJobId(data.linkedin_job_id)
      localStorage.setItem(LI_JOB_KEY, data.linkedin_job_id)
      openLinkedInStream(data.linkedin_job_id)
    } catch (err: any) {
      setLiStatus('error')
      setLiError(err.message ?? 'Failed to launch LinkedIn bot')
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


  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Auto Apply</h1>
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

      {/* ── 1. Apply by URL ── */}
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
                className="h-40 overflow-y-auto rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-slate-300">
                {lines.map((line, i) => <div key={i} className="break-all">{line}</div>)}
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

      {/* ── 2. LinkedIn Bot ── */}
      <Card className="overflow-hidden p-0">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-[#0077B5] to-[#0091D5] px-4 md:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Linkedin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-white">LinkedIn Easy Apply Bot</p>
                <p className="text-xs text-white/60">Bulk-applies to jobs matching your profile preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              {liStatus === 'running' && (
                <>
                  <button onClick={handleScreenshot} disabled={liScreenshotLoading}
                    title="Screenshot Hetzner display"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition disabled:opacity-50">
                    {liScreenshotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <button onClick={handleLinkedInStop} disabled={liStopping}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition disabled:opacity-50">
                    {liStopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    {liStopping ? 'Stopping…' : 'Stop Bot'}
                  </button>
                </>
              )}
              <button onClick={handleLinkedIn} disabled={liStatus === 'running'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-bold text-[#0077B5] hover:bg-blue-50 transition disabled:opacity-60">
                {liStatus === 'running'
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
                  : <><Zap className="h-4 w-4" /> Launch Bot</>}
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 md:px-6 py-5 space-y-4">
          {liStatus === 'idle' && (
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              {['Desired roles', 'Experience level', 'Work preference', 'Job type', 'Salary'].map(item => (
                <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{item}</span>
              ))}
              <span className="text-xs text-slate-400 self-center">pulled from your profile</span>
            </div>
          )}

          {liStatus !== 'idle' && (
            <>
              <div ref={liLogRef}
                className="h-56 overflow-y-auto rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed space-y-0.5">
                {liLines.length === 0 && <span className="text-slate-600">Starting bot…</span>}
                {liLines.map((line, i) => {
                  const cls =
                    /\[ERROR\]|\bERROR\b|failed|exception/i.test(line) ? 'text-red-400' :
                    /\[WARN\]|\bwarning\b/i.test(line)                  ? 'text-amber-400' :
                    /\[OK\]|Successfully|Applied|PASSED/i.test(line)    ? 'text-emerald-400' :
                    /\[JOBEZEE\]/i.test(line)                           ? 'text-cyan-300' :
                    /\[Tailor\]/i.test(line)                            ? 'text-violet-300' :
                    /\[Resume\]/i.test(line)                            ? 'text-blue-300' :
                    /\[JD\]/i.test(line)                                ? 'text-slate-400' :
                    /Skipping|FAILED|Click Failed/i.test(line)          ? 'text-slate-500' :
                    'text-slate-300'
                  return <div key={i} className={`break-all ${cls}`}>{line}</div>
                })}
                {liStatus === 'running' && (
                  <div className="flex gap-1.5 pt-1 text-blue-400"><span className="animate-pulse">●</span><span className="text-slate-500">bot running…</span></div>
                )}
              </div>

              {liStatus === 'complete' && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-700 flex-1">{liResult ?? 'Bot finished successfully'}</p>
                  <button onClick={() => { setLiStatus('idle'); setLiLines([]); setLiResult(null); localStorage.removeItem(LI_JOB_KEY) }}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 transition">Clear</button>
                </div>
              )}
              {liStatus === 'error' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1.5">
                  <p className="text-sm font-medium text-red-700">{liError ?? 'Bot encountered an error. Check the log above.'}</p>
                  {liError?.toLowerCase().includes('desired roles') && (
                    <a href="/app/profile" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 underline hover:text-blue-800">
                      Add desired roles in Profile →
                    </a>
                  )}
                </div>
              )}

              {/* Screenshot preview */}
              {liScreenshot && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">Hetzner display (:99)</span>
                    <button onClick={() => setLiScreenshot(null)} className="text-slate-400 hover:text-slate-600 transition">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                  <img src={liScreenshot} alt="Bot screen" className="w-full" />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

    </div>
  )
}

export default AutoApplyPage
