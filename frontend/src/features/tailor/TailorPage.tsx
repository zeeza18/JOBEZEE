import { useEffect, useRef, useState } from 'react'
import { FileText, Loader2, Upload, User } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ScorePanel } from './ScorePanel'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useTailorStore } from '../../store/useTailorStore'

type ResumeMode = 'text' | 'file' | 'profile'

const BASE = import.meta.env.VITE_API_URL || ''

const TailorPage = () => {
  const { tailor: tailorSettings } = useSettingsStore()

  // ── Global tailor state (persists across navigation) ──────────────────────
  const {
    jobId, jobStatus, progressLines, score, hasPdf, hasTex, errorMsg,
    startJob, reset,
  } = useTailorStore()

  // ── Local input state (doesn't need to persist) ───────────────────────────
  const [jd, setJd]               = useState('')
  const [resume, setResume]       = useState('')
  const [resumeMode, setResumeMode] = useState<ResumeMode>('profile')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractErr, setExtractErr] = useState<string | null>(null)
  const [profileFilename, setProfileFilename] = useState<string | null>(null)

  const logRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [progressLines])

  // Auto-load profile resume on mount
  useEffect(() => { loadFromProfile() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resume source handlers ─────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeFile(file)
    setExtractErr(null)
    setExtracting(true)
    setResume('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${BASE}/api/tailor/extract-resume-text`, {
        method: 'POST', credentials: 'include', body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Extraction failed')
      setResume(data.text)
    } catch (err: any) {
      setExtractErr(err.message ?? 'Could not extract text from file')
    } finally {
      setExtracting(false)
    }
  }

  const loadFromProfile = async () => {
    setExtractErr(null)
    setExtracting(true)
    setResume('')
    setProfileFilename(null)
    try {
      const res = await fetch(`${BASE}/api/tailor/profile-resume-text`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Failed to load profile resume')
      setResume(data.text)
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
    if (mode === 'text') { setResume(''); setResumeFile(null) }
    if (mode === 'profile') loadFromProfile()
  }

  // ── Tailor pipeline ────────────────────────────────────────────────────────

  const handleRun = async () => {
    if (!jd.trim() || !resume.trim()) return
    try {
      const res = await fetch(`${BASE}/api/tailor/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_description: jd, resume }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      startJob(data.job_id)
    } catch (err: any) {
      // Set error via store so it shows even if user navigates away and back
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

  const stageLabel: Record<typeof jobStatus, string> = {
    idle: '', running: 'Running…', complete: 'Complete', error: 'Failed',
  }

  const MODES: { key: ResumeMode; label: string; icon: React.ReactNode }[] = [
    { key: 'text',    label: 'Paste Text',   icon: <FileText className="h-3.5 w-3.5" /> },
    { key: 'file',    label: 'Upload File',  icon: <Upload   className="h-3.5 w-3.5" /> },
    { key: 'profile', label: 'From Profile', icon: <User     className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">ATS-friendly · AI-powered</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Tailor Resume</h1>
      </div>

      {/* Row 1 — JD | Resume side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

        {/* Job Description */}
        <Card className="space-y-2 p-4 md:p-5">
          <p className="text-sm md:text-base font-semibold text-slate-800">Job Description</p>
          <textarea
            className="h-52 md:h-80 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 text-sm md:text-base text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition"
            placeholder="Paste the full job description here..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            disabled={jobStatus === 'running'}
          />
        </Card>

        {/* Resume — with 3-mode selector */}
        <Card className="space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm md:text-base font-semibold text-slate-800">Your Resume</p>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
              {MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
                  disabled={jobStatus === 'running'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                    resumeMode === m.key
                      ? 'bg-white shadow-sm text-cyan-700 border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m.icon}{m.label}
                </button>
              ))}
            </div>
          </div>

          {resumeMode === 'file' && (
            <div
              onClick={() => !extracting && fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition ${
                extracting ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              {extracting ? (
                <><Loader2 className="h-6 w-6 text-cyan-500 animate-spin" /><p className="text-sm text-cyan-600">Extracting text…</p></>
              ) : resumeFile ? (
                <><FileText className="h-6 w-6 text-cyan-600" /><p className="text-sm font-medium text-slate-700">{resumeFile.name}</p><p className="text-xs text-slate-400">Click to replace</p></>
              ) : (
                <><Upload className="h-6 w-6 text-slate-400" /><p className="text-sm font-medium text-slate-600">Click to upload</p><p className="text-xs text-slate-400">PDF, DOCX, or TXT</p></>
              )}
            </div>
          )}

          {resumeMode === 'profile' && !resume && !extracting && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <User className="h-6 w-6 text-slate-400" />
              {extractErr ? (
                <p className="text-sm text-red-500">{extractErr}<br/><span className="text-slate-500 text-xs">Go to <span className="font-semibold text-slate-700">Profile → Resume</span> and re-upload your file.</span></p>
              ) : (
                <p className="text-sm text-slate-500">No resume found in profile.<br/>Upload one via <span className="font-semibold text-slate-700">Profile → Resume</span>.</p>
              )}
            </div>
          )}

          {extracting && resumeMode === 'profile' && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
              <span className="text-sm text-slate-500">Loading from profile…</span>
            </div>
          )}

          {(resumeMode === 'text' || (resume && !extracting)) && (
            <>
              {(resumeMode === 'file' || resumeMode === 'profile') && resume && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  {resumeMode === 'profile' && profileFilename
                    ? <span>Loaded: <span className="font-medium">{profileFilename}</span> — edit below if needed</span>
                    : <span>Text extracted — edit below if needed</span>
                  }
                </div>
              )}
              <textarea
                className="h-52 md:h-64 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 text-sm md:text-base text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition"
                placeholder={resumeMode === 'text' ? 'Paste your resume as plain text here...' : 'Extracted text — review and edit if needed...'}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                disabled={jobStatus === 'running'}
              />
            </>
          )}

          {extractErr && resumeMode !== 'profile' && (
            <p className="text-xs text-red-500">{extractErr}</p>
          )}
        </Card>
      </div>

      {/* Tailor / Reset buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleRun}
          disabled={jobStatus === 'running' || !jd.trim() || !resume.trim()}
          className="flex-1 py-3 text-sm md:text-base"
        >
          {jobStatus === 'running' ? 'Tailoring...' : 'Tailor Resume'}
        </Button>
        {jobStatus !== 'idle' && jobStatus !== 'running' && (
          <Button variant="ghost" onClick={reset} className="py-3 text-sm">
            New
          </Button>
        )}
      </div>

      {/* Output — visible even after navigating away and back */}
      {(jobStatus !== 'idle' || progressLines.length > 0 || score !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            {score !== null && tailorSettings.showSuggestions && <ScorePanel score={score} missing={[]} />}
            {jobStatus === 'complete' && (
              <Card className="space-y-3 p-4 md:p-5">
                <p className="text-sm md:text-base font-semibold text-slate-800">Downloads</p>
                <div className="flex flex-wrap gap-3">
                  {hasPdf && <Button onClick={() => downloadFile('download', 'tailored_resume.pdf')}>Download PDF</Button>}
                  {hasTex && <Button variant="ghost" onClick={() => downloadFile('download-tex', 'tailored_resume.tex')}>Download .tex</Button>}
                  {!hasPdf && !hasTex && <p className="text-sm text-slate-500">LaTeX output not available — check pdflatex is installed.</p>}
                </div>
              </Card>
            )}
          </div>

          {(jobStatus !== 'idle' || progressLines.length > 0) && tailorSettings.showKeywords && (
            <Card className="space-y-3 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-base font-semibold text-slate-800">Progress</p>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  jobStatus === 'running'  ? 'bg-cyan-100 text-cyan-700'       :
                  jobStatus === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                  jobStatus === 'error'    ? 'bg-red-100 text-red-700'         : ''
                }`}>{stageLabel[jobStatus]}</span>
              </div>
              <div ref={logRef} className="h-48 md:h-64 overflow-y-auto rounded-xl bg-slate-900 p-3 md:p-4 font-mono text-xs md:text-sm space-y-0.5">
                {progressLines.length === 0 && <span className="text-slate-500">Waiting for pipeline output...</span>}
                {progressLines.map((line, i) => {
                  const cls =
                    /^\[ERROR\]/i.test(line)    ? 'text-red-400' :
                    /^\[WARN\]/i.test(line)     ? 'text-amber-400' :
                    /^\[OK\]/i.test(line)       ? 'text-emerald-400' :
                    /^\[STEP\]/i.test(line)     ? 'text-cyan-300 font-semibold' :
                    /^\[Tailor\]/i.test(line)   ? 'text-violet-300' :
                    /^\[PHASE/i.test(line)      ? 'text-cyan-400 font-semibold' :
                    /^\[ROUND|^={3}/i.test(line) ? 'text-blue-300 font-semibold' :
                    /^\[MEMORY\]/i.test(line)   ? 'text-slate-400' :
                    /^\[ANALYZER\]/i.test(line) ? 'text-slate-400' :
                    /^\[INFO\]/i.test(line)     ? 'text-slate-400' :
                    /^\[STATS\]/i.test(line)    ? 'text-slate-400' :
                    'text-slate-300'
                  return (
                    <div key={i} className={`break-all leading-relaxed ${cls}`}>{line}</div>
                  )
                })}
                {jobStatus === 'running' && (
                  <div className="flex gap-1 pt-1">
                    <span className="animate-pulse text-cyan-400">●</span>
                    <span className="text-slate-400">Processing...</span>
                  </div>
                )}
              </div>
              {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default TailorPage
