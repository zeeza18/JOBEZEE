import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const variants = {
  primary:   'bg-cyan-500 text-white hover:bg-cyan-600 active:bg-cyan-700',
  secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
  ghost:     'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'font-medium rounded-md transition-colors inline-flex items-center justify-center gap-2',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
