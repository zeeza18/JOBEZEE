import { useState, useEffect, useCallback } from 'react'
import { useApiCache } from '../../store/useApiCache'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Code2, Copy, ExternalLink, Heart, Loader2,
  Palette, Pencil, Stethoscope, TrendingUp, X, Zap,
  Briefcase, BarChart2, Image, Type, Layers, Sparkles,
} from 'lucide-react'
import { profileApi, portfolioApi } from '../../lib/api'
import type { UserProfile, PortfolioConfig } from '../../lib/api'
import { TEMPLATE_REGISTRY } from './templates'
import type { TextOverrides } from './types'

// ── Section keys ──────────────────────────────────────────────────────────────
const SECTION_KEYS = ['about', 'skills', 'experience', 'projects', 'education', 'contact']
const DEFAULT_SECTIONS: Record<string, boolean> = Object.fromEntries(SECTION_KEYS.map(k => [k, true]))

const CATEGORY_DEFAULTS: Record<string, { primary: string; accent: string }> = {
  tech       : { primary: '#06b6d4', accent: '#a78bfa' },
  creative   : { primary: '#f59e0b', accent: '#ef4444' },
  business   : { primary: '#c9a84c', accent: '#f5edd8' },
  finance    : { primary: '#00d46a', accent: '#ffd700' },
  healthcare : { primary: '#0891b2', accent: '#14b8a6' },
  marketing  : { primary: '#8b5cf6', accent: '#ec4899' },
}

// ── Canva presets ──────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'cyber',    name: 'Cyber',     primary: '#06b6d4', accent: '#a78bfa' },
  { id: 'midnight', name: 'Midnight',  primary: '#8b5cf6', accent: '#ec4899' },
  { id: 'forest',   name: 'Forest',    primary: '#10b981', accent: '#34d399' },
  { id: 'sunset',   name: 'Sunset',    primary: '#f97316', accent: '#ef4444' },
  { id: 'ocean',    name: 'Ocean',     primary: '#0ea5e9', accent: '#06b6d4' },
  { id: 'gold',     name: 'Executive', primary: '#c9a84c', accent: '#fbbf24' },
  { id: 'rose',     name: 'Rose',      primary: '#f43f5e', accent: '#fb923c' },
  { id: 'neon',     name: 'Neon',      primary: '#22d3ee', accent: '#a3e635' },
]

const HERO_GRADIENTS = [
  { id: 'mesh',   label: 'Mesh',    css: (p: string, a: string) => `radial-gradient(ellipse at 20% 50%, ${p}25 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${a}20 0%, transparent 55%), #0a0a0f` },
  { id: 'top',    label: 'Aurora',  css: (p: string) => `radial-gradient(ellipse at top, ${p}35 0%, #0a0a0f 65%)` },
  { id: 'side',   label: 'Neon',    css: (p: string, a: string) => `linear-gradient(135deg, ${p}20 0%, #0a0a0f 40%, ${a}15 100%)` },
  { id: 'split',  label: 'Split',   css: (p: string, a: string) => `linear-gradient(160deg, ${p}30 0%, #0a0a0f 50%, ${a}20 100%)` },
  { id: 'pure',   label: 'Pure',    css: () => '#0a0a0f' },
  { id: 'slate',  label: 'Slate',   css: () => `radial-gradient(ellipse at top left, #1e293b 0%, #0a0a0f 60%)` },
]

const PROFILE_PHOTOS = [
  { id: 'initials', label: 'Initials', url: null },
  { id: 'photo1',   label: 'Style 1',  url: 'https://i.pravatar.cc/300?img=11' },
  { id: 'photo2',   label: 'Style 2',  url: 'https://i.pravatar.cc/300?img=47' },
  { id: 'photo3',   label: 'Style 3',  url: 'https://i.pravatar.cc/300?img=68' },
  { id: 'photo4',   label: 'Style 4',  url: 'https://i.pravatar.cc/300?img=32' },
]

// ── Category cards ────────────────────────────────────────────────────────────
interface CategoryCard {
  id: string; label: string; tagline: string
  Icon: React.ElementType; gradient: string; textColor: string; iconBg: string
  templateId: string; previewBg: string; accentHex: string
}

