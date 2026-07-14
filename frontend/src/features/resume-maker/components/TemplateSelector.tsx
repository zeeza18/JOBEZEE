import { cn } from '../../../lib/utils'
import { useResumeMaker } from '../store/useResumeMaker'
import { ACCENT_COLORS, TEMPLATES, TEMPLATE_FONT_PRESETS, headingColor } from '../templates/styles'
import type { ResumeDocumentSettings } from '../../../lib/api'

export function TemplateSelector() {
  const { settings, updateSettings } = useResumeMaker()

  const selectTemplate = (id: ResumeDocumentSettings['template']) => {
    const preset = TEMPLATE_FONT_PRESETS[id]
    updateSettings((s) => ({
      ...s,
      template: id,
      ...(preset ? { header_font: preset.header, body_font: preset.body } : {}),
    }))
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {TEMPLATES.map((tpl) => {
        const active = settings.template === tpl.id
        const previewSettings = { ...settings, template: tpl.id }
        const accentBar = tpl.id === 'modern' || tpl.id === 'modern-two-column' || tpl.id === 'vivid'
          ? ACCENT_COLORS[settings.accent_color] : '#9ca3af'
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => selectTemplate(tpl.id)}
            title={tpl.description}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition',
              active ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <div className="flex h-16 w-full flex-col items-center gap-1 rounded-md bg-white p-1.5 shadow-inner">
              <div className="h-1.5 w-3/5 rounded-sm" style={{ background: headingColor(previewSettings) }} />
              <div className="h-1 w-4/5 rounded-sm bg-slate-200" />
              {tpl.twoColumn ? (
                <div className="mt-1 flex w-full flex-1 gap-1">
                  <div className="flex w-1/3 flex-col gap-0.5">
                    <div className="h-1 w-full rounded-sm" style={{ background: accentBar }} />
                    <div className="h-1 w-full rounded-sm bg-slate-100" />
                    <div className="h-1 w-full rounded-sm bg-slate-100" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="h-1 w-full rounded-sm" style={{ background: accentBar }} />
                    <div className="h-1 w-full rounded-sm bg-slate-100" />
                    <div className="h-1 w-2/3 rounded-sm bg-slate-100" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-1 h-1 w-full rounded-sm" style={{ background: accentBar }} />
                  <div className="h-1 w-full rounded-sm bg-slate-100" />
                  <div className="h-1 w-2/3 rounded-sm bg-slate-100" />
                </>
              )}
            </div>
            <span className={cn('text-xs font-semibold', active ? 'text-cyan-700' : 'text-slate-600')}>{tpl.name}</span>
          </button>
        )
      })}
    </div>
  )
}
