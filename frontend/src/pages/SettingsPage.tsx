import { useState } from 'react'
import {
  CreditCard,
  Briefcase,
  FileText,
  Globe,
  Zap,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
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

// ── Main page ─────────────────────────────────────────────────────────────────
const SettingsPage = () => {
  const {
    billing, jobs, tailor, portfolio, autoApply,
    deductApplyCost, addCredits,
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

  // Fun billing demo
  const handleSpend = () => {
    if (billing.balance < billing.costPerApply) {
      pushToast({ title: 'Insufficient balance', description: 'Add credits to continue applying', type: 'error' })
      return
    }
    deductApplyCost()
    pushToast({ title: `–$${billing.costPerApply.toFixed(2)} applied`, description: `Balance: $${(billing.balance - billing.costPerApply).toFixed(2)}`, type: 'info' })
  }

  const handleAddCredits = (amt: number) => {
    addCredits(amt)
    pushToast({ title: `+$${amt.toFixed(2)} added`, type: 'success' })
  }

  const pct = Math.min(100, (billing.balance / 5) * 100)
  const barColor = pct > 50 ? 'bg-cyan-500' : pct > 20 ? 'bg-amber-400' : 'bg-rose-500'

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" eyebrow="Control" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Left column: all sections ───────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">

          {/* 1. Billing */}
          <Section icon={CreditCard} title="Billing" description="Track apply spend and manage credits" accent="cyan">
            {/* Balance display */}
            <div className="px-5 py-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current Balance</p>
                  <p className={cn('mt-0.5 text-3xl font-bold tabular-nums', billing.balance === 0 ? 'text-rose-500' : 'text-slate-800')}>
                    ${billing.balance.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">~${billing.costPerApply.toFixed(2)} deducted per application</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">
                    ≈ {billing.balance > 0 ? Math.floor(billing.balance / billing.costPerApply) : 0} applies left
                  </p>
                </div>
              </div>

              {/* Balance bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Add / spend controls */}
            <div className="flex items-center gap-2 px-5 py-3.5">
              <p className="mr-auto text-xs font-medium text-slate-600">Add credits</p>
              {[1, 5, 10].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAddCredits(amt)}
                  className="flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                >
                  <Plus className="h-3 w-3" />
                  ${amt}
                </button>
              ))}
            </div>

            {/* Fun demo spend button */}
            <SettingRow
              label="Simulate apply spend"
              hint="Demo only — press to deduct one apply cost from balance"
            >
              <button
                onClick={handleSpend}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95"
              >
                <Minus className="h-3 w-3" />
                ${billing.costPerApply.toFixed(2)}
              </button>
            </SettingRow>
          </Section>

          {/* 2. Job Settings */}
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

          {/* 5. Auto Apply Settings */}
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
