import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const stagger = { show: { transition: { staggerChildren: 0.08 } } }

const TICKER_SYMBOLS = ['BTC', 'GS', 'JPM', 'MS', 'BAC', 'C', 'WFC', 'AAPL', 'MSFT', 'AMZN']

export default function WallStreet({ profile, primaryColor, accentColor, showSections }: PortfolioTemplateProps) {
  const darkGreen = primaryColor || '#0d2818'
  const gold      = accentColor  || '#c9a84c'
  const name      = profile.full_name || profile.preferred_name || 'Analyst'
  const title     = profile.current_job_title || profile.target_role || 'Financial Analyst'
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]

  return (
    <div className="min-h-screen font-mono" style={{ background: darkGreen, color: '#d4edda' }}>
      {/* TICKER TAPE */}
      <div className="border-b overflow-hidden" style={{ borderColor: `${gold}40`, background: '#0a1f12' }}>
        <motion.div
          animate={{ x: [0, -2000] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex items-center gap-12 py-2 whitespace-nowrap">
          {[...TICKER_SYMBOLS, ...TICKER_SYMBOLS, ...TICKER_SYMBOLS].map((sym, i) => (
            <span key={i} className="text-xs flex items-center gap-2">
              <span className="font-bold" style={{ color: gold }}>{sym}</span>
              <span className={i % 3 === 0 ? 'text-red-400' : 'text-green-400'}>
                {i % 3 === 0 ? '▼' : '▲'} {(Math.random() * 5).toFixed(2)}%
              </span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* NAV */}
      <nav className="border-b" style={{ borderColor: `${gold}25`, background: 'rgba(13,40,24,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-black" style={{ color: gold }}>▲</div>
            <div>
              <p className="text-sm font-black tracking-wider text-white">{name.split(' ')[0].toUpperCase()}</p>
              <p className="text-xs" style={{ color: `${gold}80` }}>PORTFOLIO TERMINAL v2.0</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest" style={{ color: `${gold}80` }}>
            {['Overview', 'Track Record', 'Skills', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase().replace(' ', '-')}`} className="hover:text-white transition-colors"
                style={{ color: 'inherit' }}>{s}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="overview" className="py-20 border-b" style={{ borderColor: `${gold}20` }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <motion.div initial="hidden" animate="show" variants={stagger} className="lg:col-span-2">
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-widest mb-6" style={{ color: gold }}>
                &gt; PROFILE.LOAD({name.replace(' ', '_').toUpperCase()})
              </motion.p>
              <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black leading-none mb-4 text-white">
                {name}
              </motion.h1>
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <div className="h-px w-12" style={{ background: gold }} />
                <p className="text-base" style={{ color: gold }}>{title}</p>
              </motion.div>
              <motion.p variants={fadeUp} className="text-green-300 leading-relaxed max-w-2xl opacity-80">
                {profile.headline || `Markets specialist with deep expertise in quantitative analysis and risk management. ${profile.years_experience ? profile.years_experience + 'Y' : ''} of alpha generation.`}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex gap-4">
                {profile.email && (
                  <a href={`mailto:${profile.email}`}
                    className="px-6 py-2.5 text-sm font-bold transition-all hover:scale-105"
                    style={{ background: gold, color: darkGreen }}>
                    CONTACT →
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer"
                    className="px-6 py-2.5 text-sm font-bold border transition-all hover:scale-105"
                    style={{ borderColor: `${gold}60`, color: gold }}>
                    LINKEDIN
                  </a>
                )}
              </motion.div>
            </motion.div>

            {/* Terminal stats box */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="rounded border p-6" style={{ borderColor: `${gold}30`, background: '#0a1f12' }}>
              <p className="text-xs mb-4" style={{ color: gold }}>// PERFORMANCE METRICS</p>
              <div className="space-y-4">
                {[
                  { k: 'YEARS_EXP', v: profile.years_experience || 'N/A' },
                  { k: 'FIRMS_COUNT', v: (profile.resume_facts_companies || []).length || 0 },
                  { k: 'PROJECTS', v: (profile.resume_facts_projects || []).length || 0 },
                  { k: 'SKILLS_TOTAL', v: allSkills.length || 0 },
                ].map(({ k, v }) => (
                  <div key={k} className="flex items-center justify-between border-b pb-3" style={{ borderColor: `${gold}15` }}>
                    <span className="text-xs text-green-500">{k}</span>
                    <span className="text-lg font-black" style={{ color: gold }}>{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SKILLS — Data table */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section id="skills" className="py-20 border-b" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-xs mb-2" style={{ color: gold }}>&gt; SKILLS.MATRIX()</p>
              <h2 className="text-3xl font-black text-white">Technical Competencies</h2>
            </motion.div>
            <div className="border rounded" style={{ borderColor: `${gold}30` }}>
              {/* Table header */}
              <div className="grid grid-cols-4 border-b text-xs uppercase tracking-widest py-3 px-4"
                style={{ borderColor: `${gold}30`, background: '#0a1f12', color: gold }}>
                <span>Skill</span><span>Category</span><span>Proficiency</span><span>Rating</span>
              </div>
              {allSkills.map((skill, i) => {
                const cat = i < (profile.skills_languages || []).length ? 'Language'
                  : i < (profile.skills_languages || []).length + (profile.skills_frameworks || []).length ? 'Framework'
                  : 'Tool'
                const pct = Math.max(70, 100 - i * 4)
                return (
                  <motion.div key={skill} variants={fadeUp}
                    className="grid grid-cols-4 border-b py-3 px-4 text-sm items-center hover:bg-white/5 transition-colors"
                    style={{ borderColor: `${gold}15` }}>
                    <span className="font-bold text-white">{skill}</span>
                    <span className="text-green-400 text-xs">{cat}</span>
                    <div className="h-1 bg-green-900 rounded-full w-24">
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }} whileInView={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }} viewport={{ once: true }}
                        style={{ background: gold }} />
                    </div>
                    <span style={{ color: gold }} className="font-black">{pct}%</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.section>
      )}

      {/* TRACK RECORD */}
      {showSections.experience && (profile.resume_facts_companies || []).length > 0 && (
        <motion.section id="track-record" className="py-20 border-b" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-xs mb-2" style={{ color: gold }}>&gt; EXPERIENCE.HISTORY()</p>
              <h2 className="text-3xl font-black text-white">Track Record</h2>
            </motion.div>
            <div className="space-y-6">
              {(profile.resume_facts_companies || []).map((company, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="border rounded p-6" style={{ borderColor: `${gold}25`, background: '#0a1f12' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs mb-1" style={{ color: gold }}>FIRM_{String(i + 1).padStart(2, '0')}</p>
                      <h3 className="text-2xl font-black text-white">{company}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl" style={{ color: 'limegreen' }}>▲</div>
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-2" style={{ borderColor: `${gold}15` }}>
                    {(profile.resume_facts_metrics || []).slice(i * 2, i * 2 + 2).map((m, j) => (
                      <p key={j} className="text-green-300 text-sm opacity-80 flex items-start gap-2">
                        <span style={{ color: gold }}>▸</span> {m}
                      </p>
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
        <motion.section id="projects" className="py-20 border-b" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-xs mb-2" style={{ color: gold }}>&gt; PROJECTS.LIST()</p>
              <h2 className="text-3xl font-black text-white">Key Initiatives</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(profile.resume_facts_projects || []).map((project, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="border rounded p-5 hover:border-yellow-600/50 transition-all" style={{ borderColor: `${gold}25`, background: '#0a1f12' }}>
                  <p className="text-xs mb-2" style={{ color: gold }}>PROJ_{String(i + 1).padStart(3, '0')}</p>
                  <h3 className="text-lg font-black text-white">{project}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EDUCATION */}
      {showSections.education && (profile.resume_facts_schools || []).length > 0 && (
        <motion.section id="education" className="py-20 border-b" style={{ borderColor: `${gold}20` }}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-7xl mx-auto px-8">
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-xs mb-2" style={{ color: gold }}>&gt; EDUCATION.CREDENTIALS()</p>
              <h2 className="text-3xl font-black text-white">Academic Background</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(profile.resume_facts_schools || []).map((school, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="border rounded p-6" style={{ borderColor: `${gold}25`, background: '#0a1f12' }}>
                  <h3 className="text-xl font-black text-white">{school}</h3>
                  {profile.education && <p className="text-green-300 opacity-70 mt-1 text-sm">{profile.education}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CONTACT */}
      {showSections.contact && (
        <motion.section id="contact" className="py-24 text-center"
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <div className="max-w-2xl mx-auto px-8">
            <motion.p variants={fadeUp} className="text-xs mb-4 uppercase tracking-widest" style={{ color: gold }}>
              &gt; CONTACT.INIT()
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-5xl font-black text-white mb-6">Open Positions</motion.h2>
            <motion.p variants={fadeUp} className="text-green-300 opacity-70 mb-10">
              Seeking selective high-impact roles. Reach out with serious inquiries.
            </motion.p>
            {profile.email && (
              <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                className="inline-block px-10 py-4 text-sm font-black transition-all hover:scale-105"
                style={{ background: gold, color: darkGreen }}>
                EXECUTE CONTACT →
              </motion.a>
            )}
          </div>
        </motion.section>
      )}

      <footer className="border-t py-6 px-8 flex justify-between text-xs" style={{ borderColor: `${gold}20`, color: `${gold}40` }}>
        <span>© {new Date().getFullYear()} {name.toUpperCase()}</span>
        <span>BUILT WITH JOBEZEE TERMINAL</span>
      </footer>
    </div>
  )
}
