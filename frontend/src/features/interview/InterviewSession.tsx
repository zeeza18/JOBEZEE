import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, SkipForward, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { GeneratedInterview } from '../../lib/api'

const CATEGORY_COLORS: Record<string, string> = {
  coding:        'bg-violet-50 text-violet-700 border-violet-200',
  system_design: 'bg-purple-50 text-purple-700 border-purple-200',
  behavioral:    'bg-blue-50 text-blue-700 border-blue-200',
  scenario:      'bg-amber-50 text-amber-700 border-amber-200',
  technical:     'bg-orange-50 text-orange-700 border-orange-200',
  hr:            'bg-pink-50 text-pink-700 border-pink-200',
  background:    'bg-slate-50 text-slate-600 border-slate-200',
  fit:           'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export interface SessionResult {
  interview: GeneratedInterview
  answers: string[]
  elapsed_seconds: number
  completed_at: string
}

interface Props {
  interview: GeneratedInterview
  onFinish: (result: SessionResult) => void
  onExit: () => void
}

export const InterviewSession = ({ interview, onFinish, onExit }: Props) => {
  const [index,   setIndex]   = useState(0)
  const [answers, setAnswers] = useState<string[]>(Array(interview.questions.length).fill(''))
  const [elapsed, setElapsed] = useState(0)
  const [done,    setDone]    = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const q = interview.questions[index]
  const total = interview.questions.length
  const progress = ((index + 1) / total) * 100

  const setAnswer = (val: string) =>
    setAnswers(prev => prev.map((a, i) => (i === index ? val : a)))

  const handleFinish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setDone(true)
    onFinish({
      interview,
      answers,
      elapsed_seconds: elapsed,
      completed_at: new Date().toISOString(),
    })
  }

  if (done) return null

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* Top bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onExit}
            className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            title="Exit session"
          >
            <XCircle className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {interview.round_label}
              {interview.company !== 'Unknown' && ` · ${interview.company}`}
            </p>
            <p className="text-xs text-slate-400 truncate">{interview.job_title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            elapsed > interview.duration_minutes * 60
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-slate-100 text-slate-600'
          }`}>
            <Clock className="h-3 w-3" />
            {fmtTime(elapsed)}
          </div>
          <span className="text-xs text-slate-400">{index + 1} / {total}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-slate-200 overflow-hidden -mt-2">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col p-6 gap-4 min-h-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Q{index + 1}</span>
            {q.category && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${CATEGORY_COLORS[q.category] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                {q.category.replace('_', ' ')}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">~{Math.ceil(q.estimated_time_seconds / 60)} min</span>
        </div>

        <p className="text-slate-900 font-medium text-base leading-relaxed">{q.question}</p>

        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-xs font-semibold text-slate-500 mb-1.5">Your Answer</label>
          <textarea
            value={answers[index]}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here — use STAR format for behavioral questions..."
            className="flex-1 min-h-[160px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition-all resize-none"
          />
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
        <Button
          variant="ghost" size="sm"
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Prev
        </Button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIndex(i => Math.min(total - 1, i + 1))}
            disabled={index === total - 1}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <SkipForward className="h-3 w-3" /> Skip
          </button>

          {index < total - 1 ? (
            <Button
              size="sm"
              onClick={() => setIndex(i => i + 1)}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleFinish}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
