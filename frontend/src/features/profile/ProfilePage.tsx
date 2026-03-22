/**
 * Profile & Preferences page.
 *
 * Covers every field in the DB — personal, job preferences, salary,
 * work authorization, experience, skills, resume facts, and resume upload.
 *
 * "Save & Search Jobs" → saves profile to DB → triggers Phase 1 discovery.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase, Building2, Check, ChevronRight, FileText,
  Globe2, Info, Loader2, Plus, Shield, Trash2, Upload, User, X,
  BookOpen,
} from 'lucide-react'
import { SectionHeader } from '../../components/common/SectionHeader'
import { profileApi, searchApi, type UserProfile } from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'

const BASE = import.meta.env.VITE_API_URL || ''

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'personal',    label: 'Personal',      icon: <User className="h-4 w-4" /> },
  { id: 'job',         label: 'Job Prefs',     icon: <Briefcase className="h-4 w-4" /> },
  { id: 'salary',      label: 'Salary',        icon: <Building2 className="h-4 w-4" /> },
  { id: 'visa',        label: 'Authorization', icon: <Shield className="h-4 w-4" /> },
  { id: 'experience',  label: 'Experience',    icon: <BookOpen className="h-4 w-4" /> },
  { id: 'resume',      label: 'Resume',        icon: <FileText className="h-4 w-4" /> },
] as const
type TabId = (typeof TABS)[number]['id']

const REMOTE_OPTIONS    = ['remote', 'hybrid', 'onsite', 'any']
const JOB_TYPE_OPTIONS  = ['full_time', 'part_time', 'contract', 'internship', 'temporary']
const EXP_OPTIONS       = ['intern', 'junior', 'mid', 'senior', 'lead', 'executive']
const CURRENCIES        = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'SGD', 'AED', 'JPY', 'CHF']
const INDUSTRIES        = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail',
  'Manufacturing', 'Media', 'Government', 'Consulting', 'Energy',
  'Real Estate', 'Transportation', 'Nonprofit', 'Legal', 'Hospitality',
]
const WORK_AUTH_OPTIONS = [
  'US Citizen', 'Permanent Resident (Green Card)', 'H-1B Visa',
  'OPT / STEM OPT', 'J-1 Visa', 'L-1 Visa', 'TN Visa',
  'UK Citizen / BRP', 'EU Citizen', 'Work Permit', 'Other',
]
const EDU_OPTIONS = [
  "High School", "Associate's", "Bachelor's", "Master's",
  "PhD", "Self-taught", "Bootcamp", "Other",
]

const emptyProfile: Partial<UserProfile> = {
  full_name: '', preferred_name: '', email: '', phone: '', address: '',
  city: '', state: '', country: 'USA', zip_code: '',
  linkedin: '', github: '', portfolio: '', personal_website: '', headline: '',
  desired_roles: [], preferred_locations: [], preferred_countries: [],
  preferred_regions: [], industries: [],
  remote_preference: 'hybrid', job_type: 'full_time', experience_level: 'mid',
  work_modes: [], job_types: [], experience_levels: [],
  salary_min: 0, salary_max: 0, salary_currency: 'USD', salary_range_text: '',
  work_authorization: '', visa_sponsorship_required: false, work_permit_type: '',
  current_job_title: '', target_role: '', years_experience: '', education: '',
  skills_languages: [], skills_frameworks: [], skills_tools: [],
  resume_facts_companies: [], resume_facts_projects: [],
  resume_facts_schools: [], resume_facts_metrics: [],
  earliest_start: 'Immediately',
  search_radius_miles: 50, hours_old: 72, results_per_site: 50,
  resume_filename: '', resume_url: '',
  apply_password: '',
}

function fmt(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Info tooltip ─────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="ml-1 text-slate-400 hover:text-brand focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-0 z-50 mb-2 w-60 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-soft"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// ─── Tag input ────────────────────────────────────────────────────────────────
function TagInput({
  label, values, onChange, placeholder, info,
}: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; info?: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <label className="flex items-center text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}{info && <InfoTip text={info} />}
      </label>
      <div className="flex min-h-[3rem] flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand-dark">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="min-w-[140px] flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
        />
      </div>
      {input && (
        <button onClick={add} className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark">
          <Plus className="h-3 w-3" /> Add "{input}"
        </button>
      )}
    </div>
  )
}

// ─── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, info, children }: { label: string; info?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}{info && <InfoTip text={info} />}
      </label>
      {children}
    </div>
  )
}

function TInput({
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
    />
  )
}

function SField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
    >
      {options.map((o) => <option key={o} value={o}>{fmt(o)}</option>)}
    </select>
  )
}

/** Multi-select pill picker — toggles values in an array */
function MultiPillSelect({ values, onChange, options }: { values: string[]; onChange: (v: string[]) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-0.5">
      {options.map(o => {
        const selected = values.includes(o)
        return (
          <button key={o} type="button"
            onClick={() => onChange(selected ? values.filter(x => x !== o) : [...values, o])}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all select-none ${
              selected
                ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white'
            }`}>
            {selected && <Check className="mr-1 inline h-3 w-3" />}{fmt(o)}
          </button>
        )
      })}
    </div>
  )
}

/** +/− stepper for numeric preferences */
function StepperInput({ value, onChange, step = 1, min = 0 }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-lg font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition select-none">
        −
      </button>
      <input
        type="number" value={value} min={min} step={step}
        onChange={e => onChange(Math.max(min, Number(e.target.value)))}
        className="w-20 text-center rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition"
      />
      <button type="button"
        onClick={() => onChange(value + step)}
        className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-lg font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition select-none">
        +
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { pushToast } = useAppStore()

  const [tab, setTab]               = useState<TabId>('personal')
  const [form, setForm]             = useState<Partial<UserProfile>>(emptyProfile)
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [searching, setSearching]   = useState(false)
  const [sessionId, setSessionId]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    profileApi.get()
      .then((p) => setForm(p))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = useCallback(<K extends keyof UserProfile>(k: K, v: UserProfile[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await profileApi.update(form)
      pushToast({ title: 'Profile saved!', type: 'success' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      pushToast({ title: 'Save failed', description: msg, type: 'error' })
    } finally { setSaving(false) }
  }

  const handleSaveAndSearch = async () => {
    setSaving(true)
    try {
      await profileApi.update(form)
      const res = await searchApi.trigger()
      setSessionId(res.session_id)
      setSearching(true)
      pushToast({ title: `Search started! Session ${res.session_id}`, description: res.message, type: 'success' })
    } catch (e: unknown) {
      pushToast({ title: 'Error', description: String(e), type: 'error' })
    } finally { setSaving(false) }
  }

  const handleResumeUpload = async (file: File) => {
    try {
      const res = await profileApi.uploadResume(file)
      setForm((prev) => ({ ...prev, resume_filename: res.filename, resume_url: res.url }))
      pushToast({ title: 'Resume uploaded!', type: 'success' })
    } catch (e: unknown) {
      pushToast({ title: 'Upload failed', description: String(e), type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Profile & Preferences"
        eyebrow="Editor — update your saved job-search profile"
      />

      {/* Search running banner */}
      {searching && sessionId && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          <p className="text-sm text-brand-dark">
            Search running (session <span className="font-mono font-bold">{sessionId}</span>) —{' '}
            <a href="/app/pulled-jobs" className="underline">check Pulled Jobs</a> in ~60 s.
          </p>
        </motion.div>
      )}

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-brand-dark shadow-soft'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft"
        >

          {/* ── Personal ─────────────────────────────────────────────── */}
          {tab === 'personal' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Personal Information</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Full Name" info="Your legal full name as it appears on official documents.">
                  <TInput value={form.full_name ?? ''} onChange={(v) => set('full_name', v)} placeholder="Jordan Lee" />
                </Field>
                <Field label="Preferred Name / Nickname" info="How you like to be called — used in cover letters and AI tailoring.">
                  <TInput value={form.preferred_name ?? ''} onChange={(v) => set('preferred_name', v)} placeholder="Jo" />
                </Field>
                <Field label="Email">
                  <TInput value={form.email ?? ''} onChange={(v) => set('email', v)} placeholder="jordan.lee@email.com" type="email" />
                </Field>
                <Field label="Phone Number" info="Include country code for international applications, e.g. +1 (512) 555-0174.">
                  <TInput value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="+1 (512) 555-0174" type="tel" />
                </Field>
                <Field label="Street Address" info="Used to auto-fill application forms. Never shared without your consent.">
                  <TInput value={form.address ?? ''} onChange={(v) => set('address', v)} placeholder="3820 Lakewood Blvd" />
                </Field>
                <Field label="City">
                  <TInput value={form.city ?? ''} onChange={(v) => set('city', v)} placeholder="Austin" />
                </Field>
                <Field label="State / Province">
                  <TInput value={form.state ?? ''} onChange={(v) => set('state', v)} placeholder="TX" />
                </Field>
                <Field label="ZIP / Postal Code">
                  <TInput value={form.zip_code ?? ''} onChange={(v) => set('zip_code', v)} placeholder="78704" />
                </Field>
                <Field label="Country">
                  <TInput value={form.country ?? ''} onChange={(v) => set('country', v)} placeholder="USA" />
                </Field>
                <Field label="Headline / Current Title" info="Your professional tagline — appears on your profile and cover letters.">
                  <TInput value={form.headline ?? ''} onChange={(v) => set('headline', v)} placeholder="Senior Software Engineer · 6 yrs exp" />
                </Field>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Online Profiles</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="LinkedIn URL"><TInput value={form.linkedin ?? ''} onChange={(v) => set('linkedin', v)} placeholder="linkedin.com/in/jordan-lee" /></Field>
                  <Field label="GitHub URL"><TInput value={form.github ?? ''} onChange={(v) => set('github', v)} placeholder="github.com/jordanlee" /></Field>
                  <Field label="Portfolio URL"><TInput value={form.portfolio ?? ''} onChange={(v) => set('portfolio', v)} placeholder="jordanlee.dev" /></Field>
                  <Field label="Personal Website"><TInput value={form.personal_website ?? ''} onChange={(v) => set('personal_website', v)} placeholder="blog.jordanlee.dev" /></Field>
                </div>
              </div>
            </div>
          )}

          {/* ── Job Preferences ──────────────────────────────────────── */}
          {tab === 'job' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Job Preferences — used by Phase 1 search</p>
              <TagInput
                label="Desired Job Roles" values={form.desired_roles ?? []}
                onChange={(v) => set('desired_roles', v)}
                placeholder="e.g. Senior Software Engineer, Backend Developer"
                info="These become the search queries in Phase 1. Be specific — 'Senior Backend Engineer' outperforms just 'Engineer'."
              />
              <TagInput
                label="Preferred Locations" values={form.preferred_locations ?? []}
                onChange={(v) => set('preferred_locations', v)}
                placeholder="e.g. Austin TX, Remote, San Francisco CA"
                info="City names or 'Remote'. Phase 1 passes these directly to job board search APIs."
              />
              <TagInput
                label="Preferred Countries" values={form.preferred_countries ?? []}
                onChange={(v) => set('preferred_countries', v)}
                placeholder="e.g. USA, Canada, United Kingdom"
                info="Drives the Indeed country endpoint selection. Use full country names (USA, United Kingdom, Germany)."
              />
              <div className="space-y-4">
                <Field label="Work Mode" info="Select all that apply — used by LinkedIn bot and job filters.">
                  <MultiPillSelect
                    values={form.work_modes ?? []}
                    onChange={(v) => { set('work_modes', v); set('remote_preference', v[0] ?? 'hybrid') }}
                    options={REMOTE_OPTIONS}
                  />
                </Field>
                <Field label="Job Type" info="Select all that apply.">
                  <MultiPillSelect
                    values={form.job_types ?? []}
                    onChange={(v) => { set('job_types', v); set('job_type', v[0] ?? 'full_time') }}
                    options={JOB_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="Experience Level" info="Select all that apply.">
                  <MultiPillSelect
                    values={form.experience_levels ?? []}
                    onChange={(v) => { set('experience_levels', v); set('experience_level', v[0] ?? 'mid') }}
                    options={EXP_OPTIONS}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Field label="Search Radius (miles)" info="Distance from your city for onsite/hybrid roles. Set to 0 for remote-only.">
                  <StepperInput value={form.search_radius_miles ?? 50} onChange={(v) => set('search_radius_miles', v)} step={5} min={0} />
                </Field>
                <Field label="Max job age (hours)" info="Only return listings posted in the last N hours. 72 = last 3 days.">
                  <StepperInput value={form.hours_old ?? 72} onChange={(v) => set('hours_old', v)} step={24} min={1} />
                </Field>
                <Field label="Results per site" info="How many listings to fetch per job board per search. Higher = slower but more results.">
                  <StepperInput value={form.results_per_site ?? 50} onChange={(v) => set('results_per_site', v)} step={10} min={5} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Salary ───────────────────────────────────────────────── */}
          {tab === 'salary' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Salary & Industry</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Currency"><SField value={form.salary_currency ?? 'USD'} onChange={(v) => set('salary_currency', v)} options={CURRENCIES} /></Field>
                <Field label="Minimum Salary" info="Your floor. Phase 1 filters out roles below this when salary data is available.">
                  <TInput value={String(form.salary_min ?? '')} onChange={(v) => set('salary_min', Number(v))} type="number" placeholder="90000" />
                </Field>
                <Field label="Maximum Salary">
                  <TInput value={String(form.salary_max ?? '')} onChange={(v) => set('salary_max', Number(v))} type="number" placeholder="140000" />
                </Field>
                <Field label="Range Text" info="Free-text range shown in applications, e.g. '90,000 – 130,000'. Optional.">
                  <TInput value={form.salary_range_text ?? ''} onChange={(v) => set('salary_range_text', v)} placeholder="90,000 – 130,000" />
                </Field>
              </div>
              {(form.salary_min || form.salary_max) && (
                <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
                  <p className="text-sm text-brand-dark">
                    Expected: <span className="font-semibold">{form.salary_currency} {(form.salary_min ?? 0).toLocaleString()} – {(form.salary_max ?? 0).toLocaleString()}</span>
                  </p>
                </div>
              )}
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Industries</p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((ind) => {
                    const active = (form.industries ?? []).includes(ind)
                    return (
                      <button
                        key={ind}
                        onClick={() => set('industries', active ? (form.industries ?? []).filter((x) => x !== ind) : [...(form.industries ?? []), ind])}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          active ? 'bg-brand/10 text-brand-dark border border-brand/30' : 'border border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {active && <Check className="mr-1 inline h-3 w-3" />}{ind}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Work Authorization ───────────────────────────────────── */}
          {tab === 'visa' && (
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Work Authorization</p>
              <Field label="Authorization Status" info="Your current right to work in the target country. This is used to filter job listings and auto-fill application forms.">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {WORK_AUTH_OPTIONS.map((opt) => {
                    const active = form.work_authorization === opt
                    return (
                      <button
                        key={opt} onClick={() => set('work_authorization', opt)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                          active ? 'border-brand/50 bg-brand/5 text-brand-dark' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {active && <Check className="mr-1.5 inline h-3 w-3 text-brand" />}{opt}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Specific Permit / Visa Type" info="Optional extra detail, e.g. 'H-1B cap-exempt', 'STEM OPT 3-year', 'Blue Card EU'. Stored for form auto-fill.">
                <TInput value={form.work_permit_type ?? ''} onChange={(v) => set('work_permit_type', v)} placeholder="e.g. STEM OPT, Blue Card" />
              </Field>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start gap-4">
                  <div
                    onClick={() => set('visa_sponsorship_required', !form.visa_sponsorship_required)}
                    className={`mt-0.5 flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors ${form.visa_sponsorship_required ? 'bg-brand' : 'bg-slate-300'}`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${form.visa_sponsorship_required ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
                      Visa Sponsorship Required
                      <InfoTip text="Toggle ON if you need the employer to sponsor a work visa (H-1B, Tier 2, etc.). Phase 1 will prioritise companies known to sponsor." />
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {form.visa_sponsorship_required
                        ? 'ON — Phase 1 will filter for visa-sponsoring employers.'
                        : 'OFF — No sponsorship needed.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Experience & Skills ──────────────────────────────────── */}
          {tab === 'experience' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Experience & Education</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Current / Most Recent Job Title">
                  <TInput value={form.current_job_title ?? ''} onChange={(v) => set('current_job_title', v)} placeholder="Software Engineer II" />
                </Field>
                <Field label="Target Role" info="What you're applying for — used in AI resume tailoring to focus bullet points.">
                  <TInput value={form.target_role ?? ''} onChange={(v) => set('target_role', v)} placeholder="Senior Software Engineer" />
                </Field>
                <Field label="Years of Experience" info="Approximate total years of professional experience. Can be a range, e.g. '5-8'.">
                  <TInput value={form.years_experience ?? ''} onChange={(v) => set('years_experience', v)} placeholder="4" />
                </Field>
                <Field label="Highest Education">
                  <SField value={form.education ?? ''} onChange={(v) => set('education', v)} options={['', ...EDU_OPTIONS]} />
                </Field>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Skills</p>
                <TagInput
                  label="Programming Languages" values={form.skills_languages ?? []}
                  onChange={(v) => set('skills_languages', v)} placeholder="Python, TypeScript, Go, SQL"
                />
                <TagInput
                  label="Frameworks & Libraries" values={form.skills_frameworks ?? []}
                  onChange={(v) => set('skills_frameworks', v)} placeholder="React, FastAPI, Next.js, Node.js"
                />
                <TagInput
                  label="Tools & Platforms" values={form.skills_tools ?? []}
                  onChange={(v) => set('skills_tools', v)} placeholder="Docker, AWS, Kubernetes, GitHub Actions"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  Resume Facts
                  <InfoTip text="These are truths the AI must NEVER change during resume tailoring — company names, real metrics, school names, and key projects." />
                </p>
                <TagInput
                  label="Companies to always keep" values={form.resume_facts_companies ?? []}
                  onChange={(v) => set('resume_facts_companies', v)} placeholder="Acme Corp, Stripe, Shopify"
                  info="The AI will never remove or rename these employers from your resume."
                />
                <TagInput
                  label="Projects to always keep" values={form.resume_facts_projects ?? []}
                  onChange={(v) => set('resume_facts_projects', v)} placeholder="Project Phoenix, DataSync API"
                  info="Project names that must remain verbatim — AI won't rename them."
                />
                <TagInput
                  label="Schools to preserve" values={form.resume_facts_schools ?? []}
                  onChange={(v) => set('resume_facts_schools', v)} placeholder="University of Texas, Coursera"
                />
                <TagInput
                  label="Real metrics to preserve" values={form.resume_facts_metrics ?? []}
                  onChange={(v) => set('resume_facts_metrics', v)}
                  placeholder="40% faster load times, 2M monthly users"
                  info="Exact numbers/stats the AI must keep verbatim — never fabricate or round."
                />
                <Field label="Earliest Start Date" info="When you can realistically start a new role. Used in cover letters.">
                  <TInput value={form.earliest_start ?? 'Immediately'} onChange={(v) => set('earliest_start', v)} placeholder="2 weeks notice / Immediately" />
                </Field>
              </div>
            </div>
          )}

          {/* ── Resume ──────────────────────────────────────────────── */}
          {tab === 'resume' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Resume / CV</p>
              {form.resume_filename ? (
                <div className="flex items-center gap-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
                  <FileText className="h-8 w-8 text-brand" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{form.resume_filename}</p>
                    {form.resume_url && (
              <a href={`${BASE}${form.resume_url}`} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
                        View / Download →
                      </a>
                    )}
                  </div>
                  <button onClick={() => { set('resume_filename', ''); set('resume_url', '') }} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-400">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">No resume uploaded yet</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f) }} />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 py-6 text-sm font-medium text-brand transition-all hover:bg-brand/10 hover:border-brand/60"
              >
                <Upload className="h-5 w-5" /> Click to upload resume (PDF, DOCX)
              </button>
              <p className="text-center text-xs text-slate-400">
                Max 10 MB · Used for AI tailoring &amp; auto-apply pre-fill
              </p>

              {/* Job-site account password */}
              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                <p className="text-sm font-semibold text-slate-700">Auto-Apply Account Password</p>
                <p className="text-xs text-slate-400">
                  Used by the AI agent to sign into or create job-site accounts (Workday, Lever, Greenhouse, etc.) during auto-apply.
                  Set this to the password you want to use for those accounts.
                </p>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  placeholder="Enter your job-site account password"
                  value={form.apply_password ?? ''}
                  onChange={(e) => set('apply_password', e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-soft transition hover:border-slate-300 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Profile
        </button>

        <button
          onClick={handleSaveAndSearch} disabled={saving || searching}
          className="flex items-center gap-2 rounded-xl bg-cyan-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
          Save &amp; Search Jobs
          <ChevronRight className="h-4 w-4" />
        </button>

        <p className="ml-auto hidden text-xs text-slate-400 md:block">
          "Save &amp; Search Jobs" persists your profile then triggers Phase 1 discovery automatically.
        </p>
      </div>
    </div>
  )
}
