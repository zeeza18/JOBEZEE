import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/utils'

export function CollapsibleCard({
  title, defaultOpen = true, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  )
}
