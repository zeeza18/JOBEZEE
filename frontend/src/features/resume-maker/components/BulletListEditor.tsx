import { useState } from 'react'
import { Loader2, Plus, Sparkles, X } from 'lucide-react'
import { resumeBuilderApi } from '../../../lib/api'
import { useResumeMaker } from '../store/useResumeMaker'

export function BulletListEditor({
  bullets, onChange, context = '',
}: { bullets: string[]; onChange: (next: string[]) => void; context?: string }) {
  const jobDescription = useResumeMaker((s) => s.jobDescription)
  const [improvingIdx, setImprovingIdx] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (i: number, val: string) => onChange(bullets.map((b, idx) => (idx === i ? val : b)))
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i))
  const add = () => onChange([...bullets, ''])

  const improve = async (i: number) => {
    const current = bullets[i]
    if (!current.trim()) return
    setImprovingIdx(i)
    setError(null)
    try {
      const others = bullets.filter((_, idx) => idx !== i)
      const { bullet } = await resumeBuilderApi.rewriteBullet(current, context, others, jobDescription)
      update(i, bullet)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Improve failed')
    } finally {
      setImprovingIdx(null)
    }
  }

  const generateFromNotes = async () => {
    if (!notes.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const { bullet } = await resumeBuilderApi.bulletFromText(notes, context, bullets, jobDescription)
      onChange([...bullets, bullet])
      setNotes('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generate failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-1.5">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-slate-400 text-xs">•</span>
          <input
            value={b}
            onChange={(e) => update(i, e.target.value)}
            placeholder="Describe an achievement — start with an action verb, include a metric if you can"
            className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
          <button
            type="button" onClick={() => improve(i)} disabled={improvingIdx === i || !b.trim()}
            className="text-slate-300 hover:text-cyan-500 disabled:opacity-40" title="Improve with AI"
          >
            {improvingIdx === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => remove(i)} className="text-slate-300 hover:text-red-500" title="Remove">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button" onClick={add}
        className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700"
      >
        <Plus className="h-3 w-3" /> Add bullet
      </button>

      <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-1.5">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); generateFromNotes() } }}
          placeholder="Or just type what you did in your own words…"
          className="h-7 flex-1 rounded-md border border-transparent bg-white px-2 text-xs text-slate-700 outline-none focus:border-cyan-300"
        />
        <button
          type="button" onClick={generateFromNotes} disabled={generating || !notes.trim()}
          className="flex shrink-0 items-center gap-1 rounded-md bg-cyan-500 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-40"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Turn into bullet
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
