import { motion } from 'framer-motion'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  subtitle?: string
  variant?: 'dark' | 'light'
}

const JOBE = ['J', 'o', 'b', 'E']
const ZEE  = ['z', 'e', 'e']

export default function LogoBrand({ size = 'md', subtitle, variant = 'dark' }: Props) {
  const textCls = size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl'
  const gapCls  = size === 'sm' ? 'gap-2'    : 'gap-2.5'

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center ${gapCls}`}>
        {/* JobEzee wordmark — letters stagger in */}
        <div className={`flex font-black tracking-tight leading-none ${textCls}`}>
          {JOBE.map((l, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
              className={variant === 'light' ? 'text-slate-900' : 'text-white'}
            >
              {l}
            </motion.span>
          ))}
          {ZEE.map((l, i) => (
            <motion.span
              key={i + 4}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 + i * 0.06, duration: 0.3, ease: 'easeOut' }}
              className="text-cyan-400"
            >
              {l}
            </motion.span>
          ))}
        </div>
      </div>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          className="text-xs text-slate-500 leading-none"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )
}
