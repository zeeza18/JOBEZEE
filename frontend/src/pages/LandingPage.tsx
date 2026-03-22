import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import LogoBrand from '../components/common/LogoBrand'
import {
  ArrowRight, Briefcase, CheckCircle2, ChevronRight, Globe2,
  LayoutDashboard, Rocket, Search, Sparkles, Target,
  Wand2, Zap, Shield, TrendingUp, Clock,
} from 'lucide-react'

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref    = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const mv     = useMotionValue(0)
  const spring = useSpring(mv, { duration: 2000, bounce: 0 })
  const [display, setDisplay] = useState('0')
  useEffect(() => { if (inView) mv.set(target) }, [inView, mv, target])
  useEffect(() => spring.on('change', (v) => setDisplay(Math.round(v).toLocaleString())), [spring])
  return <span ref={ref}>{display}{suffix}</span>
}

const FEATURES = [
  {
    icon : <Search className="h-5 w-5" />,
    title: 'Global Job Discovery',
    desc : 'AI scrapes Indeed, LinkedIn, Glassdoor, ZipRecruiter and more across 45+ countries. One click, hundreds of live listings.',
    bg   : 'bg-cyan-50',
    text : 'text-cyan-600',
    border: 'border-cyan-100',
    tag  : 'AI-Powered',
    tagBg: 'bg-cyan-100 text-cyan-700',
  },
  {
    icon : <Wand2 className="h-5 w-5" />,
    title: 'Resume Tailoring Engine',
    desc : 'Upload your resume once. JOBEZEE rewrites bullets, fills keyword gaps, scores fit, and generates a cover letter for each role.',
    bg   : 'bg-violet-50',
    text : 'text-violet-600',
    border: 'border-violet-100',
    tag  : 'AI',
    tagBg: 'bg-violet-100 text-violet-700',
  },
  {
    icon : <Target className="h-5 w-5" />,
    title: 'One-Time Smart Profile',
    desc : 'Name, city, phone, salary, visa status, desired roles — fill once. Every search, tailor, and apply action uses it automatically.',
    bg   : 'bg-emerald-50',
    text : 'text-emerald-600',
    border: 'border-emerald-100',
    tag  : 'Smart',
    tagBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon : <LayoutDashboard className="h-5 w-5" />,
    title: 'Kanban Application Tracker',
    desc : 'Track every application from Saved → Applied → Interview → Offer in a visual Kanban board.',
    bg   : 'bg-amber-50',
    text : 'text-amber-600',
    border: 'border-amber-100',
    tag  : 'Tracking',
    tagBg: 'bg-amber-100 text-amber-700',
  },
  {
    icon : <Rocket className="h-5 w-5" />,
    title: 'One-Click Apply',
    desc : 'Your profile auto-fills every application form. Attach your tailored resume and cover letter with a single click.',
    bg   : 'bg-rose-50',
    text : 'text-rose-600',
    border: 'border-rose-100',
    tag  : 'Automation',
    tagBg: 'bg-rose-100 text-rose-700',
  },
  {
    icon : <Globe2 className="h-5 w-5" />,
    title: 'Worldwide Coverage',
    desc : '45+ countries · 6 global regions · 80+ Workday employer portals. Remote, hybrid, or onsite — search the entire planet.',
    bg   : 'bg-sky-50',
    text : 'text-sky-600',
    border: 'border-sky-100',
    tag  : 'Global',
    tagBg: 'bg-sky-100 text-sky-700',
  },
]

const STEPS = [
  {
    n    : '01',
    icon : <Target className="h-6 w-6 text-cyan-500" />,
    title: 'Set up your profile',
    desc : 'Enter your desired roles, salary range, location, visa status and upload your resume — takes under 3 minutes.',
    color: 'border-t-cyan-400',
  },
  {
    n    : '02',
    icon : <Sparkles className="h-6 w-6 text-sky-500" />,
    title: 'Trigger a job search',
    desc : 'Hit "Search Jobs" — our AI instantly scrapes job boards and delivers hundreds of live, relevant listings.',
    color: 'border-t-sky-400',
  },
  {
    n    : '03',
    icon : <Wand2 className="h-6 w-6 text-violet-500" />,
    title: 'Tailor & apply',
    desc : 'Pick a role, get an AI-tailored resume with keyword gaps fixed, then apply directly through JOBEZEE.',
    color: 'border-t-violet-400',
  },
  {
    n    : '04',
    icon : <TrendingUp className="h-6 w-6 text-emerald-500" />,
    title: 'Track everything',
    desc : 'Manage all applications in your Kanban. Know exactly where every opportunity stands at a glance.',
    color: 'border-t-emerald-400',
  },
]

