import { cn } from '../../lib/utils'

type BadgeProps = {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'slate'
  className?: string
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const styles = {
    default: 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    error:   'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    outline: 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200',
    slate:   'bg-slate-100 text-slate-600',
  }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', styles[variant], className)}>
      {children}
    </span>
  )
}
