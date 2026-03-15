import { ArrowRight, Calendar, Send, Wand2, Search, Sparkles } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/common/SectionHeader'
import { ApplicationKanban } from '../features/applications/ApplicationKanban'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { formatDate } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { applications, jobs, tailorResults } = useAppStore()
  const { user } = useAuthStore()

  const stats = [
    { label: 'Saved jobs',    value: applications.filter((a) => a.status === 'Saved').length },
    { label: 'Applications',  value: applications.filter((a) => a.status !== 'Saved').length },
    { label: 'Interviews',    value: applications.filter((a) => a.status === 'Interviewing').length },
    { label: 'Avg match',     value: tailorResults.length ? `${Math.round(tailorResults.reduce((s, t) => s + t.matchScore, 0) / tailorResults.length)}%` : '72%' },
  ]

  const recentJobs = jobs.slice(0, 5)
  const timeline = applications
    .filter((a) => a.nextStepDate)
    .sort((a, b) => new Date(a.nextStepDate).getTime() - new Date(b.nextStepDate).getTime())
    .slice(0, 4)

  const greeting = user?.full_name ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Dashboard'

  return (
    <div className="space-y-6">
      <SectionHeader title={greeting} eyebrow="Overview" />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 space-y-1">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Main body */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent jobs — 2/3 */}
        <Card className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-800">Recent jobs</p>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate('/app/pulled-jobs')}>
              View all
            </Button>
          </div>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No jobs yet — run a search to get started.</p>
          ) : (
            <div className="space-y-1.5">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.company}</p>
                  </div>
                  <Badge variant="outline">{job.location}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right column — 1/3 */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Quick actions</p>
            <div className="space-y-1.5">
              <button onClick={() => navigate('/app/pulled-jobs')} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                <span>Browse pulled jobs</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
              </button>
              <button onClick={() => navigate('/app/tailor')} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                <Wand2 className="h-4 w-4 text-cyan-500" />
                <span>Tailor resume</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
              </button>
              <button onClick={() => navigate('/app/apply')} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                <Send className="h-4 w-4 text-cyan-500" />
                <span>Apply checklist</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </Card>

          {/* Next steps */}
          <Card className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Next steps</p>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming steps.</p>
            ) : (
              <div className="space-y-1.5">
                {timeline.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                    <Calendar className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-cyan-500" />
                    <div className="text-xs text-slate-700">
                      <p className="font-medium">{formatDate(item.nextStepDate)}</p>
                      <p className="text-slate-500">{jobs.find((j) => j.id === item.jobId)?.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Kanban */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800">Application pipeline</p>
          <Badge variant="slate">Kanban</Badge>
        </div>
        <ApplicationKanban />
      </Card>

      {/* Feature grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Search,   label: 'Search',    desc: 'Find roles fast.',          to: '/app/pulled-jobs' },
          { icon: Wand2,    label: 'Tailor',    desc: 'Score and keyword gap.',    to: '/app/tailor' },
          { icon: Send,     label: 'Apply',     desc: 'Checklist before submit.',  to: '/app/apply' },
          { icon: ArrowRight, label: 'Track',   desc: 'Kanban with next steps.',   to: '/app/applications' },
        ].map(({ icon: Icon, label, desc, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50/40"
          >
            <Icon className="h-4 w-4 flex-shrink-0 text-cyan-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