const STATS = [
  { value: 10, suffix: '+',    label: 'Job boards scraped', sub: 'Indeed, LinkedIn, Glassdoor & more' },
  { value: 45, suffix: '+',    label: 'Countries covered',  sub: 'North America, Europe, APAC, ME' },
  { value: 80, suffix: '+',    label: 'Workday employers',  sub: 'Direct portal access' },
  { value: 3,  suffix: ' min', label: 'Setup time',         sub: 'Profile → first search results' },
]

const BOARDS = ['Indeed', 'LinkedIn', 'Glassdoor', 'ZipRecruiter', 'Google Jobs', 'Workday', 'Lever', 'Greenhouse']

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative overflow-x-hidden bg-white text-slate-900">

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-16 text-center">
        {/* Subtle bg blobs */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-100/60 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <img src="/logo.jpg" alt="JOBEZEE" className="mx-auto h-24 w-24 rounded-2xl object-cover shadow-lg shadow-cyan-100" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl"
        >
          The job search platform{' '}
          <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
            that works harder than you.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500"
        >
          JOBEZEE scrapes global job boards with AI, tailors your resume for each role,
          auto-fills applications from your saved profile, and tracks everything in a
          beautiful Kanban dashboard. All in one place.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28 }}
          className="relative mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => navigate('/auth')}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-base font-bold text-white shadow-md shadow-cyan-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-300"
          >
            Start for Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            Sign in →
          </button>
        </motion.div>

        {/* Trust pills */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.42 }}
          className="relative mt-6 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-400"
        >
          {[
            { icon: <CheckCircle2 className="h-4 w-4 text-cyan-500" />, text: 'No credit card' },
            { icon: <Shield className="h-4 w-4 text-cyan-500" />,       text: 'JWT secured' },
            { icon: <Clock className="h-4 w-4 text-cyan-500" />,        text: 'Setup in 3 min' },
          ].map((item) => (
            <span key={item.text} className="flex items-center gap-1.5">{item.icon} {item.text}</span>
          ))}
        </motion.div>

        {/* Dashboard preview — styled like the real app */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-14 w-full max-w-4xl px-2 md:px-0"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <div className="ml-4 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-center text-xs text-slate-400">
                app.jobezee.ai/dashboard
              </div>
            </div>

            <div className="flex">
              {/* Mini sidebar */}
              <div className="hidden w-44 shrink-0 border-r border-slate-100 bg-slate-50/80 p-3 md:block">
                <div className="mb-4 flex items-center gap-2 px-2 py-1">
                  <div className="h-5 w-5 rounded bg-gradient-to-br from-cyan-500 to-sky-500" />
                  <span className="text-xs font-bold text-slate-700">JOBEZEE</span>
                </div>
                {[
                  { label: 'Dashboard', active: true },
                  { label: 'Jobs', active: false },
                  { label: 'Tailor', active: false },
                  { label: 'Apply', active: false },
                  { label: 'Portfolio', active: false },
                ].map((item) => (
                  <div key={item.label}
                    className={`mb-0.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${item.active ? 'bg-cyan-500/10 text-cyan-600' : 'text-slate-400'}`}>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 md:p-5">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                  {[
                    { l: 'Jobs Pulled', v: '247', color: 'text-cyan-600',   bg: 'bg-cyan-50',   border: 'border-cyan-100' },
                    { l: 'Saved',       v: '31',  color: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-100' },
                    { l: 'Applied',     v: '12',  color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                    { l: 'Interviews',  v: '4',   color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-100' },
                  ].map((s) => (
                    <div key={s.l} className={`rounded-xl border ${s.border} ${s.bg} p-3`}>
                      <p className="text-[10px] text-slate-500">{s.l}</p>
                      <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.v}</p>
                    </div>
                  ))}
                </div>

                {/* Job rows */}
                <div className="mt-3 space-y-2">
                  {[
                    { t: 'Senior ML Engineer',     c: 'Google DeepMind', loc: 'Remote · USA',       s: 'New',     sc: 'bg-cyan-50 text-cyan-700 border-cyan-200',     sal: '$180k–$240k' },
                    { t: 'Staff Backend Engineer',  c: 'Stripe',          loc: 'New York / Remote',  s: 'Saved',   sc: 'bg-sky-50 text-sky-700 border-sky-200',         sal: '$160k–$210k' },
                    { t: 'AI Product Manager',      c: 'OpenAI',          loc: 'San Francisco',      s: 'Applied', sc: 'bg-violet-50 text-violet-700 border-violet-200', sal: '$200k–$280k' },
                    { t: 'Data Science Lead',       c: 'Spotify',         loc: 'Stockholm / Remote', s: 'New',     sc: 'bg-cyan-50 text-cyan-700 border-cyan-200',     sal: '€130k–€170k' },
                  ].map((j, i) => (
                    <motion.div
                      key={j.t}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.07 }}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm transition hover:border-slate-200 hover:shadow-md gap-2"
                    >
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-800">{j.t}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{j.c} · {j.loc}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden text-[10px] font-medium text-slate-400 md:block">{j.sal}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${j.sc}`}>{j.s}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── BOARD TICKER ── */}
      <div className="overflow-hidden border-y border-slate-100 bg-slate-50 py-5">
        <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Searches across all major platforms
        </p>
        <div className="flex animate-[scroll_22s_linear_infinite] gap-12 whitespace-nowrap">
          {[...BOARDS, ...BOARDS].map((b, i) => (
            <span key={i} className="text-sm font-semibold text-slate-400 transition hover:text-slate-700">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
            >
              <p className="text-4xl font-extrabold text-cyan-500">
                <AnimatedNumber target={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{s.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-slate-50/60 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-sm font-semibold text-cyan-600">
              <Zap className="h-3.5 w-3.5" /> Built to win
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Everything you need.{' '}
              <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">
                Nothing you don't.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              JOBEZEE replaces five separate tools — job boards, resume editors, application trackers,
              cover letter generators — in one clean platform.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, transition: { duration: 0.18 } }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`inline-flex rounded-xl border ${f.border} ${f.bg} p-2.5 ${f.text}`}>
                    {f.icon}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${f.tagBg}`}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-600">
              <Briefcase className="h-3.5 w-3.5" /> How it works
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              From zero to interviews{' '}
              <span className="bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent">
                in four steps.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
              No learning curve. Just a clear path from setup to offer.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative flex h-full flex-col rounded-2xl border-t-2 border border-slate-200 bg-white p-6 shadow-sm ${s.color}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">{s.icon}</div>
                  <span className="text-4xl font-black text-slate-100">{s.n}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-slate-50 border-t border-slate-100 px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Your next role is{' '}
              <span className="bg-gradient-to-r from-cyan-500 to-sky-500 bg-clip-text text-transparent">
                one click away.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500">
              Set up your profile in 3 minutes. Let JOBEZEE's AI handle the searching,
              tailoring, and tracking. You just show up to the interviews.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/auth')}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-10 py-4 text-base font-bold text-white shadow-md shadow-cyan-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-300"
              >
                Create Free Account
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                Sign in →
              </button>
            </div>
            <p className="mt-5 text-sm text-slate-400">
              No credit card required · Free to get started
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <LogoBrand size="sm" variant="light" />
          <p className="text-sm text-slate-400">
            © 2026 JOBEZEE · Built with React 19, FastAPI &amp; Neon PostgreSQL
          </p>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="https://github.com/zeeza18/JOBEZEE" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-700">GitHub</a>
            <Link to="/privacy" className="transition hover:text-slate-700">Privacy</Link>
            <Link to="/terms" className="transition hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
