import { cn } from '../../lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export const Card = ({ className, ...props }: CardProps) => {
  return <div className={cn('bg-white rounded-lg border border-slate-200 p-5', className)} {...props} />
}
