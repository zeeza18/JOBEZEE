import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, X } from 'lucide-react'

interface Props {
  open: boolean
  displayName: string
  onConfirm: () => void
  onCancel: () => void
}

export function SignOutModal({ open, displayName, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative z-10 w-[340px] rounded-2xl border border-white/[0.08] bg-[#0d1117] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
          >
            {/* Close */}
            <button
              onClick={onCancel}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Cyan icon — matches app theme */}
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 shadow-[0_8px_24px_rgba(6,182,212,0.35)]">
              <LogOut className="h-6 w-6 text-white" />
            </div>

            <div className="mb-7 text-center">
              <h3 className="text-lg font-bold text-white">Sign out?</h3>
              <p className="mt-1.5 text-sm text-slate-400">
                Signed in as{' '}
                <span className="font-semibold text-cyan-400">{displayName}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.10] hover:text-white"
              >
                Stay
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(6,182,212,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(6,182,212,0.4)]"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
