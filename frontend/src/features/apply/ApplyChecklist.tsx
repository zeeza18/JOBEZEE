import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const defaultItems = [
  'Resume tailored',
  'Cover letter ready',
  'Links updated',
  'References aligned',
  'Portfolio curated',
]

export const ApplyChecklist = ({ onComplete }: { onComplete?: () => void }) => {
  const [checked, setChecked] = useState<string[]>([])

  const toggle = (item: string) => {
    setChecked((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))
  }

  const allDone = checked.length === defaultItems.length

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Apply checklist</p>
        {allDone && <span className="text-xs text-emerald-600">Ready</span>}
      </div>
      <div className="mt-3 space-y-2">
        {defaultItems.map((item) => (
          <button
            key={item}
            onClick={() => toggle(item)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm transition-colors',
              checked.includes(item) ? 'bg-emerald-50 border-emerald-200' : 'bg-white'
            )}
          >
            <CheckCircle2 className={cn('h-4 w-4', checked.includes(item) ? 'text-emerald-600' : 'text-slate-300')} />
            <span>{item}</span>
          </button>
        ))}
      </div>
      {allDone && onComplete && (
        <button onClick={onComplete} className="mt-3 text-sm text-brand">
          Mark ready to apply
        </button>
      )}
    </div>
  )
}
