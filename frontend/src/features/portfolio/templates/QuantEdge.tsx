import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } }
const stagger = { show: { transition: { staggerChildren: 0.09 } } }

function HexBadge({ skill, color }: { skill: string; color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, y: -2 }}
      className="inline-flex items-center justify-center text-xs font-bold px-3 py-2 cursor-default transition-all"
      style={{
        clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)',
        background: `${color}18`,
        color: color,
        border: 'none',
        minWidth: '80px',
      }}>
      {skill}
    </motion.div>
  )
}

export default function QuantEdge({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const navy      = primaryColor || '#0f172a'
  const emerald   = accentColor  || '#10b981'
  const name      = profile.full_name || profile.preferred_name || 'Analyst'
  const title     = profile.current_job_title || profile.target_role || 'Quantitative Analyst'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex" style={{ background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      {/* LEFT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-0 h-screen overflow-y-auto"
        style={{ background: navy, color: '#f1f5f9' }}>
        <div className="p-8">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl mb-5 flex items-center justify-center text-3xl font-black"
            style={{ background: `linear-gradient(135deg, ${emerald}30, ${emerald}60)`, border: `2px solid ${emerald}40`, color: emerald }}>
            {initials}
          </div>
          <h1 className="text-xl font-black text-white leading-tight mb-1">{name}</h1>
          <p className="text-sm mb-6" style={{ color: emerald }}>{title}</p>

          {/* Divider */}
          <div className="h-px mb-6" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Contact info */}
          <div className="space-y-3 text-sm">
            {profile.email && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: `${emerald}80` }}>Email</p>
                <a href={`mailto:${profile.email}`} className="text-slate-300 hover:text-white transition-colors text-xs break-all">{profile.email}</a>
              </div>
            )}
            {profile.phone && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: `${emerald}80` }}>Phone</p>
                <p className="text-slate-300 text-xs">{profile.phone}</p>
              </div>
            )}
            {(profile.city || profile.country) && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: `${emerald}80` }}>Location</p>
                <p className="text-slate-300 text-xs">{[profile.city, profile.country].filter(Boolean).join(', ')}</p>
              </div>
            )}
          </div>

          <div className="h-px my-6" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Links */}
          <div className="space-y-2">
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <span style={{ color: emerald }}>↗</span> LinkedIn
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <span style={{ color: emerald }}>↗</span> GitHub
              </a>
            )}
            {profile.portfolio && (
              <a href={profile.portfolio} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <span style={{ color: emerald }}>↗</span> Portfolio
              </a>
            )}
          </div>

          <div className="h-px my-6" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Metrics */}
          <div className="space-y-4">
            {[
              { label: 'Experience', value: profile.years_experience ? `${profile.years_experience}Y` : '—' },
              { label: 'Companies', value: (profile.resume_facts_companies || []).length || '—' },
              { label: 'Skills', value: allSkills.length || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-sm font-black" style={{ color: emerald }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <section id="about" className="bg-white border-b border-gray-100 py-16 px-10">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
              <div className="h-px w-12" style={{ background: emerald }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: emerald }}>
                {title}
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Hello, I&apos;m <span style={{ color: navy }}>{name.split(' ')[0]}</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 max-w-2xl leading-relaxed mb-8">
              {profile.headline || `Quantitative specialist with deep expertise in data analysis, algorithmic design, and financial modeling. ${profile.years_experience ? profile.years_experience + ' years' : ''} of delivering precise, data-driven results.`}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: navy }}>
                  Contact Me
                </a>
              )}
              <a href="#skills" className="px-6 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all hover:bg-gray-50"
                style={{ borderColor: emerald, color: emerald }}>
                View Skills
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* Skills */}
        {showSections.skills && allSkills.length > 0 && (
          <motion.section id="skills" className="py-14 px-10 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-8">
              <h3 className="text-2xl font-black text-gray-900">Skills & Tools</h3>
              <p className="text-gray-400 text-sm mt-1">Hexagonal skills matrix</p>
            </motion.div>
            {([
              ['Languages', profile.skills_languages || [], emerald],
              ['Frameworks', profile.skills_frameworks || [], '#3b82f6'],
              ['Tools', profile.skills_tools || [], '#f59e0b'],
            ] as [string, string[], string][]).map(([label, items, color]) => items.length > 0 && (
              <motion.div key={label} variants={fadeUp} className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-400">{label}</p>
                <div className="flex flex-wrap gap-3">
                  {items.map(skill => <HexBadge key={skill} skill={skill} color={color} />)}
                </div>
              </motion.div>
            ))}
          </motion.section>
        )}

        {/* Experience */}
        {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
          <motion.section id="experience" className="py-14 px-10 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-8">
              <h3 className="text-2xl font-black text-gray-900">Experience</h3>
            </motion.div>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: `${emerald}30` }} />
              <div className="space-y-10 pl-12">
                {(profile.resume_facts_companies || []).map((company, i) => (
                  <motion.div key={i} variants={fadeUp} className="relative">
                    <div className="absolute -left-[41px] w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center"
                      style={{ borderColor: emerald }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: emerald }} />
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                      <h4 className="text-xl font-black text-gray-900 mb-3">{company}</h4>
                      <div className="space-y-2">
                        {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                          <p key={j} className="text-gray-500 text-sm flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: emerald }} />
                            {m}
                          </p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Projects */}
        {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
          <motion.section id="projects" className="py-14 px-10 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-8">
              <h3 className="text-2xl font-black text-gray-900">Projects</h3>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -2 }}
                  className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black font-mono" style={{ color: emerald }}>
                      [{String(i + 1).padStart(2, '0')}]
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md text-white"
                      style={{ background: navy }}>
                      Project
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900">{project}</h4>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Education */}
        {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
          <motion.section id="education" className="py-14 px-10 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="mb-8">
              <h3 className="text-2xl font-black text-gray-900">Education</h3>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                    style={{ background: `${emerald}15` }}>
                    <GraduationCap className="h-5 w-5" style={{ color: emerald }} />
                  </div>
                  <h4 className="font-black text-gray-900 mb-1">{school}</h4>
                  {profile.education && <p className="text-sm text-gray-400">{profile.education}</p>}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Contact */}
        {showSections.contact && (
          <motion.section id="contact" className="py-14 px-10"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center max-w-2xl">
              <h3 className="text-3xl font-black text-gray-900 mb-3">Let&apos;s Connect</h3>
              <p className="text-gray-500 mb-8">Open to quantitative, data, and engineering roles with driven teams.</p>
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="inline-block px-8 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: navy }}>
                  Send a Message →
                </a>
              )}
            </motion.div>
          </motion.section>
        )}

        <footer className="py-6 px-10 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
          <span>&copy; {new Date().getFullYear()} {name}</span>
          <span>Built with <span style={{ color: emerald }}>JOBEZEE</span></span>
        </footer>
      </main>
    </div>
  )
}