const CARDS: CategoryCard[] = [
  { id: 'tech',       label: 'Tech',       tagline: 'For developers & engineers',    Icon: Code2,        gradient: 'from-slate-900 via-cyan-950 to-slate-900',      textColor: 'text-cyan-300',    iconBg: 'bg-cyan-500/20',    templateId: 'ModernDev',      previewBg: '#0a0a0f', accentHex: '#06b6d4' },
  { id: 'creative',   label: 'Creative',   tagline: 'For designers & artists',       Icon: Palette,      gradient: 'from-rose-950 via-orange-950 to-yellow-950',    textColor: 'text-amber-300',   iconBg: 'bg-amber-500/20',   templateId: 'ArtCanvas',      previewBg: '#0d0d0d', accentHex: '#f59e0b' },
  { id: 'business',   label: 'Business',   tagline: 'For executives & managers',     Icon: Briefcase,    gradient: 'from-slate-800 via-blue-950 to-slate-900',      textColor: 'text-amber-300',   iconBg: 'bg-amber-500/20',   templateId: 'ExecutiveSuite', previewBg: '#0f2044', accentHex: '#c9a84c' },
  { id: 'finance',    label: 'Finance',    tagline: 'For analysts & bankers',        Icon: BarChart2,    gradient: 'from-green-950 via-emerald-950 to-slate-900',   textColor: 'text-emerald-400', iconBg: 'bg-emerald-500/20', templateId: 'WallStreet',     previewBg: '#070f0a', accentHex: '#00d46a' },
  { id: 'healthcare', label: 'Healthcare', tagline: 'For medical professionals',     Icon: Stethoscope,  gradient: 'from-teal-50 via-cyan-50 to-blue-50',           textColor: 'text-teal-700',    iconBg: 'bg-teal-100',       templateId: 'CareFlow',       previewBg: '#f0fdfa', accentHex: '#0891b2' },
  { id: 'marketing',  label: 'Marketing',  tagline: 'For marketers & growth leads',  Icon: TrendingUp,   gradient: 'from-violet-600 via-purple-600 to-pink-600',    textColor: 'text-white',       iconBg: 'bg-white/20',       templateId: 'BrandStudio',    previewBg: '#0f0f14', accentHex: '#ec4899' },
]

// ── Per-category demo profiles ─────────────────────────────────────────────
const BASE_PROFILE = {
  id: '', phone: '', address: '', state: '', zip_code: '',
  portfolio: '', personal_website: '', preferred_name: '',
  desired_roles: [] as string[], preferred_locations: [] as string[], preferred_countries: [] as string[],
  preferred_regions: [] as string[], industries: [] as string[],
  remote_preference: 'hybrid' as const, job_type: 'full_time' as const, experience_level: 'senior' as const,
  salary_min: 0, salary_max: 0, salary_currency: 'USD', salary_range_text: '',
  work_authorization: '', visa_sponsorship_required: false, work_permit_type: '',
  education: '', skills_languages: [] as string[], skills_frameworks: [] as string[], skills_tools: [] as string[],
  github: '', earliest_start: 'Immediately', search_radius_miles: 50, hours_old: 72, results_per_site: 20,
  resume_filename: '', resume_url: '', created_at: '', updated_at: '', apply_password: '',
}

