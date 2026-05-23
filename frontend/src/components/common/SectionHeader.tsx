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
    <div className="space-y-1.5">
      {eyebrow && (
        <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-cyan-600">
          {eyebrow}
        </span>
      )}
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
)
