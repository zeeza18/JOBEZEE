import { motion } from 'framer-motion'
import { GraduationCap, Mail } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp   = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7 } } }
const fadeIn   = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8 } } }
const stagger  = { show: { transition: { staggerChildren: 0.12 } } }

function GlassCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function NeonGrid({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const name      = profile.full_name || profile.preferred_name || 'Developer'
  const title     = profile.current_job_title || profile.target_role || 'Software Engineer'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen" style={{
      background: '#08091a',
      color: '#e2e8f0',
      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
    }}>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(8,9,26,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: '#fff' }}>
              {initials}
            </div>
            <span className="text-sm font-semibold text-white">{name.split(' ')[0]}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            {['about', 'skills', 'experience', 'projects', 'contact'].map(s => (
              <a key={s} href={`#${s}`}
                className="capitalize text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                {s}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="about" className="pt-36 pb-28 px-6 max-w-6xl mx-auto">
        <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-col md:flex-row gap-12 items-center">
          {/* Left */}
          <motion.div variants={fadeUp} className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{ background: `${primaryColor}18`, border: `1px solid ${primaryColor}40`, color: primaryColor }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: primaryColor }} />
              Available for opportunities
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-none mb-4">
              {name.split(' ')[0]}<br />
              <span style={{ WebkitTextStroke: `2px ${primaryColor}`, color: 'transparent' }}>
                {name.split(' ').slice(1).join(' ')}
              </span>
            </h1>
            <p className="text-xl font-medium mb-6" style={{ color: primaryColor }}>{title}</p>
            <p className="text-slate-400 max-w-lg leading-relaxed mb-8">
              {profile.headline || `Crafting high-performance digital experiences. ${profile.years_experience ? profile.years_experience + ' years' : ''} of engineering excellence.`}
            </p>
            <div className="flex flex-wrap gap-3">
              {profile.github && (
                <a href={profile.github} target="_blank" rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${accentColor}22)`, border: `1px solid ${primaryColor}40`, color: primaryColor }}>
                  GitHub
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                  LinkedIn
                </a>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  Email Me
                </a>
              )}
            </div>
          </motion.div>

          {/* Right: Stats */}
          <motion.div variants={fadeIn} className="grid grid-cols-2 gap-4 w-full md:w-72 shrink-0">
            {[
              { label: 'Years Exp.', value: profile.years_experience || '—' },
              { label: 'Companies', value: (profile.resume_facts_companies || []).length || '—' },
              { label: 'Projects', value: (profile.resume_facts_projects || []).length || '—' },
              { label: 'Skills', value: allSkills.length || '—' },
            ].map(({ label, value }) => (
              <GlassCard key={label} className="p-5 text-center">
                <p className="text-3xl font-black" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </GlassCard>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* SKILLS */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="skills" className="py-20 px-6"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-4xl font-black text-white mb-2">Skills & Technologies</h2>
              <p className="text-slate-500">The tools I wield daily</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {([
                ['Languages', profile.skills_languages || [], primaryColor],
                ['Frameworks', profile.skills_frameworks || [], accentColor],
                ['Tools', profile.skills_tools || [], '#94a3b8'],
              ] as [string, string[], string][]).map(([label, items, color]) => items.length > 0 && (
                <motion.div key={label} variants={fadeUp}>
                  <GlassCard className="p-6 h-full">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-2 h-6 rounded-full" style={{ background: color }} />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-white">{label}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {items.map(skill => (
                        <span key={skill}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 cursor-default"
                          style={{ background: `${color}12`, color: color, border: `1px solid ${color}25`, boxShadow: `0 0 8px ${color}15` }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EXPERIENCE */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="experience" className="py-20 px-6"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-4xl font-black text-white mb-2">Experience</h2>
              <p className="text-slate-500">Where I&apos;ve made an impact</p>
            </motion.div>
            <div className="space-y-6">
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ scale: 1.01 }}>
                  <GlassCard className="p-6" style={{ boxShadow: `0 0 30px ${primaryColor}08` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}25, ${accentColor}25)`, border: `1px solid ${primaryColor}30`, color: primaryColor }}>
                        {company.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{company}</h3>
                        <div className="space-y-2 mt-3">
                          {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                            <p key={j} className="text-slate-400 text-sm flex items-start gap-2">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: primaryColor }} />
                              {m}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs font-bold px-3 py-1 rounded-full shrink-0"
                        style={{ background: `${primaryColor}15`, color: primaryColor, border: `1px solid ${primaryColor}30` }}>
                        #{String(i + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* PROJECTS */}
      {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
        <motion.section id="projects" className="py-20 px-6"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-4xl font-black text-white mb-2">Projects</h2>
              <p className="text-slate-500">Things I&apos;ve built</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -6 }}
                  className="group cursor-pointer">
                  <GlassCard className="p-6 h-full transition-all duration-300 group-hover:border-white/20"
                    style={{ boxShadow: `0 0 0px ${primaryColor}00`, transition: 'all 0.3s' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black font-mono" style={{ color: primaryColor }}>
                        P.{String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors">↗</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3 leading-snug">{project}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-4">
                      {allSkills.slice(0, 3).map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-md font-mono"
                          style={{ background: `${accentColor}12`, color: accentColor }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EDUCATION */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <motion.section id="education" className="py-20 px-6"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-4xl font-black text-white mb-2">Education</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}25, ${accentColor}25)` }}>
                        <GraduationCap className="h-5 w-5" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{school}</h3>
                        {profile.education && <p className="text-sm text-slate-400">{profile.education}</p>}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CONTACT */}
      {showSections.contact && (
        <motion.section id="contact" className="py-28 px-6"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-3xl mx-auto text-center">
            <GlassCard className="p-12" style={{ boxShadow: `0 0 80px ${primaryColor}15` }}>
              <motion.div variants={fadeUp} className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                <Mail className="h-7 w-7 text-white" />
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-4xl font-black text-white mb-4">Let&apos;s Build Something</motion.h2>
              <motion.p variants={fadeUp} className="text-slate-400 mb-10 text-lg">
                Open to exciting projects and opportunities. Let&apos;s create something extraordinary together.
              </motion.p>
              {profile.email && (
                <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                  className="inline-block px-10 py-4 rounded-xl text-white font-bold text-sm transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, boxShadow: `0 0 30px ${primaryColor}40` }}>
                  Send a Message →
                </motion.a>
              )}
              <motion.div variants={fadeUp} className="flex justify-center gap-6 mt-8 text-slate-500 text-sm">
                {profile.github && <a href={profile.github} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>}
                {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>}
              </motion.div>
            </GlassCard>
          </div>
        </motion.section>
      )}

      <footer className="py-8 text-center text-slate-700 text-sm border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        Built with <span style={{ color: primaryColor }}>JOBEZEE</span>
      </footer>
    </div>
  )
}
