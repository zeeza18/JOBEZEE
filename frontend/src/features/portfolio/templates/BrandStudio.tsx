import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.65 } } }
const stagger = { show: { transition: { staggerChildren: 0.1 } } }

export default function BrandStudio({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const purple  = primaryColor || '#7c3aed'
  const pink    = accentColor  || '#ec4899'
  const name    = profile.full_name || profile.preferred_name || 'Marketer'
  const title   = profile.current_job_title || profile.target_role || 'Brand Strategist'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]
  const initials  = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen" style={{ color: '#1a0a2e', fontFamily: 'system-ui, sans-serif' }}>
      {/* HERO — Full gradient */}
      <section id="about" className="relative overflow-hidden min-h-screen flex flex-col"
        style={{ background: `linear-gradient(135deg, ${purple} 0%, ${pink} 50%, #f97316 100%)` }}>
        {/* NAV */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-black text-sm">
              {initials}
            </div>
            <span className="text-white font-bold">{name.split(' ')[0]}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            {['Work', 'Skills', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} className="hover:text-white transition-colors font-medium">{s}</a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`}
              className="bg-white/20 backdrop-blur-sm px-5 py-2 rounded-full text-sm text-white font-semibold hover:bg-white/30 transition-all">
              Hire Me
            </a>
          )}
        </nav>

        {/* Hero content */}
        <div className="flex-1 flex items-center px-8 py-16">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.p variants={fadeUp} className="text-white/60 text-sm font-medium mb-4 uppercase tracking-widest">
                {title}
              </motion.p>
              <motion.h1 variants={fadeUp}
                className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-none mb-8 tracking-tighter">
                {name.split(' ').map((word: string, i: number) => <span key={i} className="block">{word}</span>)}
              </motion.h1>
              <motion.p variants={fadeUp} className="text-white/70 text-xl max-w-2xl leading-relaxed mb-10">
                {profile.headline || `Creating brand experiences that convert. ${profile.years_experience ? profile.years_experience + ' years' : ''} of growth-focused storytelling and data-driven campaigns.`}
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="px-8 py-4 bg-white text-sm font-black rounded-full transition-all hover:scale-105"
                    style={{ color: purple }}>
                    Let&apos;s Work Together →
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer"
                    className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold rounded-full border border-white/20 transition-all hover:bg-white/20">
                    LinkedIn
                  </a>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Bottom stats bar */}
        <div className="bg-black/20 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Years Experience', value: profile.years_experience || '5+' },
              { label: 'Brands Worked', value: (profile.resume_facts_companies || []).length || '10+' },
              { label: 'Campaigns Run', value: (profile.resume_facts_projects || []).length || '50+' },
              { label: 'Tools Mastered', value: allSkills.length || '20+' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-white">{value}</p>
                <p className="text-white/50 text-xs mt-1 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHITE CONTENT AREA */}
      <div className="bg-white">

        {/* METRICS */}
        {(profile.resume_facts_metrics || []).length > 0 && (
          <motion.section className="py-20 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <div className="max-w-7xl mx-auto px-8">
              <motion.div variants={fadeUp} className="text-center mb-12">
                <h2 className="text-4xl font-black text-gray-900">Results That Speak</h2>
                <p className="text-gray-400 mt-2">Numbers backed by real campaigns</p>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(profile.resume_facts_metrics || []).slice(0, 6).map((metric, i) => (
                  <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                    className="p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all">
                    <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${purple}15, ${pink}15)` }}>
                      <BarChart3 className="h-5 w-5" style={{ color: purple }} />
                    </div>
                    <p className="text-gray-700 leading-relaxed">{metric}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* EXPERIENCE */}
        {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
          <motion.section id="work" className="py-20 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <div className="max-w-7xl mx-auto px-8">
              <motion.div variants={fadeUp} className="mb-12">
                <p className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: purple }}>Track Record</p>
                <h2 className="text-4xl font-black text-gray-900">Brand Experience</h2>
              </motion.div>
              <div className="space-y-5">
                {(profile.resume_facts_companies || []).map((company, i) => (
                  <motion.div key={i} variants={fadeUp} whileHover={{ x: 4 }}
                    className="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-xl"
                      style={{ background: `linear-gradient(135deg, ${purple}, ${pink})` }}>
                      {company.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">{company}</h3>
                      {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                        <p key={j} className="text-gray-500 text-sm flex items-start gap-2 mb-1">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: pink }} />
                          {m}
                        </p>
                      ))}
                    </div>
                    <div className="text-3xl font-black text-gray-100 shrink-0 self-center">
                      {String(i + 1).padStart(2, '0')}
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
            style={{ background: '#fafafa' }}
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <div className="max-w-7xl mx-auto px-8">
              <motion.div variants={fadeUp} className="text-center mb-12">
                <h2 className="text-4xl font-black text-gray-900">Marketing Stack</h2>
              </motion.div>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center">
                {allSkills.map((skill, i) => (
                  <motion.span key={skill}
                    initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                    whileHover={{ scale: 1.05 }}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-default transition-all"
                    style={i % 3 === 0
                      ? { background: `linear-gradient(135deg, ${purple}, ${pink})`, color: '#fff' }
                      : i % 3 === 1
                        ? { background: '#f1f5f9', color: '#475569' }
                        : { background: `${pink}10`, color: pink, border: `1px solid ${pink}20` }
                    }>
                    {skill}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* PROJECTS */}
        {showSections.projects && (profile.resume_facts_projects || []).length > 0 && (
          <motion.section id="projects" className="py-20 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <div className="max-w-7xl mx-auto px-8">
              <motion.div variants={fadeUp} className="mb-12">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: purple }}>Case Studies</p>
                <h2 className="text-4xl font-black text-gray-900">Selected Campaigns</h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(profile.resume_facts_projects || []).map((project, i) => (
                  <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                    className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all">
                    <div className="h-40 relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${purple}${i % 2 === 0 ? '' : '99'}, ${pink}${i % 2 === 0 ? '99' : ''})` }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white/30 text-7xl font-black">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                    </div>
                    <div className="p-6 bg-white">
                      <h3 className="text-xl font-black text-gray-900 mb-3">{project}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {allSkills.slice(0, 3).map(s => (
                          <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">{s}</span>
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
          <motion.section id="education" className="py-20 border-b border-gray-100"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <div className="max-w-7xl mx-auto px-8">
              <motion.div variants={fadeUp} className="mb-12">
                <h2 className="text-4xl font-black text-gray-900">Education</h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(profile.resume_facts_schools || []).map((school, i) => (
                  <motion.div key={i} variants={fadeUp}
                    className="p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-black text-gray-900">{school}</h3>
                    {profile.education && <p className="text-sm text-gray-500 mt-1">{profile.education}</p>}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* CONTACT */}
        {showSections.contact && (
          <motion.section id="contact" className="py-28 relative overflow-hidden"
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <div className="absolute inset-0 opacity-5"
              style={{ background: `linear-gradient(135deg, ${purple}, ${pink})` }} />
            <div className="relative max-w-3xl mx-auto px-8 text-center">
              <motion.h2 variants={fadeUp} className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
                Ready to <span style={{ background: `linear-gradient(135deg, ${purple}, ${pink})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>grow</span>?
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-500 text-lg mb-10">
                Let&apos;s create campaigns that actually convert.
              </motion.p>
              {profile.email && (
                <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                  className="inline-block px-10 py-5 rounded-full text-white font-black text-base transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${purple}, ${pink})`, boxShadow: `0 20px 60px ${purple}40` }}>
                  Start a Conversation →
                </motion.a>
              )}
            </div>
          </motion.section>
        )}
      </div>

      <footer className="bg-white border-t border-gray-100 py-6 px-8 flex justify-between text-xs text-gray-400">
        <span>&copy; {new Date().getFullYear()} {name}</span>
        <span>Built with <span className="font-bold" style={{ color: purple }}>JOBEZEE</span></span>
      </footer>
    </div>
  )
}
