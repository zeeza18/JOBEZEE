import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Paperclip, Plus, SkipForward, Sparkles, X } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SectionHeader } from '../components/common/SectionHeader'
import { profileApi, searchApi, type UserProfile } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'

const REMOTE_OPTIONS    = ['remote', 'hybrid', 'onsite']
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
  work_modes: ['hybrid'], job_types: ['full_time'], experience_levels: ['mid'],
  salary_min: 0, salary_max: 0, salary_currency: 'USD', salary_range_text: '',
  work_authorization: '', visa_sponsorship_required: false, work_permit_type: '',
  current_job_title: '', target_role: '', years_experience: '', education: '',
  skills_languages: [], skills_frameworks: [], skills_tools: [],
  resume_facts_companies: [], resume_facts_projects: [],
  resume_facts_schools: [], resume_facts_metrics: [],
  earliest_start: 'Immediately',
  search_radius_miles: 50, hours_old: 72, results_per_site: 50,
  resume_filename: '', resume_url: '',
}

function ChipsInput({
  label, values, onChange, placeholder,
}: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </p>
  )
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 bg-white shadow-soft">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </Card>
  )
}

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const OnboardingPage = () => {
  const navigate = useNavigate()
  const { pushToast } = useAppStore()

  const [step, setStep]         = useState(0)
  const [form, setForm]         = useState<Partial<UserProfile>>(emptyProfile)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [resumeFile, setResumeFile]     = useState<File | null>(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeUploaded, setResumeUploaded]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    profileApi.get()
      .then((p) => setForm({ ...emptyProfile, ...p }))
      .catch(() => setForm(emptyProfile))
      .finally(() => setLoading(false))
  }, [])

  const setField = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  const steps = [
    {
      title: 'Start with the basics',
      description: 'Who are you and how can we reach you?',
      content: (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={form.full_name ?? ''} onChange={(e) => setField('full_name', e.target.value)} placeholder="Jordan Lee" />
          </div>
          <div className="space-y-2">
            <Label>Preferred name</Label>
            <Input value={form.preferred_name ?? ''} onChange={(e) => setField('preferred_name', e.target.value)} placeholder="Jo" />
          </div>
          <div className="space-y-2">
            <Label>Headline / Title</Label>
            <Input value={form.headline ?? ''} onChange={(e) => setField('headline', e.target.value)} placeholder="Senior Software Engineer · 6 yrs exp" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ''} onChange={(e) => setField('email', e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
          </div>
          <div className="space-y-2">
            <Label>Street address</Label>
            <Input value={form.address ?? ''} onChange={(e) => setField('address', e.target.value)} placeholder="3820 Lakewood Blvd" />
          </div>
          <div className="space-y-2">
            <Label>City / Location</Label>
            <Input value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} placeholder="Austin, TX" />
          </div>
          <div className="space-y-2">
            <Label>State / Province</Label>
            <Input value={form.state ?? ''} onChange={(e) => setField('state', e.target.value)} placeholder="TX" />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={form.country ?? ''} onChange={(e) => setField('country', e.target.value)} placeholder="USA" />
          </div>
          <div className="space-y-2">
            <Label>ZIP / Postal Code</Label>
            <Input value={form.zip_code ?? ''} onChange={(e) => setField('zip_code', e.target.value)} placeholder="78704" />
          </div>
        </div>
      ),
    },
    {
      title: 'Links and online presence',
      description: 'Share where recruiters can learn more about you.',
      content: (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input value={form.linkedin ?? ''} onChange={(e) => setField('linkedin', e.target.value)} placeholder="linkedin.com/in/you" />
          </div>
          <div className="space-y-2">
            <Label>GitHub</Label>
            <Input value={form.github ?? ''} onChange={(e) => setField('github', e.target.value)} placeholder="github.com/you" />
          </div>
          <div className="space-y-2">
            <Label>Portfolio</Label>
            <Input value={form.portfolio ?? ''} onChange={(e) => setField('portfolio', e.target.value)} placeholder="portfolio.site" />
          </div>
          <div className="space-y-2">
            <Label>Personal website</Label>
            <Input value={form.personal_website ?? ''} onChange={(e) => setField('personal_website', e.target.value)} placeholder="blog.you.dev" />
          </div>
        </div>
      ),
    },
    {
      title: 'Roles and search preferences',
      description: 'What should we look for and where?',
      content: (
        <div className="space-y-4">
          <ChipsInput
            label="Desired roles"
            values={form.desired_roles ?? []}
            onChange={(v) => setField('desired_roles', v)}
            placeholder="e.g. Senior Backend Engineer"
          />
          <ChipsInput
            label="Preferred locations"
            values={form.preferred_locations ?? []}
            onChange={(v) => setField('preferred_locations', v)}
            placeholder="e.g. Remote, Austin, Toronto"
          />
          <ChipsInput
            label="Preferred countries"
            values={form.preferred_countries ?? []}
            onChange={(v) => setField('preferred_countries', v)}
            placeholder="e.g. USA, Canada, United Kingdom"
          />
          <ChipsInput
            label="Preferred regions (optional)"
            values={form.preferred_regions ?? []}
            onChange={(v) => setField('preferred_regions', v)}
            placeholder="e.g. North America, EMEA"
          />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Work mode <span className="text-xs text-slate-400 font-normal">(select all that apply)</span></Label>
              <div className="flex flex-wrap gap-2">
                {REMOTE_OPTIONS.map((o) => {
                  const selected = (form.work_modes ?? []).includes(o)
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        const cur = form.work_modes ?? []
                        const next = selected ? cur.filter(x => x !== o) : [...cur, o]
                        setField('work_modes', next)
                        setField('remote_preference', next[0] ?? 'hybrid')
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-cyan-500 border-cyan-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300'
                      }`}
                    >
                      {fmt(o)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job type <span className="text-xs text-slate-400 font-normal">(select all that apply)</span></Label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPE_OPTIONS.map((o) => {
                  const selected = (form.job_types ?? []).includes(o)
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        const cur = form.job_types ?? []
                        const next = selected ? cur.filter(x => x !== o) : [...cur, o]
                        setField('job_types', next)
                        setField('job_type', next[0] ?? 'full_time')
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-cyan-500 border-cyan-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300'
                      }`}
                    >
                      {fmt(o)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Experience level <span className="text-xs text-slate-400 font-normal">(select all that apply)</span></Label>
              <div className="flex flex-wrap gap-2">
                {EXP_OPTIONS.map((o) => {
                  const selected = (form.experience_levels ?? []).includes(o)
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        const cur = form.experience_levels ?? []
                        const next = selected ? cur.filter(x => x !== o) : [...cur, o]
                        setField('experience_levels', next)
                        setField('experience_level', next[0] ?? 'mid')
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-cyan-500 border-cyan-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300'
                      }`}
                    >
                      {fmt(o)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Search radius (miles)</Label>
              <Input type="number" value={String(form.search_radius_miles ?? 50)} onChange={(e) => setField('search_radius_miles', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Max job age (hours)</Label>
              <Input type="number" value={String(form.hours_old ?? 72)} onChange={(e) => setField('hours_old', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Results per site</Label>
              <Input type="number" value={String(form.results_per_site ?? 50)} onChange={(e) => setField('results_per_site', Number(e.target.value))} />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Compensation & industries',
      description: 'Tell us your target range and sectors you like.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <select
                value={form.salary_currency ?? 'USD'}
                onChange={(e) => setField('salary_currency', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Minimum salary</Label>
              <Input type="number" value={String(form.salary_min ?? '')} onChange={(e) => setField('salary_min', Number(e.target.value))} placeholder="90000" />
            </div>
            <div className="space-y-2">
              <Label>Maximum salary</Label>
              <Input type="number" value={String(form.salary_max ?? '')} onChange={(e) => setField('salary_max', Number(e.target.value))} placeholder="140000" />
            </div>
            <div className="space-y-2">
              <Label>Range text</Label>
              <Input value={form.salary_range_text ?? ''} onChange={(e) => setField('salary_range_text', e.target.value)} placeholder="90,000 – 130,000" />
            </div>
          </div>
          <div>
            <Label>Industries</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => {
                const active = (form.industries ?? []).includes(ind)
                return (
                  <button
                    key={ind}
                    onClick={() => setField('industries', active ? (form.industries ?? []).filter((x) => x !== ind) : [...(form.industries ?? []), ind])}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                      active ? 'bg-brand/10 text-brand-dark border-brand/30' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {active && <CheckCircle2 className="mr-1 inline h-3 w-3" />} {ind}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Work authorization',
      description: 'Share your visa/permit situation to filter jobs.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {WORK_AUTH_OPTIONS.map((opt) => {
              const active = form.work_authorization === opt
              return (
                <button
                  key={opt}
                  onClick={() => setField('work_authorization', opt)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
                    active ? 'border-brand/50 bg-brand/5 text-brand-dark' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          <div className="space-y-2">
            <Label>Specific permit / visa type</Label>
            <Input value={form.work_permit_type ?? ''} onChange={(e) => setField('work_permit_type', e.target.value)} placeholder="e.g. STEM OPT, Blue Card" />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div
              onClick={() => setField('visa_sponsorship_required', !form.visa_sponsorship_required)}
              className={cn(
                'relative h-7 w-12 cursor-pointer rounded-full transition',
                form.visa_sponsorship_required ? 'bg-brand' : 'bg-slate-300'
              )}
            >
              <div className={cn(
                'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition',
                form.visa_sponsorship_required ? 'right-1' : 'left-1'
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">I need visa sponsorship</p>
              <p className="text-xs text-slate-500">We will prioritize employers known to sponsor.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Experience & education',
      description: 'Where are you in your career journey?',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Current / recent title</Label>
              <Input value={form.current_job_title ?? ''} onChange={(e) => setField('current_job_title', e.target.value)} placeholder="Software Engineer II" />
            </div>
            <div className="space-y-2">
              <Label>Target role</Label>
              <Input value={form.target_role ?? ''} onChange={(e) => setField('target_role', e.target.value)} placeholder="Senior Backend Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Years of experience</Label>
              <Input value={form.years_experience ?? ''} onChange={(e) => setField('years_experience', e.target.value)} placeholder="4" />
            </div>
            <div className="space-y-2">
              <Label>Highest education</Label>
              <select
                value={form.education ?? ''}
                onChange={(e) => setField('education', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none"
              >
                {['', ...EDU_OPTIONS].map((opt) => <option key={opt} value={opt}>{opt || 'Select'}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Earliest start date</Label>
            <Input value={form.earliest_start ?? 'Immediately'} onChange={(e) => setField('earliest_start', e.target.value)} placeholder="2 weeks notice / Immediately" />
          </div>
        </div>
      ),
    },
    {
      title: 'Skills and must-keep resume facts',
      description: 'Lock in keywords and facts the AI should never change.',
      content: (
        <div className="space-y-4">
          <ChipsInput
            label="Programming languages"
            values={form.skills_languages ?? []}
            onChange={(v) => setField('skills_languages', v)}
            placeholder="Python, TypeScript, Go"
          />
          <ChipsInput
            label="Frameworks & libraries"
            values={form.skills_frameworks ?? []}
            onChange={(v) => setField('skills_frameworks', v)}
            placeholder="React, FastAPI, Next.js"
          />
          <ChipsInput
            label="Tools & platforms"
            values={form.skills_tools ?? []}
            onChange={(v) => setField('skills_tools', v)}
            placeholder="Docker, AWS, Kubernetes"
          />
          <ChipsInput
            label="Companies to always keep"
            values={form.resume_facts_companies ?? []}
            onChange={(v) => setField('resume_facts_companies', v)}
            placeholder="Acme Corp, Stripe"
          />
          <ChipsInput
            label="Projects to always keep"
            values={form.resume_facts_projects ?? []}
            onChange={(v) => setField('resume_facts_projects', v)}
            placeholder="Project Phoenix"
          />
          <ChipsInput
            label="Schools to preserve"
            values={form.resume_facts_schools ?? []}
            onChange={(v) => setField('resume_facts_schools', v)}
            placeholder="University of Texas"
          />
          <ChipsInput
            label="Real metrics to preserve"
            values={form.resume_facts_metrics ?? []}
            onChange={(v) => setField('resume_facts_metrics', v)}
            placeholder="40% faster load times"
          />
        </div>
      ),
    },
    {
      title: 'Upload your resume',
      description: 'This is the base resume the AI uses to tailor applications. PDF or DOCX.',
      content: (
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const ext = f.name.split('.').pop()?.toLowerCase()
              if (!['pdf', 'docx', 'doc'].includes(ext ?? '')) {
                pushToast({ title: 'Only PDF and DOCX files are supported', type: 'error' })
                return
              }
              setResumeFile(f)
              setResumeUploaded(false)
            }}
          />

          {resumeUploaded && form.resume_filename ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Resume uploaded</p>
                <p className="text-xs text-emerald-600 truncate">{form.resume_filename}</p>
              </div>
              <button
                onClick={() => { setResumeFile(null); setResumeUploaded(false); fileInputRef.current?.click() }}
                className="text-xs text-emerald-600 hover:text-emerald-800 underline"
              >
                Replace
              </button>
            </div>
          ) : resumeFile ? (
            <div className="flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4">
              <Paperclip className="h-5 w-5 text-cyan-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cyan-800">{resumeFile.name}</p>
                <p className="text-xs text-cyan-600">Ready to upload — click Upload below</p>
              </div>
              <button
                onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : form.resume_filename ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
              <Paperclip className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">Current: {form.resume_filename}</p>
                <p className="text-xs text-slate-500">You can replace it below</p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-4 text-sm text-slate-500 transition hover:border-cyan-400 hover:text-cyan-600"
            >
              <Paperclip className="h-4 w-4" />
              {resumeFile || form.resume_filename ? 'Choose different file' : 'Choose file (PDF / DOCX)'}
            </button>

            {resumeFile && !resumeUploaded && (
              <button
                type="button"
                disabled={uploadingResume}
                onClick={async () => {
                  setUploadingResume(true)
                  try {
                    const res = await profileApi.uploadResume(resumeFile)
                    setForm((prev) => ({ ...prev, resume_filename: res.filename, resume_url: res.url }))
                    setResumeUploaded(true)
                    pushToast({ title: 'Resume uploaded', type: 'success' })
                  } catch {
                    pushToast({ title: 'Upload failed — try again', type: 'error' })
                  } finally { setUploadingResume(false) }
                }}
                className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
              >
                {uploadingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {uploadingResume ? 'Uploading…' : 'Upload'}
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Your resume is only used to tailor job applications — it is never shared with employers automatically.
            You can update it anytime from Profile.
          </p>
        </div>
      ),
    },
  ]

  const progress = Math.round(((step + 1) / steps.length) * 100)

  const save = async (showToast = false) => {
    setSaving(true)
    try {
      await profileApi.update(form)
      if (showToast) pushToast({ title: 'Profile saved', type: 'success' })
      return true
    } catch (e: unknown) {
      pushToast({ title: 'Save failed', description: String(e), type: 'error' })
      return false
    } finally { setSaving(false) }
  }

  const handleNext = async () => {
    const ok = await save()
    if (!ok) return
    setStep((s) => Math.min(steps.length - 1, s + 1))
  }

  const handleSkipStep = () => setStep((s) => Math.min(steps.length - 1, s + 1))

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  const handleFinish = async () => {
    const ok = await save(true)
    if (!ok) return
    try {
      await searchApi.trigger()
      pushToast({ title: 'Profile saved! Job search started.', type: 'success' })
    } catch {
      // non-fatal — user can trigger manually from the dashboard
    }
    navigate('/app')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <SectionHeader title="Save your profile" eyebrow="One-time setup · Next or skip through the cards" />

      <Card className="flex items-center justify-between gap-4 bg-gradient-to-r from-cyan-50 via-white to-slate-50">
        <div>
          <p className="text-sm font-semibold text-slate-900">Step {step + 1} of {steps.length}</p>
          <p className="text-sm text-slate-600">Use Next to save answers to the database. You can always edit later in Profile.</p>
        </div>
        <Button
          variant="ghost"
          icon={<SkipForward className="h-4 w-4" />}
          onClick={() => navigate('/app')}
          className="text-slate-600"
        >
          Skip onboarding
        </Button>
      </Card>

      <ProgressBar progress={progress} />

      <motion.div
        key={steps[step].title}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <SectionCard title={steps[step].title} description={steps[step].description}>
          {steps[step].content}
        </SectionCard>
      </motion.div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={handleBack}
          disabled={step === 0}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          {step < steps.length - 1 && (
            <Button
              variant="ghost"
              icon={<Sparkles className="h-4 w-4" />}
              onClick={handleSkipStep}
            >
              Skip this card
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={saving}
              icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            >
              Next & Save
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            >
              Save & Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
