import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type SettingsState = {
  // ── Billing ────────────────────────────────────────────────────────────────
  billing: {
    balance: number          // USD, starts at 5.00
    costPerApply: number     // deducted each time an apply runs (~$0.12)
  }

  // ── Job Settings ──────────────────────────────────────────────────────────
  jobs: {
    showFilters: boolean     // filter pulled jobs by preferences (location / type / salary)
    convertHourlyToMonthly: boolean  // hourly × 40 × 4 for salary comparison
  }

  // ── Tailor Settings ───────────────────────────────────────────────────────
  tailor: {
    showKeywords: boolean    // highlight job description keywords in tailor view
    showSuggestions: boolean // show AI suggestions panel while tailoring
  }

  // ── Portfolio Settings ────────────────────────────────────────────────────
  portfolio: {
    defaultSlug: string      // domain slug — auto-set from name, user can edit
    slugLocked: boolean      // once published, warn before changing
  }

  // ── Auto Apply Settings ───────────────────────────────────────────────────
  autoApply: {
    tailorBeforeApply: boolean  // ON = tailor (2 rounds) then apply | OFF = apply from profile resume directly
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  deductApplyCost: () => void
  addCredits: (amount: number) => void
  updateJobs: (patch: Partial<SettingsState['jobs']>) => void
  updateTailor: (patch: Partial<SettingsState['tailor']>) => void
  updatePortfolio: (patch: Partial<SettingsState['portfolio']>) => void
  updateAutoApply: (patch: Partial<SettingsState['autoApply']>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      billing: {
        balance: 5.0,
        costPerApply: 0.12,
      },
      jobs: {
        showFilters: true,
        convertHourlyToMonthly: true,
      },
      tailor: {
        showKeywords: true,
        showSuggestions: true,
      },
      portfolio: {
        defaultSlug: '',
        slugLocked: false,
      },
      autoApply: {
        tailorBeforeApply: true,
      },

      deductApplyCost: () =>
        set((s) => ({
          billing: {
            ...s.billing,
            balance: Math.max(0, parseFloat((s.billing.balance - s.billing.costPerApply).toFixed(4))),
          },
        })),

      addCredits: (amount) =>
        set((s) => ({
          billing: {
            ...s.billing,
            balance: parseFloat((s.billing.balance + amount).toFixed(4)),
          },
        })),

      updateJobs: (patch) =>
        set((s) => ({ jobs: { ...s.jobs, ...patch } })),

      updateTailor: (patch) =>
        set((s) => ({ tailor: { ...s.tailor, ...patch } })),

      updatePortfolio: (patch) =>
        set((s) => ({ portfolio: { ...s.portfolio, ...patch } })),

      updateAutoApply: (patch) =>
        set((s) => ({ autoApply: { ...s.autoApply, ...patch } })),
    }),
    {
      name: 'jobezee-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
