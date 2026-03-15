import { cn } from '../../lib/utils'

export const SectionHeader = ({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string
  eyebrow?: string
  action?: React.ReactNode
  className?: string
}) => (
  <div className={cn('flex items-center justify-between mb-6', className)}>
    <div className="space-y-0.5">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{eyebrow}</p>
      )}
      <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h1>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
)
