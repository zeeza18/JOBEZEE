import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, GraduationCap } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } }
const stagger = { show: { transition: { staggerChildren: 0.09 } } }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-lg font-black text-gray-800">{title}</h3>
        <div className="flex-1 h-px bg-blue-100" />
      </div>
      {children}
    </div>
  )
}

export default function MedProfile({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const blue    = primaryColor || '#1d4ed8'
  const sky     = accentColor  || '#60a5fa'
  const name    = profile.full_name || profile.preferred_name || 'Medical Professional'
  const title   = profile.current_job_title || profile.target_role || 'Healthcare Specialist'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen" style={{ background: '#eff6ff', color: '#1e3a5f', fontFamily: 'system-ui, sans-serif' }}>
      {/* HEADER */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
              style={{ background: `linear-gradient(135deg, ${blue}, ${sky})` }}>
              {initials}
            </div>
            <div>
              <p className="font-black text-gray-900 leading-none">{name}</p>
              <p className="text-xs mt-0.5" style={{ color: blue }}>{title}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            {['Profile', 'Education', 'Skills', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} className="hover:text-gray-800 transition-colors font-medium">{s}</a>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT PANEL */}
        <aside className="lg:col-span-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100 sticky top-24">
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full mx-auto mb-5 flex items-center justify-center text-5xl font-black text-white"
              style={{ background: `linear-gradient(135deg, ${blue}, ${sky})` }}>
              {initials}
            </div>
            <h2 className="text-xl font-black text-center text-gray-900 mb-1">{name}</h2>
            <p className="text-sm text-center mb-5" style={{ color: blue }}>{title}</p>

            <div className="h-px bg-blue-50 mb-5" />

            <div className="space-y-3 text-sm">
              {profile.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0" style={{ color: blue }} />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Email</p>
                    <a href={`mailto:${profile.email}`} className="text-gray-600 hover:text-blue-600 transition-colors text-xs break-all">{profile.email}</a>
                  </div>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0" style={{ color: blue }} />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                    <p className="text-gray-600 text-xs">{profile.phone}</p>
                  </div>
                </div>
              )}
              {(profile.city || profile.country) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: blue }} />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Location</p>
                    <p className="text-gray-600 text-xs">{[profile.city, profile.country].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-blue-50 my-5" />

            <div className="space-y-2">
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ background: `${blue}08`, color: blue }}>
                  LinkedIn ↗
                </a>
              )}
              {profile.github && (
                <a href={profile.github} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ background: `${sky}10`, color: sky }}>
                  GitHub ↗
                </a>
              )}
            </div>

            <div className="h-px bg-blue-50 my-5" />

            <div className="grid grid-cols-2 gap-3">
              {profile.years_experience && (
                <div className="text-center p-3 rounded-xl" style={{ background: `${blue}08` }}>
                  <p className="text-2xl font-black" style={{ color: blue }}>{profile.years_experience}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Years</p>
                </div>
              )}
              <div className="text-center p-3 rounded-xl" style={{ background: `${sky}10` }}>
                <p className="text-2xl font-black" style={{ color: sky }}>{(profile.resume_facts_schools || []).length || 1}</p>
                <p className="text-xs text-gray-400 mt-0.5">Degrees</p>
              </div>
            </div>
          </motion.div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="lg:col-span-8 space-y-6">
          {/* About */}
          <motion.div initial="hidden" animate="show" variants={stagger}
            id="profile"
            className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100">
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-2xl font-black text-gray-900">Professional Profile</h2>
                <div className="flex-1 h-px bg-blue-100" />
              </div>
              <p className="text-gray-600 leading-relaxed">
                {profile.headline || `Compassionate healthcare professional dedicated to excellence in patient care and evidence-based practice. ${profile.years_experience ? profile.years_experience + ' years' : ''} of clinical experience.`}
              </p>
              {profile.work_authorization && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: `${blue}08`, color: blue }}>
                  {profile.work_authorization}
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Education / Credentials */}
          {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
              id="education"
              className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100">
              <Section title="Education & Credentials">
                <div className="space-y-4">
                  {(profile.resume_facts_schools || []).map((school, i) => (
                    <motion.div key={i} variants={fadeUp}
                      className="flex gap-4 p-4 rounded-2xl"
                      style={{ background: `${blue}05`, border: `1px solid ${blue}12` }}>
                      <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${blue}20, ${sky}25)` }}>
                        <GraduationCap className="h-5 w-5" style={{ color: blue }} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 mb-0.5">{school}</h4>
                        {profile.education && <p className="text-sm text-gray-500">{profile.education}</p>}
                        <span className="inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${sky}15`, color: sky }}>
                          Verified
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Skills */}
          {showSections.skills && allSkills.length > 0 && (
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
              id="skills"
              className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100">
              <Section title="Skills & Competencies">
                {([
                  ['Clinical Skills', profile.skills_languages || [], blue],
                  ['Tools & Systems', profile.skills_frameworks || [], sky],
                  ['Specializations', profile.skills_tools || [], '#0ea5e9'],
                ] as [string, string[], string][]).map(([label, items, color]) => items.length > 0 && (
                  <motion.div key={label} variants={fadeUp} className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-400">{label}</p>
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
              </Section>
            </motion.div>
          )}

          {/* Experience */}
          {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
              className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100">
              <Section title="Professional Experience">
                <div className="space-y-4">
                  {(profile.resume_facts_companies || []).map((company, i) => (
                    <motion.div key={i} variants={fadeUp}
                      className="p-5 rounded-2xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <h4 className="text-lg font-black text-gray-900 mb-2">{company}</h4>
                      {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                        <p key={j} className="text-gray-500 text-sm flex items-start gap-2 mb-1">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: blue }} />
                          {m}
                        </p>
                      ))}
                    </motion.div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Projects */}
          {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
              className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100">
              <Section title="Research & Initiatives">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(profile.resume_facts_projects || []).map((project, i) => (
                    <motion.div key={i} variants={fadeUp}
                      className="p-4 rounded-xl" style={{ background: `${blue}06`, border: `1px solid ${blue}15` }}>
                      <h4 className="font-bold text-gray-800 text-sm">{project}</h4>
                    </motion.div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Contact */}
          {showSections.contact && (
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
              id="contact"
              className="rounded-3xl p-8 text-white"
              style={{ background: `linear-gradient(135deg, ${blue}, ${sky})` }}>
              <motion.h3 variants={fadeUp} className="text-2xl font-black mb-2">Open to Opportunities</motion.h3>
              <motion.p variants={fadeUp} className="opacity-80 mb-6 text-sm">
                Seeking clinical and research positions. Let&apos;s connect.
              </motion.p>
              {profile.email && (
                <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                  className="inline-block bg-white px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{ color: blue }}>
                  {profile.email}
                </motion.a>
              )}
            </motion.div>
          )}
        </main>
      </div>

      <footer className="bg-white border-t border-blue-100 py-5 px-8 flex justify-between text-xs text-gray-400">
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span className="font-semibold" style={{ color: blue }}>JobEzee</span></span>
      </footer>
    </div>
  )
}
