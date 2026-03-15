/**
 * Login / Register page.
 * Uses JWT cookies managed by the backend — no localStorage tokens.
 * Register: collects name/email/password + optional resume upload (PDF/DOCX).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { searchApi } from '../lib/api'

function Orb({ className }: { className?: string }) {
  return <div className={`pointer-events-none absolute rounded-full blur-[100px] opacity-20 ${className}`} />
}

type Mode = 'login' | 'register'

export default function AuthPage() {
  const navigate  = useNavigate()
  const { login, register, loading } = useAuthStore()

  const [mode, setMode]         = useState<Mode>('login')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    full_name : '',
    email     : '',
    password  : '',
  })

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        searchApi.trigger().catch(() => {})   // fire-and-forget background search
        navigate('/app')
      } else {
        await register(form.email, form.password, form.full_name)
        navigate('/onboarding')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const isLoading = loading

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817] px-4">
      <Orb className="h-[500px] w-[500px] bg-cyan-500 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <Orb className="h-[300px] w-[300px] bg-sky-600 right-0 top-0" />
      <Orb className="h-[200px] w-[200px] bg-indigo-600 left-0 bottom-0" />

      {/* Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-sky-500/5" />

          <div className="relative">
            {/* Logo */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 text-lg font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                J
              </div>
              <div>
                <p className="text-lg font-bold text-white">JOBEZEE</p>
                <p className="text-xs text-slate-500">AI Job Search Co-Pilot</p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="mb-6 flex rounded-xl bg-white/5 p-1">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    key="register_fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={form.full_name}
                      onChange={update('full_name')}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={update('email')}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
              />

              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={update('password')}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              By continuing you agree to our{' '}
              <span className="text-cyan-400 cursor-pointer hover:underline">Terms</span>{' '}
              &amp;{' '}
              <span className="text-cyan-400 cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </div>
        </div>

        {/* Back to landing */}
        <p className="mt-4 text-center text-xs text-slate-600">
          <button onClick={() => navigate('/')} className="hover:text-slate-400 transition-colors">
            ← Back to home
          </button>
        </p>
      </motion.div>
    </div>
  )
}
