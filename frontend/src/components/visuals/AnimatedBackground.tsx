import { motion } from 'framer-motion'
import { LoopingParticles } from './LoopingParticles'

export const AnimatedBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-surface to-white shadow-soft">
      <motion.div
        className="absolute -left-20 -top-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl"
        animate={{ y: [0, 20, -10, 0], opacity: [0.8, 1, 0.8, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-10 top-10 h-60 w-60 rounded-full bg-brand-light/30 blur-3xl"
        animate={{ y: [10, -10, 20, 10], opacity: [0.7, 1, 0.7, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <LoopingParticles />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
