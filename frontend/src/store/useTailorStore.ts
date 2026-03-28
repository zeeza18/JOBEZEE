/**
 * Global tailor job store — all state persists across navigation.
 * This includes the input JD/resume so switching to Jobs/Portfolio and
 * coming back restores exactly what the user had.
 */
import { create } from 'zustand'

export type TailorJobStatus = 'idle' | 'running' | 'complete' | 'error'

export interface RoundResult {
  round: number
  score: number | null
  status: 'pending' | 'running' | 'complete'
}

interface TailorState {
  // ── Inputs (persist across navigation) ──────────────────────────────────
  inputJd: string
  inputResume: string

  // ── Job run state ────────────────────────────────────────────────────────
  jobId: string | null
  jobStatus: TailorJobStatus
  progressLines: string[]
  keywords: string[]
  rounds: RoundResult[]
  score: number | null
  hasPdf: boolean
  hasTex: boolean
  pdflatexAvailable: boolean | null
  errorMsg: string | null

  // ── Actions ──────────────────────────────────────────────────────────────
  setInputJd: (jd: string) => void
  setInputResume: (resume: string) => void
  startJob: (jobId: string) => void
  addLine: (line: string) => void
  setKeywords: (kw: string[]) => void
  updateRound: (r: RoundResult) => void
  setComplete: (hasPdf: boolean, hasTex: boolean, pdflatexAvailable: boolean | null, score?: number | null) => void
  setError: (msg: string) => void
  reset: () => void
}

const BASE = import.meta.env.VITE_API_URL || ''

// Module-level handles — survive component unmounts / navigation
let _es: EventSource | null = null
let _pollInterval: ReturnType<typeof setInterval> | null = null
let _errorCount = 0

export const useTailorStore = create<TailorState>((set, get) => ({
  // Inputs
  inputJd: '',
  inputResume: '',

  // Job state
  jobId: null,
  jobStatus: 'idle',
  progressLines: [],
  keywords: [],
  rounds: [],
  score: null,
  hasPdf: false,
  hasTex: false,
  pdflatexAvailable: null,
  errorMsg: null,

  setInputJd: (inputJd) => set({ inputJd }),
  setInputResume: (inputResume) => set({ inputResume }),

  startJob: (jobId) => {
    _es?.close(); _es = null
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
    _errorCount = 0

    set({
      jobId,
      jobStatus: 'running',
      progressLines: ['Running AI pipeline — this takes 2-4 minutes...'],
      keywords: [],
      rounds: [
        { round: 1, score: null, status: 'pending' },
        { round: 2, score: null, status: 'pending' },
      ],
      score: null,
      hasPdf: false,
      hasTex: false,
      pdflatexAvailable: null,
      errorMsg: null,
    })

    _openStream(jobId)
  },

  addLine: (line) => set((s) => ({ progressLines: [...s.progressLines, line] })),
  setKeywords: (keywords) => set({ keywords }),
  updateRound: (updated) =>
    set((s) => ({
      rounds: s.rounds.map((r) => (r.round === updated.round ? { ...r, ...updated } : r)),
    })),

  setComplete: (hasPdf, hasTex, pdflatexAvailable, score) =>
    set((s) => ({
      jobStatus: 'complete',
      hasPdf,
      hasTex,
      pdflatexAvailable,
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
    _es?.close(); _es = null
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
    set({
      jobId: null,
      jobStatus: 'idle',
      progressLines: [],
      keywords: [],
      rounds: [],
      score: null,
      hasPdf: false,
      hasTex: false,
      pdflatexAvailable: null,
      errorMsg: null,
      // intentionally keep inputJd and inputResume
    })
  },
}))

// ── SSE ───────────────────────────────────────────────────────────────────────

function _openStream(jobId: string) {
  const es = new EventSource(`${BASE}/api/tailor/stream/${jobId}`)
  _es = es

  es.onmessage = (e) => {
    if (!e.data?.trim()) return
    _errorCount = 0

    let data: any
    try { data = JSON.parse(e.data) } catch { return }
    if (data.error) { es.close(); _es = null; _startPolling(jobId); return }

    const store = useTailorStore.getState()

    if (data.event === 'keywords_extracted') {
      const raw: string[] = [
        ...(data.keyword_analysis?.keywords ?? []),
        ...(data.keyword_analysis?.needs ?? []),
      ]
      // Filter out tool-1 error fallback strings
      const kw = raw.filter(k => !k.toLowerCase().startsWith('error') && !k.toLowerCase().startsWith('please check'))
      store.setKeywords(kw)
      store.addLine(`[STEP] ${kw.length} keywords extracted — starting Round 1...`)
      store.updateRound({ round: 1, score: null, status: 'running' })

    } else if (data.event === 'round_complete') {
      const raw = data.evaluation?.score
      const score = raw != null && raw !== '' ? Number(raw) : null
      store.updateRound({ round: data.round, score, status: 'complete' })
      store.addLine(`[ROUND] Round ${data.round} complete — score ${score ?? '?'}/100`)
      if (score != null) useTailorStore.setState({ score })
      if (data.round < 2) {
        store.updateRound({ round: data.round + 1, score: null, status: 'running' })
        store.addLine(`[STEP] Starting Round ${data.round + 1}...`)
      }

    } else if (data.event === 'process_complete') {
      store.addLine('[OK] AI complete — generating PDF...')

    } else if (data.event === 'done') {
      es.close(); _es = null
      if (data.status === 'error') {
        store.setError(data.error ?? 'Unknown error')
      } else {
        fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((s) => store.setComplete(s.has_pdf ?? false, s.has_tex ?? false, s.pdflatex_available ?? null, s.score ?? data.score))
          .catch(() => store.setComplete(data.has_pdf ?? false, false, null, data.score))
      }
    }
  }

  es.onerror = () => {
    _errorCount++
    if (_errorCount >= 3) { es.close(); _es = null; _startPolling(jobId) }
  }
}

// ── Polling fallback ───────────────────────────────────────────────────────────

function _startPolling(jobId: string) {
  if (_pollInterval) return
  _pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
      if (!res.ok) return
      const s = await res.json()
      const store = useTailorStore.getState()
      if (s.score != null) useTailorStore.setState({ score: s.score })
      if (s.status === 'complete') {
        clearInterval(_pollInterval!); _pollInterval = null
        store.setComplete(s.has_pdf ?? false, s.has_tex ?? false, s.pdflatex_available ?? null, s.score)
      } else if (s.status === 'error') {
        clearInterval(_pollInterval!); _pollInterval = null
        store.setError(s.error ?? 'Unknown error')
      }
    } catch { /* keep polling */ }
  }, 3000)
}
