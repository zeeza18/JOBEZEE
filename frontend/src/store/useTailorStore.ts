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

export const useTailorStore = create<TailorState>((set, get) => ({
  jobId: null,
  jobStatus: 'idle',
  progressLines: [],
  score: null,
  hasPdf: false,
  hasTex: false,
  errorMsg: null,

  startJob: (jobId) => {
    // Close any existing stream
    _es?.close()
    _es = null

    set({
      jobId,
      jobStatus: 'running',
      progressLines: ['Job started — connecting to stream...'],
      score: null,
      hasPdf: false,
      hasTex: false,
      errorMsg: null,
    })

    const es = new EventSource(`${BASE}/api/tailor/stream/${jobId}`)
    _es = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.event === 'keywords_extracted') {
        get().addLine('Tool 1 (GPT-4o): Keywords extracted')
      } else if (data.event === 'round_complete') {
        const s = data.evaluation?.score ?? 0
        get().addLine(`Round ${data.round} complete — score ${s}/100`)
        set({ score: s })
      } else if (data.event === 'done') {
        es.close()
        _es = null
        if (data.status === 'error') {
          get().setError(data.error ?? 'Unknown error')
        } else {
          // Fetch final status to confirm has_tex
          fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
            .then((r) => r.json())
            .then((s) => {
              get().setComplete(
                s.has_pdf ?? data.has_pdf ?? false,
                s.has_tex ?? false,
                s.score ?? data.score,
              )
            })
            .catch(() => {
              get().setComplete(data.has_pdf ?? false, false, data.score)
            })
        }
      }
    }

    es.onerror = () => {
      es.close()
      _es = null
      // Fall back to polling
      _startPolling(jobId)
    }
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

// ── Polling fallback (when SSE fails) ─────────────────────────────────────────

function _startPolling(jobId: string) {
  const store = useTailorStore.getState()
  store.addLine('Stream disconnected — polling for status...')

  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
      const s = await res.json()
      if (s.score != null) useTailorStore.setState({ score: s.score })
      if (s.status === 'complete') {
        clearInterval(interval)
        useTailorStore.getState().setComplete(s.has_pdf ?? false, s.has_tex ?? false, s.score)
      } else if (s.status === 'error') {
        clearInterval(interval)
        useTailorStore.getState().setError(s.error ?? 'Unknown error')
      }
    } catch {
      clearInterval(interval)
    }
  }, 3000)
}
