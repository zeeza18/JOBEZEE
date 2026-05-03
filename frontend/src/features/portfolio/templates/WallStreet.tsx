import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp: any = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const fadeIn: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.7 } } }
const stagger: any = { show: { transition: { staggerChildren: 0.08 } } }

export default function WallStreet({
  profile, primaryColor, accentColor, showSections, profilePhoto, textOverrides,
}: PortfolioTemplateProps) {
  const BG    = '#070f0a'
  const GREEN = primaryColor || '#00d46a'
  const DIM   = `${GREEN}90`

  const name     = textOverrides?.name  || profile.full_name || profile.preferred_name || 'Finance Professional'
  const title    = textOverrides?.title || profile.current_job_title || profile.target_role || 'Investment Analyst'
  const bio      = textOverrides?.bio   || profile.headline || 'Quantitative analyst driving alpha generation through data-driven investment strategies.'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const companies = profile.resume_facts_companies || []
  const projects  = profile.resume_facts_projects  || []
  const metrics   = profile.resume_facts_metrics   || []
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]

  const heroMetrics = [
    { label: 'AUM',           val: metrics[0] || `${companies.length}+ Companies` },
    { label: 'Returns',       val: metrics[1] || `${profile.years_experience || 12}+ Years` },
    { label: 'Deals Closed',   val: metrics[2] || `${projects.length}+ Projects` },
    { label: 'Years',         val: `${profile.years_experience || 12}` },
  ]

  const monoStyle: React.CSSProperties = { fontFamily: "'Courier New', 'Consolas', monospace" }

  // Real skill rows — proficiency from position
  const allSkillRows = allSkills.slice(0, 12).map((skill, i) => ({
    name: skill,
    cat: i < allSkills.length * 0.4 ? 'Strategy' : i < allSkills.length * 0.7 ? 'Analysis' : 'Tools',
    color: i < allSkills.length * 0.4 ? GREEN : i < allSkills.length * 0.7 ? '#00c8ff' : (accentColor || '#ffd700'),
    pct: Math.max(65, 95 - i * 5),
  }))

  return (
    <div style={{ background: BG, color: GREEN, minHeight: '100vh', ...monoStyle }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: `${BG}ee`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${GREEN}25` }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 60px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: GREEN, fontWeight: 700, fontSize: 16, letterSpacing: '0.1em' }}>[{initials}]</span>
          <div style={{ display: 'flex', gap: 32, fontSize: 12, letterSpacing: '0.15em', color: DIM }}>
            {['PROFILE', 'TRACK_RECORD', 'SKILLS', 'CONTACT'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = GREEN)}
                onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
                {s}
              </a>
            ))}
          </div>
          {profile.email && <a href={`mailto:${profile.email}`} style={{ fontSize: 12, color: GREEN, textDecoration: 'none', letterSpacing: '0.08em' }}>GET IN TOUCH</a>}
        </div>
      </nav>

      {/* HERO */}
      <section id="profile" style={{ minHeight: '90vh', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, padding: '0' }}>
        {/* Left: Identity + stats */}
        <motion.div initial="hidden" animate="show" variants={stagger}
          style={{ padding: '80px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid ${GREEN}20` }}>
          <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>
            Investment Professional
          </motion.p>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 900, lineHeight: 1.1, color: GREEN, marginBottom: 8, letterSpacing: '-0.02em' }}>
            {name}
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: 18, color: DIM, marginBottom: 32, letterSpacing: '0.05em' }}>
            {title}
          </motion.p>
          <motion.div variants={fadeIn} style={{ width: '100%', height: 1, background: `linear-gradient(to right, ${GREEN}, transparent)`, marginBottom: 32 }} />
          <motion.p variants={fadeUp} style={{ fontSize: 14, color: `${GREEN}99`, lineHeight: 1.9, marginBottom: 40, maxWidth: 440 }}>
            {bio}
          </motion.p>
          {/* Key metrics row */}
          <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 40 }}>
            {heroMetrics.map((m, i) => (
              <motion.div key={i} variants={fadeUp} style={{ padding: '16px 12px', background: `${GREEN}08`, border: `1px solid ${GREEN}25`, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: GREEN }}>{m.val}</div>
                <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.1em', marginTop: 4 }}>{m.label}</div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16 }}>
            {profile.email && (
              <a href={`mailto:${profile.email}`}
                style={{ background: GREEN, color: '#000', padding: '12px 28px', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.1em' }}>
                GET IN TOUCH →
              </a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin}
                style={{ border: `1px solid ${GREEN}50`, color: GREEN, padding: '12px 28px', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.1em' }}>
                LINKEDIN →
              </a>
            )}
          </motion.div>
        </motion.div>

        {/* Right: Bar chart + avatar */}
        <div style={{ padding: '80px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.div initial="hidden" animate="show" variants={stagger}>
            {/* Avatar */}
            <motion.div variants={fadeIn} style={{ marginBottom: 40 }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', border: `2px solid ${GREEN}`, background: `${GREEN}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profilePhoto
                  ? <img src={profilePhoto} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 40, fontWeight: 900, color: GREEN }}>{initials}</span>}
              </div>
            </motion.div>

            <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.2em', color: DIM, marginBottom: 20 }}>
              METRICS OVERVIEW
            </motion.p>
            {/* Real data bar chart from resume_facts_metrics */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '0 0 24px', borderBottom: `1px solid ${GREEN}30`, position: 'relative' }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct * 1.36 + 24}px`, borderTop: `1px solid ${GREEN}15`, fontSize: 9, color: DIM, paddingLeft: 2 }}>
                  {pct}%
                </div>
              ))}
              {(metrics.length > 0 ? metrics.slice(0, 6) : companies.slice(0, 6).map((_, i) => `${85 - i * 8}%`)).map((val, i) => (
                <motion.div key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${(metrics.length > 0 ? (parseInt(val) || 80 - i * 10) : (85 - i * 8)) * 1.36}px` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  style={{ flex: 1, background: GREEN, position: 'relative', minWidth: 0, maxWidth: 80 }}>
                  <span style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: DIM }}>#{i + 1}</span>
                  <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: GREEN, fontWeight: 700 }}>
                    +{(metrics.length > 0 ? parseInt(val) || 80 : 85 - i * 8) / 10}%
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SKILLS TABLE */}
      {showSections['skills'] !== false && (
        <section style={{ padding: '80px 60px', borderTop: `1px solid ${GREEN}20` }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>Competency Matrix</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 40, fontWeight: 900, color: GREEN, marginBottom: 40, letterSpacing: '-0.02em' }}>Core Competencies</motion.h2>
              <div style={{ border: `1px solid ${GREEN}30`, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 80px', background: `${GREEN}15`, padding: '12px 24px', borderBottom: `1px solid ${GREEN}30`, fontSize: 11, letterSpacing: '0.15em', color: DIM }}>
                  <span>SKILL_NAME</span><span>CATEGORY</span><span>PROFICIENCY_BAR</span><span>PCT</span>
                </div>
                {allSkillRows.map((row, i) => (
                  <motion.div key={i} variants={fadeUp}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 80px', padding: '14px 24px', borderBottom: `1px solid ${GREEN}15`, fontSize: 13, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : `${GREEN}05` }}>
                    <span style={{ color: GREEN, fontWeight: 600 }}>{row.name}</span>
                    <span style={{ color: row.color, fontSize: 11, letterSpacing: '0.1em' }}>{row.cat.toUpperCase()}</span>
                    <div style={{ height: 6, background: `${GREEN}20`, borderRadius: 0, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${row.pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.05 }}
                        style={{ height: '100%', background: row.color }} />
                    </div>
                    <span style={{ color: row.color, fontSize: 12, textAlign: 'right' }}>{row.pct}%</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* TRACK RECORD */}
      {showSections['experience'] !== false && companies.length > 0 && (
        <section id="track_record" style={{ padding: '80px 60px', background: `${GREEN}05` }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>Career History</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 40, fontWeight: 900, color: GREEN, marginBottom: 48, letterSpacing: '-0.02em' }}>Track Record</motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {companies.map((company, i) => (
                  <motion.div key={i} variants={fadeUp}
                    whileHover={{ borderColor: GREEN }}
                    style={{ padding: '28px', border: `1px solid ${GREEN}30`, background: BG, transition: 'border-color 0.3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 700, color: GREEN }}>{company}</h3>
                      <span style={{ fontSize: 11, letterSpacing: '0.1em', padding: '4px 10px', border: `1px solid ${accentColor || '#ffd700'}50`, color: accentColor || '#ffd700' }}>
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: DIM, lineHeight: 1.9 }}>
                      {(projects[i] || metrics[i]) && (
                        <div style={{ color: `${GREEN}80` }}>{projects[i] || metrics[i]}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* SKILLS TABLE */}
      {showSections['skills'] !== false && allSkills.length > 0 && (
        <section style={{ padding: '80px 60px', borderTop: `1px solid ${GREEN}20` }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>Competency Matrix</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 40, fontWeight: 900, color: GREEN, marginBottom: 40, letterSpacing: '-0.02em' }}>Core Competencies</motion.h2>
              <div style={{ border: `1px solid ${GREEN}30`, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 80px', background: `${GREEN}15`, padding: '12px 24px', borderBottom: `1px solid ${GREEN}30`, fontSize: 11, letterSpacing: '0.15em', color: DIM }}>
                  <span>SKILL_NAME</span><span>CATEGORY</span><span>PROFICIENCY_BAR</span><span>PCT</span>
                </div>
                {allSkillRows.map((row, i) => (
                  <motion.div key={i} variants={fadeUp}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 80px', padding: '14px 24px', borderBottom: `1px solid ${GREEN}15`, fontSize: 13, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : `${GREEN}05` }}>
                    <span style={{ color: GREEN, fontWeight: 600 }}>{row.name}</span>
                    <span style={{ color: row.color, fontSize: 11, letterSpacing: '0.1em' }}>{row.cat.toUpperCase()}</span>
                    <div style={{ height: 6, background: `${GREEN}20`, borderRadius: 0, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${row.pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.05 }}
                        style={{ height: '100%', background: row.color }} />
                    </div>
                    <span style={{ color: row.color, fontSize: 12, textAlign: 'right' }}>{row.pct}%</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      {showSections['contact'] !== false && (
        <section id="contact" style={{ padding: '100px 60px', textAlign: 'center', borderTop: `1px solid ${GREEN}30` }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} style={{ maxWidth: 700, margin: '0 auto' }}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 24, textTransform: 'uppercase' }}>Contact</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: GREEN, marginBottom: 24, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Let's Connect
            </motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: 15, color: DIM, marginBottom: 48, lineHeight: 1.9 }}>
              {profile.city ? `${profile.city}${profile.country ? `, ${profile.country}` : ''}` : 'Available Globally'} · Open to new opportunities
            </motion.p>
            {profile.email && (
              <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                style={{ display: 'inline-block', background: GREEN, color: '#000', padding: '16px 48px', fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.15em' }}>
                GET IN TOUCH →
              </motion.a>
            )}
          </motion.div>
        </section>
      )}
    </div>
  )
}
