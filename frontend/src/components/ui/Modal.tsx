import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './Button'

const modalRoot = typeof document !== 'undefined' ? document.body : null

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!modalRoot) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex h-full items-center justify-center px-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-glow"
            >
              <div className="flex items-center justify-between gap-4 pb-4">
                {title && <h3 className="text-lg font-semibold">{title}</h3>}
                <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="!px-2 !py-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">{children}</div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  )
}
