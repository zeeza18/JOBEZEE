/**
 * Store for card-based parallel tailor jobs.
 * Each card tracks one tailor job with its own SSE stream.
 */
import { create } from 'zustand'

const BASE = import.meta.env.VITE_API_URL || ''

export type CardStatus = 'queued' | 'running' | 'complete' | 'error'

export interface RoundResult {
  round: number
  score: number | null
  status: 'pending' | 'running' | 'complete' | 'skipped'
}

export interface TailorCard {
  jobId: string
  status: CardStatus
  companyName: string | null
  score: number | null
  hasPdf: boolean
  hasDocx: boolean
  filename: string | null
  errorMsg: string | null
  progressLines: string[]
  keywords: string[]
  rounds: RoundResult[]
  expanded: boolean
  createdAt: string
}

interface TailorCardsStore {
  cards: TailorCard[]
  loaded: boolean
  loadCards: () => Promise<void>
  addCard: (jobId: string, companyName: string | null) => void
  patchCard: (jobId: string, patch: Partial<TailorCard>) => void
  toggleExpanded: (jobId: string) => void
  removeCard: (jobId: string) => void
  openStream: (jobId: string) => void
}

// Per-card SSE handles
const _streams = new Map<string, EventSource>()

export const useTailorCards = create<TailorCardsStore>((set, get) => ({
  cards: [],
  loaded: false,

  loadCards: async () => {
    try {
      const res = await fetch(`${BASE}/api/tailor/my-jobs`, { credentials: 'include' })
      if (!res.ok) return
      const jobs: any[] = await res.json()
      const cards: TailorCard[] = jobs.map(j => ({
        jobId: j.job_id,
        status: j.status,
        companyName: j.company_name ?? null,
        score: j.score ?? null,
        hasPdf: j.has_pdf ?? false,
        hasDocx: j.has_docx ?? false,
        filename: j.filename ?? null,
        errorMsg: j.error_msg ?? null,
        progressLines: [],
        keywords: [],
        rounds: [
          { round: 1, score: null, status: 'pending' },
          { round: 2, score: null, status: 'pending' },
        ],
        expanded: false,
        createdAt: j.created_at ?? '',
      }))
      set({ cards, loaded: true })
      // Re-open SSE for running/queued jobs
      for (const c of cards) {
        if (c.status === 'running' || c.status === 'queued') {
          get().openStream(c.jobId)
        }
      }
    } catch {
      set({ loaded: true })
    }
  },

  addCard: (jobId, companyName) => {
    const card: TailorCard = {
      jobId,
      status: 'queued',
      companyName,
      score: null,
      hasPdf: false,
      hasDocx: false,
      filename: null,
      errorMsg: null,
      progressLines: [],
      keywords: [],
      rounds: [
        { round: 1, score: null, status: 'pending' },
        { round: 2, score: null, status: 'pending' },
      ],
      expanded: false,
      createdAt: new Date().toISOString(),
    }
    set(s => ({ cards: [card, ...s.cards] }))
  },

  patchCard: (jobId, patch) => {
    set(s => ({
      cards: s.cards.map(c => c.jobId === jobId ? { ...c, ...patch } : c),
    }))
  },

  toggleExpanded: (jobId) => {
    set(s => ({
      cards: s.cards.map(c => c.jobId === jobId ? { ...c, expanded: !c.expanded } : c),
    }))
  },

  removeCard: (jobId) => {
    _streams.get(jobId)?.close()
    _streams.delete(jobId)
    set(s => ({ cards: s.cards.filter(c => c.jobId !== jobId) }))
  },

  openStream: (jobId) => {
    if (_streams.has(jobId)) return  // already open
    const es = new EventSource(`${BASE}/api/tailor/stream/${jobId}`)
    _streams.set(jobId, es)

    es.onmessage = (e) => {
      if (!e.data?.trim()) return
      let data: any
      try { data = JSON.parse(e.data) } catch { return }
      if (data.error) { es.close(); _streams.delete(jobId); return }

      const store = useTailorCards.getState()
      const patchCard = (p: Partial<TailorCard>) => store.patchCard(jobId, p)
      const addLine = (line: string) =>
        set(s => ({
          cards: s.cards.map(c => c.jobId === jobId
            ? { ...c, progressLines: [...c.progressLines, line] }
            : c),
        }))
      const patchRound = (r: RoundResult) =>
        set(s => ({
          cards: s.cards.map(c => c.jobId === jobId
            ? { ...c, rounds: c.rounds.map(x => x.round === r.round ? { ...x, ...r } : x) }
            : c),
        }))

      if (data.event === 'company_detected') {
        patchCard({ companyName: data.company_name ?? null, status: 'running' })

      } else if (data.event === 'keywords_extracted') {
        const raw: string[] = [
          ...(data.keyword_analysis?.keywords ?? []),
          ...(data.keyword_analysis?.needs ?? []),
        ]
        const kw = raw.filter(k => !k.toLowerCase().startsWith('error'))
        patchCard({ keywords: kw, status: 'running' })
        addLine(`[STEP] ${kw.length} keywords extracted — starting Round 1...`)
        patchRound({ round: 1, score: null, status: 'running' })

      } else if (data.event === 'round_complete') {
        const score = data.evaluation?.score != null ? Number(data.evaluation.score) : null
        patchRound({ round: data.round, score, status: 'complete' })
        addLine(`[ROUND] Round ${data.round} complete — score ${score ?? '?'}/100`)
        if (score != null) patchCard({ score })
        if (data.round < 2 && score != null) {
          if (score >= 100) {
            patchRound({ round: 2, score: null, status: 'skipped' })
            addLine('[OK] Perfect score — skipping Round 2.')
          } else {
            patchRound({ round: 2, score: null, status: 'running' })
            addLine('[STEP] Starting Round 2...')
          }
        }

      } else if (data.event === 'process_complete') {
        addLine('[OK] AI complete — generating PDF...')
        es.close(); _streams.delete(jobId)
        // Switch to polling for the PDF generation phase
        _pollUntilDone(jobId)

      } else if (data.event === 'done') {
        es.close(); _streams.delete(jobId)
        if (data.status === 'error') {
          patchCard({ status: 'error', errorMsg: data.error ?? 'Unknown error' })
        } else {
          _fetchStatusAndComplete(jobId)
        }
      }
    }

    es.onerror = () => {
      // After 3 errors, switch to polling
      const cur = _errorCounts.get(jobId) ?? 0
      _errorCounts.set(jobId, cur + 1)
      if (cur + 1 >= 3) {
        es.close(); _streams.delete(jobId)
        _errorCounts.delete(jobId)
        _pollUntilDone(jobId)
      }
    }
  },
}))

