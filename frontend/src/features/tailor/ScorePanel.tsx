import { motion } from 'framer-motion'
import { Badge } from '../../components/ui/Badge'

export const ScorePanel = ({ score, missing }: { score: number; missing: string[] }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Match score</p>
          <p className="text-3xl font-semibold text-slate-900">{score}%</p>
        </div>
        <div className="text-sm text-emerald-600">Looks promising</div>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-slate-800">Missing keywords</p>
        <div className="flex flex-wrap gap-2">
          {missing.length === 0 && <span className="text-sm text-slate-500">None — great fit.</span>}
          {missing.map((kw) => (
            <Badge key={kw} variant="outline">
              {kw}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
