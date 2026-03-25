import { useMemo, useState } from 'react'
import { Calendar, NotebookPen, Send, MapPin, Briefcase, ExternalLink, Building2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { SectionHeader } from '../../components/common/SectionHeader'
import { ApplyChecklist } from './ApplyChecklist'
import { useAppStore } from '../../store/useAppStore'
import { formatDate } from '../../lib/utils'

const ApplyPage = () => {
  const { jobs, applications, saveApplication, updateApplicationStatus, updateApplicationNotes, pushToast } = useAppStore()
  const fallbackJobId = jobs[0]?.id ?? ''
  const [jobId, setJobId] = useState(fallbackJobId)
  const [notes, setNotes] = useState('')
  const [nextStepDate, setNextStepDate] = useState('')

  const application = useMemo(() => applications.find((a) => a.jobId === jobId), [applications, jobId])
  const job = jobs.find((j) => j.id === jobId)

  const ensureApp = () => {
    if (!jobId) return
    if (!application) {
      saveApplication(jobId, 'Saved')
    }
  }

  const handleApply = () => {
    if (!jobId) return
    if (!application) {
      saveApplication(jobId, 'Applied')
    } else {
      updateApplicationStatus(application.id, 'Applied')
      updateApplicationNotes(application.id, notes, nextStepDate)
    }
    pushToast({ title: 'Marked as applied', description: job ? `${job.title} at ${job.company}` : '', type: 'success' })
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Apply" eyebrow="Action" />

      {/* Job being applied to */}
      {job ? (
        <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
              <Building2 className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 leading-tight">{job.title}</p>
              <p className="text-sm text-slate-500">{job.company}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{job.location}
                  </span>
                )}
                {job.type && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />{job.type}
                  </span>
                )}
                {job.salaryRange && (
                  <span className="text-emerald-600 font-medium">{job.salaryRange}</span>
                )}
              </div>
            </div>
          </div>
          {(job as { url?: string }).url && (
            <a
              href={(job as { url?: string }).url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
            >
              <ExternalLink className="h-3 w-3" /> View posting
            </a>
          )}
        </Card>
      ) : (
        <Card className="text-sm text-slate-400">No job selected. Add jobs via the Search or Jobs tab.</Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select value={jobId} onChange={(e) => setJobId(e.target.value)} onFocus={ensureApp}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} @ {j.company}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Next step date"
              type="date"
              value={nextStepDate}
              onChange={(e) => setNextStepDate(e.target.value)}
              aria-label="Next step date"
            />
            <Input
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Application notes"
            />
          </div>

          <ApplyChecklist onComplete={handleApply} />

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Application notes</p>
            <p className="mt-2 whitespace-pre-wrap">{notes || 'Add any recruiters, links, or interview prep here.'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleApply} icon={<Send className="h-4 w-4" />}>
              Mark as applied
            </Button>
            <Button
              variant="ghost"
              icon={<NotebookPen className="h-4 w-4" />}
              onClick={() => pushToast({ title: 'Application notes drafted', type: 'info' })}
            >
              Generate notes (mock)
            </Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Next steps</p>
          {application ? (
            <div className="space-y-2 text-sm text-slate-600">
              <p>Status: {application.status}</p>
              {application.appliedAt && <p>Applied: {formatDate(application.appliedAt)}</p>}
              {application.nextStepDate && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="h-4 w-4 text-brand" />
                  <span>{formatDate(application.nextStepDate)}</span>
                </div>
              )}
              <p>{application.notes || 'No notes yet.'}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a job to track application steps.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ApplyPage
