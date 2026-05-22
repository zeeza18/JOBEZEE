import { useState } from 'react'
import { X, Loader2, Briefcase, Phone, Code2, Users, Brain } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { interviewApi, type InterviewRound, type GeneratedInterview } from '../../lib/api'

const ROUNDS: { id: InterviewRound; label: string; sub: string; icon: React.ReactNode }[] = [
  { id: 'phone',     label: 'Phone Screen',       sub: 'Visa · salary · fit',       icon: <Phone   className="h-4 w-4" /> },
  { id: 'mid',       label: 'Round 1 (Mid-Level)', sub: 'Behavioral + scenarios',    icon: <Brain   className="h-4 w-4" /> },
  { id: 'technical', label: 'Technical',           sub: 'Hard coding + system design', icon: <Code2   className="h-4 w-4" /> },
  { id: 'hr',        label: 'HR Round',            sub: 'Scenario-based soft skills', icon: <Users   className="h-4 w-4" /> },
]

interface Props {
  mode: 'schedule' | 'instant'
  profileResumeAvailable: boolean
  onClose: () => void
  onStart: (interview: GeneratedInterview, scheduledDate?: string) => void
}

export const InterviewSetupModal = ({ mode, profileResumeAvailable, onClose, onStart }: Props) => {
  const [jd,           setJd]           = useState('')
  const [resumeSrc,    setResumeSrc]    = useState<'profile' | 'paste'>(profileResumeAvailable ? 'profile' : 'paste')
  const [resumeText,   setResumeText]   = useState('')
  const [round,        setRound]        = useState<InterviewRound>('mid')
  const [duration,     setDuration]     = useState(30)
  const [scheduleDate, setScheduleDate] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const handleGenerate = async () => {
    if (!jd.trim()) { setError('Paste a job description first.'); return }
    if (resumeSrc === 'paste' && !resumeText.trim()) { setError('Paste your resume text.'); return }
    if (mode === 'schedule' && !scheduleDate) { setError('Pick a date to schedule the interview.'); return }
    setError('')
    setLoading(true)
    try {
      const result = await interviewApi.generate({
        job_description: jd.trim(),
        resume_text:     resumeSrc === 'paste' ? resumeText.trim() : '(use profile resume)',
        round_type:      round,
        duration_minutes: duration,
      })
      onStart(result, mode === 'schedule' ? scheduleDate : undefined)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate questions. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-cyan-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {mode === 'schedule' ? 'Schedule an Interview' : 'Start Instant Interview'}
              </p>
              <p className="text-xs text-slate-400">AI will generate questions from your JD + resume</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Job Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Job Description</label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              rows={5}
              placeholder="Paste the full job description here..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Resume source */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Resume</label>
            <div className="flex gap-2">
              {profileResumeAvailable && (
                <button
                  onClick={() => setResumeSrc('profile')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                    resumeSrc === 'profile'
                      ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  Use profile resume
                </button>
              )}
              <button
                onClick={() => setResumeSrc('paste')}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  resumeSrc === 'paste'
                    ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                Paste resume text
              </button>
            </div>
            {resumeSrc === 'paste' && (
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                rows={4}
                placeholder="Paste your resume text here..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition-all resize-none"
              />
            )}
          </div>

          {/* Round type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Interview Round</label>
            <div className="grid grid-cols-2 gap-2">
              {ROUNDS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRound(r.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    round === r.id
                      ? 'border-cyan-400 bg-cyan-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`rounded-lg p-1.5 ${round === r.id ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}>
                    {r.icon}
                  </span>
                  <div>
                    <p className={`text-xs font-semibold ${round === r.id ? 'text-cyan-700' : 'text-slate-700'}`}>{r.label}</p>
                    <p className="text-[10px] text-slate-400">{r.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Duration</label>
              <span className="text-sm font-bold text-cyan-600">{duration} min</span>
            </div>
            <input
              type="range"
              min={5} max={60} step={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full h-1.5 rounded-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5 min</span>
              <span>60 min</span>
            </div>
          </div>

          {/* Schedule date — only for schedule mode */}
          {mode === 'schedule' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Schedule For</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition-all"
              />
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</> : mode === 'schedule' ? 'Schedule Interview' : 'Start Now'}
          </Button>
        </div>
      </div>
    </div>
  )
}
