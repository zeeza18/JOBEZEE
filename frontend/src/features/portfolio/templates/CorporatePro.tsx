import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { GraduationCap } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { show: { transition: { staggerChildren: 0.1 } } }

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  return (
    <span ref={ref}>
      {isInView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}>
          {value}
        </motion.span>
      ) : 0}
    </span>
  )
}

function SkillBar({ skill, pct, color }: { skill: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-700">{skill}</span>
        <span className="text-gray-400">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          viewport={{ once: true }}
          style={{ background: color }} />
      </div>
    </div>
  )
}

export default function CorporatePro({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const name      = profile.full_name || profile.preferred_name || 'Professional'
  const title     = profile.current_job_title || profile.target_role || 'Senior Manager'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-white" style={{ color: '#1e293b', fontFamily: 'system-ui, sans-serif' }}>
      {/* NAV */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-white"
              style={{ background: primaryColor }}>
              {initials}
            </div>
            <span className="font-bold text-gray-900">{name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            {['About', 'Experience', 'Skills', 'Projects', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} className="hover:text-gray-900 transition-colors font-medium">{s}</a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`}
              className="hidden md:block px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: primaryColor }}>
              Contact
            </a>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="about" className="py-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{ background: `${primaryColor}10`, color: primaryColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: primaryColor }} />
                Open to Opportunities
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-4">
                {name}
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl font-semibold mb-6" style={{ color: primaryColor }}>
                {title}
              </motion.p>
              <motion.p variants={fadeUp} className="text-gray-500 leading-relaxed mb-8 text-base max-w-lg">
                {profile.headline || `Delivering measurable results through strategic thinking and operational excellence. ${profile.years_experience ? profile.years_experience + ' years' : ''} of proven performance.`}
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: primaryColor }}>
                    Get In Touch
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer"
                    className="px-6 py-3 rounded-lg text-sm font-semibold border-2 transition-all hover:bg-gray-50"
                    style={{ borderColor: primaryColor, color: primaryColor }}>
                    LinkedIn
                  </a>
                )}
              </motion.div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6 }}
              className="grid grid-cols-2 gap-5">
              {[
                { label: 'Years Experience', value: parseInt(profile.years_experience || '0') || 5, suffix: '+' },
                { label: 'Companies', value: (profile.resume_facts_companies || []).length || 3, suffix: '' },
                { label: 'Projects', value: (profile.resume_facts_projects || []).length || 8, suffix: '+' },
                { label: 'Skills', value: allSkills.length || 15, suffix: '+' },
              ].map(({ label, value, suffix }) => (
                <div key={label} className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all hover:shadow-md">
                  <p className="text-4xl font-black mb-1" style={{ color: primaryColor }}>
                    <AnimatedNumber value={value} />{suffix}
                  </p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* EXPERIENCE */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="experience" className="py-20 border-b border-gray-100"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12">
              <span className="text-sm font-semibold px-3 py-1 rounded-full mb-4 inline-block"
                style={{ background: `${primaryColor}10`, color: primaryColor }}>
                Work History
              </span>
              <h2 className="text-3xl font-black text-gray-900 mt-2">Experience</h2>
            </motion.div>
            <div className="space-y-6">
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="flex gap-6 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-black"
                    style={{ background: primaryColor }}>
                    {company.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{company}</h3>
                    <div className="space-y-1.5">
                      {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                        <p key={j} className="text-gray-500 text-sm flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: accentColor }} />
                          {m}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="text-xs font-semibold px-2 py-1 rounded-md"
                      style={{ background: `${primaryColor}10`, color: primaryColor }}>
                      #{String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* SKILLS */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="skills" className="py-20 border-b border-gray-100 bg-gray-50"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12">
              <span className="text-sm font-semibold px-3 py-1 rounded-full mb-4 inline-block"
                style={{ background: `${primaryColor}10`, color: primaryColor }}>
                Competencies
              </span>
              <h2 className="text-3xl font-black text-gray-900 mt-2">Skills</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {([
                ['Languages', profile.skills_languages || [], primaryColor],
                ['Frameworks', profile.skills_frameworks || [], accentColor],
                ['Tools', profile.skills_tools || [], '#64748b'],
              ] as [string, string[], string][]).map(([label, items, color]) => items.length > 0 && (
                <motion.div key={label} variants={fadeUp}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">{label}</h3>
                  <div className="space-y-4">
                    {items.map((skill, j) => (
                      <SkillBar key={skill} skill={skill} pct={90 - j * 7} color={color} />
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
        <motion.section id="projects" className="py-20 border-b border-gray-100"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12">
              <span className="text-sm font-semibold px-3 py-1 rounded-full mb-4 inline-block"
                style={{ background: `${primaryColor}10`, color: primaryColor }}>
                Portfolio
              </span>
              <h2 className="text-3xl font-black text-gray-900 mt-2">Key Projects</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -3 }}
                  className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center font-black text-sm text-white"
                    style={{ background: primaryColor }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">{project}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {allSkills.slice(0, 3).map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: `${accentColor}10`, color: accentColor }}>
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
        <motion.section id="education" className="py-20 border-b border-gray-100 bg-gray-50"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-12">
              <h2 className="text-3xl font-black text-gray-900">Education</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${primaryColor}10` }}>
                      <GraduationCap className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{school}</h3>
                      {profile.education && <p className="text-sm text-gray-500">{profile.education}</p>}
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
        <motion.section id="contact" className="py-24"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8 text-center">
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-900 mb-4">Ready to Collaborate?</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 mb-10 max-w-md mx-auto">
              Let&apos;s discuss how I can add value to your organization.
            </motion.p>
            {profile.email && (
              <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                className="inline-block px-10 py-4 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 hover:scale-105"
                style={{ background: primaryColor }}>
                Send a Message →
              </motion.a>
            )}
            <motion.div variants={fadeUp} className="flex justify-center gap-6 mt-8 text-gray-400 text-sm">
              {profile.github && <a href={profile.github} target="_blank" rel="noreferrer" className="hover:text-gray-700 transition-colors">GitHub</a>}
              {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="hover:text-gray-700 transition-colors">LinkedIn</a>}
              {profile.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer" className="hover:text-gray-700 transition-colors">Portfolio</a>}
            </motion.div>
          </div>
        </motion.section>
      )}

      <footer className="py-6 px-8 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span className="font-semibold" style={{ color: primaryColor }}>JobEzee</span></span>
      </footer>
    </div>
  )
}
