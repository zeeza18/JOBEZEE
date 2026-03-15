import { useMemo, useState } from 'react'
import { Search as SearchIcon, Bookmark } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SectionHeader } from '../../components/common/SectionHeader'
import { GlowDivider } from '../../components/visuals/GlowDivider'
import { JobDetailsModal } from './JobDetailsModal'
import { locations, jobTypes, salaryRanges, postedTimes } from './filters'
import { truncate } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

const SearchPage = () => {
  const { jobs, saveApplication, setModalJobId } = useAppStore()
  const [keyword, setKeyword] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [salary, setSalary] = useState('')
  const [posted, setPosted] = useState('')

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesKeyword = keyword
        ? job.title.toLowerCase().includes(keyword.toLowerCase()) ||
          job.description.toLowerCase().includes(keyword.toLowerCase())
        : true
      const matchesCompany = company ? job.company.toLowerCase().includes(company.toLowerCase()) : true
      const matchesLocation = location ? job.location.toLowerCase().includes(location.toLowerCase()) : true
      const matchesType = type ? job.type.toLowerCase().includes(type.toLowerCase()) : true
      const matchesSalary = salary ? job.salaryRange.includes(salary.replace('+', '')) : true
      const matchesPosted = posted ? true : true
      return matchesKeyword && matchesCompany && matchesLocation && matchesType && matchesSalary && matchesPosted
    })
  }, [jobs, keyword, company, location, type, salary, posted])

  return (
    <div className="space-y-6">
      <SectionHeader title="Search jobs" eyebrow="Phase 1" action={<Badge>Mock data</Badge>} />
      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input placeholder="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location filter">
            <option value="">Any location</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type filter">
            <option value="">Any type</option>
            {jobTypes.map((jt) => (
              <option key={jt} value={jt}>
                {jt}
              </option>
            ))}
          </Select>
          <Select value={salary} onChange={(e) => setSalary(e.target.value)} aria-label="Salary filter">
            <option value="">Any salary</option>
            {salaryRanges.map((sal) => (
              <option key={sal} value={sal}>
                {sal}
              </option>
            ))}
          </Select>
          <Select value={posted} onChange={(e) => setPosted(e.target.value)} aria-label="Posted filter">
            <option value="">Any time</option>
            {postedTimes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            <span>Showing {filtered.length} roles</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => saveApplication(filtered[0]?.id ?? '')} disabled={!filtered.length}>
            Quick Save First
          </Button>
        </div>
      </Card>

      <GlowDivider />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((job) => (
          <Card key={job.id} className="card-hover space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-500">{job.company}</p>
                <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => saveApplication(job.id)} aria-label="Save job">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <Badge variant="outline">{job.location}</Badge>
              <Badge variant="outline">{job.type}</Badge>
              <Badge variant="outline">{job.salaryRange}</Badge>
            </div>
            <p className="text-sm text-slate-600">{truncate(job.description, 170)}</p>
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 4).map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setModalJobId(job.id)}>
                View details
              </Button>
              <Button size="sm" variant="ghost">
                Tailor this job
              </Button>
            </div>
            <JobDetailsModal job={job} />
          </Card>
        ))}
      </div>
    </div>
  )
}

export default SearchPage
