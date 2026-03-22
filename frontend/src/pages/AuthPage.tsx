/**
 * Login / Register page.
 * Uses JWT cookies managed by the backend — no localStorage tokens.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { searchApi } from '../lib/api'
import LogoBrand from '../components/common/LogoBrand'

type Mode = 'login' | 'register' | 'forgot'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login, register, loading } = useAuthStore()

  const [mode, setMode]         = useState<Mode>('login')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotEmail, setForgotEmail]     = useState('')

  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        searchApi.trigger().catch(() => {})
        navigate('/app')
      } else {
        await register(form.email, form.password, form.full_name)
        navigate('/onboarding')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setForgotLoading(true)
    try {
      const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'
      await fetch(`${base}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      setForgotSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen bg-white">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-50 border-r border-slate-100 p-12">
        <LogoBrand size="md" variant="light" />

        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
            The job search platform<br />
            <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">
              that works harder than you.
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 leading-relaxed">
            AI-powered job discovery, resume tailoring, one-click apply,
            and application tracking — all in one place.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { n: '01', title: 'Set up your profile once', desc: 'Name, roles, salary, visa status, resume — done in 3 minutes.' },
              { n: '02', title: 'AI searches across job boards', desc: 'Hundreds of live listings from Indeed, LinkedIn, Glassdoor & more.' },
              { n: '03', title: 'Tailor, apply & track', desc: 'AI rewrites your resume per role. Track every app in a Kanban board.' },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-black text-cyan-600">{s.n}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400">© 2026 JOBEZEE · No credit card required</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <LogoBrand size="md" variant="light" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* ── Forgot password panel ── */}
          <AnimatePresence mode="wait">
            {mode === 'forgot' ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <button
                  onClick={() => { setMode('login'); setForgotSent(false); setForgotEmail(''); setError('') }}
                  className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>

                {forgotSent ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-6 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-800">Check your inbox</p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      If <span className="font-medium">{forgotEmail}</span> is registered, you'll receive a reset link shortly. Check your spam folder if it doesn't arrive.
                    </p>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
                    <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send you a reset link.</p>

                    <form onSubmit={handleForgot} className="mt-5 space-y-3">
                      <input
                        type="email"
                        placeholder="Email address"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      />

                      {error && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                          {error}
                        </motion.p>
                      )}

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                      >
                        {forgotLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send reset link'}
                      </button>
                    </form>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <h1 className="text-2xl font-bold text-slate-900">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {mode === 'login'
                    ? 'Sign in to continue your job search.'
                    : 'Get started — it takes under a minute.'}
                </p>

                {/* Tab switcher */}
                <div className="mt-6 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {(['login', 'register'] as ('login' | 'register')[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setError('') }}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                        mode === m
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {m === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  <AnimatePresence>
                    {mode === 'register' && (
                      <motion.div
                        key="name"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={form.full_name}
                          onChange={update('full_name')}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />

                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Password"
                      value={form.password}
                      onChange={update('password')}
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

                  {mode === 'login' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setForgotEmail(form.email); setError('') }}
                        className="text-xs text-cyan-500 hover:text-cyan-700 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

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
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />
                        {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                      </>
                    ) : (
                      <><Sparkles className="h-4 w-4" />
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                      </>
                    )}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-xs text-slate-400">or</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                {/* LinkedIn OAuth */}
                <button
                  type="button"
                  onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8001'}/api/auth/linkedin` }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <svg className="h-4 w-4 fill-[#0077B5]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Continue with LinkedIn
                </button>

                <p className="mt-6 text-center text-xs text-slate-400">
                  By continuing you agree to our{' '}
                  <a href="https://www.jobezee.org/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Terms</a>{' '}
                  &amp;{' '}
                  <a href="https://www.jobezee.org/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Privacy Policy</a>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-3 text-center text-xs text-slate-400">
            <button onClick={() => navigate('/')} className="hover:text-slate-700 transition-colors">
              ← Back to home
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
