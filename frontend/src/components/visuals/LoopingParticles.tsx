import { motion } from 'framer-motion'

const dots = Array.from({ length: 16 }, (_, i) => i)

export const LoopingParticles = () => (
  <div className="pointer-events-none absolute inset-0">
    {dots.map((dot) => (
      <motion.span
        key={dot}
        className="absolute h-2 w-2 rounded-full bg-brand/40"
        style={{ top: `${(dot * 13) % 90}%`, left: `${(dot * 23) % 90}%` }}
        animate={{
          y: [0, -6, 4, 0],
          opacity: [0.7, 1, 0.4, 0.8],
        }}
        transition={{ duration: 6 + dot * 0.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
  </div>
)
