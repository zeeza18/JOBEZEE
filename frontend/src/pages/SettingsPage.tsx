import { useState, useRef, useEffect } from 'react'
import {
  Briefcase,
  FileText,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
  Camera,
  Trash2,
  User,
  Check,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  Save,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/common/SectionHeader'
import { useSettingsStore } from '../store/useSettingsStore'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-cyan-500' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  description,
  children,
  accent = 'cyan',
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  accent?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose'
}) {
  const [open, setOpen] = useState(true)

  const accentMap = {
    cyan:    'bg-cyan-50 text-cyan-600 border-cyan-100',
    violet:  'bg-violet-50 text-violet-600 border-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    rose:    'bg-rose-50 text-rose-600 border-rose-100',
  }

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
      >
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {children}
        </div>
      )}
    </Card>
  )
}

// ── Setting row ───────────────────────────────────────────────────────────────
function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ── Info tooltip ──────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => setOpen(v => !v)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="text-slate-400 hover:text-cyan-500 transition-colors">
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs text-slate-600 leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-white" />
        </span>
      )}
    </span>
  )
}

// ── Password field with show/hide ─────────────────────────────────────────────
function PwField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Password'}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-sm text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ── Platform credential pair ──────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  in: 'bg-[#0077B5] text-white',
  gh: 'bg-emerald-600 text-white',
  wd: 'bg-slate-700 text-white',
}

function PlatformCreds({
  logo, name, emailVal, pwVal, onEmail, onPw, pwSaved,
}: {
  logo: string; name: string
  emailVal: string; pwVal: string
  onEmail: (v: string) => void; onPw: (v: string) => void
  pwSaved?: boolean
}) {
  const isSaved = pwSaved || (emailVal.trim() !== '' && pwVal.trim() !== '')
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center gap-2.5 mb-1">
        <span className={`inline-flex h-6 w-8 items-center justify-center rounded text-[10px] font-black tracking-tight ${PLATFORM_COLORS[logo] ?? 'bg-slate-200 text-slate-600'}`}>
          {logo.toUpperCase()}
        </span>
        <p className="text-sm font-semibold text-slate-700">{name}</p>
        {isSaved && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="email"
          value={emailVal}
          onChange={e => onEmail(e.target.value)}
          placeholder={`${name} email`}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
        />
        <PwField
          value={pwVal}
          onChange={onPw}
          placeholder={pwSaved && !pwVal ? '••••••••••••' : `${name} password`}
        />
      </div>
    </div>
  )
}

