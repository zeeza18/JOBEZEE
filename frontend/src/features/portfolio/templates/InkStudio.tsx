import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const stagger = { show: { transition: { staggerChildren: 0.08 } } }

export default function InkStudio({ profile, primaryColor: _primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const name      = profile.full_name || profile.preferred_name || 'Studio'
  const title     = profile.current_job_title || profile.target_role || 'Creative Director'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]

  return (
    <div className="min-h-screen font-serif" style={{ background: '#fafaf9', color: '#1a1a1a' }}>
      {/* TOP STRIP */}
      <div className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between text-xs uppercase tracking-widest font-sans">
          <span>Portfolio</span>
          <div className="flex gap-8">
            {['Work', 'Skills', 'About', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} className="hover:opacity-60 transition-opacity font-medium">{s}</a>
            ))}
          </div>
          <span>{new Date().getFullYear()}</span>
        </div>
      </div>

      {/* HERO */}
      <section id="about" className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
            {/* Left column */}
            <motion.div initial="hidden" animate="show" variants={stagger}
              className="md:col-span-8 py-20 md:border-r-2 border-black md:pr-8">
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-widest font-sans mb-8"
                style={{ color: accentColor }}>
                No.01 — Introduction
              </motion.p>
              <motion.h1 variants={fadeUp}
                className="text-6xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter mb-8"
                style={{ fontFamily: 'Georgia, serif' }}>
                {name.split(' ').map((word: string, i: number) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </motion.h1>
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1" style={{ background: accentColor }} />
                <p className="text-sm uppercase tracking-widest font-sans shrink-0" style={{ color: accentColor }}>{title}</p>
              </motion.div>
              <motion.p variants={fadeUp} className="text-lg text-gray-600 max-w-2xl leading-relaxed font-sans">
                {profile.headline || `A creative mind shaping visual culture through intentional design. ${profile.years_experience ? profile.years_experience + ' years' : ''} of studio experience.`}
              </motion.p>
            </motion.div>
            {/* Right column */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="md:col-span-4 py-20 md:pl-8 flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest font-sans text-gray-400 mb-6">Contact</p>
                {profile.email && (
                  <p className="text-sm font-sans text-gray-700 break-all mb-2">{profile.email}</p>
                )}
                {profile.phone && <p className="text-sm font-sans text-gray-700 mb-2">{profile.phone}</p>}
                {(profile.city || profile.country) && (
                  <p className="text-sm font-sans text-gray-700">{[profile.city, profile.country].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <div className="mt-8 pt-8 border-t border-gray-200">
                {profile.years_experience && (
                  <div className="mb-4">
                    <p className="text-5xl font-black" style={{ fontFamily: 'Georgia, serif' }}>{profile.years_experience}</p>
                    <p className="text-xs uppercase tracking-widest font-sans text-gray-400">Years Experience</p>
                  </div>
                )}
                {(profile.resume_facts_companies || []).length > 0 && (
                  <div>
                    <p className="text-5xl font-black" style={{ fontFamily: 'Georgia, serif' }}>{(profile.resume_facts_companies || []).length}</p>
                    <p className="text-xs uppercase tracking-widest font-sans text-gray-400">Studios / Companies</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SKILLS MARQUEE */}
      {showSections.skills && allSkills.length > 0 && (
        <section id="skills" className="border-b-2 border-black py-6 overflow-hidden">
          <div className="relative">
            <motion.div
              animate={{ x: [0, -allSkills.join(' · ').length * 12] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="flex items-center gap-8 whitespace-nowrap">
              {[...allSkills, ...allSkills, ...allSkills].map((skill, i) => (
                <span key={i} className="text-sm font-sans font-bold uppercase tracking-widest">
                  <span style={{ color: i % 3 === 0 ? accentColor : '#1a1a1a' }}>{skill}</span>
                  <span className="mx-4 text-gray-300">·</span>
                </span>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* EXPERIENCE — Newspaper columns */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="work" className="border-b-2 border-black"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            {/* Section header */}
            <div className="border-b-2 border-black py-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest font-sans" style={{ color: accentColor }}>No.02 — Experience</p>
              <h2 className="text-2xl font-black" style={{ fontFamily: 'Georgia, serif' }}>Work History</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="py-10 px-0 md:px-8 border-b-2 md:border-b-0 md:border-r-2 border-black last:border-r-0">
                  <p className="text-xs font-sans uppercase tracking-widest text-gray-400 mb-3">
                    {String(i + 1).padStart(2, '0')} / {(profile.resume_facts_companies || []).length.toString().padStart(2, '0')}
                  </p>
                  <h3 className="text-3xl font-black mb-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{company}</h3>
                  <div className="w-8 h-px mb-4" style={{ background: accentColor }} />
                  {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                    <p key={j} className="text-sm text-gray-600 font-sans leading-relaxed mb-2">{m}</p>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* PROJECTS */}
      {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
        <motion.section id="projects" className="border-b-2 border-black"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <div className="border-b-2 border-black py-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest font-sans" style={{ color: accentColor }}>No.03 — Portfolio</p>
              <h2 className="text-2xl font-black" style={{ fontFamily: 'Georgia, serif' }}>Selected Projects</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ backgroundColor: '#f3f4f6' }}
                  className="py-10 px-4 md:px-8 border-b-2 md:border-r-2 border-black md:last:border-r-0 even:border-r-0 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-sans uppercase tracking-widest text-gray-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-gray-300 text-lg">↗</span>
                  </div>
                  <h3 className="text-2xl font-black leading-tight mb-3" style={{ fontFamily: 'Georgia, serif' }}>{project}</h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {allSkills.slice(0, 3).map(s => (
                      <span key={s} className="text-xs font-sans font-medium px-2.5 py-1 border border-black rounded-none">{s}</span>
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
        <motion.section id="education" className="border-b-2 border-black"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <div className="border-b-2 border-black py-4">
              <p className="text-xs uppercase tracking-widest font-sans" style={{ color: accentColor }}>No.04 — Education</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="py-10 px-4 md:px-8 border-b md:border-r-2 border-black md:last:border-r-0">
                  <h3 className="text-2xl font-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>{school}</h3>
                  {profile.education && <p className="text-sm text-gray-600 font-sans">{profile.education}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CONTACT */}
      {showSections.contact && (
        <motion.section id="contact" className="py-24 px-8 max-w-7xl mx-auto"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <p className="text-xs uppercase tracking-widest font-sans mb-6" style={{ color: accentColor }}>No.05 — Get In Touch</p>
              <h2 className="text-5xl md:text-7xl font-black leading-tight mb-10" style={{ fontFamily: 'Georgia, serif' }}>
                Let&apos;s<br />
                <span style={{ WebkitTextStroke: `2px ${accentColor}`, color: 'transparent' }}>Talk.</span>
              </h2>
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="inline-block border-b-2 pb-1 text-lg font-sans font-bold transition-all hover:gap-4"
                  style={{ borderColor: accentColor, color: accentColor }}>
                  {profile.email} →
                </a>
              )}
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col gap-4">
              {profile.github && (
                <a href={profile.github} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between py-5 border-b-2 border-black group hover:pl-2 transition-all font-sans">
                  <span className="font-bold uppercase tracking-widest text-sm">GitHub</span>
                  <span className="text-gray-400 group-hover:text-black transition-colors">↗</span>
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between py-5 border-b-2 border-black group hover:pl-2 transition-all font-sans">
                  <span className="font-bold uppercase tracking-widest text-sm">LinkedIn</span>
                  <span className="text-gray-400 group-hover:text-black transition-colors">↗</span>
                </a>
              )}
              {profile.portfolio && (
                <a href={profile.portfolio} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between py-5 border-b-2 border-black group hover:pl-2 transition-all font-sans">
                  <span className="font-bold uppercase tracking-widest text-sm">Portfolio</span>
                  <span className="text-gray-400 group-hover:text-black transition-colors">↗</span>
                </a>
              )}
            </motion.div>
          </div>
        </motion.section>
      )}

      <footer className="border-t-2 border-black py-6 px-8 flex items-center justify-between text-xs font-sans uppercase tracking-widest text-gray-400">
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span style={{ color: accentColor }}>JobEzee</span></span>
      </footer>
    </div>
  )
}