const SAMPLES: Record<string, import('../../lib/api').UserProfile> = {
  tech: {
    ...BASE_PROFILE,
    full_name: 'Alex Morgan', email: 'alex@example.com', city: 'San Francisco', country: 'USA',
    github: 'https://github.com/alexmorgan', linkedin: 'https://linkedin.com/in/alexmorgan',
    headline: 'Senior Software Engineer building scalable distributed systems at the intersection of performance and reliability.',
    current_job_title: 'Senior Software Engineer', target_role: 'Staff Engineer',
    years_experience: '7', education: "Bachelor's in Computer Science, MIT",
    skills_languages: ['Python', 'TypeScript', 'Go', 'Rust'],
    skills_frameworks: ['React', 'FastAPI', 'Kubernetes', 'PostgreSQL'],
    skills_tools: ['AWS', 'Docker', 'Terraform', 'Git'],
    resume_facts_companies: ['Stripe', 'Airbnb', 'Google'],
    resume_facts_projects: ['Distributed Rate Limiter', 'Real-time Analytics Pipeline', 'Auth Microservice'],
    resume_facts_schools: ['MIT', 'Stanford University'],
    resume_facts_metrics: ['Reduced API latency by 62% across 40M daily requests', 'Led team of 12 engineers', 'Cut infrastructure cost 35%'],
  },
  creative: {
    ...BASE_PROFILE,
    full_name: 'Jordan Reed', email: 'jordan@studio.com', city: 'New York', country: 'USA',
    linkedin: 'https://linkedin.com/in/jordanreed',
    headline: 'Award-winning Art Director crafting brand identities and visual systems for global clients.',
    current_job_title: 'Art Director', target_role: 'Creative Director',
    years_experience: '8', education: 'BFA, Parsons School of Design',
    resume_facts_companies: ['Pentagram', 'IDEO', 'Wieden+Kennedy'],
    resume_facts_projects: ['Nike Brand Identity', 'Spotify Wrapped 2024', 'Airbnb Visual System', 'Cannes Lions Campaign'],
    resume_facts_schools: ['Parsons School of Design', 'Rhode Island School of Design'],
    resume_facts_metrics: ['60M+ campaign impressions', '3 Cannes Lions won', '4 Fortune 500 rebrands delivered'],
  },
  business: {
    ...BASE_PROFILE,
    full_name: 'Sarah Chen', email: 'sarah@exec.com', city: 'Chicago', country: 'USA',
    linkedin: 'https://linkedin.com/in/sarahchen',
    headline: 'Seasoned executive driving organizational transformation and delivering measurable growth across global enterprises.',
    current_job_title: 'Chief Operating Officer', target_role: 'CEO',
    years_experience: '18', education: 'MBA, Harvard Business School',
    resume_facts_companies: ['McKinsey & Company', 'Deloitte', 'Johnson & Johnson'],
    resume_facts_projects: ['Global Operations Restructure', 'Digital Transformation Initiative', 'APAC Market Expansion'],
    resume_facts_schools: ['Harvard Business School', 'Northwestern University'],
    resume_facts_metrics: ['₹450Cr+ revenue grown', '3,000+ professionals led', '12 companies scaled'],
  },
  finance: {
    ...BASE_PROFILE,
    full_name: 'Michael Ross', email: 'mross@capital.com', city: 'New York', country: 'USA',
    linkedin: 'https://linkedin.com/in/michaelross',
    headline: 'CFA charterholder managing $2.4B AUM with a 14-year track record of 18%+ annual returns across equity and fixed income.',
    current_job_title: 'Portfolio Manager', target_role: 'Managing Director',
    years_experience: '14', education: 'MBA, Columbia Business School; CFA Level III',
    resume_facts_companies: ['Goldman Sachs', 'BlackRock', 'JP Morgan'],
    resume_facts_projects: ['Emerging Markets Growth Fund', 'ESG Portfolio Strategy', 'Cross-Border M&A Advisory'],
    resume_facts_schools: ['Columbia Business School', 'University of Chicago'],
    resume_facts_metrics: ['$2.4B AUM', '18.4% avg. annual returns', '47 deals closed'],
  },
  healthcare: {
    ...BASE_PROFILE,
    full_name: 'Dr. Emily Park', email: 'dr.park@hospital.com', city: 'Boston', country: 'USA',
    linkedin: 'https://linkedin.com/in/drepark',
    headline: 'Board-certified Cardiologist with 12 years of clinical excellence, research, and patient care at leading institutions.',
    current_job_title: 'Cardiologist, MD FACC', target_role: 'Chief of Cardiology',
    years_experience: '12', education: 'MD, Johns Hopkins; Fellowship, Mayo Clinic',
    resume_facts_companies: ['Mayo Clinic', 'Massachusetts General Hospital', 'Cleveland Clinic'],
    resume_facts_projects: ['Cardiac Catheterization Lab', 'Heart Failure Management Program', 'Preventive Cardiology Research'],
    resume_facts_schools: ['Johns Hopkins School of Medicine', 'Harvard Medical School'],
    resume_facts_metrics: ['4,800+ patients treated', '18+ publications in NEJM & Lancet', '6 hospital affiliations'],
  },
  marketing: {
    ...BASE_PROFILE,
    full_name: 'Nina Patel', email: 'nina@brandco.com', city: 'Los Angeles', country: 'USA',
    linkedin: 'https://linkedin.com/in/ninapatel',
    headline: 'Brand Strategist driving 340% average campaign ROI through data-led storytelling and integrated marketing at scale.',
    current_job_title: 'VP of Marketing', target_role: 'Chief Marketing Officer',
    years_experience: '10', education: 'MBA, Kellogg School of Management',
    resume_facts_companies: ['Ogilvy', 'Wunderman Thompson', 'Unilever'],
    resume_facts_projects: ['Global Product Launch Campaign', 'Social Commerce Strategy', 'Brand Identity Overhaul'],
    resume_facts_schools: ['Kellogg School of Management', 'UCLA'],
    resume_facts_metrics: ['24M+ total impressions', '8.4% avg. CTR', '340% avg. campaign ROI'],
  },
}
const SAMPLE = SAMPLES.tech

// ── Mini Preview (card thumbnails) ────────────────────────────────────────────
const PREVIEW_DATA: Record<string, { role: string; skills: string[]; companies: string[] }> = {
  tech:       { role: 'Senior Software Engineer',  skills: ['Python',    'React',       'AWS',      'Docker'],   companies: ['Stripe',    'Google']      },
  creative:   { role: 'Art Director',              skills: ['Figma',     'Photoshop',   'Cinema 4D','Procreate'],companies: ['Pentagram', 'IDEO']         },
  business:   { role: 'Chief Operating Officer',   skills: ['Strategy',  'P&L Mgmt',   'OKRs',     'M&A'],      companies: ['McKinsey',  'Deloitte']     },
  finance:    { role: 'Portfolio Manager, CFA',    skills: ['Equities',  'Bloomberg',   'DCF/LBO',  'Risk Mgmt'],companies: ['Goldman',   'BlackRock']    },
  healthcare: { role: 'Cardiologist, MD FACC',     skills: ['Cardiology','Epic EHR',   'PACS',     'ACLS'],     companies: ['Mayo Clinic','Mass General'] },
  marketing:  { role: 'VP of Marketing',           skills: ['Meta Ads',  'SEO/SEM',    'HubSpot',  'GA4'],      companies: ['Ogilvy',    'Unilever']     },
}