// ── API key field ─────────────────────────────────────────────────────────────
function ApiKeyField({
  label, value, onChange, placeholder, isSaved, hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; isSaved?: boolean; hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {isSaved && !value && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={isSaved && !value ? '••••••••••••••••••••••••' : (placeholder ?? 'sk-…')}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-9 font-mono text-xs text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SettingsPage = () => {
  const {
    jobs, tailor, portfolio, autoApply,
    updateJobs, updateTailor, updatePortfolio, updateAutoApply,
  } = useSettingsStore()

  const { pushToast, resetAll } = useAppStore()

  // Slug input local state
  const [slugDraft, setSlugDraft] = useState(portfolio.defaultSlug)

  const handleSlugSave = () => {
    const clean = slugDraft.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    updatePortfolio({ defaultSlug: clean })
    setSlugDraft(clean)
    pushToast({ title: 'Portfolio slug saved', type: 'success' })
  }

  // ── Profile Picture ──────────────────────────────────────────────────────────
  const BASE_URL = import.meta.env.VITE_API_URL || ''

  // Hold the full profile so credential saves don't wipe other fields
  const fullProfileRef = useRef<Record<string, unknown>>({})

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl,       setAvatarUrl]       = useState<string>('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarRemoving,  setAvatarRemoving]  = useState(false)
  const [avatarSuccess,   setAvatarSuccess]   = useState(false)
  const [avatarError,     setAvatarError]     = useState<string | null>(null)

  // ── Credentials state ─────────────────────────────────────────────────────
  const [creds, setCreds] = useState({
    apply_email: '', apply_password: '',
    linkedin_email: '', linkedin_password: '',
    indeed_email: '', indeed_password: '',
    greenhouse_email: '', greenhouse_password: '',
    workday_email: '', workday_password: '',
    gmail_api_key: '',
    openai_api_key: '',
    anthropic_api_key: '',
  })
  // Which sensitive fields are already saved in DB (backend never returns the actual values)
  const [credentialsSet, setCredentialsSet] = useState<Record<string, boolean>>({})
  const [credsSaving, setCredsSaving] = useState(false)
  const [credsSaved,  setCredsSaved]  = useState(false)

  const setCred = (key: keyof typeof creds) => (val: string) =>
    setCreds(prev => ({ ...prev, [key]: val }))

  const saveCredentials = async () => {
    setCredsSaving(true)
    try {
      const r = await fetch(`${BASE_URL}/api/profile/`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fullProfileRef.current, ...creds }),
      })
      if (r.ok) {
        const updated = await r.json()
        // Refresh credentials_set from response
        if (updated.credentials_set) setCredentialsSet(updated.credentials_set)
      }
      setCredsSaved(true)
      setTimeout(() => setCredsSaved(false), 2500)
    } catch { /* silent */ }
    setCredsSaving(false)
  }

  useEffect(() => {
    fetch(`${BASE_URL}/api/profile/`, { credentials: 'include' })
      .then(r => r.json())
      .then(p => {
        fullProfileRef.current = p
        if (p.avatar_url) setAvatarUrl(p.avatar_url.startsWith('http') ? p.avatar_url : `${BASE_URL}${p.avatar_url}`)
        if (p.credentials_set) setCredentialsSet(p.credentials_set)
        setCreds({
          apply_email:         p.apply_email         ?? '',
          apply_password:      p.apply_password      ?? '',
          linkedin_email:      p.linkedin_email      ?? '',
          linkedin_password:   p.linkedin_password   ?? '',
          indeed_email:        p.indeed_email        ?? '',
          indeed_password:     p.indeed_password     ?? '',
          greenhouse_email:    p.greenhouse_email    ?? '',
          greenhouse_password: p.greenhouse_password ?? '',
          workday_email:       p.workday_email       ?? '',
          workday_password:    p.workday_password    ?? '',
          gmail_api_key:       p.gmail_api_key       ?? '',
          openai_api_key:      p.openai_api_key      ?? '',
          anthropic_api_key:   p.anthropic_api_key   ?? '',
        })
      })
      .catch(() => {})
  }, [])

  const handleAvatarRemove = async () => {
    if (!avatarUrl) return
    setAvatarRemoving(true); setAvatarError(null)
    try {
      const r = await fetch(`${BASE_URL}/api/profile/avatar/remove`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!r.ok) throw new Error(await r.text())
      setAvatarUrl('')
      pushToast({ title: 'Photo removed', type: 'info' })
    } catch (err: any) {
      setAvatarError(err.message ?? 'Remove failed')
    } finally {
      setAvatarRemoving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true); setAvatarSuccess(false); setAvatarError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${BASE_URL}/api/profile/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json()
      const url = data.avatar_url
      setAvatarUrl(url.startsWith('data:') || url.startsWith('http') ? url : `${BASE_URL}${url}`)
      setAvatarSuccess(true)
      setTimeout(() => setAvatarSuccess(false), 3000)
    } catch (err: any) {
      setAvatarError(err.message ?? 'Upload failed')
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" eyebrow="Control" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Left column: all sections ───────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">

          {/* 0. Profile Picture */}
          <Card className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Profile Picture</p>
                <p className="text-xs text-slate-400">Shown on your dashboard. JPG, PNG or WebP, max 5 MB.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-16 w-16 rounded-full object-cover ring-2 ring-cyan-200 shadow" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                  <User className="h-7 w-7 text-slate-400" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium px-4 py-2 transition-colors">
                    {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {avatarUploading ? 'Uploading…' : 'Upload Photo'}
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={handleAvatarRemove}
                      disabled={avatarRemoving}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-medium px-3 py-2 transition-colors"
                    >
                      {avatarRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {avatarRemoving ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
                {avatarSuccess && (
                  <p className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> Photo updated!</p>
                )}
                {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
              </div>
            </div>
          </Card>

          {/* 1. Job Settings */}
          <Section icon={Briefcase} title="Job Settings" description="Control how pulled jobs are filtered and displayed" accent="violet">
            <SettingRow
              label="Show filters from preferences"
              hint="Filters jobs by location, job type, and salary from your profile settings"
            >
              <Toggle checked={jobs.showFilters} onChange={(v) => updateJobs({ showFilters: v })} />
            </SettingRow>

            <SettingRow
              label="Convert hourly → monthly salary"
              hint="Hourly rate × 40 hrs × 4 weeks for apples-to-apples salary comparison"
            >
              <Toggle
                checked={jobs.convertHourlyToMonthly}
                onChange={(v) => updateJobs({ convertHourlyToMonthly: v })}
              />
            </SettingRow>

            {/* Info chip */}
            {jobs.showFilters && (
              <div className="mx-5 mb-3.5 mt-1 rounded-lg bg-violet-50 px-3.5 py-2.5 text-xs text-violet-700">
                <span className="font-semibold">Active filters:</span> Location · Job Type · Salary range from your profile preferences
              </div>
            )}
            {jobs.convertHourlyToMonthly && (
              <div className="mx-5 mb-3.5 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                e.g. $30/hr → $30 × 40 × 4 = <span className="font-semibold text-slate-700">$4,800/mo</span> · $75/hr → <span className="font-semibold text-slate-700">$12,000/mo</span>
              </div>
            )}
          </Section>

          {/* 3. Tailor Settings */}
          <Section icon={FileText} title="Tailor Settings" description="Customise the resume tailoring experience" accent="emerald">
            <SettingRow
              label="Show description keywords"
              hint="Highlights matched keywords from the job description while tailoring"
            >
              <Toggle checked={tailor.showKeywords} onChange={(v) => updateTailor({ showKeywords: v })} />
            </SettingRow>

            <SettingRow
              label="Show AI suggestions"
              hint="Displays real-time improvement tips from the AI during tailoring"
            >
              <Toggle checked={tailor.showSuggestions} onChange={(v) => updateTailor({ showSuggestions: v })} />
            </SettingRow>
          </Section>

          {/* 4. Portfolio Settings */}
          <Section icon={Globe} title="Portfolio Settings" description="Manage your public portfolio link" accent="amber">
            <SettingRow
              label="Portfolio URL slug"
              hint="Default is your name as a domain. You can change it anytime."
            >
              <span />
            </SettingRow>

            <div className="px-5 pb-4">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 pl-3 text-sm">
                <span className="shrink-0 text-xs text-slate-400">jobezee.dev/</span>
                <input
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(e.target.value)}
                  placeholder="your-name"
                  className="flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-300"
                />
                <button
                  onClick={handleSlugSave}
                  className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  Save
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Auto-generated from your full name. Letters, numbers, and hyphens only.
              </p>
            </div>
          </Section>

          {/* 5. Credentials */}
          <Section icon={KeyRound} title="Credentials" description="Login details for job platforms + email integration" accent="amber">

            {/* Apply defaults */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-700">Default Apply Email & Password</p>
                <InfoTip text="Used as the fallback when auto-applying to any job site. Per-platform credentials below will override these if set." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="email" value={creds.apply_email} onChange={e => setCred('apply_email')(e.target.value)}
                  placeholder="you@email.com"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition" />
                <PwField value={creds.apply_password} onChange={setCred('apply_password')} placeholder="Default password" />
              </div>
              <p className="text-xs text-slate-400">These are used when signing up / logging in to job sites. Not your JOBEZEE password.</p>
            </div>

            <div className="mx-5 h-px bg-slate-100" />

            {/* Per-platform */}
            <PlatformCreds logo="in" name="LinkedIn"
              emailVal={creds.linkedin_email} pwVal={creds.linkedin_password}
              onEmail={setCred('linkedin_email')} onPw={setCred('linkedin_password')}
              pwSaved={credentialsSet['linkedin_password']} />
            <div className="mx-5 h-px bg-slate-100" />
            <PlatformCreds logo="in" name="Indeed"
              emailVal={creds.indeed_email} pwVal={creds.indeed_password}
              onEmail={setCred('indeed_email')} onPw={setCred('indeed_password')}
              pwSaved={credentialsSet['indeed_password']} />
            <div className="mx-5 h-px bg-slate-100" />
            <PlatformCreds logo="gh" name="Greenhouse"
              emailVal={creds.greenhouse_email} pwVal={creds.greenhouse_password}
              onEmail={setCred('greenhouse_email')} onPw={setCred('greenhouse_password')}
              pwSaved={credentialsSet['greenhouse_password']} />
            <div className="mx-5 h-px bg-slate-100" />
            <PlatformCreds logo="wd" name="Workday"
              emailVal={creds.workday_email} pwVal={creds.workday_password}
              onEmail={setCred('workday_email')} onPw={setCred('workday_password')}
              pwSaved={credentialsSet['workday_password']} />

            <div className="mx-5 h-px bg-slate-100" />

            {/* Gmail App Password */}
            <ApiKeyField
              label="Gmail App Password"
              value={creds.gmail_api_key}
              onChange={setCred('gmail_api_key')}
              isSaved={credentialsSet['gmail_api_key']}
              placeholder="fhlc ggyy wcyo oumv"
              hint="16-char Google App Password for IMAP inbox scanning. Gmail → Settings → Security → App passwords."
            />

            <div className="mx-5 h-px bg-slate-100" />

            {/* AI API Keys */}
            <div className="px-5 pt-4 pb-1">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-semibold text-slate-700">AI API Keys</p>
                <span className="rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[10px] font-semibold text-cyan-600 uppercase tracking-wide">Optional</span>
                <InfoTip text="Your own API keys are used for resume tailoring and auto-apply. If left empty, the platform's shared keys from .env are used as fallback." />
              </div>
            </div>

            <ApiKeyField
              label="OpenAI API Key"
              value={creds.openai_api_key}
              onChange={setCred('openai_api_key')}
              isSaved={credentialsSet['openai_api_key']}
              placeholder="sk-proj-…"
              hint="Used for GPT-4o-mini resume tailoring and job status detection. Get it at platform.openai.com."
            />
            <div className="mx-5 h-px bg-slate-100" />
            <ApiKeyField
              label="Claude (Anthropic) API Key"
              value={creds.anthropic_api_key}
              onChange={setCred('anthropic_api_key')}
              isSaved={credentialsSet['anthropic_api_key']}
              placeholder="sk-ant-…"
              hint="Used for Claude-powered resume tailoring. Get it at console.anthropic.com."
            />

            {/* Save button */}
            <div className="px-5 py-4 flex items-center justify-between border-t border-slate-100">
              <p className="text-xs text-slate-400">Credentials are encrypted at rest and never shared.</p>
              <button onClick={saveCredentials} disabled={credsSaving}
                className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 transition-colors">
                {credsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : credsSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {credsSaving ? 'Saving…' : credsSaved ? 'Saved!' : 'Save Credentials'}
              </button>
            </div>
          </Section>

          {/* 7. Auto Apply Settings */}
          <Section icon={Zap} title="Auto Apply Settings" description="Control how the agent applies to jobs" accent="rose">
            <SettingRow
              label="Tailor resume before applying"
              hint={
                autoApply.tailorBeforeApply
                  ? 'ON — AI tailors your resume (2 rounds) for each job, then applies'
                  : 'OFF — applies directly using the base resume from your profile'
              }
            >
              <Toggle
                checked={autoApply.tailorBeforeApply}
                onChange={(v) => updateAutoApply({ tailorBeforeApply: v })}
              />
            </SettingRow>

            <div className="mx-5 mb-3.5 mt-1 rounded-lg border px-3.5 py-2.5 text-xs"
              style={{
                background: autoApply.tailorBeforeApply ? '#fdf4ff' : '#f8fafc',
                borderColor: autoApply.tailorBeforeApply ? '#e9d5ff' : '#e2e8f0',
                color: autoApply.tailorBeforeApply ? '#7e22ce' : '#64748b',
              }}
            >
              {autoApply.tailorBeforeApply ? (
                <>
                  <span className="font-semibold">Tailor → Apply:</span> Pull job · Tailor resume (round 1 → round 2) · Submit application
                </>
              ) : (
                <>
                  <span className="font-semibold">Direct Apply:</span> Pull job · Submit application using your profile resume
                </>
              )}
            </div>
          </Section>
        </div>

        {/* ── Right column: danger + about ──────────────────────────────────── */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">Danger zone</p>
            <p className="text-xs text-slate-500">Clears all local mock data (jobs, resumes, applications). Settings are kept.</p>
            <button
              onClick={() => {
                resetAll()
                pushToast({ title: 'Local data reset', type: 'info' })
              }}
              className="w-full rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
            >
              Reset local data
            </button>
          </Card>

          <Card className="space-y-2 text-xs text-slate-500">
            <p className="text-sm font-semibold text-slate-800">About</p>
            <p>Version 0.2 — Settings are persisted in <code className="rounded bg-slate-100 px-1 text-slate-600">localStorage</code>.</p>
            <p>Billing, tailor, and auto-apply settings are read by the backend at apply-time.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
