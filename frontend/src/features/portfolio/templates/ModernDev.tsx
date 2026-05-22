import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { PortfolioTemplateProps } from '../types'

// ── Motion helpers ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp:   any = { hidden: { opacity: 0, y: 40 },  show: { opacity: 1, y: 0,  transition: { duration: 0.7, ease: 'easeOut' } } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeLeft: any = { hidden: { opacity: 0, x: -40 }, show: { opacity: 1, x: 0,  transition: { duration: 0.7, ease: 'easeOut' } } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeIn:   any = { hidden: { opacity: 0 },          show: { opacity: 1,        transition: { duration: 0.8 } } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stagger:  any = { show: { transition: { staggerChildren: 0.1 } } }

// ── Animated skill bar ────────────────────────────────────────────────────────
function SkillBar({ skill, pct, color }: { skill: string; pct: number; color: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-sm font-semibold text-slate-300">{skill}</span>
        <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
          style={{ background: `linear-gradient(90deg, ${color}, ${color}99)`, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  )
}

// ── Project card gradients ────────────────────────────────────────────────────
const PROJECT_GRADIENTS = [
  'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ModernDev({
  profile, primaryColor, accentColor, showSections,
  heroGradient, profilePhoto, textOverrides,
}: PortfolioTemplateProps) {
  const name      = textOverrides?.name  || profile.full_name || profile.preferred_name || 'Your Name'
  const title     = textOverrides?.title || profile.current_job_title || profile.target_role || 'Software Engineer'
  const bio       = textOverrides?.bio   || profile.headline || `Building high-performance systems and shipping products that scale. ${profile.years_experience ? profile.years_experience + '+ years' : 'Years'} of hands-on engineering excellence.`
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const firstName = name.split(' ')[0]
  const lastName  = name.split(' ').slice(1).join(' ')
  const initials  = name.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase()

  const heroBg = heroGradient || `radial-gradient(ellipse at 20% 50%, ${primaryColor}25 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${accentColor}20 0%, transparent 55%), #0a0a0f`

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#e2e8f0', fontFamily: '"Inter", "system-ui", sans-serif' }}>

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono" style={{ color: primaryColor }}>~/</span>
            <span className="text-sm font-bold text-white">{firstName.toLowerCase()}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            {(['about','skills','experience','projects','contact'] as const).map(s => (
              <a key={s} href={`#${s}`} className="hover:text-white transition-colors capitalize tracking-wide">{s}</a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`}
              className="hidden md:block px-4 py-2 rounded-lg text-xs font-bold text-black transition-all hover:scale-105"
              style={{ background: primaryColor }}>
              Hire Me
            </a>
          )}
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section id="about" className="relative min-h-screen flex items-center overflow-hidden" style={{ background: heroBg }}>
        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
          <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }} />
          {/* Grid dots */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-8 py-28 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

            {/* Text */}
            <motion.div initial="hidden" animate="show" variants={stagger} className="lg:col-span-7">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
                style={{ background: `${primaryColor}15`, border: `1px solid ${primaryColor}30`, color: primaryColor }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: primaryColor }} />
                Available for opportunities
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-6xl md:text-7xl lg:text-8xl font-black leading-none mb-6 tracking-tight">
                <span className="text-white block">{firstName}</span>
                <span className="block" style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>{lastName || firstName}</span>
              </motion.h1>

              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <div className="h-px w-12 rounded-full" style={{ background: primaryColor }} />
                <p className="text-xl font-medium" style={{ color: primaryColor }}>{title}</p>
              </motion.div>

              <motion.p variants={fadeUp} className="text-slate-400 leading-relaxed text-lg mb-10 max-w-2xl">
                {bio}
              </motion.p>

              {/* Stats row */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 mb-10">
                {[
                  { v: profile.years_experience || '5+', l: 'Years Exp.' },
                  { v: (profile.resume_facts_companies || []).length || 3, l: 'Companies' },
                  { v: allSkills.length || 12, l: 'Skills' },
                  { v: (profile.resume_facts_projects || []).length || 6, l: 'Projects' },
                ].map(s => (
                  <div key={s.l} className="text-center px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-3xl font-black" style={{ color: primaryColor }}>{s.v}</p>
                    <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">{s.l}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                {profile.github && (
                  <a href={profile.github} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}>
                    GitHub ↗
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: '#000' }}>
                    LinkedIn ↗
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{ border: `1px solid ${primaryColor}50`, color: primaryColor }}>
                    Email Me
                  </a>
                )}
              </motion.div>
            </motion.div>

            {/* Profile visual */}
            <motion.div initial="hidden" animate="show" variants={fadeIn} className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute -inset-4 rounded-full opacity-20"
                  style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
                {/* Ring */}
                <div className="absolute -inset-2 rounded-full border-2"
                  style={{ borderColor: `${primaryColor}30` }} />
                {/* Rotating dashed ring */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-6 rounded-full border border-dashed opacity-30"
                  style={{ borderColor: primaryColor }} />

                {/* Avatar */}
                <div className="w-56 h-56 md:w-72 md:h-72 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}40, ${accentColor}40)`, border: `3px solid ${primaryColor}60` }}>
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-7xl font-black" style={{ color: primaryColor }}>{initials}</span>
                  )}
                </div>

                {/* Floating badges */}
                <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -right-8 top-8 px-3 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, boxShadow: `0 8px 24px ${primaryColor}50`, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.8 }} />
                  Open to work
                </motion.div>
                <motion.div animate={{ y: [4, -4, 4] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -left-6 bottom-12 px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  {allSkills[0] || 'Full Stack'}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 text-xs">
          <span>Scroll</span>
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #475569, transparent)' }} />
        </motion.div>
      </section>

      {/* ── SKILLS ─────────────────────────────────────────────────────────── */}
      {showSections.skills && allSkills.length > 0 && (
        <section id="skills" className="py-28 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0d0d14' }}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeLeft} className="mb-16">
                <p className="text-xs font-mono mb-3" style={{ color: primaryColor }}>// technical_skills</p>
                <h2 className="text-4xl md:text-5xl font-black text-white">Skills & Expertise</h2>
                <p className="text-slate-500 mt-3 text-lg">Technologies I work with every day</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {([
                  { label: 'Languages', items: profile.skills_languages || [], color: primaryColor },
                  { label: 'Frameworks', items: profile.skills_frameworks || [], color: accentColor },
                  { label: 'Tools & Platforms', items: profile.skills_tools || [], color: '#94a3b8' },
                ] as { label: string; items: string[]; color: string }[]).map(({ label, items, color }) => items.length > 0 && (
                  <motion.div key={label} variants={fadeUp}
                    className="rounded-2xl p-7 border"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)', boxShadow: `0 0 40px ${color}08` }}>
                    <div className="flex items-center gap-3 mb-7">
                      <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-white">{label}</h3>
                    </div>
                    {items.map((skill, j) => (
                      <SkillBar key={skill} skill={skill} pct={Math.max(72, 98 - j * 6)} color={color} />
                    ))}
                  </motion.div>
                ))}
              </div>

              {/* All-skills cloud */}
              <motion.div variants={fadeUp} className="mt-12 flex flex-wrap gap-2.5 justify-center">
                {allSkills.map((skill, i) => (
                  <motion.span key={skill}
                    initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    className="px-4 py-2 rounded-full text-sm font-medium cursor-default transition-shadow"
                    style={{
                      background: `${primaryColor}12`,
                      border: `1px solid ${primaryColor}25`,
                      color: primaryColor,
                    }}>
                    {skill}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── EXPERIENCE ─────────────────────────────────────────────────────── */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <section id="experience" className="py-28 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeLeft} className="mb-16">
                <p className="text-xs font-mono mb-3" style={{ color: primaryColor }}>// work_experience</p>
                <h2 className="text-4xl md:text-5xl font-black text-white">Where I've Worked</h2>
              </motion.div>

              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-px hidden md:block"
                  style={{ background: `linear-gradient(to bottom, ${primaryColor}80, transparent)` }} />

                <div className="space-y-8">
                  {(profile.resume_facts_companies || []).map((company, i) => (
                    <motion.div key={i} variants={fadeUp} whileHover={{ x: 4 }}
                      className="md:pl-24 relative group">
                      {/* Timeline dot */}
                      <div className="absolute left-5 top-7 w-6 h-6 rounded-full border-2 hidden md:flex items-center justify-center transition-all group-hover:scale-125"
                        style={{ background: '#0a0a0f', borderColor: primaryColor, boxShadow: `0 0 12px ${primaryColor}60` }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: primaryColor }} />
                      </div>

                      <div className="rounded-2xl p-7 border transition-all duration-300 group-hover:border-white/15"
                        style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                              style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)`, color: primaryColor, border: `1px solid ${primaryColor}30` }}>
                              {company[0]}
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white">{company}</h3>
                              <p className="text-sm mt-0.5" style={{ color: primaryColor }}>Senior Engineer · {2018 + i}–{i === 0 ? 'Present' : 2021 + i}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold shrink-0"
                            style={{ background: `${primaryColor}15`, color: primaryColor }}>
                            {i === 0 ? '● Current' : 'Past'}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                            <div key={j} className="flex items-start gap-3 text-slate-400 text-sm">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
                              {m}
                            </div>
                          ))}
                        </div>
                        {/* Skills used */}
                        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                          {allSkills.slice(i * 3, i * 3 + 4).map(s => (
                            <span key={s} className="text-xs px-2.5 py-1 rounded-lg font-mono"
                              style={{ background: `${accentColor}10`, color: accentColor }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── PROJECTS ───────────────────────────────────────────────────────── */}
      {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
        <section id="projects" className="py-28 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0d0d14' }}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeLeft} className="mb-16">
                <p className="text-xs font-mono mb-3" style={{ color: primaryColor }}>// featured_projects</p>
                <h2 className="text-4xl md:text-5xl font-black text-white">Things I've Built</h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(profile.resume_facts_projects || []).map((project, i) => (
                  <motion.div key={i} variants={fadeUp} whileHover={{ y: -8, scale: 1.01 }}
                    className="group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                    {/* Project image header */}
                    <div className="h-44 relative overflow-hidden" style={{ background: PROJECT_GRADIENTS[i % PROJECT_GRADIENTS.length] }}>
                      {/* Geometric decoration */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white/10 text-9xl font-black select-none">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <span className="text-white/80 text-xs font-mono font-bold uppercase tracking-widest">
                          Project_{String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4 text-white/70 text-lg group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</div>
                    </div>

                    {/* Project info */}
                    <div className="p-6" style={{ background: 'rgba(255,255,255,0.025)' }}>
                      <h3 className="text-lg font-black text-white mb-2 leading-snug">{project}</h3>
                      <p className="text-slate-500 text-sm mb-4">
                        {profile.resume_facts_metrics?.[i] || 'High-impact system with measurable results.'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allSkills.slice(i % 3, (i % 3) + 3).map(s => (
                          <span key={s} className="text-xs px-2.5 py-1 rounded-lg font-mono font-medium"
                            style={{ background: `${primaryColor}12`, color: primaryColor, border: `1px solid ${primaryColor}20` }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── EDUCATION / CERTIFICATIONS ──────────────────────────────────────── */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <section id="education" className="py-28 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeLeft} className="mb-16">
                <p className="text-xs font-mono mb-3" style={{ color: primaryColor }}>// education</p>
                <h2 className="text-4xl md:text-5xl font-black text-white">Education & Certs</h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {(profile.resume_facts_schools || []).map((school, i) => (
                  <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                    className="rounded-2xl p-7 border flex items-start gap-5 transition-all group"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)` }}>
                      <div style={{ width: 20, height: 20, borderRadius: 2, background: primaryColor, opacity: 0.7 }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: `${primaryColor}20`, color: primaryColor }}>Verified</span>
                      </div>
                      <h3 className="text-xl font-black text-white">{school}</h3>
                      {profile.education && <p className="text-slate-400 text-sm mt-1">{profile.education}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Certification badges */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                {['AWS Certified', 'Google Cloud', 'Kubernetes', 'React Expert', 'TypeScript Pro'].map((cert) => (
                  <div key={cert} className="flex items-center gap-3 px-5 py-3 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />
                    <span className="text-sm font-semibold text-slate-300">{cert}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── CONTACT ────────────────────────────────────────────────────────── */}
      {showSections.contact && (
        <section id="contact" className="py-32 border-t relative overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0d0d14' }}>
          {/* BG glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
              style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
          </div>

          <div className="relative max-w-4xl mx-auto px-8 text-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-sm font-mono mb-4" style={{ color: primaryColor }}>// get_in_touch</motion.p>
              <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-black text-white mb-6 leading-none">
                Let's Build<br />
                <span style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Something Great
                </span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-slate-400 text-xl mb-12 max-w-xl mx-auto">
                Open to senior roles, consulting, and exciting collaborations. Let's make it happen.
              </motion.p>

              {profile.email && (
                <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                  className="inline-block px-12 py-5 rounded-2xl text-base font-black text-black transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, boxShadow: `0 0 40px ${primaryColor}50` }}>
                  Send a Message →
                </motion.a>
              )}

              <motion.div variants={fadeUp} className="flex justify-center gap-8 mt-12 text-sm">
                {profile.github && (
                  <a href={profile.github} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    GitHub ↗
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    LinkedIn ↗
                  </a>
                )}
                {(profile.city || profile.country) && (
                  <span className="text-slate-600">{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-700"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span>&copy; {new Date().getFullYear()} {name}. All rights reserved.</span>
        <span>Built with <span className="font-bold" style={{ color: primaryColor }}>JobEzee</span> · Portfolio Builder</span>
      </footer>
    </div>
  )
}
