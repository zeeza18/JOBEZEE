import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 25 }, show: { opacity: 1, y: 0, transition: { duration: 0.7 } } }
const stagger = { show: { transition: { staggerChildren: 0.1 } } }

function GoldDivider() {
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #c9a84c)' }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ background: '#c9a84c' }} />
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #c9a84c)' }} />
    </div>
  )
}

export default function ExecutiveSuite({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const gold      = accentColor || '#c9a84c'
  const navy      = primaryColor || '#0f2044'
  const name      = profile.full_name || profile.preferred_name || 'Executive'
  const title     = profile.current_job_title || profile.target_role || 'Senior Executive'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]

  return (
    <div className="min-h-screen" style={{ background: navy, color: '#f1f5f9', fontFamily: '"Georgia", serif' }}>

      {/* TOP NAV */}
      <nav className="border-b" style={{ borderColor: `${gold}30`, background: `${navy}ee` }}>
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-px h-6" style={{ background: gold }} />
            <span className="text-sm uppercase tracking-[0.3em] font-sans" style={{ color: gold }}>{name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-sans text-xs uppercase tracking-widest" style={{ color: '#94a3b8' }}>
            {['About', 'Experience', 'Skills', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} className="hover:text-white transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO — Two column */}
      <section id="about" className="py-24">
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Main hero text */}
            <motion.div initial="hidden" animate="show" variants={stagger} className="lg:col-span-8">
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.4em] mb-8 font-sans" style={{ color: gold }}>
                Professional Portfolio
              </motion.p>
              <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black leading-tight mb-4" style={{ color: '#f8fafc' }}>
                {name.split(' ').map((word: string, i: number) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </motion.h1>
              <GoldDivider />
              <motion.p variants={fadeUp} className="text-xl font-sans" style={{ color: gold }}>{title}</motion.p>
              <motion.p variants={fadeUp} className="mt-6 text-slate-400 font-sans leading-relaxed max-w-2xl text-base">
                {profile.headline || `A results-driven executive with a proven track record of delivering transformative outcomes. ${profile.years_experience ? profile.years_experience + ' years' : ''} of leadership excellence.`}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="px-7 py-3 text-sm font-sans font-semibold transition-all hover:scale-105"
                    style={{ background: gold, color: navy }}>
                    Contact Me
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer"
                    className="px-7 py-3 text-sm font-sans border transition-all hover:scale-105"
                    style={{ borderColor: `${gold}60`, color: gold }}>
                    LinkedIn Profile
                  </a>
                )}
              </motion.div>
            </motion.div>

            {/* Sidebar stats */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
              className="lg:col-span-4">
              <div className="rounded-sm border p-8 space-y-8" style={{ borderColor: `${gold}30`, background: 'rgba(255,255,255,0.03)' }}>
                {[
                  { label: 'Years of Experience', value: profile.years_experience || '—' },
                  { label: 'Companies Led', value: (profile.resume_facts_companies || []).length || '—' },
                  { label: 'Projects Delivered', value: (profile.resume_facts_projects || []).length || '—' },
                  { label: 'Core Competencies', value: allSkills.length || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-4xl font-black" style={{ color: gold }}>{value}</p>
                    <p className="text-xs font-sans uppercase tracking-widest mt-1 text-slate-500">{label}</p>
                    <div className="h-px mt-4" style={{ background: `${gold}20` }} />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* EXPERIENCE TIMELINE */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="experience" className="py-20 border-t" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-14">
              <p className="text-xs uppercase tracking-[0.4em] mb-3 font-sans" style={{ color: gold }}>Career Timeline</p>
              <h2 className="text-4xl font-black text-white">Professional Experience</h2>
              <GoldDivider />
            </motion.div>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-px ml-4" style={{ background: `linear-gradient(to bottom, ${gold}60, transparent)` }} />
              <div className="space-y-12 ml-12">
                {(profile.resume_facts_companies || []).map((company, i) => (
                  <motion.div key={i} variants={fadeUp} className="relative">
                    <div className="absolute -left-12 mt-1.5 w-4 h-4 flex items-center justify-center">
                      <div className="w-3 h-3 rotate-45" style={{ background: gold }} />
                    </div>
                    <div className="pl-4 border-l" style={{ borderColor: `${gold}30` }}>
                      <span className="text-xs font-sans uppercase tracking-widest font-bold" style={{ color: gold }}>
                        Position {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-2xl font-black text-white mt-1 mb-3">{company}</h3>
                      <div className="space-y-2">
                        {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                          <p key={j} className="text-slate-400 font-sans text-sm flex items-start gap-3">
                            <span style={{ color: gold }} className="mt-1">◆</span>
                            {m}
                          </p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* SKILLS */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="skills" className="py-20 border-t" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-14">
              <p className="text-xs uppercase tracking-[0.4em] mb-3 font-sans" style={{ color: gold }}>Competencies</p>
              <h2 className="text-4xl font-black text-white">Skills & Expertise</h2>
              <GoldDivider />
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {([
                ['Core Languages', profile.skills_languages || []],
                ['Frameworks', profile.skills_frameworks || []],
                ['Tools & Platforms', profile.skills_tools || []],
              ] as [string, string[]][]).map(([label, items]) => items.length > 0 && (
                <motion.div key={label} variants={fadeUp}>
                  <p className="text-xs font-sans uppercase tracking-widest mb-5" style={{ color: gold }}>{label}</p>
                  <div className="space-y-3">
                    {items.map((skill, j) => (
                      <div key={skill}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-sans text-slate-300">{skill}</span>
                          <span className="text-xs font-sans" style={{ color: gold }}>{85 - j * 5}%</span>
                        </div>
                        <div className="h-px w-full" style={{ background: '#1e3a5f' }}>
                          <motion.div className="h-px"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${85 - j * 5}%` }}
                            transition={{ duration: 1, delay: j * 0.1 }}
                            viewport={{ once: true }}
                            style={{ background: `linear-gradient(to right, ${gold}, ${gold}80)` }} />
                        </div>
                      </div>
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
        <motion.section id="projects" className="py-20 border-t" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-14">
              <p className="text-xs uppercase tracking-[0.4em] mb-3 font-sans" style={{ color: gold }}>Initiatives</p>
              <h2 className="text-4xl font-black text-white">Key Projects</h2>
              <GoldDivider />
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="p-6 border" style={{ borderColor: `${gold}20`, background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-xs font-sans uppercase tracking-widest" style={{ color: gold }}>
                    Initiative {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-xl font-black text-white mt-2">{project}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EDUCATION */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <motion.section id="education" className="py-20 border-t" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-14">
              <p className="text-xs uppercase tracking-[0.4em] mb-3 font-sans" style={{ color: gold }}>Academic Background</p>
              <h2 className="text-4xl font-black text-white">Education</h2>
              <GoldDivider />
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="p-6 border" style={{ borderColor: `${gold}20`, background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5" style={{ color: gold }}>
                      ◆
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{school}</h3>
                      {profile.education && <p className="text-slate-400 font-sans text-sm mt-1">{profile.education}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CONTACT */}
      {showSections.contact && (
        <motion.section id="contact" className="py-24 border-t" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8 text-center">
            <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.4em] mb-4 font-sans" style={{ color: gold }}>
              Open to Opportunities
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-5xl font-black text-white mb-6">Get In Touch</motion.h2>
            <GoldDivider />
            <motion.p variants={fadeUp} className="text-slate-400 font-sans mb-10 max-w-lg mx-auto">
              Available for board advisory, executive roles, and strategic consulting engagements.
            </motion.p>
            {profile.email && (
              <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                className="inline-block px-10 py-4 text-sm font-sans font-bold transition-all hover:scale-105"
                style={{ background: gold, color: navy }}>
                Schedule a Meeting
              </motion.a>
            )}
          </div>
        </motion.section>
      )}

      <footer className="py-8 px-8 border-t flex items-center justify-between text-xs font-sans uppercase tracking-widest text-slate-700" style={{ borderColor: `${gold}20` }}>
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span style={{ color: gold }}>JOBEZEE</span></span>
      </footer>
    </div>
  )
}
