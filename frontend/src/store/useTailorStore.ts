/**
 * Global tailor job store — state persists across navigation so the
 * tailoring pipeline keeps running in the background when the user
 * switches to a different page.
 */
import { create } from 'zustand'

export type TailorJobStatus = 'idle' | 'running' | 'complete' | 'error'

interface TailorState {
  jobId: string | null
  jobStatus: TailorJobStatus
  progressLines: string[]
  score: number | null
  hasPdf: boolean
  hasTex: boolean
  errorMsg: string | null

  // Actions
  startJob: (jobId: string) => void
  addLine: (line: string) => void
  setScore: (score: number) => void
  setComplete: (hasPdf: boolean, hasTex: boolean, score?: number | null) => void
  setError: (msg: string) => void
  reset: () => void
}

const BASE = import.meta.env.VITE_API_URL || ''

// Module-level EventSource — survives component unmounts / navigation
let _es: EventSource | null = null
let _pollInterval: ReturnType<typeof setInterval> | null = null

export const useTailorStore = create<TailorState>((set, get) => ({
  jobId: null,
  jobStatus: 'idle',
  progressLines: [],
  score: null,
  hasPdf: false,
  hasTex: false,
  errorMsg: null,

  startJob: (jobId) => {
    // Cancel any existing stream/poll
    _es?.close()
    _es = null
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }

    set({
      jobId,
      jobStatus: 'running',
      progressLines: ['Running AI pipeline — this takes 2-4 minutes...'],
      score: null,
      hasPdf: false,
      hasTex: false,
      errorMsg: null,
    })

    _openStream(jobId)
  },

  addLine: (line) => set((s) => ({ progressLines: [...s.progressLines, line] })),

  setScore: (score) => set({ score }),

  setComplete: (hasPdf, hasTex, score) =>
    set((s) => ({
      jobStatus: 'complete',
      hasPdf,
      hasTex,
      score: score ?? s.score,
      progressLines: [...s.progressLines, 'Done! Resume tailored successfully.'],
    })),

  setError: (msg) =>
    set((s) => ({
      jobStatus: 'error',
      errorMsg: msg,
      progressLines: [...s.progressLines, `[ERROR] ${msg}`],
    })),

  reset: () => {
    _es?.close()
    _es = null
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
    set({
      jobId: null,
      jobStatus: 'idle',
      progressLines: [],
      score: null,
      hasPdf: false,
      hasTex: false,
      errorMsg: null,
    })
  },
}))

// ── SSE connection ─────────────────────────────────────────────────────────────

let _errorCount = 0

function _openStream(jobId: string) {
  _errorCount = 0
  const es = new EventSource(`${BASE}/api/tailor/stream/${jobId}`)
  _es = es

  es.onmessage = (e) => {
    // SSE comment lines (keepalive) come through as empty data — ignore
    if (!e.data?.trim()) return
    _errorCount = 0   // reset on successful message

    let data: any
    try { data = JSON.parse(e.data) } catch { return }

    if (data.error) {
      // job-not-found from backend
      es.close(); _es = null
      _startPolling(jobId)
      return
    }

    const store = useTailorStore.getState()
    if (data.event === 'keywords_extracted') {
      store.addLine('[STEP] Keywords extracted — starting resume tailoring...')
    } else if (data.event === 'round_complete') {
      const s = data.evaluation?.score ?? data.score ?? 0
      store.addLine(`[ROUND] Round ${data.round} complete — score ${s}/100`)
      useTailorStore.setState({ score: s })
    } else if (data.event === 'process_complete') {
      store.addLine('[OK] Pipeline complete — compiling PDF...')
    } else if (data.event === 'done') {
      es.close(); _es = null
      if (data.status === 'error') {
        store.setError(data.error ?? 'Unknown error')
      } else {
        fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((s) => {
            store.setComplete(s.has_pdf ?? data.has_pdf ?? false, s.has_tex ?? false, s.score ?? data.score)
          })
          .catch(() => store.setComplete(data.has_pdf ?? false, false, data.score))
      }
    }
  }

  es.onerror = () => {
    _errorCount++
    // EventSource auto-reconnects — give it 3 attempts before switching to polling
    if (_errorCount >= 3) {
      es.close(); _es = null
      _startPolling(jobId)
    }
  }
}

// ── Polling fallback (when SSE fails after retries) ───────────────────────────

function _startPolling(jobId: string) {
  if (_pollInterval) return   // already polling

  _pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
      if (!res.ok) return
      const s = await res.json()
      const store = useTailorStore.getState()
      if (s.score != null) useTailorStore.setState({ score: s.score })
      if (s.status === 'complete') {
        clearInterval(_pollInterval!); _pollInterval = null
        store.setComplete(s.has_pdf ?? false, s.has_tex ?? false, s.score)
      } else if (s.status === 'error') {
        clearInterval(_pollInterval!); _pollInterval = null
        store.setError(s.error ?? 'Unknown error')
      }
    } catch {
      // network error — keep polling
    }
  }, 3000)
}
