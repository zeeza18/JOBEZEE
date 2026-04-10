import { useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Clock, Download, ExternalLink, FileText, Loader2, XCircle,
} from 'lucide-react'
import { TailorCard as TailorCardType, useTailorCards } from '../../store/useTailorCards'
import { Card } from '../../components/ui/Card'

const BASE = import.meta.env.VITE_API_URL || ''

interface Props { card: TailorCardType }

/* ── helpers ─────────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null
  const cls = score >= 80
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : score >= 60
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${cls}`}>
      {score}/100
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
        {score}
      </span>
    </div>
  )
}

function StepDot({ status }: { status: 'pending' | 'running' | 'complete' | 'skipped' }) {
  if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
  if (status === 'running')  return <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
  if (status === 'skipped')  return <div className="h-4 w-4 rounded-full border-2 border-slate-200 shrink-0" />
  return <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
}

/** Collapsible details panel — shown in running AND complete states */
function DetailsPanel({ card, showLog = false }: { card: TailorCardType; showLog?: boolean }) {
  const [showJd, setShowJd] = useState(false)
  const [showResume, setShowResume] = useState(false)

  const hasAny = card.jobUrl || card.jdSnippet || card.resumeSnippet || (showLog && card.progressLines.length > 0) || card.keywords.length > 0

  if (!hasAny) return null

  return (
    <div className="border-t border-slate-100 bg-slate-50/40 divide-y divide-slate-100">

      {/* Job URL */}
      {card.jobUrl && (
        <div className="px-4 py-2.5 flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <a
            href={card.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-600 hover:text-cyan-800 hover:underline truncate"
          >
            {card.jobUrl}
          </a>
        </div>
      )}

      {/* JD snippet */}
      {card.jdSnippet && (
        <div className="px-4 py-2.5">
          <button
            onClick={() => setShowJd(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition w-full"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            Job Description
            {showJd ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
          </button>
          {showJd && (
            <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto bg-white rounded-lg border border-slate-200 p-3">
              {card.jdSnippet}
            </pre>
          )}
        </div>
      )}

      {/* Resume snippet */}
      {card.resumeSnippet && (
        <div className="px-4 py-2.5">
          <button
            onClick={() => setShowResume(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition w-full"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            Resume Used
            {showResume ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
          </button>
          {showResume && (
            <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto bg-white rounded-lg border border-slate-200 p-3">
              {card.resumeSnippet}
            </pre>
          )}
        </div>
      )}

      {/* Keywords (complete only) */}
      {showLog && card.keywords.length > 0 && (
        <div className="px-4 py-2.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
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

      {/* Log (complete only) */}
      {showLog && card.progressLines.length > 0 && (
        <div className="px-4 py-2.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Log</p>
          <div className="rounded-xl bg-slate-900 p-3 font-mono text-xs space-y-0.5 max-h-40 overflow-y-auto">
            {card.progressLines.map((line, i) => (
              <div
                key={i}
                className={`break-all leading-relaxed ${
                  /^\[ERROR\]/i.test(line) ? 'text-red-400'
                  : /^\[WARN\]/i.test(line) ? 'text-amber-400'
                  : /^\[OK\]/i.test(line) ? 'text-emerald-400'
                  : /^\[STEP\]/i.test(line) ? 'text-cyan-300 font-semibold'
                  : /^\[ROUND\]/i.test(line) ? 'text-blue-300 font-semibold'
                  : 'text-slate-300'
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── main component ──────────────────────────────────────────────────────── */
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

  const dismiss = () => removeCard(card.jobId)

  /* ── QUEUED ─────────────────────────────────────────────────────────────── */
  if (card.status === 'queued') {
    return (
      <Card className="overflow-hidden p-0 border-slate-200">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/60">
          <Clock className="h-4 w-4 text-slate-400 shrink-0 animate-pulse" />
          <span className="text-sm text-slate-500 flex-1">Queued — waiting for available slot…</span>
          <button onClick={dismiss} className="text-slate-300 hover:text-slate-500 transition p-1">✕</button>
        </div>
        <DetailsPanel card={card} />
      </Card>
    )
  }

  /* ── RUNNING ─────────────────────────────────────────────────────────────── */
  if (card.status === 'running') {
    const kw   = card.keywords.length
    const r1   = card.rounds[0]
    const r2   = card.rounds[1]
    const kwStep = kw > 0 ? 'complete' : 'running'

    return (
      <Card className="overflow-hidden p-0 border-cyan-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-50/60 to-transparent">
          <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {card.companyName
                ? <>Tailoring for <span className="text-cyan-700">{card.companyName}</span></>
                : 'Analysing job description…'}
            </p>
            {!card.companyName && (
              <p className="text-xs text-slate-400 mt-0.5">Detecting company and extracting keywords</p>
            )}
          </div>
          <button
            onClick={() => toggleExpanded(card.jobId)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
          >
            {card.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={dismiss} className="text-slate-300 hover:text-slate-500 transition p-1 shrink-0">✕</button>
        </div>

        {/* Steps */}
        <div className="px-4 pb-3 pt-2 space-y-2">
          <div className="flex items-center gap-2">
            <StepDot status={kwStep} />
            <span className="text-xs text-slate-600">
              {kw > 0 ? `${kw} keywords extracted` : 'Extracting keywords…'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StepDot status={r1.status} />
            <span className="text-xs text-slate-600 w-16 shrink-0">Round 1</span>
            {r1.status === 'complete' && r1.score != null && <ScoreBar score={r1.score} />}
            {r1.status === 'running' && <span className="text-xs text-slate-400 italic">scoring…</span>}
          </div>
          <div className="flex items-center gap-2">
            <StepDot status={r2.status} />
            <span className="text-xs text-slate-600 w-16 shrink-0">
              {r2.status === 'skipped' ? 'Round 2 (skipped)' : 'Round 2'}
            </span>
            {r2.status === 'complete' && r2.score != null && <ScoreBar score={r2.score} />}
            {r2.status === 'running' && <span className="text-xs text-slate-400 italic">scoring…</span>}
          </div>
          <div className="flex items-center gap-2">
            <StepDot status="pending" />
            <span className="text-xs text-slate-400">Generating PDF & Word…</span>
          </div>
        </div>

        {/* Dropdown — always available */}
        {card.expanded && <DetailsPanel card={card} />}
      </Card>
    )
  }

  /* ── ERROR ───────────────────────────────────────────────────────────────── */
  if (card.status === 'error') {
    const isRestart = card.errorMsg?.toLowerCase().includes('server restarted')
    return (
      <Card className={`overflow-hidden p-0 ${isRestart ? 'border-amber-200' : 'border-red-200'}`}>
        <div className={`flex items-center gap-2 px-4 py-3 ${isRestart ? 'bg-amber-50/40' : 'bg-red-50/40'}`}>
          {isRestart
            ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isRestart ? 'text-amber-800' : 'text-red-700'}`}>
              {card.companyName
                ? `${isRestart ? 'Interrupted for' : 'Failed for'} ${card.companyName}`
                : isRestart ? 'Job interrupted' : 'Tailoring failed'}
            </p>
            <p className={`text-xs mt-0.5 ${isRestart ? 'text-amber-700' : 'text-red-600'}`}>
              {isRestart ? 'Re-paste your JD above and click Tailor to retry.' : card.errorMsg}
            </p>
          </div>
          <button onClick={dismiss} className={`p-1 transition ${isRestart ? 'text-amber-300 hover:text-amber-500' : 'text-red-300 hover:text-red-500'}`}>✕</button>
        </div>
        <DetailsPanel card={card} />
      </Card>
    )
  }

  /* ── COMPLETE ────────────────────────────────────────────────────────────── */
  const r1 = card.rounds[0]
  const r2 = card.rounds[1]

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {card.companyName ? `Resume tailored for ${card.companyName}` : 'Resume tailored'}
          </p>
        </div>
        <ScoreBadge score={card.score} />
        <div className="flex items-center gap-1.5 shrink-0">
          {card.hasPdf && (
            <button
              onClick={() => download('download', 'pdf')}
              disabled={downloading === 'pdf'}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition"
            >
              {downloading === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              PDF
            </button>
          )}
          {card.hasDocx && (
            <button
              onClick={() => download('download-docx', 'docx')}
              disabled={downloading === 'docx'}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 transition"
            >
              {downloading === 'docx' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Word
            </button>
          )}
        </div>
        <button
          onClick={() => toggleExpanded(card.jobId)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
        >
          {card.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={dismiss} className="p-1 text-slate-300 hover:text-slate-500 transition shrink-0">✕</button>
      </div>

      {/* Round scores always visible under header */}
      {(r1.status !== 'pending' || r2.status !== 'pending') && (
        <div className="px-4 pb-3 pt-0 grid grid-cols-2 gap-2">
          {[r1, r2].map(r => (
            <div
              key={r.round}
              className={`rounded-lg px-3 py-2 flex items-center gap-2 ${
                r.status === 'complete' ? 'bg-emerald-50 border border-emerald-100'
                : r.status === 'skipped' ? 'bg-slate-50 border border-slate-100 opacity-50'
                : 'bg-slate-50 border border-slate-100'
              }`}
            >
              <span className="text-xs text-slate-500 shrink-0">Round {r.round}</span>
              {r.status === 'complete' && r.score != null
                ? <ScoreBar score={r.score} />
                : r.status === 'skipped'
                ? <span className="text-xs text-slate-400 italic">Skipped</span>
                : <span className="text-xs text-slate-400">—</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* Expanded details */}
      {card.expanded && <DetailsPanel card={card} showLog />}
    </Card>
  )
}

export default TailorCard
