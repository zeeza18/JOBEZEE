import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { resumeBuilderApi } from '../../../lib/api'
import type { ResumeScoreResponse } from '../../../lib/api'
import { useResumeMaker } from '../store/useResumeMaker'

const SECTION_LABELS: Record<string, string> = {
  summary: 'Summary', experience: 'Experience', education: 'Education',
  skills: 'Skills', projects: 'Projects', certifications: 'Certifications',
}

export function ScorePanel() {
  const { activeId, jobDescription, setJobDescription } = useResumeMaker()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResumeScoreResponse | null>(null)

  const runScore = async () => {
    if (!activeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await resumeBuilderApi.score(activeId, jobDescription)
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scoring failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Paste a job description (optional) — used for scoring and bullet suggestions"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      <Button size="sm" variant="secondary" onClick={runScore} disabled={loading || !activeId}
        icon={loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}>
        {loading ? 'Scoring…' : 'Check ATS score'}
      </Button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && (
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800">{result.score}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          {result.matched.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.matched.map((m) => (
                <span key={m} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {m}
                </span>
              ))}
            </div>
          )}
          {result.missing.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.missing.map((m) => (
                <span key={m} className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  <XCircle className="h-2.5 w-2.5" /> {m}
                </span>
              ))}
            </div>
          )}
          {result.suggestions.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-600">
              {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
          {result.item_feedback.length > 0 && (
            <div className="space-y-1.5 border-t border-slate-200 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Specific fixes</p>
              {result.item_feedback.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 rounded-lg bg-white p-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <div>
                    <span className="font-semibold text-slate-700">{SECTION_LABELS[item.section] ?? item.section}: </span>
                    <span className="italic text-slate-500">"{item.snippet}"</span>
                    <p className="text-slate-600">{item.issue}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
