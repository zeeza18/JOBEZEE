import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900',
        'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})

Select.displayName = 'Select'
