import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/common/SectionHeader'
import { ScorePanel } from './ScorePanel'

type JobStatus = 'idle' | 'running' | 'complete' | 'error'

interface ProgressEvent {
  event?: string
  status?: string
  round?: number
  evaluation?: { score?: number }
  score?: number
  has_pdf?: boolean
  error?: string
}

const TailorPage = () => {
  const [jd, setJd] = useState('')
  const [resume, setResume] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle')
  const [progressLines, setProgressLines] = useState<string[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [hasPdf, setHasPdf] = useState(false)
  const [hasTex, setHasTex] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Auto-scroll progress log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [progressLines])

  // Cleanup SSE on unmount
  useEffect(() => () => { esRef.current?.close() }, [])

  const handleRun = async () => {
    if (!jd.trim() || !resume.trim()) return
    setJobStatus('running')
    setProgressLines([])
    setScore(null)
    setHasPdf(false)
    setHasTex(false)
    setErrorMsg(null)
    setJobId(null)
    esRef.current?.close()

    try {
      const res = await fetch('/api/tailor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_description: jd, resume }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      const id: string = data.job_id
      setJobId(id)
      addLine('Job started — connecting to stream...')
      openStream(id)
    } catch (err: any) {
      setJobStatus('error')
      setErrorMsg(err.message ?? 'Failed to start job')
    }
  }

  const addLine = (line: string) =>
    setProgressLines((prev) => [...prev, line])

  const openStream = (id: string) => {
    const es = new EventSource(`/api/tailor/stream/${id}`)
    esRef.current = es

    es.onmessage = (e) => {
      const data: ProgressEvent = JSON.parse(e.data)

      if (data.event === 'keywords_extracted') {
        addLine('Tool 1 (GPT-4o): Keywords extracted')
      } else if (data.event === 'round_complete') {
        const s = data.evaluation?.score ?? 0
        addLine(`Round ${data.round} complete — score ${s}/100`)
        setScore(s)
      } else if (data.event === 'done') {
        if (data.status === 'error') {
          setJobStatus('error')
          setErrorMsg(data.error ?? 'Unknown error')
        } else {
          setJobStatus('complete')
          if (data.score != null) setScore(data.score)
          setHasPdf(data.has_pdf ?? false)
          addLine('Done! Resume tailored successfully.')
        }
        es.close()
        // fetch final status to check for tex
        fetch(`/api/tailor/status/${id}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((s) => {
            setHasTex(s.has_tex ?? false)
            setHasPdf(s.has_pdf ?? false)
            if (s.score != null) setScore(s.score)
          })
          .catch(() => {})
      }
    }

    es.onerror = () => {
      es.close()
      // Fall back to polling if SSE fails
      pollStatus(id)
    }
  }

  const pollStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tailor/status/${id}`, { credentials: 'include' })
        const s = await res.json()
        if (s.score != null) setScore(s.score)
        if (s.status === 'complete') {
          setJobStatus('complete')
          setHasPdf(s.has_pdf ?? false)
          setHasTex(s.has_tex ?? false)
          addLine('Done! Resume tailored successfully.')
          clearInterval(interval)
        } else if (s.status === 'error') {
          setJobStatus('error')
          setErrorMsg(s.error ?? 'Unknown error')
          clearInterval(interval)
        }
      } catch { clearInterval(interval) }
    }, 3000)
  }

  const downloadFile = (endpoint: string, filename: string) => {
    if (!jobId) return
    const a = document.createElement('a')
    a.href = `/api/tailor/${endpoint}/${jobId}`
    a.download = filename
    a.click()
  }

  const stageLabel: Record<JobStatus, string> = {
    idle: '',
    running: 'Running pipeline...',
    complete: 'Complete',
    error: 'Failed',
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Tailor resume" eyebrow="ATS-friendly • AI-powered" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left — inputs */}
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Job description</p>
            <textarea
              className="h-52 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Paste the full job description here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              disabled={jobStatus === 'running'}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Your resume (plain text)</p>
            <textarea
              className="h-64 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Paste your resume as plain text here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              disabled={jobStatus === 'running'}
            />
          </div>
          <Button
            onClick={handleRun}
            disabled={jobStatus === 'running' || !jd.trim() || !resume.trim()}
            className="w-full"
          >
            {jobStatus === 'running' ? 'Tailoring...' : 'Tailor Resume'}
          </Button>
        </Card>

        {/* Right — output */}
        <div className="space-y-4">
          {/* Score */}
          {score !== null && (
            <ScorePanel score={score} missing={[]} />
          )}

          {/* Progress log */}
          {(jobStatus !== 'idle' || progressLines.length > 0) && (
            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">Progress</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  jobStatus === 'running' ? 'bg-cyan-100 text-cyan-700' :
                  jobStatus === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                  jobStatus === 'error' ? 'bg-red-100 text-red-700' : ''
                }`}>
                  {stageLabel[jobStatus]}
                </span>
              </div>
              <div
                ref={logRef}
                className="h-40 overflow-y-auto rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-300 space-y-1"
              >
                {progressLines.length === 0 && (
                  <span className="text-slate-500">Waiting for pipeline output...</span>
                )}
                {progressLines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-500 select-none">{String(i + 1).padStart(2, '0')}</span>
                    <span>{line}</span>
                  </div>
                ))}
                {jobStatus === 'running' && (
                  <div className="flex gap-1 pt-1">
                    <span className="animate-pulse text-cyan-400">●</span>
                    <span className="text-slate-400">Processing...</span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
            </Card>
          )}

          {/* Downloads */}
          {jobStatus === 'complete' && (
            <Card className="space-y-3">
              <p className="text-sm font-medium text-slate-800">Downloads</p>
              <div className="flex flex-wrap gap-3">
                {hasPdf && (
                  <Button onClick={() => downloadFile('download', 'tailored_resume.pdf')}>
                    Download PDF
                  </Button>
                )}
                {hasTex && (
                  <Button variant="ghost" onClick={() => downloadFile('download-tex', 'tailored_resume.tex')}>
                    Download .tex
                  </Button>
                )}
                {!hasPdf && !hasTex && (
                  <p className="text-sm text-slate-500">
                    LaTeX output not available — check that pdflatex is installed.
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default TailorPage
