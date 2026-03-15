import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const stagger = { show: { transition: { staggerChildren: 0.1 } } }

export default function ModernDev({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const name      = profile.full_name || profile.preferred_name || 'Developer'
  const title     = profile.current_job_title || profile.target_role || 'Software Engineer'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]

  return (
    <div className="min-h-screen font-mono" style={{ background: '#0a0a0f', color: '#e2e8f0' }}>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ borderColor: '#1e293b', background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: primaryColor }}>
            <span style={{ color: '#64748b' }}>~/</span>{name.split(' ')[0].toLowerCase()}
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            {['about', 'skills', 'experience', 'projects', 'contact'].map(s => (
              <a key={s} href={`#${s}`} className="hover:text-white transition-colors">
                <span style={{ color: primaryColor }}>./</span>{s}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="about" className="pt-32 pb-24 px-6 max-w-6xl mx-auto">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.p variants={fadeUp} className="text-sm mb-4" style={{ color: primaryColor }}>
            // hello, world
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black mb-4 leading-none">
            <span className="text-white">{name}</span>
          </motion.h1>
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <span className="w-8 h-px" style={{ background: primaryColor }} />
            <p className="text-xl" style={{ color: primaryColor }}>{title}</p>
          </motion.div>
          <motion.p variants={fadeUp} className="max-w-2xl text-slate-400 leading-relaxed text-lg">
            {profile.headline || `Building robust systems and shipping production-grade software.${profile.years_experience ? ` ${profile.years_experience} years` : ''} of hands-on engineering.`}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg">
            {profile.years_experience && (
              <div className="rounded-lg p-3 border" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <p className="text-2xl font-black" style={{ color: primaryColor }}>{profile.years_experience}</p>
                <p className="text-xs text-slate-500 mt-0.5">Years Exp.</p>
              </div>
            )}
            {(profile.resume_facts_companies || []).length > 0 && (
              <div className="rounded-lg p-3 border" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <p className="text-2xl font-black" style={{ color: primaryColor }}>{(profile.resume_facts_companies || []).length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Companies</p>
              </div>
            )}
            {allSkills.length > 0 && (
              <div className="rounded-lg p-3 border" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <p className="text-2xl font-black" style={{ color: primaryColor }}>{allSkills.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Skills</p>
              </div>
            )}
            {(profile.resume_facts_projects || []).length > 0 && (
              <div className="rounded-lg p-3 border" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <p className="text-2xl font-black" style={{ color: primaryColor }}>{(profile.resume_facts_projects || []).length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Projects</p>
              </div>
            )}
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer"
                className="px-5 py-2.5 rounded border text-sm font-medium transition-all hover:scale-105"
                style={{ borderColor: primaryColor, color: primaryColor }}>
                GitHub
              </a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer"
                className="px-5 py-2.5 rounded text-sm font-medium transition-all hover:scale-105"
                style={{ background: primaryColor, color: '#000' }}>
                LinkedIn
              </a>
            )}
            {profile.portfolio && (
              <a href={profile.portfolio} target="_blank" rel="noreferrer"
                className="px-5 py-2.5 rounded border text-sm font-medium transition-all hover:scale-105"
                style={{ borderColor: '#334155', color: '#94a3b8' }}>
                Website
              </a>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* SKILLS */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="skills" className="py-20 px-6 border-t" style={{ borderColor: '#1e293b' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-sm mb-2" style={{ color: primaryColor }}>const skills = [</p>
              <h2 className="text-3xl font-black text-white">Technical Skills</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {([
                ['Languages', profile.skills_languages || []],
                ['Frameworks', profile.skills_frameworks || []],
                ['Tools', profile.skills_tools || []],
              ] as [string, string[]][]).map(([label, items]) => items.length > 0 && (
                <motion.div key={label} variants={fadeUp}
                  className="rounded-xl p-6 border" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                    // {label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(skill => (
                      <span key={skill} className="px-3 py-1 rounded text-sm"
                        style={{ background: `${primaryColor}15`, color: primaryColor, border: `1px solid ${primaryColor}30` }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.p variants={fadeUp} className="mt-4 text-sm" style={{ color: primaryColor }}>]</motion.p>
          </div>
        </motion.section>
      )}

      {/* EXPERIENCE */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="experience" className="py-20 px-6 border-t" style={{ borderColor: '#1e293b' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-sm mb-2" style={{ color: primaryColor }}>{'function experience() {'}</p>
              <h2 className="text-3xl font-black text-white">Work Experience</h2>
            </motion.div>
            <div className="relative pl-8 border-l" style={{ borderColor: primaryColor + '40' }}>
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp} className="mb-10 relative">
                  <div className="absolute -left-[41px] w-4 h-4 rounded-full border-2"
                    style={{ background: '#0a0a0f', borderColor: primaryColor }} />
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: primaryColor }}>
                    Company 0{i + 1}
                  </p>
                  <h3 className="text-xl font-bold text-white mb-2">{company}</h3>
                  {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                    <p key={j} className="text-slate-400 text-sm flex items-start gap-2 mb-1">
                      <span style={{ color: primaryColor }}>▸</span> {m}
                    </p>
                  ))}
                </motion.div>
              ))}
            </div>
            <motion.p variants={fadeUp} className="text-sm mt-4" style={{ color: primaryColor }}>{'}'}</motion.p>
          </div>
        </motion.section>
      )}

      {/* PROJECTS */}
      {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
        <motion.section id="projects" className="py-20 px-6 border-t" style={{ borderColor: '#1e293b' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-sm mb-2" style={{ color: primaryColor }}>// featured projects</p>
              <h2 className="text-3xl font-black text-white">Projects</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -4, scale: 1.01 }}
                  className="rounded-xl p-6 border cursor-pointer transition-all"
                  style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                  <div className="w-8 h-8 rounded-lg mb-4 flex items-center justify-center text-sm font-black"
                    style={{ background: primaryColor + '20', color: primaryColor }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{project}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {allSkills.slice(0, 3).map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded"
                        style={{ background: accentColor + '15', color: accentColor }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EDUCATION */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <motion.section id="education" className="py-20 px-6 border-t" style={{ borderColor: '#1e293b' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-3xl font-black text-white mb-12">Education</motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="rounded-xl p-6 border" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                  <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>Education</p>
                  <h3 className="text-xl font-bold text-white">{school}</h3>
                  {profile.education && <p className="text-slate-400 mt-1">{profile.education}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CONTACT */}
      {showSections.contact && (
        <motion.section id="contact" className="py-24 px-6 border-t text-center" style={{ borderColor: '#1e293b' }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-2xl mx-auto">
            <motion.p variants={fadeUp} className="text-sm mb-4" style={{ color: primaryColor }}>// let&apos;s connect</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-white mb-6">Get In Touch</motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 mb-10">
              Open to new opportunities and collaborations. Shoot me a message.
            </motion.p>
            {profile.email && (
              <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                className="inline-block px-8 py-4 rounded-lg text-sm font-bold transition-all hover:scale-105"
                style={{ background: primaryColor, color: '#000' }}>
                Say Hello →
              </motion.a>
            )}
            <motion.div variants={fadeUp} className="flex justify-center gap-6 mt-10 text-slate-500 text-sm">
              {profile.github && <a href={profile.github} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>}
              {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>}
              {profile.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Portfolio</a>}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t text-center text-slate-600 text-sm" style={{ borderColor: '#1e293b' }}>
        <span>Built with </span><span style={{ color: primaryColor }}>JOBEZEE</span>
      </footer>
    </div>
  )
}