function MiniPreview({ card }: { card: CategoryCard }) {
  const isDark = ['tech', 'finance', 'marketing', 'business', 'creative'].includes(card.id)
  const textColor = isDark ? 'rgba(255,255,255,0.9)' : '#111'
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const data = PREVIEW_DATA[card.id] ?? PREVIEW_DATA.tech
  const sampleName = SAMPLES[card.id]?.full_name ?? 'Alex Morgan'

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ background: card.previewBg, border: `1px solid ${borderColor}` }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderBottom: `1px solid ${borderColor}` }}>
        <div className="w-2 h-2 rounded-full bg-red-400 opacity-70" /><div className="w-2 h-2 rounded-full bg-yellow-400 opacity-70" /><div className="w-2 h-2 rounded-full bg-green-400 opacity-70" />
        <div className="flex-1 mx-2 rounded-sm px-2 py-0.5 text-[7px] truncate" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: subColor }}>jobezee.app/portfolio/you</div>
      </div>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="text-[8px] font-black" style={{ color: card.accentHex }}>PORTFOLIO</div>
        <div className="flex gap-2">{['About', 'Work', 'Contact'].map(s => <div key={s} className="text-[6px]" style={{ color: subColor }}>{s}</div>)}</div>
      </div>
      <div className="px-3 pt-3 pb-2">
        <div className="text-[11px] font-black leading-tight mb-1" style={{ color: textColor }}>{sampleName}</div>
        <div className="text-[7px] mb-2 font-semibold" style={{ color: card.accentHex }}>{data.role}</div>
        <div className="space-y-0.5 mb-2"><div className="h-1 rounded-full w-4/5" style={{ background: subColor, opacity: 0.4 }} /><div className="h-1 rounded-full w-3/5" style={{ background: subColor, opacity: 0.3 }} /></div>
        <div className="flex gap-1.5"><div className="px-2 py-0.5 rounded-sm text-[6px] font-bold" style={{ background: card.accentHex, color: card.previewBg }}>Contact</div><div className="px-2 py-0.5 rounded-sm text-[6px] border" style={{ borderColor: card.accentHex, color: card.accentHex }}>LinkedIn</div></div>
      </div>
      <div className="px-3 py-2 flex gap-1 flex-wrap" style={{ borderTop: `1px solid ${borderColor}` }}>
        {data.skills.map(s => <div key={s} className="px-1.5 py-0.5 rounded text-[5px] font-medium" style={{ background: `${card.accentHex}18`, color: card.accentHex, border: `1px solid ${card.accentHex}30` }}>{s}</div>)}
      </div>
      <div className="px-3 py-2" style={{ borderTop: `1px solid ${borderColor}` }}>
        <div className="text-[6px] font-bold uppercase tracking-wider mb-1" style={{ color: card.accentHex }}>Experience</div>
        {data.companies.map(c => (
          <div key={c} className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded text-[5px] font-black flex items-center justify-center" style={{ background: `${card.accentHex}20`, color: card.accentHex }}>{c[0]}</div>
            <div><div className="text-[6px] font-bold" style={{ color: textColor }}>{c}</div><div className="h-0.5 rounded w-10 mt-0.5" style={{ background: subColor, opacity: 0.3 }} /></div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-center" style={{ background: `${card.accentHex}12`, borderTop: `1px solid ${borderColor}` }}>
        <div className="text-[6px] font-bold" style={{ color: card.accentHex }}>Get In Touch →</div>
      </div>
    </div>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-300 capitalize">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: checked ? '#06b6d4' : '#334155' }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
      </button>
    </div>
  )
}

// ── Editable field ─────────────────────────────────────────────────────────────
function EditField({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Pencil className="h-3 w-3 text-slate-500" />
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      </div>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 resize-none focus:outline-none focus:ring-1"
          style={{ background: '#0a0f1a', border: '1px solid #1e293b' }} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1"
          style={{ background: '#0a0f1a', border: '1px solid #1e293b' }} />
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
type EditorTab = 'themes' | 'colors' | 'images' | 'text' | 'sections'

export default function PortfolioPage() {
  const cache = useApiCache()

  // Init from cache — instant on re-visit
  const [profile,       setProfile]       = useState<UserProfile | null>(() => cache.portfolioData?.profile ?? null)
  const [config,        setConfig]        = useState<PortfolioConfig | null>(() => cache.portfolioData?.config ?? null)
  const [loading,       setLoading]       = useState(!cache.portfolioData)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [openCat,       setOpenCat]       = useState<CategoryCard | null>(null)
  const [primaryColor,  setPrimaryColor]  = useState(() => cache.portfolioData?.config?.primary_color || '#06b6d4')
  const [accentColor,   setAccentColor]   = useState(() => cache.portfolioData?.config?.accent_color  || '#a78bfa')
  const [showSections,  setShowSections]  = useState<Record<string, boolean>>(() => ({
    ...DEFAULT_SECTIONS,
    ...(cache.portfolioData?.config?.show_sections || {}),
  }))

  // Canva editor state
  const [editorTab,     setEditorTab]     = useState<EditorTab>('themes')
  const [isConverted,   setIsConverted]   = useState(false)
  const [heroGradIdx,   setHeroGradIdx]   = useState(0)
  const [profilePhotoId, setProfilePhotoId] = useState('initials')
  const [textOverrides, setTextOverrides] = useState<TextOverrides>({})

  useEffect(() => {
    // Silent refresh (no spinner) if cache hit, full load on first visit
    Promise.all([profileApi.get(), portfolioApi.getMy()])
      .then(([p, c]) => {
        setProfile(p)
        if (c) {
          setConfig(c)
          setPrimaryColor(c.primary_color || '#06b6d4')
          setAccentColor(c.accent_color   || '#a78bfa')
          setShowSections({ ...DEFAULT_SECTIONS, ...(c.show_sections || {}) })
        }
        // Update cache
        useApiCache.getState().setPortfolioData({ profile: p, config: c ?? null })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openCategory = useCallback((card: CategoryCard) => {
    const defaults = CATEGORY_DEFAULTS[card.id]
    setPrimaryColor(defaults.primary)
    setAccentColor(defaults.accent)
    setEditorTab('themes')
    setIsConverted(false)
    setHeroGradIdx(0)
    setProfilePhotoId('initials')
    setTextOverrides({})
    setSaved(false)
    setOpenCat(card)
  }, [])

  const demoProfile     = SAMPLES[openCat?.id ?? 'tech'] ?? SAMPLE
  const previewProfile  = isConverted ? (profile ?? SAMPLE) : demoProfile
  const portfolioSlug   = ((profile ?? SAMPLE).preferred_name || (profile ?? SAMPLE).full_name || 'user').toLowerCase().replace(/\s+/g, '')
  const portfolioUrl    = `${window.location.origin}/portfolio/${portfolioSlug}`

  const heroGradient    = HERO_GRADIENTS[heroGradIdx].css(primaryColor, accentColor)
  const profilePhotoUrl = PROFILE_PHOTOS.find(p => p.id === profilePhotoId)?.url ?? null

  const handleConvert = () => {
    if (profile) {
      setTextOverrides({
        name:  profile.full_name || '',
        title: profile.current_job_title || profile.target_role || '',
        bio:   profile.headline || '',
      })
    }
    setIsConverted(true)
    setEditorTab('text')
  }

  const handleSave = async () => {
    if (!openCat) return
    setSaving(true)
    try {
      const updated = await portfolioApi.updateMy({
        template_id   : openCat.templateId,
        category      : openCat.id,
        primary_color : primaryColor,
        accent_color  : accentColor,
        show_sections : showSections,
        is_published  : true,
      })
      setConfig(updated)
      setSaved(true)
    } catch { /**/ } finally { setSaving(false) }
  }

  const handleCopyLink = () => navigator.clipboard.writeText(portfolioUrl).catch(() => {})
  const handleOpen     = () => window.open(portfolioUrl, '_blank', 'noreferrer')

  const activeCatId = config?.category ?? null
  const activeCard  = CARDS.find(c => c.id === activeCatId)

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
    </div>
  )

  // ── Canva sidebar tabs ─────────────────────────────────────────────────────
  const TABS: { id: EditorTab; Icon: React.ElementType; label: string; locked?: boolean }[] = [
    { id: 'themes',   Icon: Sparkles, label: 'Themes'   },
    { id: 'colors',   Icon: Palette,  label: 'Colors'   },
    { id: 'images',   Icon: Image,    label: 'Images',  locked: !isConverted },
    { id: 'text',     Icon: Type,     label: 'Text',    locked: !isConverted },
    { id: 'sections', Icon: Layers,   label: 'Sections' },
  ]

  // ── Modal ──────────────────────────────────────────────────────────────────
  const TemplateModal = () => {
    if (!openCat) return null
    const TemplateComponent = TEMPLATE_REGISTRY[openCat.templateId] ?? TEMPLATE_REGISTRY['ModernDev']

    return (
      <AnimatePresence>
        <motion.div key="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col" style={{ background: '#020817' }}>

          {/* ── Top bar ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
            style={{ background: '#0d1117', borderColor: '#1e293b' }}>
            <button onClick={() => { setOpenCat(null); setSaved(false) }}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="h-4 w-4" />Back
            </button>

            <div className="flex items-center gap-3">
              {/* Demo / Live badge */}
              {isConverted ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />MY PORTFOLIO
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' }}>
                  DEMO MODE
                </span>
              )}
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }} />
                <span className="text-sm font-bold text-white">{openCat.label} · {openCat.templateId}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <button onClick={handleOpen} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-all hover:scale-105" style={{ background: primaryColor }}>
                  <ExternalLink className="h-3.5 w-3.5" />Open Live
                </button>
              )}
              <button onClick={() => { setOpenCat(null); setSaved(false) }} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Body ──────────────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Preview area */}
            <div className="flex-1 overflow-y-auto relative" style={{ background: '#010510' }}>
              {/* Floating badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 pointer-events-none"
                style={{ background: 'rgba(13,17,23,0.9)', border: '1px solid #1e293b', backdropFilter: 'blur(12px)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isConverted ? '#10b981' : '#f59e0b' }} />
                <span className="text-[10px] text-slate-400 font-medium">{isConverted ? 'Your data' : 'Demo preview'}</span>
              </div>

              {/* Scaled template */}
              <div style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: '138.9%', pointerEvents: 'none' }}>
                <TemplateComponent
                  profile={previewProfile}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  showSections={showSections}
                  heroGradient={heroGradient}
                  profilePhoto={profilePhotoUrl ?? undefined}
                  textOverrides={Object.keys(textOverrides).length ? textOverrides : undefined}
                />
              </div>
            </div>

            {/* ── Canva Sidebar ─────────────────────────────────────────── */}
            <aside className="w-80 shrink-0 border-l flex flex-col" style={{ background: '#0d1117', borderColor: '#1e293b' }}>

              {/* Tab strip */}
              <div className="flex border-b" style={{ borderColor: '#1e293b' }}>
                {TABS.map(({ id, Icon, label, locked }) => (
                  <button key={id} type="button"
                    onClick={() => !locked && setEditorTab(id)}
                    title={locked ? 'Convert to unlock' : label}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors relative ${locked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ color: editorTab === id && !locked ? primaryColor : '#64748b', borderBottom: editorTab === id && !locked ? `2px solid ${primaryColor}` : '2px solid transparent' }}>
                    <Icon className="h-4 w-4" />
                    {label}
                    {locked && <span className="absolute top-1 right-1 text-[8px] text-slate-500">lock</span>}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5">

                {/* THEMES TAB */}
                {editorTab === 'themes' && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preset Themes</p>
                    <div className="grid grid-cols-2 gap-3">
                      {THEMES.map(t => (
                        <button key={t.id} type="button"
                          onClick={() => { setPrimaryColor(t.primary); setAccentColor(t.accent) }}
                          className="rounded-xl p-3 text-left border-2 transition-all hover:scale-[1.02]"
                          style={{
                            background: `linear-gradient(135deg, ${t.primary}20, ${t.accent}15)`,
                            borderColor: primaryColor === t.primary ? primaryColor : '#1e293b',
                          }}>
                          <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-bold text-white">{t.name}</span>
                            {primaryColor === t.primary && <Check className="h-3 w-3 ml-auto" style={{ color: t.primary }} />}
                          </div>
                          <div className="flex gap-1.5">
                            <div className="w-8 h-3 rounded-full" style={{ background: t.primary }} />
                            <div className="w-8 h-3 rounded-full" style={{ background: t.accent }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* COLORS TAB */}
                {editorTab === 'colors' && (
                  <div className="space-y-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Custom Colors</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#0a0f1a', border: '1px solid #1e293b' }}>
                        <div>
                          <p className="text-xs font-bold text-white mb-0.5">Primary</p>
                          <p className="text-[10px] font-mono text-slate-500">{primaryColor.toUpperCase()}</p>
                        </div>
                        <label className="cursor-pointer">
                          <div className="w-10 h-10 rounded-xl border-2 border-white/20 overflow-hidden">
                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                              className="w-14 h-14 -m-2 cursor-pointer border-0" />
                          </div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#0a0f1a', border: '1px solid #1e293b' }}>
                        <div>
                          <p className="text-xs font-bold text-white mb-0.5">Accent</p>
                          <p className="text-[10px] font-mono text-slate-500">{accentColor.toUpperCase()}</p>
                        </div>
                        <label className="cursor-pointer">
                          <div className="w-10 h-10 rounded-xl border-2 border-white/20 overflow-hidden">
                            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                              className="w-14 h-14 -m-2 cursor-pointer border-0" />
                          </div>
                        </label>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick Combos</p>
                    <div className="grid grid-cols-4 gap-2">
                      {THEMES.map(t => (
                        <button key={t.id} type="button" title={t.name}
                          onClick={() => { setPrimaryColor(t.primary); setAccentColor(t.accent) }}
                          className="h-8 rounded-lg border-2 transition-transform hover:scale-110"
                          style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`, borderColor: primaryColor === t.primary ? '#fff' : 'transparent' }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* IMAGES TAB */}
                {editorTab === 'images' && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Hero Background</p>
                      <div className="grid grid-cols-3 gap-2">
                        {HERO_GRADIENTS.map((g, idx) => (
                          <button key={g.id} type="button"
                            onClick={() => setHeroGradIdx(idx)}
                            className="h-14 rounded-xl border-2 text-[9px] font-bold text-white/60 transition-all hover:scale-105 overflow-hidden"
                            style={{ background: g.css(primaryColor, accentColor), borderColor: heroGradIdx === idx ? primaryColor : 'transparent' }}>
                            {heroGradIdx === idx && <Check className="h-3 w-3 text-white" />}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {HERO_GRADIENTS.map((g) => (
                          <p key={g.id} className="text-[9px] text-slate-600 text-center">{g.label}</p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Profile Photo</p>
                      <div className="grid grid-cols-3 gap-2">
                        {PROFILE_PHOTOS.map(ph => (
                          <button key={ph.id} type="button"
                            onClick={() => setProfilePhotoId(ph.id)}
                            className="h-16 rounded-xl border-2 overflow-hidden transition-all hover:scale-105 flex items-center justify-center"
                            style={{ borderColor: profilePhotoId === ph.id ? primaryColor : '#1e293b', background: '#0a0f1a' }}>
                            {ph.url ? (
                              <img src={ph.url} alt={ph.label} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-black" style={{ color: primaryColor }}>A B</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 text-center">Sample photos for preview</p>
                    </div>
                  </div>
                )}

                {/* TEXT TAB */}
                {editorTab === 'text' && (
                  <div className="space-y-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Edit Your Content</p>
                    <EditField label="Name" value={textOverrides.name ?? previewProfile.full_name ?? ''}
                      onChange={v => setTextOverrides(p => ({ ...p, name: v }))} />
                    <EditField label="Title / Role" value={textOverrides.title ?? previewProfile.current_job_title ?? ''}
                      onChange={v => setTextOverrides(p => ({ ...p, title: v }))} />
                    <EditField label="Bio / Headline" value={textOverrides.bio ?? previewProfile.headline ?? ''}
                      onChange={v => setTextOverrides(p => ({ ...p, bio: v }))} multiline />
                    <button type="button"
                      onClick={() => setTextOverrides({ name: previewProfile.full_name ?? '', title: previewProfile.current_job_title ?? '', bio: previewProfile.headline ?? '' })}
                      className="w-full py-2 rounded-lg text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-white/5 transition-colors">
                      Reset to profile data
                    </button>
                  </div>
                )}

                {/* SECTIONS TAB */}
                {editorTab === 'sections' && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Toggle Sections</p>
                    <div className="space-y-1">
                      {SECTION_KEYS.map(key => (
                        <Toggle key={key} label={key} checked={showSections[key] ?? true}
                          onChange={val => setShowSections(prev => ({ ...prev, [key]: val }))} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Bottom CTA ────────────────────────────────────────── */}
              <div className="p-5 border-t space-y-3" style={{ borderColor: '#1e293b' }}>
                {/* URL display */}
                <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0f1a', border: '1px solid #1e293b' }}>
                  <p className="text-[10px] text-slate-600 mb-0.5">Portfolio URL</p>
                  <p className="text-[11px] font-mono text-cyan-400 break-all">{portfolioUrl}</p>
                </div>

                {!isConverted ? (
                  /* Convert button */
                  <button type="button" onClick={handleConvert}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black tracking-wide transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: '#000', boxShadow: `0 0 24px ${primaryColor}50` }}>
                    <Zap className="h-4 w-4" />
                    Convert to My Profile
                  </button>
                ) : saved ? (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black" style={{ background: '#10b98120', border: '1px solid #10b98140', color: '#10b981' }}>
                      <Check className="h-4 w-4" /> Portfolio is Live!
                    </div>
                    <button type="button" onClick={handleOpen}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${accentColor}22)`, border: `1px solid ${primaryColor}40`, color: primaryColor }}>
                      <ExternalLink className="h-4 w-4" />Open My Portfolio →
                    </button>
                    <button type="button" onClick={handleCopyLink}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all hover:bg-white/5"
                      style={{ borderColor: '#1e293b', color: '#94a3b8' }}>
                      <Copy className="h-3.5 w-3.5" />Copy Link
                    </button>
                  </motion.div>
                ) : (
                  <button type="button" onClick={handleSave} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black tracking-wide transition-all disabled:opacity-60 hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: '#000', boxShadow: `0 0 24px ${primaryColor}50` }}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Zap className="h-4 w-4" />Save Portfolio</>}
                  </button>
                )}

                {isConverted && !saved && (
                  <button type="button" onClick={() => setIsConverted(false)}
                    className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors">
                    ← Back to demo preview
                  </button>
                )}
              </div>
            </aside>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ── Main page ──────────────────────────────────────────────────────────────
  return (
    <>
      <TemplateModal />

      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Portfolio Builder</p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Choose your style</h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl">Pick a category, customize with our Canva-like editor, then publish in one click.</p>
          </div>
          <div className="hidden xl:flex items-center gap-3 shrink-0">
            {['1-click publish', 'Canva editor', 'Shareable URL'].map(f => (
              <div key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#f1f5f9', color: '#475569' }}>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live banner */}
        {config?.is_published && activeCatId && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl px-5 py-4 mb-6"
            style={{ background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', boxShadow: '0 0 24px rgba(6,182,212,0.25)' }}>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Your portfolio is live</p>
                <p className="text-xs text-cyan-100 font-mono mt-0.5 break-all">{portfolioUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleOpen} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-cyan-700 text-xs font-bold hover:bg-cyan-50 transition-colors shadow-sm"><ExternalLink className="h-3.5 w-3.5" />Open</button>
              <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors"><Copy className="h-3.5 w-3.5" />Copy</button>
              <button onClick={() => { if (activeCard) openCategory(activeCard) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors"><Palette className="h-3.5 w-3.5" />Edit</button>
            </div>
          </motion.div>
        )}

        {/* Two-panel layout */}
        <div className="flex gap-8 items-start">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 xl:gap-6">
              {CARDS.map((card, i) => {
                const Icon     = card.Icon
                const isActive = activeCatId === card.id && config?.is_published
                return (
                  <motion.button key={card.id} type="button"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    whileHover={{ y: -5, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    onClick={() => openCategory(card)}
                    className={`relative text-left rounded-2xl overflow-hidden transition-all duration-300 group ${isActive ? 'ring-2 ring-cyan-400 ring-offset-2' : ''}`}
                    style={{ boxShadow: isActive ? '0 0 0 2px #06b6d4, 0 12px 40px rgba(6,182,212,0.2)' : '0 2px 16px rgba(0,0,0,0.08)' }}>
                    <div className={`bg-gradient-to-br ${card.gradient} p-4 xl:p-5 h-full flex flex-col`}>
                      {isActive && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 bg-cyan-500 text-black text-[10px] font-black">
                          <Check className="h-2.5 w-2.5" />ACTIVE
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                          <Icon className={`h-5 w-5 ${card.textColor}`} />
                        </div>
                        <div>
                          <p className={`text-base font-black ${card.textColor}`}>{card.label}</p>
                          <p className={`text-[10px] leading-tight ${card.textColor} opacity-60`}>{card.tagline}</p>
                        </div>
                      </div>
                      <div className="mb-3 group-hover:scale-[1.02] transition-transform duration-300 flex-1">
                        <MiniPreview card={card} />
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${card.textColor} opacity-80 group-hover:opacity-100 transition-all mt-2`}>
                        <span>Open Canva editor</span>
                        <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>→</motion.span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-5">
              <Heart className="h-3.5 w-3.5 text-pink-400" />
              <span>Built automatically from your saved profile data</span>
            </div>
          </div>

          {/* Right info panel */}
          <aside className="hidden xl:flex flex-col gap-5 w-80 2xl:w-96 shrink-0 sticky top-6">
            {config?.is_published && activeCard ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl overflow-hidden border" style={{ borderColor: '#e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white">Portfolio Live</p><p className="text-[10px] text-cyan-100 font-mono truncate mt-0.5">{portfolioUrl}</p></div>
                </div>
                <div className="p-4 space-y-2.5 bg-white">
                  <button onClick={handleOpen} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 4px 12px rgba(6,182,212,0.3)' }}><ExternalLink className="h-4 w-4" />Open My Portfolio</button>
                  <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-slate-50" style={{ borderColor: '#e2e8f0', color: '#64748b' }}><Copy className="h-4 w-4" />Copy Link</button>
                  <button onClick={() => openCategory(activeCard)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-slate-50" style={{ borderColor: '#e2e8f0', color: '#64748b' }}><Palette className="h-4 w-4" />Customize</button>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-xl p-5 border border-dashed text-center" style={{ borderColor: '#cbd5e1', background: '#f8fafc' }}>
                <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: '#e2e8f0' }}>
                  <Layers className="h-5 w-5" style={{ color: '#64748b' }} />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">No portfolio yet</p>
                <p className="text-xs text-slate-400">Pick a template, open the editor, convert to your profile, then save.</p>
              </div>
            )}

            <div className="rounded-xl p-5 border" style={{ borderColor: '#e2e8f0', background: '#fff' }}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Editor Features</p>
              <div className="space-y-3">
                {([
                  { Icon: Sparkles, t: 'Themes',   d: '8 preset color themes' },
                  { Icon: Palette,  t: 'Colors',   d: 'Full primary & accent pickers' },
                  { Icon: Image,    t: 'Images',   d: 'Hero gradients & profile photo' },
                  { Icon: Type,     t: 'Text',     d: 'Edit name, title & bio inline' },
                  { Icon: Layers,   t: 'Sections', d: 'Toggle any section on/off' },
                ] as { Icon: React.ElementType; t: string; d: string }[]).map(f => (
                  <div key={f.t} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f1f5f9' }}>
                      <f.Icon className="h-4 w-4" style={{ color: '#64748b' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{f.t}</p>
                      <p className="text-xs text-slate-400">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-5 border flex items-center gap-4" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#e2e8f0' }}>
                <Zap className="h-5 w-5" style={{ color: '#64748b' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">12 Templates available</p>
                <p className="text-xs text-slate-400">6 categories · 2 styles each</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
