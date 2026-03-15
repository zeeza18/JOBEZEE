import { motion } from 'framer-motion'
import { Badge } from '../../components/ui/Badge'
import { useAppStore } from '../../store/useAppStore'
import { formatDate } from '../../lib/utils'

const columns = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'] as const

export const ApplicationKanban = () => {
  const { applications, jobs, updateApplicationStatus } = useAppStore()

  const moveForward = (status: string) => {
    const index = columns.indexOf(status as (typeof columns)[number])
    return columns[Math.min(columns.length - 1, index + 1)]
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      {columns.map((col) => (
        <div key={col} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between text-sm font-medium text-slate-800">
            <span>{col}</span>
            <Badge variant="outline">{applications.filter((a) => a.status === col).length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {applications
              .filter((app) => app.status === col)
              .map((app) => {
                const job = jobs.find((j) => j.id === app.jobId)
                return (
                  <motion.button
                    key={app.id}
                    whileHover={{ y: -2 }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm shadow-soft"
                    onClick={() => updateApplicationStatus(app.id, moveForward(app.status))}
                  >
                    <p className="font-semibold text-slate-900">{job?.title ?? 'Job'}</p>
                    <p className="text-slate-500">{job?.company}</p>
                    <p className="text-xs text-slate-500">Next: {app.nextStepDate ? formatDate(app.nextStepDate) : 'TBD'}</p>
                  </motion.button>
                )
              })}
            {applications.filter((a) => a.status === col).length === 0 && (
              <p className="text-xs text-slate-500">No items</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
