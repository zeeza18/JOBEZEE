import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, Download, Loader2, XCircle, AlertTriangle } from 'lucide-react'
import { TailorCard as TailorCardType, useTailorCards } from '../../store/useTailorCards'
import { Card } from '../../components/ui/Card'

const BASE = import.meta.env.VITE_API_URL || ''

interface Props {
  card: TailorCardType
}

export const TailorCard = ({ card }: Props) => {
  const { toggleExpanded, removeCard } = useTailorCards()
  const [downloading, setDownloading] = useState<string | null>(null)

  const download = async (endpoint: string, ext: string) => {
    setDownloading(ext)
    try {
      const res = await fetch(`${BASE}/api/tailor/${endpoint}/${card.jobId}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = card.filename ? `${card.filename}.${ext}` : `tailored_resume.${ext}`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(`Download failed: ${e?.message}`)
    } finally {
      setDownloading(null)
    }
  }

  // ── Queued ────────────────────────────────────────────────────────────────
  if (card.status === 'queued') {
    return (
      <Card className="flex items-center gap-3 p-4 border-slate-200 bg-slate-50/60 opacity-70">
        <Clock className="h-4 w-4 text-slate-400 shrink-0 animate-pulse" />
        <span className="text-sm text-slate-500">Queued — waiting for available slot…</span>
        <button onClick={() => removeCard(card.jobId)} className="ml-auto text-slate-300 hover:text-slate-500 transition">✕</button>
      </Card>
    )
  }

  // ── Running — no company name yet (wide loading card) ─────────────────────
  if (card.status === 'running' && !card.companyName) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-slate-50 to-cyan-50 p-6">
        {/* Shimmer animation */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="relative flex items-center gap-4">
          <Loader2 className="h-6 w-6 text-cyan-500 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Tailoring resume…</p>
            <p className="text-xs text-slate-400 mt-0.5">AI is analysing your job description and resume</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Running — company name known (compact row) ────────────────────────────
  if (card.status === 'running' && card.companyName) {
    return (
      <Card className="flex items-center gap-3 p-4 border-cyan-200 bg-cyan-50/30">
        <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">
            Tailoring resume for <span className="text-cyan-700">{card.companyName}</span>
          </p>
          {card.progressLines.length > 0 && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {card.progressLines[card.progressLines.length - 1]}
            </p>
          )}
        </div>
      </Card>
    )
  }

  // ── Error (includes server-restart interrupted jobs) ─────────────────────
  if (card.status === 'error') {
    const isRestart = card.errorMsg?.toLowerCase().includes('server restarted')
    return (
      <Card className={`p-4 space-y-2 ${isRestart ? 'border-amber-200 bg-amber-50/40' : 'border-red-200 bg-red-50/40'}`}>
        <div className="flex items-center gap-2">
          {isRestart
            ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
          <span className={`text-sm font-semibold ${isRestart ? 'text-amber-800' : 'text-red-700'}`}>
            {card.companyName
              ? `${isRestart ? 'Interrupted for' : 'Tailoring failed for'} ${card.companyName}`
              : isRestart ? 'Job interrupted — server restarted' : 'Tailoring failed'}
          </span>
          <button onClick={() => removeCard(card.jobId)} className={`ml-auto transition ${isRestart ? 'text-amber-300 hover:text-amber-500' : 'text-red-300 hover:text-red-500'}`}>✕</button>
        </div>
        {card.errorMsg && (
          <p className={`text-xs pl-6 ${isRestart ? 'text-amber-700' : 'text-red-600'}`}>
            {isRestart ? 'Re-paste your JD above and click Tailor to retry.' : card.errorMsg}
          </p>
        )}
      </Card>
    )
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  const scoreColor = card.score == null
    ? ''
    : card.score >= 80
    ? 'bg-emerald-100 text-emerald-700'
    : card.score >= 60
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'

  return (
    <Card className="overflow-hidden p-0">
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {card.companyName ? `Resume tailored for ${card.companyName}` : 'Resume tailored'}
          </p>
        </div>
        {card.score != null && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${scoreColor}`}>
            Score: {card.score}/100
          </span>
        )}
        {/* Download buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {card.hasPdf && (
            <button
              onClick={() => download('download', 'pdf')}
              disabled={downloading === 'pdf'}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition"
            >
              {downloading === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              PDF
            </button>
          )}
          {card.hasDocx && (
            <button
              onClick={() => download('download-docx', 'docx')}
              disabled={downloading === 'docx'}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 disabled:opacity-60 transition"
            >
              {downloading === 'docx' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Word
            </button>
          )}
        </div>
        {/* Expand toggle */}
        <button
          onClick={() => toggleExpanded(card.jobId)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
        >
          {card.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={() => removeCard(card.jobId)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Expanded details */}
      {card.expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/40">
          {/* Keywords */}
          {card.keywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Keywords ({card.keywords.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {card.keywords.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rounds */}
          {card.rounds.some(r => r.status !== 'pending') && (
            <div className="grid grid-cols-2 gap-2">
              {card.rounds.map(r => (
                <div
                  key={r.round}
                  className={`rounded-xl p-3 flex items-center gap-3 ${
                    r.status === 'complete'
                      ? 'bg-emerald-50 border border-emerald-200'
                      : r.status === 'skipped'
                      ? 'bg-slate-50 border border-slate-200 opacity-60'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-600">Round {r.round}</div>
                  <div className="text-xs text-slate-500">
                    {r.status === 'complete'
                      ? `${r.score ?? '?'}/100`
                      : r.status === 'skipped'
                      ? 'Skipped'
                      : '—'}
                  </div>
                  {r.status === 'complete' && r.score != null && (
                    <div
                      className={`ml-auto text-lg font-bold ${
                        r.score >= 80
                          ? 'text-emerald-600'
                          : r.score >= 60
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}
                    >
                      {r.score}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Log */}
          {card.progressLines.length > 0 && (
            <div className="rounded-xl bg-slate-900 p-3 font-mono text-xs space-y-0.5 max-h-40 overflow-y-auto">
              {card.progressLines.map((line, i) => (
                <div
                  key={i}
                  className={`break-all leading-relaxed ${
                    /^\[ERROR\]/i.test(line)
                      ? 'text-red-400'
                      : /^\[WARN\]/i.test(line)
                      ? 'text-amber-400'
                      : /^\[OK\]/i.test(line)
                      ? 'text-emerald-400'
                      : /^\[STEP\]/i.test(line)
                      ? 'text-cyan-300 font-semibold'
                      : /^\[ROUND\]/i.test(line)
                      ? 'text-blue-300 font-semibold'
                      : 'text-slate-300'
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default TailorCard
