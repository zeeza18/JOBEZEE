import { useEffect, useState } from 'react'
import { DollarSign, History, Loader2, Plus, RefreshCw, TrendingUp } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/common/SectionHeader'
import { useAppStore } from '../store/useAppStore'
import { getBalance, addCredits, getBillingHistory, type BillingHistoryItem } from '../lib/billing'
import { cn } from '../lib/utils'

const MIN_CREDITS = 5

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
}

// ── Balance Card ────────────────────────────────────────────────────────────────
function BalanceCard({ balance, onRefresh, loading }: {
  balance: number | null
  onRefresh: () => void
  loading: boolean
}) {
  return (
    <Card className="relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-200">
            <DollarSign className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Current Balance</p>
            <p className={cn(
              'mt-0.5 text-3xl font-bold tracking-tight',
              balance === null ? 'text-slate-300' : 'text-slate-900'
            )}>
              {loading && !balance
                ? <span className="inline-flex items-center gap-1.5 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /> loading…</span>
                : `$${(balance ?? 0).toFixed(2)}`
              }
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh balance"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Balance info blurb */}
      <div className="relative mt-4 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          Credits are consumed per AI-powered tailoring job.
          Minimum top-up is <span className="font-semibold text-slate-700">${MIN_CREDITS.toFixed(2)}</span>.
          Check the table below for per-job costs.
        </p>
      </div>
    </Card>
  )
}

// ── Add Credits Form ────────────────────────────────────────────────────────────
function AddCreditsForm({ onSuccess }: { onSuccess: () => void }) {
  const { pushToast } = useAppStore()
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const val = parseFloat(amount)
    if (isNaN(val) || val < MIN_CREDITS) {
      setError(`Minimum top-up is $${MIN_CREDITS.toFixed(2)}`)
      return
    }
    setSubmitting(true)
    try {
      const result = await addCredits(val)
      pushToast({
        title: `+$${result.added.toFixed(2)} added`,
        description: `New balance: $${result.balance.toFixed(2)}`,
        type: 'success',
      })
      setAmount('')
      onSuccess()
    } catch (err: any) {
      pushToast({ title: 'Failed to add credits', description: err.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const presets = [10, 25, 50, 100]

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
          <Plus className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Add Credits</p>
          <p className="text-xs text-slate-500">Top up your account to keep tailoring resumes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                amount === String(p)
                  ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              ${p}
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input
            type="number"
            min={MIN_CREDITS}
            step="0.01"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null) }}
            placeholder={`${MIN_CREDITS}.00`
            }
            className={cn(
              'w-full rounded-lg border bg-slate-50 pl-7 pr-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-100 transition',
              error ? 'border-rose-400 focus:border-rose-400' : 'border-slate-200 focus:border-cyan-400'
            )}
          />
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !amount}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition-colors"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          {submitting ? 'Processing…' : 'Add Credits'}
        </button>
      </form>
    </Card>
  )
}

// ── Transaction History Table ──────────────────────────────────────────────────
function HistoryTable({ items, loading, onRefresh }: {
  items: BillingHistoryItem[]
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 border border-violet-100">
            <History className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Transaction History</p>
            <p className="text-xs text-slate-500">Per-job billing for resume tailoring</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors disabled:opacity-40"
          title="Refresh history"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <History className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No transactions yet</p>
          <p className="text-xs text-slate-400 mt-0.5">Your tailoring history will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Job ID', 'Company', 'Score', 'In Tokens', 'Out Tokens', 'Cost (USD)', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap first:pl-5 last:right-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item, i) => (
                <tr key={`${item.job_id}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap pl-5">
                    {truncateId(item.job_id)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap max-w-[140px] truncate">
                    {item.company_name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {item.score != null ? (
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 font-semibold',
                        item.score >= 80 ? 'bg-emerald-50 text-emerald-700' :
                        item.score >= 60 ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {item.score}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap font-mono text-right">
                    {item.input_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap font-mono text-right">
                    {item.output_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                      ${item.cost_usd.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-right pr-5">
                    {formatDate(item.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const BillingPage = () => {
  const { pushToast } = useAppStore()
  const [balance, setBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<BillingHistoryItem[]>([])
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadBalance = async () => {
    setBalanceLoading(true)
    try {
      const data = await getBalance()
      setBalance(data.balance)
    } catch (err: any) {
      pushToast({ title: 'Could not load balance', description: err.message, type: 'error' })
    } finally {
      setBalanceLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const data = await getBillingHistory(20)
      setHistory(data.history)
    } catch (err: any) {
      pushToast({ title: 'Could not load history', description: err.message, type: 'error' })
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadBalance()
    loadHistory()
  }, [])

  return (
    <div className="space-y-6">
      <SectionHeader title="Billing" eyebrow="Account" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: balance + form */}
        <div className="space-y-4 lg:col-span-1">
          <BalanceCard
            balance={balance}
            onRefresh={loadBalance}
            loading={balanceLoading}
          />
          <AddCreditsForm onSuccess={loadBalance} />
        </div>

        {/* Right: history table */}
        <div className="lg:col-span-2">
          <HistoryTable
            items={history}
            loading={historyLoading}
            onRefresh={loadHistory}
          />
        </div>
      </div>
    </div>
  )
}

export default BillingPage
