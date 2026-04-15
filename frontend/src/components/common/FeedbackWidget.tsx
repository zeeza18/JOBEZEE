/**
 * Floating feedback widget — circle chatbot icon, draggable within the content area only.
 * Snaps to nearest edge (left edge respects sidebar boundary).
 * Captures page context automatically. Submits to POST /api/logs/feedback.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Star, Send, Loader2, Check, Bug, Lightbulb } from 'lucide-react'

const BASE  = import.meta.env.VITE_API_URL || ''
const token = () => document.cookie.match(/access_token=([^;]+)/)?.[1]
  ?? localStorage.getItem('token') ?? ''

type FeedbackType = 'bug' | 'feature' | 'general'

const TYPE_CFG: Record<FeedbackType, { icon: React.ElementType; label: string; color: string }> = {
  bug:     { icon: Bug,            label: 'Bug Report',      color: 'text-red-600    bg-red-50    border-red-200'   },
  feature: { icon: Lightbulb,      label: 'Feature Request', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  general: { icon: MessageCircle,  label: 'General',         color: 'text-cyan-600   bg-cyan-50   border-cyan-200'  },
}

const POS_KEY  = 'feedback_pos'
const BTN_SIZE = 48   // circle diameter px
const PANEL_W  = 320
const PANEL_H  = 460
const SNAP_PAD = 16

function defaultPos(minX: number) {
  return { x: window.innerWidth - BTN_SIZE - SNAP_PAD, y: window.innerHeight - BTN_SIZE - SNAP_PAD - 24 }
}

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (typeof p.x === 'number' && typeof p.y === 'number') return p
  } catch { /* ignore */ }
  return null
}

// Snap to nearest allowed horizontal edge (left edge = minX, right edge = window right)
function snapToEdge(x: number, y: number, minX: number) {
  const leftSnap  = minX + SNAP_PAD
  const rightSnap = window.innerWidth - BTN_SIZE - SNAP_PAD
  // Which edge is closer?
  const midPoint  = (leftSnap + rightSnap) / 2
  const snapX     = x < midPoint ? leftSnap : rightSnap
  const clampY    = Math.max(SNAP_PAD, Math.min(window.innerHeight - BTN_SIZE - SNAP_PAD, y))
  return { x: snapX, y: clampY }
}

interface Props { sidebarOpen: boolean }

export default function FeedbackWidget({ sidebarOpen }: Props) {
  const location = useLocation()
  // Sidebar widths match AppShell: w-60 = 240px, w-16 = 64px
  const sidebarW = sidebarOpen ? 240 : 64

  const [open,    setOpen]    = useState(false)
  const [type,    setType]    = useState<FeedbackType>('general')
  const [rating,  setRating]  = useState<number>(0)
  const [hovered, setHovered] = useState<number>(0)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [ctx,     setCtx]     = useState<Record<string, unknown>>({})
  const [pos,     setPos]     = useState<{ x: number; y: number } | null>(null)

  const dragging   = useRef(false)
  const hasDragged = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const sidebarWRef = useRef(sidebarW)
  useEffect(() => { sidebarWRef.current = sidebarW }, [sidebarW])

  // Init position
  useEffect(() => {
    const saved = loadPos()
    setPos(saved ?? defaultPos(sidebarW))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clamp into allowed zone whenever sidebar toggles
  useEffect(() => {
    setPos(prev => {
      if (!prev) return prev
      const minX = sidebarW + SNAP_PAD
      if (prev.x < minX) return { ...prev, x: minX }
      return prev
    })
  }, [sidebarW])

  // Capture context when panel opens
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

  const closePanel = () => setOpen(false)

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

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dragging.current   = true
    hasDragged.current = false
    dragOffset.current = { x: e.clientX - (pos?.x ?? 0), y: e.clientY - (pos?.y ?? 0) }
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      hasDragged.current = true
      const minX = sidebarWRef.current + SNAP_PAD
      const x = Math.max(minX, Math.min(window.innerWidth  - BTN_SIZE, e.clientX - dragOffset.current.x))
      const y = Math.max(0,    Math.min(window.innerHeight - BTN_SIZE, e.clientY - dragOffset.current.y))
      setPos({ x, y })
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      if (hasDragged.current) {
        setPos(prev => {
          if (!prev) return prev
          const snapped = snapToEdge(prev.x, prev.y, sidebarWRef.current)
          localStorage.setItem(POS_KEY, JSON.stringify(snapped))
          return snapped
        })
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  if (pos === null) return null

  const panelLeft = pos.x + PANEL_W > window.innerWidth  ? pos.x + BTN_SIZE - PANEL_W : pos.x
  const panelTop  = pos.y - PANEL_H - 8 < 0             ? pos.y + BTN_SIZE + 8        : pos.y - PANEL_H - 8

  return (
    <>
      {/* Circle trigger */}
      <div
        role="button"
        tabIndex={0}
        onMouseDown={onMouseDown}
        onClick={() => { if (!hasDragged.current) { if (open) closePanel(); else { reset(); setOpen(true) } } }}
        className="hidden md:flex fixed z-50 items-center justify-center select-none rounded-full shadow-lg bg-brand text-white active:shadow-md transition-shadow"
        style={{ left: pos.x, top: pos.y, width: BTN_SIZE, height: BTN_SIZE, cursor: 'grab' }}
        title="Feedback"
      >
        <MessageCircle className="h-5 w-5" />
      </div>

      {/* Panel */}
      {open && (
        <div
          className="hidden md:block fixed z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          style={{ left: panelLeft, top: panelTop }}
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <MessageCircle className="h-4 w-4 text-brand" />
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
                          ${s <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-1.5 text-[10px] text-slate-400 self-center">
                        {['','Poor','Fair','Good','Great','Excellent'][rating]}
                      </span>
                    )}
                  </div>
                </div>

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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none resize-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition"
                  />
                </div>

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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md">
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
