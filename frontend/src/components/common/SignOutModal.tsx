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
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed left-1/2 top-1/2 z-[61] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-[#0d1117] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
          >
            <button
              onClick={onCancel}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
              <LogOut className="h-5 w-5 text-red-400" />
            </div>

            <div className="mb-6 text-center">
              <h3 className="text-base font-semibold text-white">Sign out?</h3>
              <p className="mt-1.5 text-sm text-slate-400">
                Signed in as{' '}
                <span className="font-medium text-slate-200">{displayName}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.08]"
              >
                Stay
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-red-500/15 py-2.5 text-sm font-semibold text-red-400 ring-1 ring-red-500/25 transition-colors hover:bg-red-500/25"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
