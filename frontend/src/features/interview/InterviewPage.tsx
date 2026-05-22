import { useCallback, useEffect, useState } from 'react'
import {
  CalendarClock, CheckCircle2, Clock, Code2,
  Lightbulb, Loader2, Play, RefreshCw, Trash2, Trophy,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SectionHeader } from '../../components/common/SectionHeader'
import { InterviewSetupModal } from './InterviewSetupModal'
import { InterviewSession } from './InterviewSession'
import { interviewApi, type GeneratedInterview, type InterviewSession as ISession, type ScheduledInterview } from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m === 0 ? `${s}s` : `${m}m${s > 0 ? ` ${s}s` : ''}`
}

const ROUND_BADGE: Record<string, string> = {
  phone:     'bg-slate-100 text-slate-600 border-slate-200',
  mid:       'bg-blue-50 text-blue-700 border-blue-200',
  technical: 'bg-violet-50 text-violet-700 border-violet-200',
  hr:        'bg-pink-50 text-pink-700 border-pink-200',
}

const InterviewPage = () => {
  const { pushToast } = useAppStore()
  const profile = useAppStore(s => s.profile)

  const [modal,      setModal]      = useState<'schedule' | 'instant' | null>(null)
  const [active,     setActive]     = useState<GeneratedInterview | null>(null)
  const [saving,     setSaving]     = useState(false)

  const [sessions,   setSessions]   = useState<ISession[]>([])
  const [sessTotal,  setSessTotal]  = useState(0)
  const [sessLoad,   setSessLoad]   = useState(true)

  const [scheduled,  setScheduled]  = useState<ScheduledInterview[]>([])
  const [schedLoad,  setSchedLoad]  = useState(true)

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setSessLoad(true)
    try {
      const res = await interviewApi.listSessions({ limit: 20 })
      setSessions(res.sessions)
      setSessTotal(res.total)
    } catch { /* silent */ }
    setSessLoad(false)
  }, [])

  const loadScheduled = useCallback(async () => {
    setSchedLoad(true)
    try {
      const res = await interviewApi.listScheduled()
      setScheduled(res.scheduled)
    } catch { /* silent */ }
    setSchedLoad(false)
  }, [])

  useEffect(() => {
    loadSessions()
    loadScheduled()
  }, [loadSessions, loadScheduled])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStart = async (interview: GeneratedInterview, scheduledAt?: string) => {
    setModal(null)
    if (scheduledAt) {
      // Save scheduled interview to DB
      try {
        const item = await interviewApi.createScheduled({
          job_title:        interview.job_title,
          company:          interview.company,
          round_type:       interview.round,
          round_label:      interview.round_label,
          duration_minutes: interview.duration_minutes,
          questions:        interview.questions,
          scheduled_at:     new Date(scheduledAt).toISOString(),
        })
        setScheduled(prev => [item, ...prev])
        pushToast({ title: 'Interview scheduled', description: `Confirmation email sent to ${profile?.email || 'your inbox'}`, type: 'success' })
      } catch {
        pushToast({ title: 'Failed to schedule', description: 'Please try again', type: 'error' })
      }
    } else {
      setActive(interview)
    }
  }

  const handleFinish = async (result: {
    interview: GeneratedInterview
    answers: string[]
    elapsed_seconds: number
    completed_at: string
  }) => {
    setSaving(true)
    try {
      const saved = await interviewApi.saveSession({
        job_title:        result.interview.job_title,
        company:          result.interview.company,
        round_type:       result.interview.round,
        round_label:      result.interview.round_label,
        duration_minutes: result.interview.duration_minutes,
        questions:        result.interview.questions,
        answers:          result.answers,
        elapsed_seconds:  result.elapsed_seconds,
        completed_at:     result.completed_at,
      })
      setSessions(prev => [saved, ...prev])
      setSessTotal(t => t + 1)
      pushToast({ title: 'Session saved', description: `${saved.questions_answered}/${result.interview.questions.length} questions answered`, type: 'success' })
    } catch {
      pushToast({ title: 'Could not save session', description: 'Your answers are shown below but not stored', type: 'error' })
    }
    setSaving(false)
    setActive(null)
  }

  const handleStartScheduled = async (item: ScheduledInterview) => {
    try {
      await interviewApi.startScheduled(item.id)
      setScheduled(prev => prev.filter(x => x.id !== item.id))
      setActive({ job_title: item.job_title, company: item.company, round: item.round_type, round_label: item.round_label, duration_minutes: item.duration_minutes, questions: item.questions })
    } catch {
      pushToast({ title: 'Error', description: 'Could not start interview', type: 'error' })
    }
  }

  const handleCancelScheduled = async (id: string) => {
    try {
      await interviewApi.cancelScheduled(id)
      setScheduled(prev => prev.filter(x => x.id !== id))
    } catch {
      pushToast({ title: 'Error', description: 'Could not cancel', type: 'error' })
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await interviewApi.deleteSession(id)
      setSessions(prev => prev.filter(x => x.id !== id))
      setSessTotal(t => t - 1)
    } catch {
      pushToast({ title: 'Error', description: 'Could not delete session', type: 'error' })
    }
  }

  // ── Active session (full page takeover) ──────────────────────────────────
  if (active) {
    return (
      <InterviewSession
        interview={active}
        onFinish={handleFinish}
        onExit={() => setActive(null)}
      />
    )
  }

  const profileHasResume = !!(profile as any)?.resume_url

  return (
    <div className="space-y-6">
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-xl border border-slate-200">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
            <p className="text-sm font-semibold text-slate-800">Saving session…</p>
          </div>
        </div>
      )}

      <SectionHeader title="Interview" eyebrow="Practice" />

      {/* ── 4 action cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ActionCard
          icon={<CalendarClock className="h-6 w-6 text-cyan-600" />}
          iconBg="bg-cyan-50 border-cyan-200"
          title="Schedule Interview"
          sub="Pick a date & time"
          cta="Schedule"
          ctaVariant="secondary"
          onClick={() => setModal('schedule')}
        />
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
        <ActionCard
          icon={<Trophy className="h-6 w-6 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-200"
          title="Past Feedback"
          sub={sessLoad ? 'Loading…' : sessTotal > 0 ? `${sessTotal} session${sessTotal > 1 ? 's' : ''}` : 'No sessions yet'}
          cta="View Below"
          ctaVariant="ghost"
          onClick={() => document.getElementById('past-sessions')?.scrollIntoView({ behavior: 'smooth' })}
        />
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
      {(schedLoad || scheduled.length > 0) && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-bold text-slate-800">Scheduled Interviews</p>
            {schedLoad && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 ml-auto" />}
          </div>
          {schedLoad ? (
            <SkeletonRows n={2} />
          ) : (
            <div className="space-y-2">
              {scheduled.map(item => {
                const rb = ROUND_BADGE[item.round_type] ?? ROUND_BADGE.mid
                const dt = new Date(item.scheduled_at)
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.job_title}</p>
                      <p className="text-xs text-slate-400">{item.company}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${rb}`}>{item.round_label}</span>
                      <span className="text-xs text-slate-500">
                        {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' · '}
                        {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <Button size="sm" onClick={() => handleStartScheduled(item)}>Start</Button>
                      <button onClick={() => handleCancelScheduled(item.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Past sessions ──────────────────────────────────────────────── */}
      <div id="past-sessions">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-bold text-slate-800">Past Sessions</p>
            {sessTotal > 0 && (
              <span className="text-[10px] font-semibold text-slate-400">{sessTotal} total</span>
            )}
            <button onClick={loadSessions} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {sessLoad ? (
            <SkeletonRows n={3} />
          ) : sessions.length === 0 ? (
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
              {sessions.map(s => {
                const rb  = ROUND_BADGE[s.round_type] ?? ROUND_BADGE.mid
                const pct = s.questions.length > 0
                  ? Math.round((s.questions_answered / s.questions.length) * 100)
                  : 0
                return (
                  <div key={s.id} className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.job_title}</p>
                        <p className="text-xs text-slate-400 truncate">{s.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3 flex-wrap justify-end">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${rb}`}>{s.round_label}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />{fmtElapsed(s.elapsed_seconds)}
                      </span>
                      <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {s.questions_answered}/{s.questions.length}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {modal && (
        <InterviewSetupModal
          mode={modal}
          profileResumeAvailable={profileHasResume}
          onClose={() => setModal(null)}
          onStart={handleStart}
        />
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SkeletonRows = ({ n }: { n: number }) => (
  <div className="space-y-2">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="h-14 w-full rounded-xl bg-slate-100 animate-pulse" />
    ))}
  </div>
)

interface ActionCardProps {
  icon: React.ReactNode; iconBg: string
  title: string; sub: string
  cta: string; ctaVariant: 'primary' | 'secondary' | 'ghost'
  highlight?: boolean; disabled?: boolean; badge?: string
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
    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${iconBg}`}>{icon}</div>
    <div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
    <Button size="sm" variant={ctaVariant} disabled={disabled} onClick={onClick} className="w-full justify-center">
      {cta}
    </Button>
  </div>
)

export default InterviewPage
