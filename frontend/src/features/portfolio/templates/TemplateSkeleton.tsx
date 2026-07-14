import { motion } from 'framer-motion'

/** Suspense fallback shown while a lazy-loaded template chunk is fetched. */
export default function TemplateSkeleton() {
  const pulse = {
    animate: { opacity: [0.4, 0.8, 0.4] },
    transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' as const },
  }
  return (
    <div className="min-h-screen w-full p-10 space-y-8" style={{ background: '#0d1117' }}>
      <motion.div className="h-40 w-full rounded-2xl bg-slate-800/60" {...pulse} />
      <div className="space-y-4">
        <motion.div className="h-5 w-1/3 rounded bg-slate-800/60" {...pulse} />
        <motion.div className="h-4 w-2/3 rounded bg-slate-800/40" {...pulse} />
        <motion.div className="h-4 w-1/2 rounded bg-slate-800/40" {...pulse} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <motion.div className="h-28 rounded-xl bg-slate-800/50" {...pulse} />
        <motion.div className="h-28 rounded-xl bg-slate-800/50" {...pulse} />
      </div>
    </div>
  )
}
