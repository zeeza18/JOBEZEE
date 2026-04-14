/**
 * Floating feedback widget — draggable, collapsed by default.
 * Click the icon to expand. Drag to any position.
 * Captures page context automatically: URL, profile, tracker status, news.
 * Submits to POST /api/logs/feedback.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquarePlus, X, Star, Send, Loader2, Check, Bug, Lightbulb, MessageCircle, ChevronLeft } from 'lucide-react'

const BASE  = import.meta.env.VITE_API_URL || ''
const token = () => document.cookie.match(/access_token=([^;]+)/)?.[1]
  ?? localStorage.getItem('token') ?? ''

type FeedbackType = 'bug' | 'feature' | 'general'

const TYPE_CFG: Record<FeedbackType, { icon: React.ElementType; label: string; color: string }> = {
  bug:     { icon: Bug,           label: 'Bug Report',      color: 'text-red-600    bg-red-50    border-red-200'   },
  feature: { icon: Lightbulb,     label: 'Feature Request', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  general: { icon: MessageCircle, label: 'General',         color: 'text-cyan-600   bg-cyan-50   border-cyan-200'  },
}

const DISMISSED_KEY = 'feedback_dismissed'

const MINI_W  = 36    // collapsed icon size
const MINI_H  = 36
const BTN_W   = 148  // expanded button group width
const BTN_H   = 42
const PANEL_W = 320
const PANEL_H = 460

export default function FeedbackWidget() {
  const location = useLocation()

  // Collapsed by default on every startup
  const [expanded, setExpanded] = useState(false)
  const [open,     setOpen]     = useState(false)
  const [type,     setType]     = useState<FeedbackType>('general')
  const [rating,   setRating]   = useState<number>(0)
  const [hovered,  setHovered]  = useState<number>(0)
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState('')
  const [ctx,      setCtx]      = useState<Record<string, unknown>>({})

  // Draggable position — bottom-right on first mount
  const [pos,      setPos]      = useState<{ x: number; y: number } | null>(null)
  const dragging    = useRef(false)
  const hasDragged  = useRef(false)
  const dragOffset  = useRef({ x: 0, y: 0 })

  // Set default position bottom-right on first mount
  useEffect(() => {
    setPos({
      x: window.innerWidth  - BTN_W - 24,
      y: window.innerHeight - BTN_H - 24,
    })
  }, [])

  // Auto-capture context when panel opens
  useEffect(() => {
    if (!open) return
    const snapshot: Record<string, unknown> = {
      page:       location.pathname,
      url:        window.location.href,
      user_agent: navigator.userAgent,
      viewport:   `${window.innerWidth}x${window.innerHeight}`,
      timestamp:  new Date().toISOString(),
    }
    const nameEl    = document.querySelector('[data-ctx="profile-name"]')
    if (nameEl) snapshot.profile_name = nameEl.textContent
    const trackerEl = document.querySelector('[data-ctx="tracker-count"]')
    if (trackerEl) snapshot.tracker_jobs = trackerEl.textContent
    const appliedEl = document.querySelector('[data-ctx="applied-count"]')
    if (appliedEl) snapshot.applied_count = appliedEl.textContent
    const newsEls   = document.querySelectorAll('[data-ctx="news-item"]')
    if (newsEls.length) snapshot.news_visible = newsEls.length
    const jobEls    = document.querySelectorAll('[data-ctx="job-card"]')
    if (jobEls.length) snapshot.jobs_visible = jobEls.length
    setCtx(snapshot)
  }, [open, location.pathname])

  const reset = () => {
    setType('general'); setRating(0); setHovered(0)
    setMessage(''); setSent(false); setError('')
  }

  const closePanel = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setOpen(false)
  }

  const submit = async () => {
    if (!message.trim()) { setError('Please describe the issue or idea.'); return }
    setSending(true); setError('')
    try {
      const res = await fetch(`${BASE}/api/logs/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          type,
          rating:  rating || null,
          message: message.trim(),
          page:    location.pathname,
          metadata: ctx,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setSent(true)
      setTimeout(() => { setOpen(false); reset() }, 2200)
    } catch {
      setError('Could not send — try again.')
    }
    setSending(false)
  }

  // ── Drag logic ────────────────────────────────────────────────────────────
  const currentW = expanded ? BTN_W : MINI_W
  const currentH = expanded ? BTN_H : MINI_H

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragging.current   = true
    hasDragged.current = false
    dragOffset.current = {
      x: e.clientX - (pos?.x ?? 0),
      y: e.clientY - (pos?.y ?? 0),
    }
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      hasDragged.current = true
      // Clamp to viewport — no edge snap, free positioning
      const w = expanded ? BTN_W : MINI_W
      const h = expanded ? BTN_H : MINI_H
      const x = Math.max(0, Math.min(window.innerWidth  - w, e.clientX - dragOffset.current.x))
      const y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - dragOffset.current.y))
      setPos({ x, y })
    }

    const onUp = () => {
      dragging.current = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [expanded])

  if (pos === null) return null

  // Panel position: prefer above button, fall back to below; prefer right-aligned, fall back to left
  const panelLeft = pos.x + PANEL_W > window.innerWidth  ? pos.x + currentW - PANEL_W : pos.x
  const panelTop  = pos.y - PANEL_H - 8 < 0             ? pos.y + currentH + 8        : pos.y - PANEL_H - 8

  return (
    <>
      {/* Floating trigger — draggable wrapper */}
      <div
        className={`hidden md:flex fixed z-50 items-stretch select-none transition-all`}
        style={{ left: pos.x, top: pos.y, cursor: dragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
      >
        {!expanded ? (
          /* ── Collapsed state: small icon pill ── */
          <button
            onClick={() => { if (!hasDragged.current) setExpanded(true) }}
            style={{ cursor: 'pointer' }}
            title="Open feedback"
            className="flex items-center justify-center h-9 w-9 rounded-full shadow-md bg-gradient-to-br from-cyan-500 to-sky-500 text-white hover:shadow-cyan-400/50 hover:scale-110 transition-all"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        ) : (
          /* ── Expanded state: full button group ── */
          <>
            {/* Collapse arrow */}
            <button
              onClick={() => { setExpanded(false); setOpen(false) }}
              style={{ cursor: 'pointer' }}
              title="Collapse feedback"
              className="flex items-center justify-center rounded-l-full shadow-lg px-2 bg-sky-400 text-white/80 hover:bg-sky-600 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>

            {/* Feedback button */}
            <button
              onClick={() => { if (!hasDragged.current) { if (open) { closePanel() } else { reset(); setOpen(true) } } }}
              style={{ cursor: 'pointer' }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5"
            >
              <MessageSquarePlus className="h-4 w-4" /> Feedback
            </button>

            {/* Dismiss X — collapses back to icon */}
            <button
              onClick={() => { setExpanded(false); setOpen(false) }}
              style={{ cursor: 'pointer' }}
              title="Collapse"
              className="flex items-center justify-center rounded-r-full shadow-lg px-2.5 bg-sky-500 text-white/80 hover:bg-red-400 hover:text-white transition-colors border-l border-sky-400/40"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      {/* Panel */}
      {open && expanded && (
        <div
          className="hidden md:block fixed z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          style={{ left: panelLeft, top: panelTop }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <MessageSquarePlus className="h-4 w-4 text-cyan-500" />
            <p className="text-sm font-semibold text-slate-800">Send Feedback</p>
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]">{location.pathname}</span>
            <button onClick={closePanel} className="ml-auto p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {sent ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Thanks for the feedback!</p>
                <p className="text-xs text-slate-400 text-center">We read every message and use it to improve JOBEZEE.</p>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(TYPE_CFG) as FeedbackType[]).map(t => {
                    const cfg = TYPE_CFG[t]
                    const Icon = cfg.icon
                    return (
                      <button key={t} onClick={() => setType(t)}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-semibold transition-all
                          ${type === t ? cfg.color : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300 hover:text-slate-600'}`}>
                        <Icon className="h-4 w-4" />
                        {cfg.label.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>

                {/* Star rating */}
                <div>
                  <p className="text-[10px] text-slate-500 mb-1.5">Rate your experience</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s}
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                        className="transition-transform hover:scale-110">
                        <Star className={`h-5 w-5 transition-colors
                          ${s <= (hovered || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'}`} />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-1.5 text-[10px] text-slate-400 self-center">
                        {['','Poor','Fair','Good','Great','Excellent'][rating]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-[10px] text-slate-500 mb-1.5">
                    {type === 'bug'     ? 'What went wrong? Steps to reproduce?' :
                     type === 'feature' ? 'What would you like to see?' :
                                          'What\'s on your mind?'}
                  </p>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Tell us more…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none resize-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
                  />
                </div>

                {/* Context preview */}
                <details className="group">
                  <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600 transition-colors list-none flex items-center gap-1">
                    <span className="group-open:hidden">▶</span>
                    <span className="hidden group-open:inline">▼</span>
                    Auto-captured context ({Object.keys(ctx).length} fields)
                  </summary>
                  <div className="mt-1.5 rounded-lg bg-slate-50 border border-slate-100 p-2 max-h-24 overflow-y-auto">
                    {Object.entries(ctx).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[10px]">
                        <span className="text-slate-400 shrink-0">{k}:</span>
                        <span className="text-slate-600 truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </details>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button onClick={submit} disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-200">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
