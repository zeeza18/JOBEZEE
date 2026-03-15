import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-shadow',
        className
      )}
      {...props}
    />
  )
})

Input.displayName = 'Input'
