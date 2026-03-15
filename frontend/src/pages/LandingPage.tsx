/**
 * JOBEZEE Landing Page — Marketing-grade, world-class design.
 *
 * Sections:
 *   1. Nav bar (sticky, glassmorphism)
 *   2. Hero (dark, animated orbs, headline, CTA, dashboard preview)
 *   3. Logos / "as seen on" ticker
 *   4. Stats counter
 *   5. Feature grid (6 cards)
 *   6. How it works (4 steps)
 *   7. Testimonials (3 cards)
 *   8. Final CTA
 *   9. Footer
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import {
  ArrowRight, Briefcase, CheckCircle2, ChevronRight, Globe2,
  LayoutDashboard, Rocket, Search, Sparkles, Star, Target,
  Wand2, Zap, Shield, TrendingUp, Clock,
} from 'lucide-react'

// ─── Utilities ────────────────────────────────────────────────────────────────

function Orb({ className }: { className?: string }) {
  return <div className={`pointer-events-none absolute rounded-full blur-[130px] ${className}`} />
}

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

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon  : <Search className="h-5 w-5" />,
    title : 'Phase 1 — Global Discovery',
    desc  : 'AI scrapes Indeed, LinkedIn, Glassdoor, ZipRecruiter and 30+ boards across 45 countries. One click, hundreds of live listings.',
    color : 'from-cyan-500/20 to-sky-500/20',
    text  : 'text-cyan-400',
    tag   : 'AI-Powered',
  },
  {
    icon  : <Wand2 className="h-5 w-5" />,
    title : 'Resume Tailoring Engine',
    desc  : 'Upload your resume once. JOBEZEE rewrites bullets, fills keyword gaps, scores fit, and generates a cover letter for each role.',
    color : 'from-violet-500/20 to-purple-500/20',
    text  : 'text-violet-400',
    tag   : 'AI',
  },
  {
    icon  : <Target className="h-5 w-5" />,
    title : 'One-Time Smart Profile',
    desc  : 'Name, city, phone, salary, visa status, desired roles — fill once. Every search, tailor, and apply action uses your profile automatically.',
    color : 'from-emerald-500/20 to-teal-500/20',
    text  : 'text-emerald-400',
    tag   : 'Smart',
  },
  {
    icon  : <LayoutDashboard className="h-5 w-5" />,
    title : 'Kanban Application Tracker',
    desc  : 'Track every application from Saved → Applied → Interview → Offer in a visual Kanban. Add notes and next-step dates.',
    color : 'from-amber-500/20 to-orange-500/20',
    text  : 'text-amber-400',
    tag   : 'Tracking',
  },
  {
    icon  : <Rocket className="h-5 w-5" />,
    title : 'One-Click Apply',
    desc  : 'Your profile auto-fills every application form. Attach your tailored resume and cover letter with a single click.',
    color : 'from-rose-500/20 to-pink-500/20',
    text  : 'text-rose-400',
    tag   : 'Automation',
  },
  {
    icon  : <Globe2 className="h-5 w-5" />,
    title : 'Worldwide Coverage',
    desc  : '45+ countries · 6 global regions · 80+ Workday employer portals. Remote, hybrid, or onsite — search the entire planet.',
    color : 'from-sky-500/20 to-indigo-500/20',
    text  : 'text-sky-400',
    tag   : 'Global',
  },
]

const STEPS = [
  {
    n    : '01',
    icon : <Target className="h-6 w-6 text-cyan-400" />,
    title: 'Set up your profile',
    desc : 'Enter your desired roles, salary range, location, visa status and upload your resume — takes under 3 minutes.',
  },
  {
    n    : '02',
    icon : <Sparkles className="h-6 w-6 text-sky-400" />,
    title: 'Trigger Phase 1 search',
    desc : 'Hit "Search Jobs" — our AI instantly scrapes 30+ boards and delivers hundreds of live, relevant listings.',
  },
  {
    n    : '03',
    icon : <Wand2 className="h-6 w-6 text-violet-400" />,
    title: 'Tailor & apply',
    desc : 'Pick a role, get an AI-tailored resume with keyword gaps fixed, then apply directly through JOBEZEE.',
  },
  {
    n    : '04',
    icon : <TrendingUp className="h-6 w-6 text-emerald-400" />,
    title: 'Track everything',
    desc : 'Manage all applications in your Kanban. Know exactly where every opportunity stands at a glance.',
  },
]

const STATS = [
  { value: 35,   suffix: '+', label: 'Job boards scraped',    sub: 'Indeed, LinkedIn, Glassdoor & more' },
  { value: 45,   suffix: '+', label: 'Countries covered',     sub: 'North America, Europe, APAC, ME' },
  { value: 80,   suffix: '+', label: 'Workday employers',     sub: 'Direct portal access' },
  { value: 100,  suffix: '%', label: 'Free forever',          sub: 'No credit card required' },
]

const TESTIMONIALS = [
  {
    name  : 'Aria Singh',
    role  : 'ML Engineer at Meta',
    avatar: 'A',
    color : 'from-cyan-500 to-sky-500',
    quote : 'Landed 3 interviews in my first week. The AI tailoring catches keyword gaps I would never have spotted myself. Absolute game-changer.',
  },
  {
    name  : 'Marco Tessier',
    role  : 'Product Manager at Spotify',
    avatar: 'M',
    color : 'from-violet-500 to-purple-500',
    quote : "Finally a job search tool that doesn't feel like a spreadsheet. Set up my profile, clicked search, had 200 curated listings in 60 seconds.",
  },
  {
    name  : 'Priya Kapoor',
    role  : 'Data Scientist at Stripe',
    avatar: 'P',
    color : 'from-emerald-500 to-teal-500',
    quote : 'The visa sponsorship filter alone saved me hours of manually checking listings. JOBEZEE is the only tool serious international job seekers need.',
  },
]

const BOARDS = ['Indeed', 'LinkedIn', 'Glassdoor', 'ZipRecruiter', 'Google Jobs', 'Workday', 'Lever', 'Greenhouse', 'Indeed', 'LinkedIn']

// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative overflow-x-hidden bg-[#020817] text-white">

      {/* ═══════════════════════════════════════════════════════════════════
          NAV BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#020817]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 text-base font-black text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              J
            </span>
            JOBEZEE
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
            {['Features', 'How it works', 'About'].map((t) => (
              <a key={t} href={`#${t.toLowerCase().replace(/ /g, '-')}`} className="transition hover:text-white">
                {t}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="hidden text-sm font-medium text-slate-400 transition hover:text-white md:block"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(6,182,212,0.6)]"
            >
              <span className="hidden sm:inline">Get Started Free</span>
              <span className="sm:hidden">Get Started</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-24 md:pt-32 text-center">
        {/* Background */}
        <Orb className="h-[800px] w-[800px] bg-cyan-600 opacity-15 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        <Orb className="h-[500px] w-[500px] bg-indigo-600 opacity-20 -left-40 top-0" />
        <Orb className="h-[400px] w-[400px] bg-sky-600 opacity-20 right-0 bottom-20" />

        {/* Grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
        {/* Radial fade */}
        <div className="pointer-events-none absolute inset-0 bg-radial-gradient" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, #020817 100%)' }} />

        {/* Pill */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-cyan-500/25 bg-cyan-500/8 px-5 py-2 text-sm font-medium text-cyan-300 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            Now live — Phase 1 AI job discovery across 45+ countries
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }}
          className="max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          The job search platform{' '}
          <span className="block bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            that works harder than you.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.22 }}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-400"
        >
          JOBEZEE scrapes 30+ global job boards with AI, tailors your resume for each role,
          auto-fills applications from your saved profile, and tracks everything
          in a beautiful Kanban dashboard. <span className="text-white font-medium">All in one place. All free.</span>
        </motion.p>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.35 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/auth')}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_50px_rgba(6,182,212,0.45)] transition-all duration-300 hover:shadow-[0_0_80px_rgba(6,182,212,0.65)] hover:-translate-y-1"
          >
            <span className="relative flex items-center gap-2.5">
              Start for Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
          <button
            onClick={() => navigate('/app')}
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-0.5"
          >
            View live demo →
          </button>
        </motion.div>

        {/* Trust pills */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.65, delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500"
        >
          {[
            { icon: <CheckCircle2 className="h-4 w-4 text-cyan-500" />, text: 'No credit card' },
            { icon: <Shield className="h-4 w-4 text-cyan-500" />,       text: 'JWT secured' },
            { icon: <Clock className="h-4 w-4 text-cyan-500" />,        text: 'Setup in 3 min' },
          ].map((item) => (
            <span key={item.text} className="flex items-center gap-1.5">
              {item.icon} {item.text}
            </span>
          ))}
        </motion.div>

        {/* ── Dashboard preview card ── */}
        <motion.div
          initial={{ opacity: 0, y: 70, scale: 0.93 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-12 md:mt-20 w-full max-w-4xl px-2 md:px-4"
        >
          {/* Glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-cyan-500/15 to-transparent blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] shadow-[0_0_120px_rgba(6,182,212,0.15)]">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/8 bg-white/[0.02] px-5 py-3.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <div className="ml-4 flex-1 rounded-md bg-white/5 px-3 py-1 text-center text-xs text-slate-500">
                app.jobezee.ai/dashboard
              </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-8">
              {/* Stat row */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { l: 'Jobs Pulled',  v: '247', c: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
                  { l: 'Saved',        v: '31',  c: 'text-sky-400',    bg: 'bg-sky-500/10' },
                  { l: 'Applied',      v: '12',  c: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { l: 'Interviews',   v: '4',   c: 'text-emerald-400',bg: 'bg-emerald-500/10' },
                ].map((s) => (
                  <div key={s.l} className={`rounded-xl border border-white/5 ${s.bg} p-4 text-left`}>
                    <p className="text-xs text-slate-500">{s.l}</p>
                    <p className={`mt-1.5 text-3xl font-bold ${s.c}`}>{s.v}</p>
                  </div>
                ))}
              </div>

              {/* Job rows */}
              <div className="mt-5 space-y-2.5">
                {[
                  { t: 'Senior ML Engineer',        c: 'Google DeepMind', loc: 'Remote · USA',          s: 'New',     sc: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/25',     sal: '$180k–$240k' },
                  { t: 'Staff Backend Engineer',    c: 'Stripe',          loc: 'New York / Remote',     s: 'Saved',   sc: 'text-sky-300 bg-sky-500/15 border-sky-500/25',         sal: '$160k–$210k' },
                  { t: 'AI Product Manager',        c: 'OpenAI',          loc: 'San Francisco',         s: 'Applied', sc: 'text-violet-300 bg-violet-500/15 border-violet-500/25', sal: '$200k–$280k' },
                  { t: 'Data Science Lead',         c: 'Spotify',         loc: 'Stockholm / Remote',    s: 'New',     sc: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/25',     sal: '€130k–€170k' },
                ].map((j, i) => (
                  <motion.div
                    key={j.t}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.08 }}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 md:px-5 md:py-3.5 transition hover:bg-white/[0.06] gap-2"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">{j.t}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{j.c} · {j.loc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-xs font-medium text-slate-500 md:block">{j.sal}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${j.sc}`}>{j.s}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BOARD TICKER
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.015] py-5">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-slate-600">
          Searches across all major platforms
        </p>
        <div className="flex animate-[scroll_20s_linear_infinite] gap-12 whitespace-nowrap">
          {[...BOARDS, ...BOARDS].map((b, i) => (
            <span key={i} className="text-sm font-semibold text-slate-600 transition hover:text-slate-400">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
              <p className="relative text-4xl font-extrabold text-cyan-400">
                <AnimatedNumber target={s.value} suffix={s.suffix} />
              </p>
              <p className="relative mt-1 text-sm font-semibold text-white">{s.label}</p>
              <p className="relative mt-0.5 text-xs text-slate-500">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative px-4 py-20">
        <Orb className="h-[600px] w-[600px] bg-indigo-600 opacity-10 -right-40 top-0" />

        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/8 px-4 py-1.5 text-sm font-medium text-cyan-300">
              <Zap className="h-3.5 w-3.5" /> Built to win
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
              Everything you need.{' '}
              <span className="block bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">
                Nothing you don't.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
              JOBEZEE replaces five separate tools — job boards, resume editors, application trackers,
              cover letter generators, and interview prep apps — in one clean platform.
            </p>
          </motion.div>

          <div className="mt-10 md:mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] p-6"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-30`} />
                </div>
                <div className="relative">
                  <div className={`inline-flex rounded-xl bg-gradient-to-br ${f.color} p-3 ${f.text}`}>
                    {f.icon}
                  </div>
                  <span className="ml-2.5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {f.tag}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative overflow-hidden border-t border-white/5 bg-white/[0.015] px-4 py-24">
        <Orb className="h-[600px] w-[600px] bg-cyan-600 opacity-8 left-1/2 -translate-x-1/2 top-0" />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/8 px-4 py-1.5 text-sm font-medium text-sky-300">
              <Briefcase className="h-3.5 w-3.5" /> How it works
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
              From zero to interviews{' '}
              <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
                in four steps.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-slate-400">
              No learning curve. No complexity. Just a clear path from setup to offer.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="relative"
              >
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-white/10 to-transparent lg:block" />
                )}
                <div className="flex h-full flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-white/5 p-2">{s.icon}</div>
                    <span className="text-5xl font-black text-white/5">{s.n}</span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Real people.{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">
              Real results.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-slate-400">
            Join thousands of job seekers who've used JOBEZEE to land their dream role.
          </p>
        </motion.div>

        <div className="mx-auto mt-8 md:mt-12 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative flex flex-col justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-7"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-5 flex-1 text-base leading-relaxed text-slate-300">
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-white/5 pt-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-sm font-bold shadow-lg`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-white/5 px-4 py-28">
        <Orb className="h-[800px] w-[800px] bg-cyan-600 opacity-12 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            {/* Icon */}
            <div className="mx-auto mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 text-4xl font-black shadow-[0_0_80px_rgba(6,182,212,0.6)]">
              J
            </div>

            <h2 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Your next role is{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">
                one click away.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
              Set up your profile in 3 minutes. Let JOBEZEE's AI handle the searching,
              tailoring, and tracking. You just show up to the interviews.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/auth')}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-10 py-4 text-lg font-bold text-white shadow-[0_0_60px_rgba(6,182,212,0.5)] transition-all duration-300 hover:shadow-[0_0_100px_rgba(6,182,212,0.7)] hover:-translate-y-1"
              >
                <span className="relative flex items-center gap-2">
                  Create Free Account
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
              <button
                onClick={() => navigate('/app')}
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Try demo first
              </button>
            </div>

            <p className="mt-6 text-sm text-slate-600">
              Free forever · No credit card · Open source on GitHub
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-sky-500 text-sm font-black text-white">
              J
            </span>
            JOBEZEE
          </div>
          <p className="text-sm text-slate-600">
            © 2026 JOBEZEE · Built with React 19, FastAPI &amp; Neon PostgreSQL
          </p>
          <div className="flex gap-6 text-sm text-slate-600">
            {['GitHub', 'Privacy', 'Terms'].map((l) => (
              <a key={l} href="#" className="transition hover:text-slate-400">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
