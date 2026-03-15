import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatDate } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import type { Job } from '../../lib/mock'

export const JobDetailsModal = ({ job }: { job?: Job }) => {
  const { modalJobId, saveApplication, setModalJobId, setActiveJob, pushToast } = useAppStore()

  if (!job) return null
  const open = modalJobId === job.id

  const handleSave = () => {
    saveApplication(job.id, 'Saved')
    pushToast({ title: 'Job saved', description: `${job.title} at ${job.company}`, type: 'success' })
  }

  return (
    <Modal open={open} onClose={() => setModalJobId(undefined)} title={`${job.title} • ${job.company}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Badge variant="outline">{job.location}</Badge>
        <Badge variant="outline">{job.type}</Badge>
        <Badge variant="outline">{job.salaryRange}</Badge>
        <span>Posted {formatDate(job.postedAt)}</span>
      </div>
      <p className="text-sm leading-relaxed text-slate-700">{job.description}</p>
      <div className="flex flex-wrap gap-2">
        {job.skills.map((skill) => (
          <Badge key={skill}>{skill}</Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={handleSave}>Save Job</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setActiveJob(job.id)
            setModalJobId(undefined)
          }}
        >
          Tailor this job
        </Button>
      </div>
    </Modal>
  )
}
