/**
 * /reset-password?token=xxx  — sets a new password using the email link.
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import LogoBrand from '../components/common/LogoBrand'

export default function ResetPasswordPage() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const token           = params.get('token') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? 'Something went wrong')
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-sm text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h1 className="text-lg font-bold text-slate-900">Invalid link</h1>
          <p className="mt-2 text-sm text-slate-500">This reset link is missing or invalid. Please request a new one.</p>
          <button
            onClick={() => navigate('/auth')}
            className="mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-white">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-50 border-r border-slate-100 p-12">
        <LogoBrand size="md" variant="light" />
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
            Set a new<br />
            <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">
              secure password.
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-500">Choose something strong and unique.</p>
        </div>
        <p className="text-xs text-slate-400">© 2026 JobEzee</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 lg:hidden">
          <LogoBrand size="md" variant="light" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {done ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
              <h1 className="text-lg font-bold text-slate-900">Password updated!</h1>
              <p className="mt-2 text-sm text-slate-500">You can now sign in with your new password.</p>
              <button
                onClick={() => navigate('/auth')}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-200"
              >
                Sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
              <p className="mt-1 text-sm text-slate-500">Must be at least 8 characters.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : 'Update password'}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-400">
                <button onClick={() => navigate('/auth')} className="hover:text-slate-700 transition-colors">
                  ← Back to sign in
                </button>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
