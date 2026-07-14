import { RotateCcw } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Select } from '../../../components/ui/Select'
import { useResumeMaker, DEFAULT_SETTINGS } from '../store/useResumeMaker'
import { ACCENT_COLORS } from '../templates/styles'
import type { ResumeDocumentSettings } from '../../../lib/api'

function LevelPicker({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button" onClick={() => onChange(n)}
            className={cn(
              'h-7 w-7 rounded-md border text-xs font-semibold transition',
              value === n ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function MarginSlider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-xs text-slate-400">{value}mm</span>
      </div>
      <input
        type="range" min={5} max={25} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-500"
      />
    </div>
  )
}

export function FormattingControls() {
  const { settings, updateSettings } = useResumeMaker()

  const set = <K extends keyof ResumeDocumentSettings>(key: K, value: ResumeDocumentSettings[K]) =>
    updateSettings((s) => ({ ...s, [key]: value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Formatting</p>
        <button
          type="button"
          onClick={() => updateSettings(() => ({ ...DEFAULT_SETTINGS }))}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Page size</p>
          <Select value={settings.page_size} onChange={(e) => set('page_size', e.target.value as ResumeDocumentSettings['page_size'])}>
            <option value="letter">US Letter</option>
            <option value="a4">A4</option>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Header font</p>
          <Select value={settings.header_font} onChange={(e) => set('header_font', e.target.value as ResumeDocumentSettings['header_font'])}>
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Body font</p>
          <Select value={settings.body_font} onChange={(e) => set('body_font', e.target.value as ResumeDocumentSettings['body_font'])}>
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Accent color</p>
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {(Object.keys(ACCENT_COLORS) as ResumeDocumentSettings['accent_color'][]).map((color) => (
            <button
              key={color} type="button" onClick={() => set('accent_color', color)}
              title={color}
              className={cn('h-6 w-6 rounded-full border-2', settings.accent_color === color ? 'border-slate-800' : 'border-transparent')}
              style={{ background: ACCENT_COLORS[color] }}
            />
          ))}
        </div>
      </div>

      <LevelPicker label="Spacing" value={settings.spacing_level} onChange={(n) => set('spacing_level', n)} />
      <LevelPicker label="Font size" value={settings.font_size_level} onChange={(n) => set('font_size_level', n)} />

      <div className="grid grid-cols-2 gap-3">
        <MarginSlider label="Top margin" value={settings.margin_top} onChange={(n) => set('margin_top', n)} />
        <MarginSlider label="Bottom margin" value={settings.margin_bottom} onChange={(n) => set('margin_bottom', n)} />
        <MarginSlider label="Left margin" value={settings.margin_left} onChange={(n) => set('margin_left', n)} />
        <MarginSlider label="Right margin" value={settings.margin_right} onChange={(n) => set('margin_right', n)} />
      </div>

      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={settings.compact} onChange={(e) => set('compact', e.target.checked)} />
          Compact mode
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={settings.show_contact_icons} onChange={(e) => set('show_contact_icons', e.target.checked)} />
          Show contact line
        </label>
      </div>
    </div>
  )
}
