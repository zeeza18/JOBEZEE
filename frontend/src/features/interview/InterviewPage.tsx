import { useState, useEffect } from 'react'
import {
  CalendarClock, CheckCircle2, Clock, Code2, FileText,
  Lightbulb, Play, Trophy,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SectionHeader } from '../../components/common/SectionHeader'
import { InterviewSetupModal } from './InterviewSetupModal'
import { InterviewSession, type SessionResult } from './InterviewSession'
import type { GeneratedInterview } from '../../lib/api'

const STORAGE_KEY = 'jobezee_interview_sessions'

function loadSessions(): SessionResult[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
function saveSessions(sessions: SessionResult[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)))
}

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s > 0 ? `${s}s` : ''}`
}

const ROUND_BADGE: Record<string, { cls: string; label: string }> = {
  phone:     { cls: 'bg-slate-100 text-slate-600 border-slate-200',     label: 'Phone Screen' },
  mid:       { cls: 'bg-blue-50 text-blue-700 border-blue-200',         label: 'Round 1' },
  technical: { cls: 'bg-violet-50 text-violet-700 border-violet-200',   label: 'Technical' },
  hr:        { cls: 'bg-pink-50 text-pink-700 border-pink-200',         label: 'HR Round' },
}

interface ScheduledItem {
  id: string
  interview: GeneratedInterview
  scheduledAt: string
}

const InterviewPage = () => {
  const [modal,     setModal]     = useState<'schedule' | 'instant' | null>(null)
  const [active,    setActive]    = useState<GeneratedInterview | null>(null)
  const [sessions,  setSessions]  = useState<SessionResult[]>(loadSessions)
  const [scheduled, setScheduled] = useState<ScheduledItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('jobezee_interview_scheduled') || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('jobezee_interview_scheduled', JSON.stringify(scheduled))
  }, [scheduled])

  const handleStart = (interview: GeneratedInterview, scheduledDate?: string) => {
    setModal(null)
    if (scheduledDate) {
      const item: ScheduledItem = { id: crypto.randomUUID(), interview, scheduledAt: scheduledDate }
      setScheduled(prev => [item, ...prev])
    } else {
      setActive(interview)
    }
  }

  const handleFinish = (result: SessionResult) => {
    const updated = [result, ...sessions]
    setSessions(updated)
    saveSessions(updated)
    setActive(null)
  }

  // ── Active session fullscreen ────────────────────────────────────────────
  if (active) {
    return (
      <div className="h-full flex flex-col gap-0">
        <InterviewSession
          interview={active}
          onFinish={handleFinish}
          onExit={() => setActive(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Interview" eyebrow="Practice" />

      {/* ── 4 action cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Schedule */}
        <ActionCard
          icon={<CalendarClock className="h-6 w-6 text-cyan-600" />}
          iconBg="bg-cyan-50 border-cyan-200"
          title="Schedule Interview"
          sub="Set a date and time"
          cta="Schedule"
          ctaVariant="secondary"
          onClick={() => setModal('schedule')}
        />

        {/* Instant */}
        <ActionCard
          icon={<Play className="h-6 w-6 text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-200"
          title="Instant Meeting"
          sub="Start right now"
          cta="Start Now"
          ctaVariant="primary"
          highlight
          onClick={() => setModal('instant')}
        />

        {/* Past feedback */}
        <ActionCard
          icon={<Trophy className="h-6 w-6 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-200"
          title="Past Feedback"
          sub={sessions.length > 0 ? `${sessions.length} session${sessions.length > 1 ? 's' : ''}` : 'No sessions yet'}
          cta="View All"
          ctaVariant="ghost"
          onClick={() => document.getElementById('past-sessions')?.scrollIntoView({ behavior: 'smooth' })}
        />

        {/* Prep — coming soon */}
        <ActionCard
          icon={<Lightbulb className="h-6 w-6 text-slate-400" />}
          iconBg="bg-slate-100 border-slate-200"
          title="Prep Questions"
          sub="Study bank"
          cta="Coming Soon"
          ctaVariant="ghost"
          disabled
          badge="Soon"
        />
      </div>

      {/* ── Scheduled interviews ──────────────────────────────────────── */}
      {scheduled.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-bold text-slate-800">Scheduled Interviews</p>
          </div>
          <div className="space-y-2">
            {scheduled.map(item => {
              const rb = ROUND_BADGE[item.interview.round] ?? ROUND_BADGE.mid
              const dt = new Date(item.scheduledAt)
              return (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200">
                      <FileText className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.interview.job_title}</p>
                      <p className="text-xs text-slate-400">{item.interview.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${rb.cls}`}>{rb.label}</span>
                    <span className="text-xs text-slate-500">
                      {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' '}
                      {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <Button size="sm" variant="primary" onClick={() => { setScheduled(s => s.filter(x => x.id !== item.id)); setActive(item.interview) }}>
                      Start
                    </Button>
                    <button
                      onClick={() => setScheduled(s => s.filter(x => x.id !== item.id))}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Past sessions ─────────────────────────────────────────────── */}
      <div id="past-sessions">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-bold text-slate-800">Past Sessions</p>
            {sessions.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-slate-400">{sessions.length} completed</span>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Code2 className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No sessions yet</p>
              <p className="text-xs text-slate-400">Start an instant interview above to practice</p>
              <Button size="sm" onClick={() => setModal('instant')}>
                <Play className="h-3.5 w-3.5" /> Start now
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => {
                const rb = ROUND_BADGE[s.interview.round] ?? ROUND_BADGE.mid
                const answered = s.answers.filter(a => a.trim()).length
                const pct = Math.round((answered / s.interview.questions.length) * 100)
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.interview.job_title}</p>
                        <p className="text-xs text-slate-400 truncate">{s.interview.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${rb.cls}`}>{rb.label}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />{fmtElapsed(s.elapsed_seconds)}
                      </span>
                      <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {answered}/{s.interview.questions.length} answered
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {modal && (
        <InterviewSetupModal
          mode={modal}
          profileResumeAvailable={false}
          onClose={() => setModal(null)}
          onStart={handleStart}
        />
      )}
    </div>
  )
}

// ── Action card sub-component ──────────────────────────────────────────────────
interface ActionCardProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  sub: string
  cta: string
  ctaVariant: 'primary' | 'secondary' | 'ghost'
  highlight?: boolean
  disabled?: boolean
  badge?: string
  onClick?: () => void
}

const ActionCard = ({ icon, iconBg, title, sub, cta, ctaVariant, highlight, disabled, badge, onClick }: ActionCardProps) => (
  <div className={`relative flex flex-col gap-3 rounded-xl border p-4 transition-all ${
    highlight ? 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-white shadow-sm' :
    disabled  ? 'border-slate-100 bg-slate-50/50 opacity-60' :
                'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
  }`}>
    {badge && (
      <span className="absolute top-3 right-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">{badge}</span>
    )}
    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${iconBg}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
    <Button
      size="sm"
      variant={ctaVariant}
      disabled={disabled}
      onClick={onClick}
      className="w-full justify-center"
    >
      {cta}
    </Button>
  </div>
)

export default InterviewPage
