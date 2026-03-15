import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { SectionHeader } from '../../components/common/SectionHeader'
import { ApplicationKanban } from './ApplicationKanban'
import { useAppStore } from '../../store/useAppStore'

const ApplicationsPage = () => {
  const { applications, jobs } = useAppStore()
  const [companyFilter, setCompanyFilter] = useState('')
  const filtered = useMemo(() => {
    if (!companyFilter) return applications
    return applications.filter((app) =>
      (jobs.find((j) => j.id === app.jobId)?.company || '').toLowerCase().includes(companyFilter.toLowerCase())
    )
  }, [applications, companyFilter, jobs])

  return (
    <div className="space-y-6">
      <SectionHeader title="Applications" eyebrow="Tracking" />
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Filter by company"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            aria-label="Filter applications"
            className="max-w-xs"
          />
          <Badge variant="outline" className="flex items-center gap-1">
            <Filter className="h-4 w-4" /> {filtered.length} records
          </Badge>
        </div>
        <ApplicationKanban />
      </Card>
    </div>
  )
}

export default ApplicationsPage
