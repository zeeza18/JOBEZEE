import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { resumeBuilderApi } from '../../../lib/api'
import type { ResumeScoreResponse } from '../../../lib/api'

export function ScorePanel() {
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResumeScoreResponse | null>(null)

  const runScore = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await resumeBuilderApi.score(jobDescription)
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
        placeholder="Paste a job description for a fit score (optional)"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      <Button size="sm" variant="secondary" onClick={runScore} disabled={loading}
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
        </div>
      )}
    </div>
  )
}
