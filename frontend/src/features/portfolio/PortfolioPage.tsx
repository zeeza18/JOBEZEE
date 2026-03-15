import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, ChevronRight, Copy, Eye, Layers, Link2,
  Loader2, Palette, Save, Settings2,
} from 'lucide-react'
import { profileApi, portfolioApi } from '../../lib/api'
import type { UserProfile, PortfolioConfig } from '../../lib/api'
import { TEMPLATES, CATEGORIES } from './types'
import { TEMPLATE_REGISTRY } from './templates'

// ─── Section keys ─────────────────────────────────────────────────────────────
const SECTION_KEYS = ['about', 'skills', 'experience', 'projects', 'education', 'contact']

const DEFAULT_SECTIONS: Record<string, boolean> = Object.fromEntries(
  SECTION_KEYS.map(k => [k, true])
)

// ─── Mobile tab type ──────────────────────────────────────────────────────────
type MobileTab = 'templates' | 'preview' | 'settings'

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-300 capitalize">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        style={{ background: checked ? '#06b6d4' : '#1e293b' }}>
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  )
}

// ─── Template Card ─────────────────────────────────────────────────────────────
function TemplateCard({ template, selected, onSelect }: {
  template: typeof TEMPLATES[0]; selected: boolean; onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="w-full text-left rounded-xl overflow-hidden border-2 transition-colors"
      style={{
        borderColor: selected ? '#06b6d4' : 'transparent',
        background : '#0f172a',
        outline    : selected ? '0 0 0 1px rgba(6,182,212,0.3)' : 'none',
      }}>
      <div className={`h-12 w-full ${template.thumbnail} relative`}>
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex items-center gap-1 bg-cyan-500 rounded px-2 py-0.5">
              <Check className="h-3 w-3 text-black" />
              <span className="text-black font-bold text-[10px]">ACTIVE</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-white leading-tight">{template.name}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{template.description}</p>
      </div>
    </motion.button>
  )
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({ primary, accent, active, onClick }: {
  primary: string; accent: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
      style={{
        background  : `linear-gradient(135deg, ${primary}, ${accent})`,
        borderColor : active ? '#fff' : 'transparent',
      }}
    />
  )
}

// ─── Fallback empty profile for preview ──────────────────────────────────────
const PREVIEW_PROFILE: UserProfile = {
  id: '', full_name: 'Alex Morgan', email: 'alex@example.com',
  phone: '+1 (555) 234-5678', address: '', city: 'San Francisco', state: 'CA',
  country: 'USA', zip_code: '',
  linkedin: 'https://linkedin.com/in/alexmorgan',
  github: 'https://github.com/alexmorgan',
  portfolio: '', personal_website: '',
  headline: 'Senior Software Engineer building scalable systems at the intersection of performance and reliability.',
  preferred_name: 'Alex',
  desired_roles: ['Senior Engineer'], preferred_locations: ['San Francisco'],
  preferred_countries: [], preferred_regions: [], industries: [],
  remote_preference: 'hybrid', job_type: 'full_time', experience_level: 'senior',
  salary_min: 0, salary_max: 0, salary_currency: 'USD', salary_range_text: '',
  work_authorization: '', visa_sponsorship_required: false, work_permit_type: '',
  current_job_title: 'Senior Software Engineer', target_role: 'Staff Engineer',
  years_experience: '7',
  education: "Bachelor's in Computer Science",
  skills_languages:  ['Python', 'TypeScript', 'Go', 'Rust'],
  skills_frameworks: ['React', 'FastAPI', 'Kubernetes', 'PostgreSQL'],
  skills_tools:      ['AWS', 'Docker', 'Terraform', 'Git'],
  resume_facts_companies: ['Stripe', 'Airbnb', 'Google'],
  resume_facts_projects:  ['Distributed Rate Limiter', 'Real-time Analytics Pipeline', 'Auth Microservice'],
  resume_facts_schools:   ['MIT', 'Stanford University'],
  resume_facts_metrics:   [
    'Reduced API latency by 62% across 40M daily requests',
    'Led team of 12 engineers shipping 3 major features per quarter',
    'Cut infrastructure cost 35% through architecture redesign',
  ],
  earliest_start: 'Immediately',
  search_radius_miles: 50, hours_old: 72, results_per_site: 20,
  resume_filename: '', resume_url: '', created_at: '', updated_at: '',
}

const COLOR_PRESETS = [
  { primary: '#06b6d4', accent: '#a78bfa' },
  { primary: '#8b5cf6', accent: '#06b6d4' },
  { primary: '#f59e0b', accent: '#111827' },
  { primary: '#ef4444', accent: '#1a1a1a' },
  { primary: '#0f2044', accent: '#c9a84c' },
  { primary: '#1e40af', accent: '#64748b' },
  { primary: '#0d2818', accent: '#c9a84c' },
  { primary: '#7c3aed', accent: '#ec4899' },
  { primary: '#0891b2', accent: '#14b8a6' },
  { primary: '#1c1917', accent: '#f97316' },
]

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [profile,      setProfile]      = useState<UserProfile | null>(null)
  const [config,       setConfig]       = useState<PortfolioConfig | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [activeCat,    setActiveCat]    = useState('all')
  const [selectedId,   setSelectedId]   = useState('ModernDev')
  const [primaryColor, setPrimaryColor] = useState('#06b6d4')
  const [accentColor,  setAccentColor]  = useState('#a78bfa')
  const [showSections, setShowSections] = useState<Record<string, boolean>>(DEFAULT_SECTIONS)
  const [mobileTab,    setMobileTab]    = useState<MobileTab>('templates')

  useEffect(() => {
    Promise.all([profileApi.get(), portfolioApi.getMy()])
      .then(([p, c]) => {
        setProfile(p)
        if (c) {
          setConfig(c)
          setSelectedId(c.template_id || 'ModernDev')
          setPrimaryColor(c.primary_color || '#06b6d4')
          setAccentColor(c.accent_color  || '#a78bfa')
          setShowSections({ ...DEFAULT_SECTIONS, ...(c.show_sections || {}) })
          if (c.category) setActiveCat(c.category)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelectTemplate = useCallback((id: string) => {
    setSelectedId(id)
    const tpl = TEMPLATES.find(t => t.id === id)
    if (tpl) {
      setPrimaryColor(tpl.defaultPrimary)
      setAccentColor(tpl.defaultAccent)
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const tpl = TEMPLATES.find(t => t.id === selectedId)
      const updated = await portfolioApi.updateMy({
        template_id   : selectedId,
        category      : tpl?.category ?? 'tech',
        primary_color : primaryColor,
        accent_color  : accentColor,
        show_sections : showSections,
        is_published  : true,
      })
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // show nothing — button reverts
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    const src = profile ?? PREVIEW_PROFILE
    const slug = (src.preferred_name || src.full_name || src.email?.split('@')[0] || 'user')
      .toLowerCase().replace(/\s+/g, '')
    const url = `${window.location.origin}/portfolio/${slug}`
    navigator.clipboard.writeText(url).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const filteredTemplates = activeCat === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === activeCat)

  const TemplateComponent = TEMPLATE_REGISTRY[selectedId] ?? TEMPLATE_REGISTRY['ModernDev']
  const previewProfile = profile ?? PREVIEW_PROFILE

  const portfolioSlug = (
    (previewProfile.preferred_name || previewProfile.full_name || previewProfile.email?.split('@')[0] || 'user')
      .toLowerCase().replace(/\s+/g, '')
  )

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-sm text-slate-500">Loading builder…</p>
        </div>
      </div>
    )
  }

  // ── Save / Copy button ──────────────────────────────────────────────────────
  const SaveButton = ({ full = false }: { full?: boolean }) => (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className={`flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
        full ? 'w-full py-2.5' : 'px-4 py-1.5'
      }`}
      style={{ background: saved ? '#10b981' : '#06b6d4', color: '#000' }}>
      {saving
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : saved
          ? <Check className="h-4 w-4" />
          : <Save className="h-4 w-4" />
      }
      {saving ? 'Saving…' : saved ? 'Saved' : 'Save & Publish'}
    </button>
  )

  // ── Templates panel ────────────────────────────────────────────────────────
  const TemplatesPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Category tabs — horizontal scroll on mobile */}
      <div className="flex gap-1 p-3 overflow-x-auto border-b scrollbar-none flex-shrink-0"
        style={{ borderColor: '#1e293b' }}>
        <button
          onClick={() => setActiveCat('all')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          style={{
            background: activeCat === 'all' ? '#06b6d4' : '#1e293b',
            color     : activeCat === 'all' ? '#000' : '#94a3b8',
          }}>
          All
        </button>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const active = activeCat === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
              style={{
                background: active ? '#06b6d4' : '#1e293b',
                color     : active ? '#000' : '#94a3b8',
              }}>
              <Icon className="h-3 w-3" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-2 md:grid-cols-1 gap-3">
            {filteredTemplates.map(tpl => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                selected={selectedId === tpl.id}
                onSelect={() => {
                  handleSelectTemplate(tpl.id)
                  // Auto-switch to preview on mobile after selecting
                  setMobileTab('preview')
                }}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )

  // ── Settings panel ─────────────────────────────────────────────────────────
  const SettingsPanel = () => (
    <div className="overflow-y-auto h-full">
      {/* Colors */}
      <div className="p-4 border-b" style={{ borderColor: '#1e293b' }}>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Colors</p>

        {/* Primary */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">Primary</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-600">{primaryColor.toUpperCase()}</span>
            <label className="cursor-pointer">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0.5"
                style={{ outline: '1px solid #1e293b' }} />
            </label>
          </div>
        </div>

        {/* Accent */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-300">Accent</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-600">{accentColor.toUpperCase()}</span>
            <label className="cursor-pointer">
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0.5"
                style={{ outline: '1px solid #1e293b' }} />
            </label>
          </div>
        </div>

        {/* Presets */}
        <p className="text-xs text-slate-600 mb-2">Presets</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map(({ primary, accent }) => (
            <ColorSwatch
              key={primary}
              primary={primary}
              accent={accent}
              active={primaryColor === primary}
              onClick={() => { setPrimaryColor(primary); setAccentColor(accent) }}
            />
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="p-4 border-b" style={{ borderColor: '#1e293b' }}>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Sections</p>
        <div className="space-y-0.5">
          {SECTION_KEYS.map(key => (
            <ToggleSwitch
              key={key}
              label={key}
              checked={showSections[key] ?? true}
              onChange={val => setShowSections(prev => ({ ...prev, [key]: val }))}
            />
          ))}
        </div>
      </div>

      {/* Publish */}
      <div className="p-4 space-y-3">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Publish</p>
        <div className="rounded-lg px-3 py-2" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <p className="text-[10px] text-slate-600 mb-0.5">Portfolio URL</p>
          <p className="text-xs font-mono text-cyan-400 break-all">
            /portfolio/{portfolioSlug}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-all hover:bg-white/5"
          style={{ borderColor: '#1e293b', color: '#94a3b8' }}>
          <Copy className="h-4 w-4" />
          Copy Portfolio Link
        </button>
        <SaveButton full />
        {config?.updated_at && (
          <p className="text-[10px] text-slate-700 text-center">
            Last saved {new Date(config.updated_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── Top bar (visible on all sizes) ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="text-base font-black text-slate-800">Portfolio Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {TEMPLATES.find(t => t.id === selectedId)?.name ?? 'Pick a template'}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-white/5"
            style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
            <Link2 className="h-3.5 w-3.5" />
            Copy Link
          </button>
          <SaveButton />
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="flex md:hidden rounded-xl overflow-hidden mb-3 shrink-0"
        style={{ background: '#0d1117', border: '1px solid #1e293b' }}>
        {([ ['templates', Layers, 'Templates'], ['preview', Eye, 'Preview'], ['settings', Settings2, 'Settings'] ] as const).map(([tab, Icon, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
            style={{
              background: mobileTab === tab ? '#06b6d4' : 'transparent',
              color     : mobileTab === tab ? '#000'    : '#64748b',
            }}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Mobile panels ── */}
      <div className="flex md:hidden flex-1 overflow-hidden rounded-xl"
        style={{ border: '1px solid #1e293b', background: '#0d1117', minHeight: 400 }}>
        {mobileTab === 'templates' && (
          <div className="w-full overflow-hidden">
            <TemplatesPanel />
          </div>
        )}
        {mobileTab === 'preview' && (
          <div className="w-full overflow-y-auto" style={{ background: '#020817' }}>
            <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '181.8%', pointerEvents: 'none' }}>
              <TemplateComponent
                profile={previewProfile}
                primaryColor={primaryColor}
                accentColor={accentColor}
                showSections={showSections}
              />
            </div>
          </div>
        )}
        {mobileTab === 'settings' && (
          <div className="w-full overflow-hidden">
            <SettingsPanel />
          </div>
        )}
      </div>

      {/* Mobile save button strip */}
      <div className="flex md:hidden gap-2 mt-3 shrink-0">
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all"
          style={{ borderColor: '#1e293b', color: '#64748b', background: '#0d1117' }}>
          <Copy className="h-4 w-4" />
          Copy Link
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: saved ? '#10b981' : '#06b6d4', color: '#000' }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save & Publish'}
        </button>
      </div>

      {/* ── Desktop 3-panel layout ── */}
      <div className="hidden md:flex flex-1 gap-0 rounded-xl overflow-hidden"
        style={{ border: '1px solid #1e293b', background: '#0d1117', height: 'calc(100vh - 220px)' }}>

        {/* Left — Templates */}
        <aside className="w-64 shrink-0 border-r flex flex-col overflow-hidden" style={{ borderColor: '#1e293b' }}>
          <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: '#1e293b' }}>
            <p className="text-xs font-black text-white">Templates</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{TEMPLATES.length} designs across 6 categories</p>
          </div>
          <TemplatesPanel />
        </aside>

        {/* Center — Preview */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0" style={{ borderColor: '#1e293b', background: '#0d1117' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500">Live preview</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
            <span className="text-xs font-semibold text-white">
              {TEMPLATES.find(t => t.id === selectedId)?.name}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ background: '#020817' }}>
            <div style={{ transform: 'scale(0.82)', transformOrigin: 'top left', width: '121.9%', pointerEvents: 'none' }}>
              <TemplateComponent
                profile={previewProfile}
                primaryColor={primaryColor}
                accentColor={accentColor}
                showSections={showSections}
              />
            </div>
          </div>
        </main>

        {/* Right — Settings */}
        <aside className="w-60 shrink-0 border-l flex flex-col overflow-hidden" style={{ borderColor: '#1e293b' }}>
          <div className="px-4 py-3 border-b shrink-0 flex items-center gap-2" style={{ borderColor: '#1e293b' }}>
            <Palette className="h-3.5 w-3.5 text-cyan-500" />
            <p className="text-xs font-black text-white">Customize</p>
          </div>
          <SettingsPanel />
        </aside>
      </div>
    </div>
  )
}
