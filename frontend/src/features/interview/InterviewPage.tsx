import { useState } from 'react'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/common/SectionHeader'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MockInterview } from './MockInterview'

const questionSets = {
  Behavioral: [
    'Tell me about a time you led a project with ambiguity.',
    'Describe a conflict with a teammate and how you handled it.',
  ],
  Technical: ['How do you ensure performance in React apps?', 'Explain a challenging system you designed.'],
  RoleSpecific: ['How do you collaborate with design?', 'What does great onboarding look like?'],
}

const InterviewPage = () => {
  const [role, setRole] = useState('Senior Frontend Engineer')
  const [company, setCompany] = useState('Cyan Labs')

  return (
    <div className="space-y-6">
      <SectionHeader title="Interview prep" eyebrow="Confidence" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="space-y-3 md:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" aria-label="Role" />
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" aria-label="Company" />
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <Badge variant="outline">Behavioral</Badge>
            <Badge variant="outline">Technical</Badge>
            <Badge variant="outline">Role-specific</Badge>
          </div>
          <MockInterview questions={questionSets.Behavioral} role={role} company={company} />
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Question sets</p>
          {Object.entries(questionSets).map(([label, qs]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                <span>{label}</span>
                <Badge variant="outline">{qs.length} prompts</Badge>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {qs.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ))}
          <Button variant="ghost" size="sm">
            Add custom questions
          </Button>
        </Card>
      </div>
    </div>
  )
}

export default InterviewPage
