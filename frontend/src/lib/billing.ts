/**
 * Billing API client.
 * Mirrors the patterns used in lib/api.ts — uses native fetch with
 * credentials: 'include' so httpOnly JWT cookies are sent automatically.
 */

const BASE = '/api/billing'

export async function getBalance(): Promise<{ balance: number }> {
  const r = await fetch(`${BASE}/balance`, { credentials: 'include' })
  if (!r.ok) throw new Error('Failed to load balance')
  return r.json()
}

export async function addCredits(amount: number): Promise<{ balance: number; added: number }> {
  const r = await fetch(`${BASE}/add?amount=${amount}`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!r.ok) throw new Error('Failed to add credits')
  return r.json()
}

export interface BillingHistoryItem {
  job_id: string
  status: string
  score: number | null
  input_tokens: number
  output_tokens: number
  cost_usd: number
  created_at: string | null
  company_name: string | null
}

export async function getBillingHistory(limit = 20): Promise<{ history: BillingHistoryItem[] }> {
  const r = await fetch(`${BASE}/history?limit=${limit}`, { credentials: 'include' })
  if (!r.ok) throw new Error('Failed to load history')
  return r.json()
}
