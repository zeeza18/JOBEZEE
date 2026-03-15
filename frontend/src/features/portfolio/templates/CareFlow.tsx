import { motion } from 'framer-motion'
import { GraduationCap, ClipboardList } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const fadeIn  = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.7 } } }
const stagger = { show: { transition: { staggerChildren: 0.1 } } }

export default function CareFlow({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const teal    = primaryColor || '#0891b2'
  const mint    = accentColor  || '#14b8a6'
  const name    = profile.full_name || profile.preferred_name || 'Healthcare Professional'
  const title   = profile.current_job_title || profile.target_role || 'Healthcare Specialist'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-white" style={{ color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      {/* NAV */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${teal}, ${mint})` }}>
              <span className="text-white text-xs font-black">+</span>
            </div>
            <span className="font-bold text-gray-800">{name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            {['About', 'Credentials', 'Skills', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`}
                className="text-gray-500 hover:text-gray-900 transition-colors font-medium">{s}</a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`}
              className="hidden md:block px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${teal}, ${mint})` }}>
              Contact
            </a>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="about" className="py-20 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div initial="hidden" animate="show" variants={stagger} className="lg:col-span-7">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ background: `${teal}10`, color: teal, border: `1px solid ${teal}25` }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: teal }} />
                {title}
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-5">
                {name}
              </motion.h1>
              <motion.p variants={fadeUp} className="text-gray-500 leading-relaxed max-w-lg mb-8 text-base">
                {profile.headline || `Dedicated healthcare professional committed to patient-centered care and clinical excellence. ${profile.years_experience ? profile.years_experience + ' years' : ''} of compassionate practice.`}
              </motion.p>
              {/* Quick stats */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-6 mb-8">
                {profile.years_experience && (
                  <div className="text-center">
                    <p className="text-3xl font-black" style={{ color: teal }}>{profile.years_experience}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Years</p>
                  </div>
                )}
                {(profile.resume_facts_schools || []).length > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-black" style={{ color: teal }}>{(profile.resume_facts_schools || []).length}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Credentials</p>
                  </div>
                )}
                {(profile.resume_facts_companies || []).length > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-black" style={{ color: teal }}>{(profile.resume_facts_companies || []).length}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Facilities</p>
                  </div>
                )}
              </motion.div>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${teal}, ${mint})` }}>
                    Contact Me
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer"
                    className="px-6 py-3 rounded-full text-sm font-semibold border-2 transition-all hover:bg-teal-50"
                    style={{ borderColor: teal, color: teal }}>
                    LinkedIn
                  </a>
                )}
              </motion.div>
            </motion.div>

            {/* Avatar card */}
            <motion.div initial="hidden" animate="show" variants={fadeIn} className="lg:col-span-5">
              <div className="rounded-3xl p-8 border text-center"
                style={{ background: `linear-gradient(135deg, ${teal}08, ${mint}12)`, borderColor: `${teal}20` }}>
                <div className="w-28 h-28 rounded-full mx-auto mb-5 flex items-center justify-center text-4xl font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${teal}, ${mint})` }}>
                  {initials}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1">{name}</h3>
                <p className="text-sm mb-4" style={{ color: teal }}>{title}</p>
                <div className="h-px mb-4" style={{ background: `${teal}20` }} />
                <div className="space-y-2 text-sm text-gray-500">
                  {(profile.city || profile.country) && (
                    <p>{[profile.city, profile.country].filter(Boolean).join(', ')}</p>
                  )}
                  {profile.work_authorization && <p>{profile.work_authorization}</p>}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CREDENTIALS */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <motion.section id="credentials" className="py-20 border-b border-gray-100"
          style={{ background: `${teal}05` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
                style={{ background: `${teal}15`, color: teal }}>
                Academic & Professional
              </div>
              <h2 className="text-3xl font-black text-gray-900">Credentials & Education</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl p-7 border transition-all hover:shadow-lg"
                  style={{ borderColor: `${teal}20`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${teal}20, ${mint}20)` }}>
                      <GraduationCap className="h-5 w-5" style={{ color: teal }} />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                        style={{ background: `${teal}10`, color: teal }}>
                        Verified Credential
                      </div>
                      <h3 className="text-lg font-black text-gray-900 mb-1">{school}</h3>
                      {profile.education && <p className="text-sm text-gray-500">{profile.education}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* SKILLS */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="skills" className="py-20 border-b border-gray-100"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-3xl font-black text-gray-900">Clinical & Technical Skills</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {([
                ['Clinical Skills', profile.skills_languages || [], teal],
                ['Procedures', profile.skills_frameworks || [], mint],
                ['Systems & Tools', profile.skills_tools || [], '#0ea5e9'],
              ] as [string, string[], string][]).map(([label, items, color]) => items.length > 0 && (
                <motion.div key={label} variants={fadeUp}
                  className="bg-white rounded-2xl p-6 border shadow-sm"
                  style={{ borderColor: `${color}20` }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-2 h-6 rounded-full" style={{ background: color }} />
                    <h3 className="font-black text-gray-900">{label}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map(skill => (
                      <span key={skill} className="px-3 py-1.5 rounded-full text-sm font-medium"
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

      {/* EXPERIENCE */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="experience" className="py-20 border-b border-gray-100"
          style={{ background: `${teal}04` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-3xl font-black text-gray-900">Professional Experience</h2>
            </motion.div>
            <div className="space-y-5">
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="bg-white rounded-2xl p-7 border shadow-sm" style={{ borderColor: `${teal}15` }}>
                  <div className="flex gap-5">
                    <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-black"
                      style={{ background: `linear-gradient(135deg, ${teal}, ${mint})` }}>
                      {company.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">{company}</h3>
                      <div className="space-y-1.5">
                        {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                          <p key={j} className="text-gray-500 text-sm flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: teal }} />
                            {m}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* PROJECTS */}
      {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
        <motion.section id="projects" className="py-20 border-b border-gray-100"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-6xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12 text-center">
              <h2 className="text-3xl font-black text-gray-900">Research & Projects</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -2 }}
                  className="bg-white rounded-xl p-5 border shadow-sm transition-all hover:shadow-md"
                  style={{ borderColor: `${teal}15` }}>
                  <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center text-sm"
                    style={{ background: `${teal}15` }}>
                    <ClipboardList className="h-4 w-4" style={{ color: teal }} />
                  </div>
                  <h3 className="font-black text-gray-900">{project}</h3>
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
          <div className="max-w-6xl mx-auto px-8 text-center">
            <motion.div variants={fadeUp} className="max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${teal}, ${mint})` }}>
                <span className="text-white text-2xl font-black">+</span>
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-4">Available for Opportunities</h2>
              <p className="text-gray-500 mb-10">
                Seeking positions where I can make a meaningful impact on patient outcomes and team performance.
              </p>
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="inline-block px-10 py-4 rounded-full text-white font-bold text-sm transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${teal}, ${mint})` }}>
                  Get In Touch →
                </a>
              )}
            </motion.div>
          </div>
        </motion.section>
      )}

      <footer className="py-6 px-8 border-t border-gray-100 flex justify-between text-xs text-gray-400">
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span className="font-semibold" style={{ color: teal }}>JOBEZEE</span></span>
      </footer>
    </div>
  )
}
