import { cn } from '../../lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export const Card = ({ className, ...props }: CardProps) => {
  return <div className={cn('bg-white rounded-2xl border border-slate-200 p-5 shadow-sm', className)} {...props} />
}
