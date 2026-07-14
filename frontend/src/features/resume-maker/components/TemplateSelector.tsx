import { cn } from '../../../lib/utils'
import { useResumeMaker } from '../store/useResumeMaker'
import { ACCENT_COLORS, TEMPLATES, headingColor } from '../templates/styles'

export function TemplateSelector() {
  const { settings, updateSettings } = useResumeMaker()

  return (
    <div className="grid grid-cols-3 gap-2">
      {TEMPLATES.map((tpl) => {
        const active = settings.template === tpl.id
        const previewSettings = { ...settings, template: tpl.id }
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => updateSettings((s) => ({ ...s, template: tpl.id }))}
            title={tpl.description}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition',
              active ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <div className="flex h-16 w-full flex-col items-center gap-1 rounded-md bg-white p-1.5 shadow-inner">
              <div className="h-1.5 w-3/5 rounded-sm" style={{ background: headingColor(previewSettings) }} />
              <div className="h-1 w-4/5 rounded-sm bg-slate-200" />
              <div
                className="mt-1 h-1 w-full rounded-sm"
                style={{ background: tpl.id === 'modern' ? ACCENT_COLORS[settings.accent_color] : '#9ca3af' }}
              />
              <div className="h-1 w-full rounded-sm bg-slate-100" />
              <div className="h-1 w-2/3 rounded-sm bg-slate-100" />
            </div>
            <span className={cn('text-xs font-semibold', active ? 'text-cyan-700' : 'text-slate-600')}>{tpl.name}</span>
          </button>
        )
      })}
    </div>
  )
}
