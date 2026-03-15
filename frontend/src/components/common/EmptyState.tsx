import { Button } from '../ui/Button'

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    {description && <p className="max-w-xl text-sm text-slate-500">{description}</p>}
    {actionLabel && onAction && (
      <Button size="sm" variant="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
)
