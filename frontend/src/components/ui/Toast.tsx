import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Info, XCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const icons = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  info: <Info className="h-4 w-4 text-brand" />,
  error: <XCircle className="h-4 w-4 text-rose-500" />,
}

export const ToastHost = () => {
  const { toasts, dismissToast } = useAppStore()

  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => dismissToast(toast.id), 3800))
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismissToast])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft"
          >
            <div className="flex items-start gap-3">
              {toast.type ? icons[toast.type] : icons.info}
              <div className="space-y-1 text-sm">
                <p className="font-medium text-slate-900">{toast.title}</p>
                {toast.description && <p className="text-slate-500">{toast.description}</p>}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