const _errorCounts = new Map<string, number>()
const _polls = new Map<string, ReturnType<typeof setInterval>>()

function _fetchStatusAndComplete(jobId: string) {
  fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
    .then(r => r.json())
    .then(s => {
      useTailorCards.getState().patchCard(jobId, {
        status: s.status === 'complete' ? 'complete' : 'error',
        hasPdf: s.has_pdf ?? false,
        hasDocx: s.has_docx ?? false,
        score: s.score ?? null,
        filename: s.filename ?? null,
        errorMsg: s.error ?? null,
        companyName: s.company_name ?? useTailorCards.getState().cards.find(c => c.jobId === jobId)?.companyName ?? null,
      })
    })
    .catch(() => {})
}

function _pollUntilDone(jobId: string) {
  if (_polls.has(jobId)) return
  const id = setInterval(async () => {
    try {
      const res = await fetch(`${BASE}/api/tailor/status/${jobId}`, { credentials: 'include' })
      if (!res.ok) return
      const s = await res.json()
      if (s.status === 'complete' || s.status === 'error') {
        clearInterval(id); _polls.delete(jobId)
        useTailorCards.getState().patchCard(jobId, {
          status: s.status,
          hasPdf: s.has_pdf ?? false,
          hasDocx: s.has_docx ?? false,
          score: s.score ?? null,
          filename: s.filename ?? null,
          errorMsg: s.error ?? null,
          companyName: s.company_name ?? useTailorCards.getState().cards.find(c => c.jobId === jobId)?.companyName ?? null,
        })
      }
    } catch {}
  }, 3000)
  _polls.set(jobId, id)
}
