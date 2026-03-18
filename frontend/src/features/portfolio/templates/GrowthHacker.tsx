import { motion } from 'framer-motion'
import { Zap, Building2, Layers, Rocket } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } }
const stagger = { show: { transition: { staggerChildren: 0.08 } } }

export default function GrowthHacker({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const dark   = primaryColor || '#1c1917'
  const orange = accentColor  || '#f97316'
  const name   = profile.full_name || profile.preferred_name || 'Growth Lead'
  const title  = profile.current_job_title || profile.target_role || 'Growth Marketer'
  const allSkills = ['Growth Hacking', 'A/B Testing', 'Funnel Optimization', 'Paid Acquisition', 'SEO / SEM', 'Product Analytics', 'Email Drip Campaigns', 'Viral Loops', 'Mixpanel / Amplitude', 'Google Analytics 4', 'Meta Ads', 'Retention Engineering']
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen font-sans" style={{ background: dark, color: '#f5f5f4' }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: 'rgba(28,25,23,0.95)', backdropFilter: 'blur(12px)', borderColor: '#292524' }}>
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
              style={{ background: orange, color: dark }}>
              {initials}
            </div>
            <span className="font-black text-white text-sm">{name.split(' ')[0].toUpperCase()}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-stone-500">
            {['Overview', 'Experience', 'Stack', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} className="hover:text-white transition-colors font-medium">{s}</a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`}
              className="px-4 py-2 rounded-lg text-xs font-black transition-all hover:scale-105"
              style={{ background: orange, color: dark }}>
              CONTACT
            </a>
          )}
        </div>
      </nav>

      {/* DASHBOARD STATS ROW */}
      <section id="overview" className="border-b" style={{ borderColor: '#292524' }}>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Years Experience', value: profile.years_experience || '5+', Icon: Zap },
              { label: 'Companies', value: (profile.resume_facts_companies || []).length || 3, Icon: Building2 },
              { label: 'Tools in Stack', value: allSkills.length || 20, Icon: Layers },
              { label: 'Projects Shipped', value: (profile.resume_facts_projects || []).length || 10, Icon: Rocket },
            ].map(({ label, value, Icon }) => (
              <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-xl p-5 border" style={{ background: '#292524', borderColor: '#44403c' }}>
                <div className="flex items-center justify-between mb-3">
                  <Icon className="h-5 w-5" style={{ color: orange }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: orange }}>LIVE</span>
                </div>
                <p className="text-3xl font-black text-white mb-1">{value}</p>
                <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HERO */}
      <section className="py-20 border-b" style={{ borderColor: '#292524' }}>
        <div className="max-w-7xl mx-auto px-8">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: orange }}>
              // {title}
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black text-white leading-none mb-6 tracking-tight">
              {name}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-stone-400 max-w-2xl leading-relaxed text-lg mb-8">
              {profile.headline || `Obsessed with growth metrics and user acquisition. ${profile.years_experience ? profile.years_experience + ' years' : ''} of shipping experiments that move needles.`}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="px-7 py-3 rounded-lg text-sm font-black transition-all hover:scale-105"
                  style={{ background: orange, color: dark }}>
                  REACH OUT →
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer"
                  className="px-7 py-3 rounded-lg text-sm font-semibold border transition-all hover:bg-white/5"
                  style={{ borderColor: '#44403c', color: '#a8a29e' }}>
                  LinkedIn
                </a>
              )}
              {profile.github && (
                <a href={profile.github} target="_blank" rel="noreferrer"
                  className="px-7 py-3 rounded-lg text-sm font-semibold border transition-all hover:bg-white/5"
                  style={{ borderColor: '#44403c', color: '#a8a29e' }}>
                  GitHub
                </a>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* EXPERIENCE — Kanban-style */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="experience" className="py-20 border-b" style={{ borderColor: '#292524' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: orange }}>Work History</p>
              <h2 className="text-3xl font-black text-white">Experience</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ scale: 1.02 }}
                  className="rounded-xl p-6 border cursor-pointer transition-all"
                  style={{ background: '#292524', borderColor: '#44403c' }}>
                  {/* Kanban header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black px-2 py-1 rounded-md"
                      style={{ background: `${orange}15`, color: orange }}>
                      #{String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-stone-600 uppercase tracking-wider">
                      {i === 0 ? 'Current' : `Role ${i + 1}`}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-3">{company}</h3>
                  <div className="h-px mb-3" style={{ background: '#44403c' }} />
                  <div className="space-y-2">
                    {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                      <p key={j} className="text-stone-400 text-xs flex items-start gap-2">
                        <span style={{ color: orange }} className="mt-0.5 shrink-0">▸</span> {m}
                      </p>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* TECH STACK */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="stack" className="py-20 border-b" style={{ borderColor: '#292524' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: orange }}>Tools & Platforms</p>
              <h2 className="text-3xl font-black text-white">Growth Stack</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {([
                ['Analytics & Data', profile.skills_languages || [], '#e2e8f0'],
                ['Platforms', profile.skills_frameworks || [], orange],
                ['Tools', profile.skills_tools || [], '#94a3b8'],
              ] as [string, string[], string][]).map(([label, items, color]) => items.length > 0 && (
                <motion.div key={label} variants={fadeUp}
                  className="rounded-xl p-5 border" style={{ background: '#292524', borderColor: '#44403c' }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-4 rounded-full" style={{ background: color }} />
                    <p className="text-xs font-black uppercase tracking-wider text-white">{label}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map(skill => (
                      <span key={skill} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: `${color}10`, color: color, border: `1px solid ${color}20` }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* PROJECTS */}
      {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
        <motion.section id="projects" className="py-20 border-b" style={{ borderColor: '#292524' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: orange }}>Shipped</p>
              <h2 className="text-3xl font-black text-white">Projects</h2>
            </motion.div>
            <div className="space-y-3">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ x: 4 }}
                  className="flex items-center gap-5 p-5 rounded-xl border transition-all cursor-pointer"
                  style={{ background: '#292524', borderColor: '#44403c' }}>
                  <span className="text-xl font-black shrink-0" style={{ color: `${orange}50` }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="h-full w-px" style={{ background: '#44403c' }} />
                  <h3 className="font-bold text-white flex-1">{project}</h3>
                  <span style={{ color: orange }} className="text-sm shrink-0">→</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EDUCATION */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <motion.section id="education" className="py-20 border-b" style={{ borderColor: '#292524' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-8">
              <h2 className="text-3xl font-black text-white">Education</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="p-5 rounded-xl border" style={{ background: '#292524', borderColor: '#44403c' }}>
                  <h3 className="font-black text-white">{school}</h3>
                  {profile.education && <p className="text-stone-500 text-sm mt-1">{profile.education}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CONTACT */}
      {showSections.contact && (
        <motion.section id="contact" className="py-24"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <div className="rounded-2xl p-12 border text-center" style={{ borderColor: `${orange}30`, background: '#292524' }}>
              <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: orange }}>
                Open to Opportunities
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-black text-white mb-4">
                Let&apos;s Drive Growth Together
              </motion.h2>
              <motion.p variants={fadeUp} className="text-stone-400 mb-10 max-w-lg mx-auto">
                Looking for roles where data, creativity, and hustle can create measurable impact.
              </motion.p>
              {profile.email && (
                <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                  className="inline-block px-10 py-4 rounded-lg text-sm font-black transition-all hover:scale-105"
                  style={{ background: orange, color: dark }}>
                  HIT ME UP →
                </motion.a>
              )}
              <motion.div variants={fadeUp} className="flex justify-center gap-8 mt-8 text-stone-600 text-sm">
                {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>}
                {profile.github && <a href={profile.github} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>}
              </motion.div>
            </div>
          </div>
        </motion.section>
      )}

      <footer className="border-t py-6 px-8 flex justify-between text-xs text-stone-700" style={{ borderColor: '#292524' }}>
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span style={{ color: orange }}>JOBEZEE</span></span>
      </footer>
    </div>
  )
}
