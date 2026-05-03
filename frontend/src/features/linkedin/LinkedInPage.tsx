import { useEffect, useRef, useState } from 'react'
import {
  Camera, CheckCircle2, Eye, EyeOff, KeyRound, Linkedin,
  Loader2, ShieldCheck, Trash2, Users, XCircle, Zap,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { linkedinApi, linkedinConnectApi } from '../../lib/api'
import { useSettingsStore } from '../../store/useSettingsStore'

type ConnectStatus = 'idle' | 'starting' | 'screenshot' | 'submitting' | 'captcha' | 'saving'

// ── Tab definition ───────────────────────────────────────────────────────────
type Tab = 'easy-apply' | 'profile-boost' | 'contacts'

// ── localStorage keys ────────────────────────────────────────────────────────
const LI_JOB_KEY    = 'jobezee_li_job_id'
const LI_LINES_KEY  = 'jobezee_li_lines'
const LI_STATUS_KEY = 'jobezee_li_status'
const LI_RESULT_KEY = 'jobezee_li_result'
const LI_ERROR_KEY  = 'jobezee_li_error'

const LinkedInPage = () => {
  const { autoApply } = useSettingsStore()

  // ── Active tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('easy-apply')

  // ── LinkedIn bot state ───────────────────────────────────────────────────
  const _initLiJobId  = localStorage.getItem(LI_JOB_KEY)
  const _initLiLines  = (() => { try { const s = localStorage.getItem(LI_LINES_KEY); return s ? JSON.parse(s) : [] } catch { return [] } })()
  const _initLiStatus = (localStorage.getItem(LI_STATUS_KEY) as any) ?? (_initLiJobId ? 'running' : 'idle')
  const _initLiResult = localStorage.getItem(LI_RESULT_KEY)
  const _initLiError  = localStorage.getItem(LI_ERROR_KEY)

  const [liStatus,  setLiStatus]  = useState<'idle' | 'queued' | 'running' | 'complete' | 'error' | 'rate_limited'>(_initLiStatus)
  const [liQueuePos, setLiQueuePos] = useState<number | null>(null)
  const [liLines,   setLiLines]   = useState<string[]>(_initLiJobId ? _initLiLines : [])
  const [liResult,  setLiResult]  = useState<string | null>(_initLiJobId ? _initLiResult : null)
  const [liError,   setLiError]   = useState<string | null>(_initLiJobId ? _initLiError : null)
  const [liJobId,   setLiJobId]   = useState<string | null>(_initLiJobId)
  const [liStopping,           setLiStopping]           = useState(false)
  const [liScreenshot,         setLiScreenshot]         = useState<string | null>(null)
  const [liScreenshotLoading,  setLiScreenshotLoading]  = useState(false)
  const [liScreenshotTs,       setLiScreenshotTs]       = useState<Date | null>(null)
  const liEsRef       = useRef<EventSource | null>(null)
  const liLogRef      = useRef<HTMLDivElement>(null)
  const ssIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const liPollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const liSseDataRef  = useRef(false)
  const liSseSkipRef  = useRef(0)

  // ── Hetzner worker status ────────────────────────────────────────────────
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

  // ── LinkedIn Connect state ───────────────────────────────────────────────
  const [hasCookies,    setHasCookies]    = useState<boolean | null>(null)
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>('idle')
  const [connectEmail,  setConnectEmail]  = useState('')
  const [connectPass,   setConnectPass]   = useState('')
  const [connectError,  setConnectError]  = useState('')
  const [showPass,      setShowPass]      = useState(false)
  const connectPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── CAPTCHA solving state ────────────────────────────────────────────────
  const [captchaScreenshot, setCaptchaScreenshot] = useState<string | null>(null)
  const [, setCaptchaClicks]                      = useState<{pctX: number; pctY: number}[]>([])
  const [verifyCode,        setVerifyCode]         = useState('')
  const [codeSubmitting,    setCodeSubmitting]      = useState(false)
  const captchaImgRef     = useRef<HTMLImageElement | null>(null)
  const captchaSsPollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const captchaUrlPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Scroll log on new lines ──────────────────────────────────────────────
  useEffect(() => {
    if (liLogRef.current) liLogRef.current.scrollTop = liLogRef.current.scrollHeight
  }, [liLines])

  // ── Persist LinkedIn bot state to localStorage ───────────────────────────
  useEffect(() => {
    if (liLines.length > 0) localStorage.setItem(LI_LINES_KEY, JSON.stringify(liLines))
  }, [liLines])
  useEffect(() => {
    if (liStatus !== 'idle') localStorage.setItem(LI_STATUS_KEY, liStatus)
  }, [liStatus])
  useEffect(() => {
    if (liResult) localStorage.setItem(LI_RESULT_KEY, liResult)
    else localStorage.removeItem(LI_RESULT_KEY)
  }, [liResult])
  useEffect(() => {
    if (liError) localStorage.setItem(LI_ERROR_KEY, liError)
    else localStorage.removeItem(LI_ERROR_KEY)
  }, [liError])

  // ── Load connect status on mount ────────────────────────────────────────
  useEffect(() => {
    linkedinConnectApi.status()
      .then(s => setHasCookies(s.has_cookies))
      .catch(() => setHasCookies(false))
  }, [])

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => () => {
    liEsRef.current?.close()
    if (ssIntervalRef.current)    clearInterval(ssIntervalRef.current)
    if (connectPollRef.current)   clearInterval(connectPollRef.current)
    if (captchaSsPollRef.current) clearInterval(captchaSsPollRef.current)
    if (captchaUrlPollRef.current) clearInterval(captchaUrlPollRef.current)
    if (liPollRef.current)        clearInterval(liPollRef.current)
    // NOTE: do NOT clear LI_JOB_KEY here — bot keeps running on the server
  }, [])

  // ── Progress polling (SSE fallback) ─────────────────────────────────────
  const stopProgressPolling = () => {
    if (liPollRef.current) { clearInterval(liPollRef.current); liPollRef.current = null }
  }

  const startProgressPolling = (id: string) => {
    if (liPollRef.current) return
    let seenCount = 0
    liPollRef.current = setInterval(async () => {
      try {
        const data = await linkedinApi.progress(id, seenCount)
        if (data.lines.length > 0) {
          seenCount += data.lines.length
          setLiLines(prev => Array.from(new Set([...prev, ...data.lines])))
          for (const line of data.lines) {
            const qm = line.match(/you're #(\d+) in queue/i)
            if (qm) { setLiQueuePos(Number(qm[1])); setLiStatus('queued') }
            if (/slot available.*starting bot now/i.test(line)) { setLiQueuePos(null); setLiStatus('running') }
          }
        }
        if (data.status === 'complete' || data.status === 'error') {
          if (data.status === 'complete') { setLiStatus('complete'); setLiResult(data.result ?? null) }
          else { setLiStatus('error'); if (data.error) setLiError(data.error) }
          localStorage.removeItem(LI_JOB_KEY)
          if (liPollRef.current) { clearInterval(liPollRef.current); liPollRef.current = null }
        }
      } catch { /* ignore poll errors */ }
    }, 3000)
  }

  // ── LinkedIn SSE stream ──────────────────────────────────────────────────
  const openLinkedInStream = (id: string, skipLines = 0) => {
    liEsRef.current?.close()
    liSseDataRef.current = false
    liSseSkipRef.current = skipLines
    let sseLineCount = 0
    const es = new EventSource(linkedinApi.streamUrl(id))
    liEsRef.current = es

    const sseTimeout = setTimeout(() => {
      if (!liSseDataRef.current) startProgressPolling(id)
    }, 8000)

    es.onmessage = (e) => {
      const ev = JSON.parse(e.data)
      if (ev.line) {
        liSseDataRef.current = true
        clearTimeout(sseTimeout)
        stopProgressPolling()
        sseLineCount++
        if (sseLineCount <= liSseSkipRef.current) return
        setLiLines(prev => [...prev, ev.line])
        const queueMatch = ev.line.match(/you're #(\d+) in queue/i)
        if (queueMatch) { setLiQueuePos(Number(queueMatch[1])); setLiStatus('queued') }
        if (/slot available.*starting bot now/i.test(ev.line)) { setLiQueuePos(null); setLiStatus('running') }
      } else if (ev.event === 'done') {
        clearTimeout(sseTimeout)
        stopProgressPolling()
        setLiStatus(ev.status === 'error' ? 'error' : 'complete')
        setLiResult(ev.result ?? null)
        if (ev.error) setLiError(ev.error)
        es.close()
        localStorage.removeItem(LI_JOB_KEY)
      }
    }
    es.onerror = () => {
      clearTimeout(sseTimeout)
      es.close()
      setTimeout(() => {
        linkedinApi.status(id).then(s => {
          if (s.status === 'running') {
            openLinkedInStream(id)
          } else if (s.status === 'queued') {
            setLiStatus('queued')
            setLiQueuePos((s as any).queue_position ?? null)
            startProgressPolling(id)
          } else if (s.status === 'complete') {
            setLiStatus('complete')
            setLiResult(s.result)
            localStorage.removeItem(LI_JOB_KEY)
          } else if (s.status === 'rate_limited') {
            setLiStatus('rate_limited')
            setLiError(s.error ?? "LinkedIn daily Easy Apply limit reached — try again tomorrow.")
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

  // ── Reconnect to running bot on mount ────────────────────────────────────
  useEffect(() => {
    const savedId = localStorage.getItem(LI_JOB_KEY)
    if (!savedId) return
    linkedinApi.status(savedId)
      .then(s => {
        if (s.status === 'running') {
          setLiJobId(savedId)
          setLiStatus('running')
          const savedLines = (() => { try { const ls = localStorage.getItem(LI_LINES_KEY); return ls ? JSON.parse(ls) : [] } catch { return [] } })()
          openLinkedInStream(savedId, savedLines.length)
        } else {
          setLiJobId(savedId)
          if (s.status === 'rate_limited') {
            setLiStatus('rate_limited')
            setLiError(s.error ?? "LinkedIn daily Easy Apply limit reached — try again tomorrow.")
          } else {
            setLiStatus(s.status === 'error' ? 'error' : 'complete')
            if (s.error) setLiError(s.error)
            if (s.result) setLiResult(s.result)
          }
          localStorage.removeItem(LI_JOB_KEY)
          localStorage.removeItem(LI_STATUS_KEY)
        }
      })
      .catch(() => localStorage.removeItem(LI_JOB_KEY))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-poll screenshot every 5s while bot is running ───────────────────
  useEffect(() => {
    if (liStatus === 'running' && liJobId) {
      fetchScreenshot(true)
      ssIntervalRef.current = setInterval(() => fetchScreenshot(true), 5000)
    } else {
      if (ssIntervalRef.current) { clearInterval(ssIntervalRef.current); ssIntervalRef.current = null }
    }
    return () => {
      if (ssIntervalRef.current) { clearInterval(ssIntervalRef.current); ssIntervalRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liStatus, liJobId])

  // ── Screenshot helpers ───────────────────────────────────────────────────
  const fetchScreenshot = async (silent = false) => {
    if (!silent) setLiScreenshotLoading(true)
    try {
      const data = await linkedinApi.screenshot()
      if (data.image_b64) { setLiScreenshot(`data:image/png;base64,${data.image_b64}`); setLiScreenshotTs(new Date()) }
    } catch { /* silent fail */ }
    finally { if (!silent) setLiScreenshotLoading(false) }
  }

  const handleScreenshot = () => fetchScreenshot(false)

  // ── LinkedIn bot handlers ────────────────────────────────────────────────
  const handleLinkedInStop = async () => {
    setLiStopping(true)
    const savedId = liJobId || localStorage.getItem(LI_JOB_KEY)
    try {
      if (savedId) { await linkedinApi.stop(savedId) }
      else { await linkedinApi.stopAll() }
    } catch {
      try { await linkedinApi.stopAll() } catch { /* nothing we can do */ }
    }
    setLiStopping(false)
    setLiStatus('error')
    setLiError('Stopped by user')
    liEsRef.current?.close()
    stopProgressPolling()
    ;[LI_JOB_KEY, LI_STATUS_KEY].forEach(k => localStorage.removeItem(k))
  }

  const handleLinkedIn = async () => {
    stopProgressPolling()
    setLiStatus('running')
    setLiLines([])
    setLiResult(null)
    setLiError(null)
    setLiJobId(null)
    localStorage.removeItem(LI_LINES_KEY)
    localStorage.removeItem(LI_STATUS_KEY)
    localStorage.removeItem(LI_RESULT_KEY)
    localStorage.removeItem(LI_ERROR_KEY)
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

  // ── Connect screen helpers ───────────────────────────────────────────────
  const stopConnectPolls = () => {
    if (captchaSsPollRef.current)  { clearInterval(captchaSsPollRef.current);  captchaSsPollRef.current  = null }
    if (captchaUrlPollRef.current) { clearInterval(captchaUrlPollRef.current); captchaUrlPollRef.current = null }
  }

  const fetchConnectScreenshot = async () => {
    try {
      const data = await linkedinConnectApi.screenshot()
      if (data.image_b64) setCaptchaScreenshot(`data:image/png;base64,${data.image_b64}`)
    } catch { /* silent */ }
  }

  const startScreenshotPolling = () => {
    fetchConnectScreenshot()
    captchaSsPollRef.current = setInterval(fetchConnectScreenshot, 1500)
    captchaUrlPollRef.current = setInterval(async () => {
      try {
        const { url } = await linkedinConnectApi.pageUrl()
        const isCaptchaUrl = url.includes('checkpoint') || url.includes('security') ||
                             url.includes('challenge') || url.includes('verification') || url.includes('authwall')
        if (url && url.includes('linkedin.com') && !isCaptchaUrl && !url.includes('/login')) {
          stopConnectPolls()
          setConnectStatus('saving')
          try {
            await linkedinConnectApi.saveCookies()
            setHasCookies(true)
            resetConnectState()
          } catch (err: any) {
            setConnectError(err.message ?? 'Failed to save session')
            setConnectStatus('captcha')
          }
        }
      } catch { /* ignore */ }
    }, 2000)
  }

  const resetConnectState = () => {
    stopConnectPolls()
    setConnectStatus('idle')
    setCaptchaScreenshot(null)
    setCaptchaClicks([])
    setVerifyCode('')
    setCodeSubmitting(false)
    setConnectEmail('')
    setConnectPass('')
    setConnectError('')
  }

  const handleConnectOpen = async () => {
    setConnectError('')
    setConnectStatus('starting')
    try {
      await linkedinConnectApi.start()
      setConnectStatus('screenshot')
      startScreenshotPolling()
    } catch (err: any) {
      setConnectStatus('idle')
      setConnectError(err.message ?? 'Failed to open LinkedIn')
    }
  }

  const handleSignIn = async () => {
    if (!connectEmail.trim()) { setConnectError('Enter your LinkedIn email.'); return }
    if (!connectPass.trim())  { setConnectError('Enter your LinkedIn password.'); return }
    setConnectError('')
    setConnectStatus('submitting')
    try {
      await linkedinConnectApi.fillEmail(connectEmail.trim())
      await linkedinConnectApi.fillPassword(connectPass)
      const data = await linkedinConnectApi.pressLogin() as any
      if (data?.captcha) {
        setConnectStatus('captcha')
        return
      }
      if (data?.success) {
        stopConnectPolls()
        setConnectStatus('saving')
        await linkedinConnectApi.saveCookies()
        setHasCookies(true)
        resetConnectState()
      } else {
        setConnectError(data?.message ?? 'Login failed — check your email and password')
        setConnectStatus('screenshot')
      }
    } catch (err: any) {
      const msg = err.message ?? 'Login failed'
      if (msg.toLowerCase().includes('no active connect session')) {
        stopConnectPolls()
        resetConnectState()
        setConnectError('Session expired — click Open LinkedIn to start again.')
        return
      }
      setConnectError(msg)
      setConnectStatus('screenshot')
    }
  }

  const handleSubmitCode = async () => {
    if (!verifyCode.trim()) return
    setCodeSubmitting(true)
    setConnectError('')
    try {
      await linkedinConnectApi.fillCode(verifyCode.trim())
      setVerifyCode('')
      setTimeout(fetchConnectScreenshot, 1000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setConnectError(msg)
    } finally {
      setCodeSubmitting(false)
    }
  }

  const handleScreenshotClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const img = captchaImgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    const serverX = Math.round(offsetX / rect.width  * (img.naturalWidth  || 1280))
    const serverY = Math.round(offsetY / rect.height * (img.naturalHeight || 800))
    setCaptchaClicks(prev => [...prev, {
      pctX: (offsetX / rect.width)  * 100,
      pctY: (offsetY / rect.height) * 100,
    }])
    try { await linkedinConnectApi.click(serverX, serverY) } catch { /* ignore */ }
    setTimeout(fetchConnectScreenshot, 700)
  }

  const handleConnectDelete = async () => {
    if (!confirm('Clear saved LinkedIn session? The bot will need to log in fresh next time.')) return
    try {
      await linkedinConnectApi.deleteCookies()
      setHasCookies(false)
    } catch { /* ignore */ }
  }

  // ── Tab content helpers ──────────────────────────────────────────────────
  const clearLiState = () => {
    setLiStatus('idle')
    setLiLines([])
    setLiResult(null)
    setLiScreenshot(null)
    ;[LI_JOB_KEY, LI_LINES_KEY, LI_STATUS_KEY, LI_RESULT_KEY, LI_ERROR_KEY].forEach(k => localStorage.removeItem(k))
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">LinkedIn</h1>
          <p className="text-xs text-slate-400 mt-0.5">Easy Apply, profile optimization, and contact management</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {([
          { id: 'easy-apply',     label: 'Easy Apply'     },
          { id: 'profile-boost',  label: 'Profile Boost'  },
          { id: 'contacts',       label: 'Contacts'       },
        ] as { id: Tab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all
              ${activeTab === tab.id
                ? 'bg-white text-[#0077B5] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════ EASY APPLY TAB ══════════════ */}
      {activeTab === 'easy-apply' && (
        <>
          {/* ── Connect LinkedIn (one-time session) ── */}
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0077B5]/10 border border-[#0077B5]/20 shrink-0">
                  <KeyRound className="h-4 w-4 text-[#0077B5]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Connect LinkedIn</p>
                  <p className="text-xs text-slate-400">Log in once — bot never needs to log in again</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasCookies === null ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : hasCookies ? (
                  <>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Session active
                    </span>
                    <button onClick={handleConnectDelete}
                      className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-red-500 hover:border-red-200 transition" title="Clear session">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Not connected
                  </span>
                )}
              </div>
            </div>

            {/* Step 0: idle */}
            {connectStatus === 'idle' && (
              <div className="px-4 md:px-6 py-4 space-y-3">
                <p className="text-xs text-slate-500">
                  Opens LinkedIn on our server — you enter credentials step by step and solve any security check interactively.
                  Only the encrypted session cookie is saved.
                </p>
                {connectError && <p className="text-xs text-red-600">{connectError}</p>}
                <button
                  onClick={handleConnectOpen}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0077B5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005f8f] transition"
                >
                  <Linkedin className="h-4 w-4" />
                  {hasCookies ? 'Re-connect LinkedIn' : 'Open LinkedIn'}
                </button>
              </div>
            )}

            {/* Starting Chrome */}
            {connectStatus === 'starting' && (
              <div className="px-4 md:px-6 py-6 flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#0077B5]" />
                <p className="text-sm text-slate-500">Opening LinkedIn on server…</p>
              </div>
            )}

            {/* Screenshot panel */}
            {(['screenshot','submitting','captcha','saving'] as ConnectStatus[]).includes(connectStatus) && (
              <div className="px-4 md:px-6 py-4 space-y-3">

                {connectStatus === 'captcha' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-800">Security check</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Click the CAPTCHA on screen below. Session saves automatically once you pass.
                    </p>
                  </div>
                )}
                {connectStatus === 'saving' && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving session…
                  </div>
                )}

                {/* Live screenshot */}
                <div
                  className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 select-none"
                  style={{ cursor: connectStatus === 'captcha' ? 'crosshair' : 'default' }}
                  onClick={connectStatus === 'captcha' ? handleScreenshotClick : undefined}
                >
                  {captchaScreenshot ? (
                    <img
                      ref={captchaImgRef}
                      src={captchaScreenshot}
                      alt="LinkedIn on server"
                      className="w-full block pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 h-48">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                      <span className="text-xs text-slate-500">Loading screen…</span>
                    </div>
                  )}
                </div>

                {connectError && <p className="text-xs text-red-600">{connectError}</p>}

                {/* Email + Password + Sign In */}
                {(connectStatus === 'screenshot' || connectStatus === 'submitting') && (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={connectEmail}
                      onChange={e => setConnectEmail(e.target.value)}
                      placeholder="LinkedIn email"
                      disabled={connectStatus === 'submitting'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0077B5] focus:ring-2 focus:ring-[#0077B5]/10 transition disabled:opacity-50"
                    />
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={connectPass}
                        onChange={e => setConnectPass(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSignIn() }}
                        placeholder="LinkedIn password"
                        disabled={connectStatus === 'submitting'}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0077B5] focus:ring-2 focus:ring-[#0077B5]/10 transition disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      onClick={handleSignIn}
                      disabled={connectStatus === 'submitting' || !connectEmail.trim() || !connectPass.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0077B5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005f8f] disabled:opacity-50 transition"
                    >
                      {connectStatus === 'submitting'
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                        : <><Linkedin className="h-4 w-4" /> Sign In</>}
                    </button>
                    <button
                      onClick={() => { stopConnectPolls(); linkedinConnectApi.stop().catch(() => {}); resetConnectState() }}
                      className="w-full text-xs text-slate-400 hover:text-slate-600 transition py-1"
                    >Cancel</button>
                  </div>
                )}

                {connectStatus === 'captcha' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={e => setVerifyCode(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmitCode() }}
                        placeholder="Verification code from email"
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#0077B5] focus:ring-2 focus:ring-[#0077B5]/10 transition"
                      />
                      <button
                        onClick={handleSubmitCode}
                        disabled={codeSubmitting || !verifyCode.trim()}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0077B5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005f8f] disabled:opacity-50 transition"
                      >
                        {codeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Click CAPTCHA tiles above · or enter code · Auto-saves when passed
                      </span>
                      <button onClick={() => { stopConnectPolls(); linkedinConnectApi.stop().catch(() => {}); resetConnectState() }}
                        className="text-xs text-red-400 hover:text-red-600 transition">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── LinkedIn Easy Apply Bot ── */}
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
                  {/* Worker health pill */}
                  {workerStatus && (
                    <span className={`hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold
                      ${workerStatus === 'ok' ? 'bg-emerald-500/20 text-emerald-200' :
                        workerStatus === 'not_configured' ? 'bg-slate-500/20 text-slate-300' :
                        'bg-red-500/20 text-red-300'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${workerStatus === 'ok' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {workerStatus === 'ok'
                        ? `Worker ${workerJobs.active}/${workerJobs.max} active${workerJobs.queued > 0 ? ` · ${workerJobs.queued} queued` : ''}`
                        : workerStatus === 'not_configured' ? 'Local mode'
                        : 'Worker offline'}
                    </span>
                  )}
                  {(liStatus === 'running' || liStatus === 'queued') && (
                    <button onClick={handleLinkedInStop} disabled={liStopping}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition disabled:opacity-50">
                      {liStopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      {liStopping ? 'Stopping…' : 'Cancel'}
                    </button>
                  )}
                  <button onClick={handleLinkedIn} disabled={liStatus === 'running' || liStatus === 'queued'}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-bold text-[#0077B5] hover:bg-blue-50 transition disabled:opacity-60">
                    {liStatus === 'running'
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
                      : liStatus === 'queued'
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Queued…</>
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
                  {/* Live screenshot */}
                  {liScreenshot ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                          {liStatus === 'running' && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                            </span>
                          )}
                          <span className="text-xs text-slate-400">Hetzner display</span>
                          {liScreenshotTs && (
                            <span className="text-[10px] text-slate-600">
                              {liScreenshotTs.toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={handleScreenshot} disabled={liScreenshotLoading}
                            className="rounded-md p-1 text-slate-400 hover:text-white transition disabled:opacity-40" title="Refresh">
                            {liScreenshotLoading
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Camera className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => setLiScreenshot(null)} className="rounded-md p-1 text-slate-400 hover:text-white transition">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <img src={liScreenshot} alt="Bot screen" className="w-full block" />
                    </div>
                  ) : liStatus === 'running' && (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                      <span className="text-xs text-slate-500">Loading live preview…</span>
                    </div>
                  )}

                  <div ref={liLogRef}
                    className="h-80 overflow-y-auto rounded-xl bg-slate-950 px-4 py-3 text-xs leading-relaxed space-y-1">
                    {liLines.length === 0 && <span className="text-slate-500">Starting bot…</span>}
                    {liLines.map((line, i) => {
                      type LogEntry = { text: string; cls: string } | null
                      const parse = (raw: string): LogEntry => {
                        if (/DAILY_LIMIT_REACHED/i.test(raw))                  return null
                        if (/\[heartbeat\]/i.test(raw))                        return null
                        if (/runAiBot\.py started/i.test(raw))                 return null
                        if (/importing open_chrome/i.test(raw))                return null
                        if (/\[JOBEZEE\] Config written/i.test(raw))           return null
                        if (/\[JOBEZEE\] Bot process started/i.test(raw))      return null
                        if (/\[JOBEZEE\] Delegating to Hetzner/i.test(raw))    return null
                        if (/\[JOBEZEE\] Saved LinkedIn session cookies found/i.test(raw)) return null
                        if (/\[JOBEZEE\] (experience_level|on_site|job_type|salary)/i.test(raw)) return null
                        if (/Extracted about company/i.test(raw))              return null
                        if (/Failed to scroll to About Company/i.test(raw))    return null
                        if (/HR info was not given/i.test(raw))                return null
                        if (/Time Posted:|Applicants:/i.test(raw))             return null
                        if (/Setting search location/i.test(raw))              return null
                        if (/Didn't find Sign in link/i.test(raw))             return null
                        if (/\[Search\] Typed|Typeahead not found|Feed step error/i.test(raw)) return null
                        if (/\[Filters\] (Looking|Found|Setting)/i.test(raw))  return null

                        const saved = raw.match(/Successfully saved "(.+?)\s*\|\s*(.+?)"\s*job/i)
                        if (saved) return { text: `✓ Applied — ${saved[1]} at ${saved[2]}`, cls: 'text-emerald-400 font-semibold' }

                        const trying = raw.match(/Trying to Apply to "(.+?)\s*\|\s*(.+?)"\s*job/i)
                        if (trying) return { text: `Applying → ${trying[1]} at ${trying[2]}`, cls: 'text-white font-medium' }

                        const already = raw.match(/Already applied to "(.+?)\s*\|\s*(.+?)"\s*job/i)
                        if (already) return { text: `Already applied — ${already[1]} at ${already[2]}`, cls: 'text-slate-600' }

                        const skip = raw.match(/[Ss]kipping "(.+?)\s*\|\s*(.+?)"/)
                          || raw.match(/[Ss]kipping "(.+?)"\s*(?:job\s*)?\((.+?)\)/)
                        if (skip) return { text: `Skipped — ${skip[1]}${skip[2] ? ' at ' + skip[2] : ''}`, cls: 'text-slate-500' }

                        if (/title doesn.*t match|Blacklisted|previously rejected/i.test(raw)) {
                          const jm = raw.match(/"(.+?)\s*\|\s*(.+?)"/)
                          return jm
                            ? { text: `Skipped — ${jm[1]} at ${jm[2]}`, cls: 'text-slate-600' }
                            : { text: 'Skipped irrelevant job', cls: 'text-slate-600' }
                        }

                        if (/Failed to apply|Failed to Easy apply|Easy apply failed/i.test(raw)) {
                          const jm = raw.match(/"(.+?)\s*\|\s*(.+?)"/)
                          return jm
                            ? { text: `Failed — ${jm[1]} at ${jm[2]}`, cls: 'text-red-400' }
                            : { text: 'Failed to apply to a job', cls: 'text-red-400' }
                        }

                        if (/Injecting .+ cookies/i.test(raw))           return { text: 'Restoring LinkedIn session…', cls: 'text-cyan-400' }
                        if (/Cookies injected/i.test(raw))               return { text: 'LinkedIn session active ✓', cls: 'text-cyan-400' }
                        if (/Cookie injection failed/i.test(raw))        return { text: 'Session expired — logging in fresh…', cls: 'text-cyan-300' }
                        if (/logging in fresh/i.test(raw))               return { text: 'Logging in to LinkedIn…', cls: 'text-cyan-300' }
                        if (/Login successful/i.test(raw))               return { text: 'Logged in ✓', cls: 'text-cyan-400' }
                        if (/login attempt failed|Couldn't Login/i.test(raw)) return { text: 'Login failed — check credentials', cls: 'text-red-400' }
                        if (/waiting for manual login/i.test(raw))       return { text: 'Waiting for manual login…', cls: 'text-amber-400' }

                        if (/Chrome session ready/i.test(raw))           return { text: 'Browser launched ✓', cls: 'text-slate-400' }
                        if (/Stealth.*navigator/i.test(raw))             return { text: 'Stealth mode active', cls: 'text-slate-600' }
                        if (/Slot available.*starting bot/i.test(raw))   return { text: 'Worker slot available — starting', cls: 'text-cyan-300' }
                        if (/Bot job accepted/i.test(raw))               return { text: 'Bot started on worker ✓', cls: 'text-cyan-300' }

                        if (/\[Search\] Navigating to Jobs/i.test(raw)) {
                          const role = raw.match(/for:\s*"(.+?)"/i)
                          return { text: `Searching LinkedIn for: ${role ? role[1] : 'jobs'}`, cls: 'text-blue-300' }
                        }
                        if (/\[Search\] Ready/i.test(raw))               return { text: 'Search results loaded ✓', cls: 'text-blue-300' }
                        if (/\[Filters\] Filters applied/i.test(raw))    return { text: 'Filters applied ✓', cls: 'text-blue-300' }
                        if (/\[Jobs\] Job listings not found/i.test(raw)) return { text: 'No jobs found for this search term', cls: 'text-amber-400' }

                        if (/\[Tailor\]/i.test(raw))                     return { text: raw.replace(/\[Tailor\]\s*/i, 'Tailoring: '), cls: 'text-violet-400' }

                        if (/\[Resume\] Sending:/i.test(raw))            return { text: raw.replace('[Resume] ', 'Resume: '), cls: 'text-blue-400' }
                        if (/\[Resume\]/i.test(raw))                     return { text: raw.replace('[Resume] ', 'Resume: '), cls: 'text-blue-400' }

                        if (/\[CAPTCHA\] Solved/i.test(raw))             return { text: 'CAPTCHA solved ✓', cls: 'text-emerald-400' }
                        if (/\[CAPTCHA\]/i.test(raw))                    return { text: 'Handling verification…', cls: 'text-amber-400' }

                        if (/daily.*apply.*limit|Easy Apply.*limit.*reached/i.test(raw))
                          return { text: 'LinkedIn daily Easy Apply limit reached', cls: 'text-amber-400' }

                        if (/\[JOBEZEE\] ERROR:|WORKER ERROR/i.test(raw))
                          return { text: raw.replace(/\[JOBEZEE\]\s*/i, ''), cls: 'text-red-400' }
                        if (/\[ERROR\]/i.test(raw))
                          return { text: raw.replace(/\[ERROR\]\s*/i, ''), cls: 'text-red-400' }

                        if (/Bot stopped by user/i.test(raw))            return { text: 'Bot stopped by user', cls: 'text-amber-400' }
                        if (/Bot finished/i.test(raw))                   return { text: 'Bot finished', cls: 'text-slate-400' }
                        if (/Bot finished \(exit code/i.test(raw))       return { text: 'Bot finished', cls: 'text-slate-400' }

                        if (/\[JOBEZEE\] Using name:/i.test(raw))        return { text: raw.replace('[JOBEZEE] ', ''), cls: 'text-slate-400' }
                        if (/\[JOBEZEE\] search_terms/i.test(raw)) {
                          const roles = raw.match(/search_terms\s*=\s*(.+)/)
                          return { text: `Roles: ${roles ? roles[1] : ''}`, cls: 'text-slate-400' }
                        }
                        if (/\[JOBEZEE\] tailor_resume/i.test(raw))      return { text: raw.replace('[JOBEZEE] ', ''), cls: 'text-slate-400' }

                        if (/Jobs Easy Applied:/i.test(raw))             return { text: raw.trim(), cls: 'text-emerald-300' }
                        if (/Total applied/i.test(raw))                  return { text: raw.trim(), cls: 'text-emerald-300' }
                        if (/Failed jobs:|Irrelevant jobs skipped/i.test(raw)) return { text: raw.trim(), cls: 'text-slate-400' }

                        const tagged = raw.match(/^\[([A-Z][A-Za-z0-9_\- ]+)\]\s+(.+)/)
                        if (tagged) return { text: `${tagged[1]}: ${tagged[2]}`, cls: 'text-slate-500' }

                        return { text: raw, cls: 'text-slate-600 text-xs' }
                      }

                      const entry = parse(line)
                      if (!entry) return null
                      return (
                        <div key={i} className={`flex items-start gap-2 ${entry.cls}`}>
                          <span className="mt-0.5 shrink-0 opacity-40">›</span>
                          <span>{entry.text}</span>
                        </div>
                      )
                    })}
                    {liStatus === 'queued' && (
                      <div className="flex gap-1.5 pt-1 text-amber-400"><span className="animate-pulse">●</span><span className="text-slate-500">waiting for worker slot…</span></div>
                    )}
                    {liStatus === 'running' && (
                      <div className="flex gap-1.5 pt-1 text-blue-400"><span className="animate-pulse">●</span><span className="text-slate-500">bot running…</span></div>
                    )}
                  </div>

                  {liStatus === 'complete' && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <p className="text-sm font-semibold text-emerald-700 flex-1">{liResult ?? 'Bot finished successfully'}</p>
                      <button onClick={clearLiState}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600 transition">Clear</button>
                    </div>
                  )}
                  {liStatus === 'queued' && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-1">
                      <p className="text-sm font-semibold text-blue-800">
                        Both workers busy — you are {liQueuePos != null ? `#${liQueuePos}` : 'next'} in queue
                      </p>
                      <p className="text-xs text-blue-700">
                        Your bot will start automatically when a slot opens. No action needed.
                      </p>
                    </div>
                  )}
                  {liStatus === 'rate_limited' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                      <p className="text-sm font-semibold text-amber-800">LinkedIn daily Easy Apply limit reached</p>
                      <p className="text-xs text-amber-700">LinkedIn limits the number of Easy Apply applications per day to prevent spam. The bot has stopped. You can try again tomorrow.</p>
                      <button onClick={clearLiState}
                        className="text-xs font-medium text-amber-600 hover:text-amber-800 transition underline">Dismiss</button>
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
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ══════════════ PROFILE BOOST TAB ══════════════ */}
      {activeTab === 'profile-boost' && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0077B5]/10 border border-[#0077B5]/20">
              <Linkedin className="h-7 w-7 text-[#0077B5]" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">Profile Boost</p>
              <p className="text-sm text-slate-400 mt-1">Coming soon — AI-powered LinkedIn profile optimization</p>
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════ CONTACTS TAB ══════════════ */}
      {activeTab === 'contacts' && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200">
              <Users className="h-7 w-7 text-slate-500" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">Contacts</p>
              <p className="text-sm text-slate-400 mt-1">Coming soon — manage and sync your professional contacts</p>
            </div>
          </div>
        </Card>
      )}

    </div>
  )
}

export default LinkedInPage
