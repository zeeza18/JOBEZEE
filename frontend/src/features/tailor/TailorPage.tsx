import { useEffect, useRef, useState } from 'react'
import { FileText, Loader2, Upload, User } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useTailorCards } from '../../store/useTailorCards'
import { TailorCard } from './TailorCard'

type ResumeMode = 'text' | 'file' | 'profile'

const BASE = import.meta.env.VITE_API_URL || ''

const TailorPage = () => {
  const { cards, loaded, loadCards, addCard, openStream } = useTailorCards()
  const [workerInfo, setWorkerInfo] = useState<{ max_workers: number; active: number } | null>(null)

  // ── Input state ───────────────────────────────────────────────────────────
  const [inputJd, setInputJd] = useState('')
  const [inputResume, setInputResume] = useState('')

  // ── Resume source state ───────────────────────────────────────────────────
  const [resumeMode, setResumeMode] = useState<ResumeMode>('profile')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractErr, setExtractErr] = useState<string | null>(null)
  const [profileFilename, setProfileFilename] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Load cards from DB on mount + fetch worker slot info
  useEffect(() => {
    if (!loaded) loadCards()
    fetch(`${BASE}/api/tailor/worker-info`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setWorkerInfo(d) })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleRun = async () => {
    if (!inputJd.trim() || !inputResume.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`${BASE}/api/tailor/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_description: inputJd, resume: inputResume }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail ?? `Server error ${res.status}`)
      }
      const data = await res.json()
      addCard(data.job_id, data.company_name ?? null)
      openStream(data.job_id)
      // Don't clear inputs — user might want to tailor same resume for another JD
    } catch (err: any) {
      alert(err.message ?? 'Failed to start job')
    } finally {
      setSubmitting(false)
    }
  }

  const MODES: { key: ResumeMode; label: string; icon: React.ReactNode }[] = [
    { key: 'text',    label: 'Paste Text',   icon: <FileText className="h-3.5 w-3.5" /> },
    { key: 'file',    label: 'Upload File',  icon: <Upload   className="h-3.5 w-3.5" /> },
    { key: 'profile', label: 'From Profile', icon: <User     className="h-3.5 w-3.5" /> },
  ]

  const canSubmit = !submitting && !!inputJd.trim() && !!inputResume.trim()

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
          />
        </Card>

        <Card className="space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm md:text-base font-semibold text-slate-800">Your Resume</p>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
              {MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
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
              />
            </>
          )}
          {extractErr && resumeMode !== 'profile' && <p className="text-xs text-red-500">{extractErr}</p>}
        </Card>
      </div>

      {/* Tailor button + worker slot badge */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleRun}
          disabled={!canSubmit}
          className="flex-1 py-3 text-sm md:text-base"
        >
          {submitting
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" />Starting…</>
            : 'Tailor Resume'
          }
        </Button>
        {workerInfo && (
          <span className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 whitespace-nowrap">
            {workerInfo.active}/{workerInfo.max_workers} slots
          </span>
        )}
      </div>

      {/* Cards — newest first */}
      {cards.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            Active Jobs ({cards.length})
          </p>
          {cards.map(card => (
            <TailorCard key={card.jobId} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TailorPage
