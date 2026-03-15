import { motion } from 'framer-motion'

export const ResumePreview = ({ content }: { content: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"
    >
      <p className="text-sm font-medium text-slate-800">Resume preview</p>
      <pre className="mt-2 max-h-[340px] overflow-y-auto whitespace-pre-wrap text-sm text-slate-600">{content}</pre>
    </motion.div>
  )
}
