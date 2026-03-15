import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

type ProgressBarProps = {
  progress?: number
  className?: string
}

export const ProgressBar = ({ progress = 45, className }: ProgressBarProps) => {
  return (
    <div className={cn('relative h-1 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-brand via-brand-light to-brand-dark"
      />
    </div>
  )
}
