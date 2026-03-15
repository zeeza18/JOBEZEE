import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const slideLeft  = { hidden: { opacity: 0, x: -60 }, show: { opacity: 1, x: 0, transition: { duration: 0.8 } } }
const slideRight = { hidden: { opacity: 0, x: 60 },  show: { opacity: 1, x: 0, transition: { duration: 0.8 } } }
const fadeUp     = { hidden: { opacity: 0, y: 30 },  show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const stagger    = { show: { transition: { staggerChildren: 0.1 } } }

export default function ArtCanvas({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const name      = profile.full_name || profile.preferred_name || 'Creative'
  const title     = profile.current_job_title || profile.target_role || 'Creative Designer'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-white" style={{ color: '#111827', fontFamily: 'system-ui, sans-serif' }}>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 border-b border-gray-100" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="#about" className="text-lg font-black tracking-tight" style={{ color: '#111827' }}>
            {name.split(' ')[0].toUpperCase()}
          </a>
          <div className="hidden md:flex items-center gap-10 text-sm tracking-widest uppercase">
            {['work', 'skills', 'about', 'contact'].map(s => (
              <a key={s} href={`#${s}`} className="text-gray-400 hover:text-gray-900 transition-colors font-medium">{s}</a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`}
              className="hidden md:block px-5 py-2 text-sm font-bold text-white rounded-full transition-all hover:scale-105"
              style={{ background: '#111827' }}>
              Hire Me
            </a>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="about" className="pt-32 min-h-screen flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="flex flex-col md:flex-row items-center gap-16">
            {/* Left: Text */}
            <motion.div initial="hidden" animate="show" variants={stagger} className="flex-1 md:pr-12">
              <motion.p variants={slideLeft} className="text-sm font-bold uppercase tracking-widest mb-6"
                style={{ color: accentColor }}>
                — {title}
              </motion.p>
              <motion.h1 variants={slideLeft}
                className="text-6xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter mb-8 text-gray-900">
                {name.split(' ').map((word: string, i: number) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </motion.h1>
              <motion.p variants={slideLeft} className="text-lg text-gray-500 max-w-md leading-relaxed mb-10">
                {profile.headline || `Shaping ideas into visual narratives. ${profile.years_experience ? profile.years_experience + ' years' : ''} of creative excellence.`}
              </motion.p>
              <motion.div variants={slideLeft} className="flex flex-wrap gap-4">
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="px-7 py-3.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105"
                    style={{ background: '#111827' }}>
                    Get In Touch
                  </a>
                )}
                {profile.portfolio && (
                  <a href={profile.portfolio} target="_blank" rel="noreferrer"
                    className="px-7 py-3.5 rounded-full text-sm font-bold border-2 transition-all hover:scale-105"
                    style={{ borderColor: accentColor, color: accentColor }}>
                    View Work
                  </a>
                )}
              </motion.div>
            </motion.div>

            {/* Right: Large abstract shape */}
            <motion.div initial="hidden" animate="show" variants={slideRight} className="shrink-0">
              <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
                {/* Rotated square behind */}
                <div className="absolute inset-0 rounded-3xl rotate-12 opacity-20"
                  style={{ background: accentColor }} />
                {/* Main shape */}
                <div className="absolute inset-4 rounded-3xl -rotate-6 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                  <span className="text-7xl font-black text-white opacity-30 select-none">{initials}</span>
                </div>
                {/* Dot accent */}
                <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full"
                  style={{ background: accentColor + '30', border: `3px solid ${accentColor}` }} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SKILLS */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="skills" className="py-28 px-8"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-16 items-start">
              <motion.div variants={slideLeft} className="md:w-72 shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accentColor }}>
                  What I Do
                </p>
                <h2 className="text-5xl font-black text-gray-900 leading-tight">Skills &<br />Expertise</h2>
                <div className="mt-8 w-16 h-1 rounded-full" style={{ background: accentColor }} />
              </motion.div>
              <motion.div variants={fadeUp} className="flex-1">
                <div className="flex flex-wrap gap-3">
                  {allSkills.map((skill, i) => (
                    <motion.span key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      viewport={{ once: true }}
                      className="px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 cursor-default"
                      style={i % 3 === 0
                        ? { background: '#111827', color: '#fff' }
                        : i % 3 === 1
                          ? { background: accentColor, color: '#fff' }
                          : { background: '#f3f4f6', color: '#374151' }
                      }>
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      )}

      {/* EXPERIENCE */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="work" className="py-28 px-8 bg-gray-50"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto">
            <motion.div variants={fadeUp} className="mb-16">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accentColor }}>Experience</p>
              <h2 className="text-5xl font-black text-gray-900">Where I&apos;ve Worked</h2>
            </motion.div>
            <div className="space-y-0">
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="flex items-start gap-8 py-10 border-b border-gray-200 group">
                  <div className="w-16 text-right shrink-0">
                    <span className="text-4xl font-black text-gray-200 group-hover:text-gray-300 transition-colors">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-gray-900 mb-3">{company}</h3>
                    <div className="space-y-1.5">
                      {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                        <p key={j} className="text-gray-500 flex items-start gap-2 text-sm">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: accentColor }} />
                          {m}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 mt-1 w-10 h-10 rounded-full border-2 border-gray-200 group-hover:border-gray-900 flex items-center justify-center transition-all">
                    <span className="text-gray-400 group-hover:text-gray-900 transition-colors">→</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* PROJECTS */}
      {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
        <motion.section id="projects" className="py-28 px-8"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto">
            <motion.div variants={fadeUp} className="mb-16">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accentColor }}>Portfolio</p>
              <h2 className="text-5xl font-black text-gray-900">Selected Work</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                  className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 transition-all bg-white shadow-sm hover:shadow-lg">
                  <div className="h-48 flex items-center justify-center"
                    style={{ background: i % 2 === 0 ? `linear-gradient(135deg, ${primaryColor}15, ${accentColor}15)` : '#f9fafb' }}>
                    <span className="text-5xl font-black text-gray-200">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black text-gray-900 mb-2">{project}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {allSkills.slice(0, 4).map(s => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EDUCATION */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <motion.section id="education" className="py-28 px-8 bg-gray-50"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto">
            <motion.div variants={fadeUp} className="mb-16">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accentColor }}>Background</p>
              <h2 className="text-5xl font-black text-gray-900">Education</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center"
                    style={{ background: accentColor }}>
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-1">{school}</h3>
                  {profile.education && <p className="text-gray-500 text-sm">{profile.education}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CONTACT */}
      {showSections.contact && (
        <motion.section id="contact" className="py-28 px-8"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">
            <motion.div variants={slideLeft} className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: accentColor }}>Contact</p>
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-6">
                Let&apos;s create<br />
                <span style={{ color: accentColor }}>something great.</span>
              </h2>
              <p className="text-gray-500 text-lg mb-10 max-w-md">
                Available for freelance, full-time and collaborative projects. Let&apos;s talk.
              </p>
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white text-sm font-bold transition-all hover:scale-105"
                  style={{ background: '#111827' }}>
                  {profile.email}
                  <span>→</span>
                </a>
              )}
            </motion.div>
            <motion.div variants={slideRight} className="shrink-0">
              <div className="w-64 h-64 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accentColor}20, ${primaryColor}20)`, border: `2px dashed ${accentColor}40` }}>
                <span className="text-6xl font-black text-gray-200">{initials}</span>
              </div>
            </motion.div>
          </div>
        </motion.section>
      )}

      <footer className="py-8 px-8 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span className="font-bold" style={{ color: accentColor }}>JOBEZEE</span></span>
      </footer>
    </div>
  )
}
