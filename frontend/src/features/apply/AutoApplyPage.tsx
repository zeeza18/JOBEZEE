import { useEffect, useRef, useState } from 'react'
import { Bot, Check, CheckCircle2, FileText, Link2, Loader2, Settings2, Wifi, XCircle, Zap } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { applyApi } from '../../lib/api'
import { useSettingsStore } from '../../store/useSettingsStore'

type ApplyStatus = 'idle' | 'running' | 'complete' | 'error'
type WarmStatus  = 'idle' | 'running' | 'complete' | 'error'

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
  const [cost, setCost]             = useState<number | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(-1)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [warmStatus,  setWarmStatus]  = useState<WarmStatus>('idle')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [warmResults, setWarmResults] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [warmError,   setWarmError]   = useState<string | null>(null)
  const warmPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const esRef  = useRef<EventSource | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [lines])

  useEffect(() => () => {
    esRef.current?.close()
    if (warmPollRef.current) clearInterval(warmPollRef.current)
  }, [])

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

  const handleWarm = async () => {
    setWarmStatus('running')
    setWarmResults({})
    setWarmError(null)
    if (warmPollRef.current) clearInterval(warmPollRef.current)
    try {
      const data = await applyApi.warmSessions(0, false)
      const id = data.warm_job_id
      warmPollRef.current = setInterval(async () => {
        try {
          const s = await applyApi.warmStatus(id)
          if (s.status !== 'running') {
            clearInterval(warmPollRef.current!)
            setWarmStatus(s.status === 'error' ? 'error' : 'complete')
            setWarmResults(s.results ?? {})
            setWarmError(s.error ?? null)
          }
        } catch { clearInterval(warmPollRef.current!) }
      }, 3000)
    } catch (err: any) {
      setWarmStatus('error')
      setWarmError(err.message ?? 'Failed to start warm sessions')
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

  const resultColor =
    result === 'applied'      ? 'text-emerald-600' :
    result === 'submitted'    ? 'text-amber-600'   :
    result === 'dry_run_done' ? 'text-cyan-600'    :
    result === 'failed'       ? 'text-red-600'      : 'text-slate-600'

  const resultIcon =
    result === 'applied'      ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
    result === 'submitted'    ? <CheckCircle2 className="h-5 w-5 text-amber-500" />   :
    result === 'dry_run_done' ? <CheckCircle2 className="h-5 w-5 text-cyan-500" />    :
    <XCircle className="h-5 w-5 text-red-500" />

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Phase 3 · AI-powered</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Auto Apply</h1>
        </div>
        {/* Mode badge from Settings */}
        <a
          href="/app/settings"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 hover:bg-slate-100"
        >
          <Settings2 className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Mode:{' '}
            <span className={autoApply.tailorBeforeApply ? 'font-semibold text-violet-600' : 'font-semibold text-cyan-600'}>
              {autoApply.tailorBeforeApply ? 'Tailor → Apply' : 'Direct Apply'}
            </span>
          </span>
          {autoApply.tailorBeforeApply
            ? <FileText className="h-3.5 w-3.5 text-violet-400" />
            : <Zap className="h-3.5 w-3.5 text-cyan-400" />
          }
        </a>
      </div>

      {/* URL Input Card */}
      <Card className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="h-4 w-4 text-cyan-500" />
          <p className="text-sm font-semibold text-slate-800">Job URL</p>
        </div>
        <input
          type="url"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition"
          placeholder="Paste job posting URL here — e.g. https://jobs.lever.co/company/abc123"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={status === 'running'}
          onKeyDown={e => { if (e.key === 'Enter') handleRun() }}
        />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setDryRun(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${dryRun ? 'bg-cyan-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${dryRun ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-600">
              Dry run <span className="text-slate-400 text-xs">(fills form, skips Submit)</span>
            </span>
          </label>
          <Button
            onClick={handleRun}
            disabled={status === 'running' || !url.trim()}
            className="px-6"
          >
            {status === 'running'
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying…</>
              : <><Zap className="h-4 w-4" /> Auto Apply</>
            }
          </Button>
        </div>
      </Card>

      {/* Warm Sessions Card */}
      <Card className="p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-cyan-500" />
            <p className="text-sm font-semibold text-slate-800">Warm Sessions</p>
            <span className="text-xs text-slate-400">Pre-login to LinkedIn & Indeed so the agent never re-authenticates mid-run</span>
          </div>
          <Button
            variant="ghost"
            onClick={handleWarm}
            disabled={warmStatus === 'running'}
            className="px-4 text-sm"
          >
            {warmStatus === 'running'
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Warming…</>
              : <><Wifi className="h-3.5 w-3.5" /> Warm Now</>
            }
          </Button>
        </div>

        {warmStatus !== 'idle' && (
          <div className="flex flex-wrap gap-2">
            {warmStatus === 'running' && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Starting Chrome &amp; logging in…
              </span>
            )}
            {Object.entries(warmResults).map(([site, state]) => {
              const ok = state === 'already_logged_in' || state === 'logged_in' || state === 'loaded'
              return (
                <span
                  key={site}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium
                    ${ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                         : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
                >
                  {ok
                    ? <Check className="h-3 w-3" />
                    : <XCircle className="h-3 w-3" />
                  }
                  <span className="capitalize">{site}</span>
                  <span className="opacity-60">·</span>
                  <span>{state === 'already_logged_in' ? 'already in' : state}</span>
                </span>
              )
            })}
            {warmError && (
              <span className="text-xs text-red-600">{warmError}</span>
            )}
          </div>
        )}
      </Card>

      {/* Live Progress */}
      {status !== 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* Step tracker */}
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-800 mb-5">Progress</p>
            <div>
              {STEPS.map((step, idx) => {
                const isDone    = activeStep > idx || (status === 'complete' && idx === STEPS.length - 1)
                const isActive  = idx === activeStep && status !== 'complete' && status !== 'error'
                const isFailed  = status === 'error' && idx === activeStep
                const isPending = !isDone && !isActive && !isFailed

                return (
                  <div key={step.key} className="flex gap-3">
                    {/* Connector column */}
                    <div className="flex flex-col items-center">
                      {/* Step circle */}
                      <div className={`
                        relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                        transition-all duration-500
                        ${isDone    ? 'bg-emerald-500 shadow-md shadow-emerald-200'                         : isFailed  ? 'bg-red-500 shadow-md shadow-red-200'
                        : isActive  ? 'bg-cyan-500 shadow-lg shadow-cyan-200 ring-4 ring-cyan-100'
                        : 'bg-slate-100 border-2 border-slate-200'}
                      `}>
                        {isDone    ? <Check className="h-4 w-4 text-white" />                        : isFailed  ? <XCircle className="h-3.5 w-3.5 text-white" />
                        : isActive  ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                        : <span className="text-xs font-bold text-slate-300">{idx + 1}</span>
                        }
                        {isActive && (
                          <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-25" />
                        )}
                      </div>
                      {/* Connector line */}
                      {idx < STEPS.length - 1 && (
                        <div className={`
                          w-0.5 flex-1 min-h-[2rem] mt-1 transition-all duration-700
                          ${isDone ? 'bg-emerald-300' : 'bg-slate-100'}
                        `} />
                      )}
                    </div>

                    {/* Step text */}
                    <div className={`pb-5 pt-1 transition-all duration-500 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                      <p className={`text-sm font-semibold transition-colors duration-300
                        ${isDone    ? 'text-emerald-700'
                        : isFailed  ? 'text-red-600'
                        : isActive  ? 'text-cyan-700'
                        : 'text-slate-400'}
                      `}>
                        {step.label}
                      </p>
                      {(isActive || isDone) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isDone && idx === STEPS.length - 1 && result === 'dry_run_done'
                            ? 'Dry run — form filled, not submitted'
                            : step.sub}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="mt-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
          </Card>

          {/* Right: log + result */}
          <div className="space-y-4">
            {/* Compact agent log */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Agent Log</p>
              <div
                ref={logRef}
                className="h-52 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-300 space-y-0.5"
              >
                {lines.length === 0 && <span className="text-slate-600">Waiting for agent…</span>}
                {lines.map((line, i) => (
                  <div key={i} className="break-all leading-relaxed">{line}</div>
                ))}
                {status === 'running' && (
                  <div className="flex gap-1.5 pt-1">
                    <span className="animate-pulse text-cyan-400">●</span>
                    <span className="text-slate-500">working…</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Result card */}
            {status === 'complete' && result && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {resultIcon}
                  <div>
                    <p className={`text-base font-bold ${resultColor}`}>
                      {result === 'applied'      ? 'Applied — Confirmed!'             :
                       result === 'submitted'    ? 'Submitted — Awaiting Email'        :
                       result === 'dry_run_done' ? 'Dry Run Complete'                  :
                       result === 'failed'       ? 'Application Failed'                :
                       result === 'expired'      ? 'Job Listing Expired'               :
                       result === 'captcha'      ? 'Blocked by CAPTCHA'                :
                       result}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {result === 'applied'      ? 'Confirmed by company email.'                              :
                       result === 'submitted'    ? 'Form submitted. Watching inbox for confirmation email…'   :
                       result === 'dry_run_done' ? 'Form filled but not submitted (dry run).'                 :
                       result === 'failed'       ? 'Agent could not complete the application.'                :
                       result === 'captcha'      ? 'Try manually or add CapSolver API key.'                   :
                       'Check the log for details.'}
                    </p>
                  </div>
                </div>
                {cost != null && cost > 0 && (
                  <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">API Cost</p>
                    <p className="text-sm font-bold text-slate-700">${cost.toFixed(4)}</p>
                  </div>
                )}
                {result !== 'applied' && (
                  <Button
                    variant="ghost"
                    onClick={() => { setStatus('idle'); setLines([]); setResult(null); setUrl(''); setActiveStep(-1) }}
                    className="w-full"
                  >
                    Try another URL
                  </Button>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Info section */}
      {status === 'idle' && (
        <Card className="p-4 md:p-5 bg-slate-50 border-slate-100">
          <div className="flex gap-3">
            <Bot className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">How it works</p>
              <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                <li>Paste any job URL — Workday, Lever, Greenhouse, Jobvite, and more</li>
                <li>The AI agent runs headlessly, fills every form field using your profile</li>
                <li>Your uploaded resume PDF is attached automatically</li>
                <li>Enable <span className="font-medium text-slate-700">Dry run</span> to test without submitting</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default AutoApplyPage
