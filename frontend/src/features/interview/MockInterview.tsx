import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useAppStore } from '../../store/useAppStore'

export const MockInterview = ({ questions, role, company }: { questions: string[]; role: string; company: string }) => {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''))
  const { addInterviewPrep, pushToast } = useAppStore()

  const handleSave = () => {
    addInterviewPrep({ id: crypto.randomUUID(), role, company, questions, answers })
    pushToast({ title: 'Mock interview saved', description: `${role} @ ${company}`, type: 'success' })
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Timed prompt</p>
          <p className="text-lg font-semibold text-slate-900">{questions[index]}</p>
        </div>
        <Badge>Question {index + 1}</Badge>
      </div>
      <textarea
        className="h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-inner"
        value={answers[index]}
        onChange={(e) => setAnswers((prev) => prev.map((a, i) => (i === index ? e.target.value : a)))}
        placeholder="Type your structured response"
      />
      <div className="flex flex-wrap gap-2 text-sm text-slate-600">
        <span>Tip: Use STAR and include metrics.</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          Prev
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
          disabled={index === questions.length - 1}
        >
          Next
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save session
        </Button>
      </div>
    </Card>
  )
}
