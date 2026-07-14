import { Plus, X } from 'lucide-react'

export function BulletListEditor({ bullets, onChange }: { bullets: string[]; onChange: (next: string[]) => void }) {
  const update = (i: number, val: string) => onChange(bullets.map((b, idx) => (idx === i ? val : b)))
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i))
  const add = () => onChange([...bullets, ''])

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
          <button type="button" onClick={() => remove(i)} className="text-slate-300 hover:text-red-500">
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
    </div>
  )
}
