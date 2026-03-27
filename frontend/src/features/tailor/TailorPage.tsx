import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, Download, FileText, Loader2, Upload, User, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useTailorStore } from '../../store/useTailorStore'

type ResumeMode = 'text' | 'file' | 'profile'

const BASE = import.meta.env.VITE_API_URL || ''

const TailorPage = () => {
  const {
    inputJd, inputResume, setInputJd, setInputResume,
    jobId, jobStatus, progressLines, keywords, rounds, score,
    hasPdf, hasTex, pdflatexAvailable, errorMsg,
    startJob, reset,
  } = useTailorStore()

  // ── Local-only UI state (doesn't need to persist) ─────────────────────────
  const [resumeMode, setResumeMode] = useState<ResumeMode>('profile')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractErr, setExtractErr] = useState<string | null>(null)
  const [profileFilename, setProfileFilename] = useState<string | null>(null)

  const logRef  = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [progressLines])

  // Load profile resume only if inputResume is still empty
  useEffect(() => {
    if (!inputResume) loadFromProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resume source handlers ────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeFile(file)
    setExtractErr(null)
    setExtracting(true)
    setInputResume('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${BASE}/api/tailor/extract-resume-text`, {
        method: 'POST', credentials: 'include', body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Extraction failed')
      setInputResume(data.text)
    } catch (err: any) {
      setExtractErr(err.message ?? 'Could not extract text from file')
    } finally {
      setExtracting(false)
    }
  }

  const loadFromProfile = async () => {
    setExtractErr(null)
    setExtracting(true)
    setProfileFilename(null)
    try {
      const res = await fetch(`${BASE}/api/tailor/profile-resume-text`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Failed to load profile resume')
      setInputResume(data.text)
      setProfileFilename(data.filename ?? null)
    } catch (err: any) {
      setExtractErr(err.message ?? 'Could not load resume from profile')
    } finally {
      setExtracting(false)
    }
  }

  const switchMode = (mode: ResumeMode) => {
    setResumeMode(mode)
    setExtractErr(null)
    if (mode !== 'file') setResumeFile(null)
    if (mode !== 'profile') setProfileFilename(null)
    if (mode === 'text') { setInputResume(''); setResumeFile(null) }
    if (mode === 'profile') loadFromProfile()
  }

  // ── Run ───────────────────────────────────────────────────────────────────

  const handleRun = async () => {
    if (!inputJd.trim() || !inputResume.trim()) return
    try {
      const res = await fetch(`${BASE}/api/tailor/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_description: inputJd, resume: inputResume }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      startJob(data.job_id)
    } catch (err: any) {
      useTailorStore.getState().setError(err.message ?? 'Failed to start job')
    }
  }

  const downloadFile = (endpoint: string, filename: string) => {
    if (!jobId) return
    const a = document.createElement('a')
    a.href = `${BASE}/api/tailor/${endpoint}/${jobId}`
    a.download = filename
    a.click()
  }

  const MODES: { key: ResumeMode; label: string; icon: React.ReactNode }[] = [
    { key: 'text',    label: 'Paste Text',   icon: <FileText className="h-3.5 w-3.5" /> },
    { key: 'file',    label: 'Upload File',  icon: <Upload   className="h-3.5 w-3.5" /> },
    { key: 'profile', label: 'From Profile', icon: <User     className="h-3.5 w-3.5" /> },
  ]

  const isRunning = jobStatus === 'running'
  const showResults = jobStatus !== 'idle' || progressLines.length > 0

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">ATS-friendly · AI-powered</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Tailor Resume</h1>
      </div>

      {/* Inputs — JD + Resume */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="space-y-2 p-4 md:p-5">
          <p className="text-sm md:text-base font-semibold text-slate-800">Job Description</p>
          <textarea
            className="h-52 md:h-80 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition"
            placeholder="Paste the full job description here..."
            value={inputJd}
            onChange={(e) => setInputJd(e.target.value)}
            disabled={isRunning}
          />
        </Card>

        <Card className="space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm md:text-base font-semibold text-slate-800">Your Resume</p>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
              {MODES.map(m => (
                <button key={m.key} onClick={() => switchMode(m.key)} disabled={isRunning}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                    resumeMode === m.key
                      ? 'bg-white shadow-sm text-cyan-700 border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {m.icon}{m.label}
                </button>
              ))}
            </div>
          </div>

          {resumeMode === 'file' && (
            <div onClick={() => !extracting && fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition ${
                extracting ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
              }`}>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />
              {extracting
                ? <><Loader2 className="h-6 w-6 text-cyan-500 animate-spin" /><p className="text-sm text-cyan-600">Extracting text…</p></>
                : resumeFile
                  ? <><FileText className="h-6 w-6 text-cyan-600" /><p className="text-sm font-medium text-slate-700">{resumeFile.name}</p><p className="text-xs text-slate-400">Click to replace</p></>
                  : <><Upload className="h-6 w-6 text-slate-400" /><p className="text-sm font-medium text-slate-600">Click to upload</p><p className="text-xs text-slate-400">PDF, DOCX, or TXT</p></>
              }
            </div>
          )}

          {resumeMode === 'profile' && !inputResume && !extracting && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <User className="h-6 w-6 text-slate-400" />
              {extractErr
                ? <p className="text-sm text-red-500">{extractErr}<br/><span className="text-xs text-slate-500">Go to <span className="font-semibold text-slate-700">Profile → Resume</span> and re-upload.</span></p>
                : <p className="text-sm text-slate-500">No resume found in profile.<br/>Upload one via <span className="font-semibold text-slate-700">Profile → Resume</span>.</p>
              }
            </div>
          )}

          {extracting && resumeMode === 'profile' && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
              <span className="text-sm text-slate-500">Loading from profile…</span>
            </div>
          )}

          {(resumeMode === 'text' || (inputResume && !extracting)) && (
            <>
              {(resumeMode === 'file' || resumeMode === 'profile') && inputResume && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  {resumeMode === 'profile' && profileFilename
                    ? <span>Loaded: <span className="font-medium">{profileFilename}</span> — edit if needed</span>
                    : <span>Text extracted — edit if needed</span>
                  }
                </div>
              )}
              <textarea
                className="h-52 md:h-64 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition"
                placeholder={resumeMode === 'text' ? 'Paste your resume as plain text here...' : 'Extracted text — review and edit if needed...'}
                value={inputResume}
                onChange={(e) => setInputResume(e.target.value)}
                disabled={isRunning}
              />
            </>
          )}
          {extractErr && resumeMode !== 'profile' && <p className="text-xs text-red-500">{extractErr}</p>}
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleRun}
          disabled={isRunning || !inputJd.trim() || !inputResume.trim()}
          className="flex-1 py-3 text-sm md:text-base"
        >
          {isRunning ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Tailoring…</> : 'Tailor Resume'}
        </Button>
        {(jobStatus === 'complete' || jobStatus === 'error') && (
          <Button variant="ghost" onClick={reset} className="py-3 text-sm">New</Button>
        )}
      </div>

      {/* ── Results area ─────────────────────────────────────────────────────── */}
      {showResults && (
        <div className="space-y-4">

          {/* Keywords */}
          {keywords.length > 0 && (
            <Card className="p-4 md:p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                Extracted Keywords <span className="text-xs font-normal text-slate-400 ml-1">({keywords.length})</span>
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {kw}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Round progress */}
          {rounds.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rounds.map((r) => (
                <Card key={r.round} className={`p-4 flex items-center gap-4 ${
                  r.status === 'complete' ? 'border-emerald-200 bg-emerald-50/40' :
                  r.status === 'running'  ? 'border-cyan-200 bg-cyan-50/40' :
                  'border-slate-200 bg-slate-50/40'
                }`}>
                  <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                    r.status === 'complete' ? 'bg-emerald-100' :
                    r.status === 'running'  ? 'bg-cyan-100'    : 'bg-slate-100'
                  }`}>
                    {r.status === 'complete' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                     r.status === 'running'  ? <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" /> :
                                               <Clock className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">Round {r.round}</p>
                    <p className="text-xs text-slate-500">
                      {r.status === 'complete'
                        ? r.score != null && r.score > 0
                          ? `Score: ${r.score}/100`
                          : 'Complete (score unavailable)'
                        : r.status === 'running' ? 'AI tailoring in progress…'
                        : 'Waiting…'}
                    </p>
                  </div>
                  {r.status === 'complete' && r.score != null && r.score > 0 && (
                    <div className={`flex-shrink-0 text-2xl font-bold tabular-nums ${
                      r.score >= 80 ? 'text-emerald-600' :
                      r.score >= 60 ? 'text-amber-500'  : 'text-red-500'
                    }`}>
                      {r.score}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Downloads — shown as soon as available */}
          {jobStatus === 'complete' && (
            <Card className="p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Downloads</p>
                {score != null && score > 0 && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                    score >= 60 ? 'bg-amber-100 text-amber-700'    : 'bg-red-100 text-red-700'
                  }`}>Final score: {score}/100</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {hasPdf && (
                  <button onClick={() => downloadFile('download', 'tailored_resume.pdf')}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                )}
                {hasTex && (
                  <button onClick={() => downloadFile('download-tex', 'tailored_resume.tex')}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 transition">
                    <Download className="h-4 w-4" /> Download .tex
                  </button>
                )}
                {!hasPdf && !hasTex && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {pdflatexAvailable === false
                      ? 'pdflatex not installed on server — install MiKTeX or TeX Live to enable PDF.'
                      : 'PDF generation failed — check server logs.'}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Log */}
          <Card className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Progress</p>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isRunning           ? 'bg-cyan-100 text-cyan-700'       :
                jobStatus === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                jobStatus === 'error'    ? 'bg-red-100 text-red-700'         : ''
              }`}>
                {isRunning ? 'Running…' : jobStatus === 'complete' ? 'Complete' : jobStatus === 'error' ? 'Failed' : ''}
              </span>
            </div>
            <div ref={logRef} className="h-40 md:h-52 overflow-y-auto rounded-xl bg-slate-900 p-3 font-mono text-xs space-y-0.5">
              {progressLines.length === 0 && <span className="text-slate-500">Waiting for pipeline output...</span>}
              {progressLines.map((line, i) => (
                <div key={i} className={`break-all leading-relaxed ${
                  /^\[ERROR\]/i.test(line)  ? 'text-red-400'    :
                  /^\[WARN\]/i.test(line)   ? 'text-amber-400'  :
                  /^\[OK\]/i.test(line)     ? 'text-emerald-400':
                  /^\[STEP\]/i.test(line)   ? 'text-cyan-300 font-semibold' :
                  /^\[ROUND\]/i.test(line)  ? 'text-blue-300 font-semibold' :
                  'text-slate-300'
                }`}>{line}</div>
              ))}
              {isRunning && (
                <div className="flex gap-1 pt-1">
                  <span className="animate-pulse text-cyan-400">●</span>
                  <span className="text-slate-400">Processing...</span>
                </div>
              )}
            </div>
            {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>}
          </Card>

        </div>
      )}
    </div>
  )
}

export default TailorPage
