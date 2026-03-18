import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp: any = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const fadeIn: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.7 } } }
const stagger: any = { show: { transition: { staggerChildren: 0.08 } } }

const TICKER_ITEMS = ['S&P 500 +1.24%', 'NASDAQ +0.87%', 'DOW +0.54%', 'BTC $67,420', 'GOLD $2,341', 'EUR/USD 1.0843', 'NIFTY 50 +0.92%', '10Y UST 4.28%', 'VIX 14.32', 'WTI OIL $78.40']

const FINANCE_SECTORS = [
  { name: 'Equities', pct: 92 },
  { name: 'Fixed Income', pct: 78 },
  { name: 'M&A Advisory', pct: 85 },
  { name: 'Risk Management', pct: 88 },
  { name: 'Derivatives', pct: 74 },
  { name: 'Portfolio Mgmt', pct: 90 },
]

const MOCK_CERTS = [
  { name: 'CFA', body: 'CFA Institute', level: 'Level III' },
  { name: 'CPA', body: 'AICPA', level: 'Certified' },
  { name: 'FRM', body: 'GARP', level: 'Part II' },
  { name: 'Series 7', body: 'FINRA', level: 'Licensed' },
]


const QUARTERS = [
  { label: 'Q1', val: 68, pos: true },
  { label: 'Q2', val: 85, pos: true },
  { label: 'Q3', val: 45, pos: false },
  { label: 'Q4', val: 92, pos: true },
  { label: 'Q1', val: 77, pos: true },
  { label: 'Q2', val: 100, pos: true },
]

export default function WallStreet({
  profile, primaryColor, accentColor, showSections, profilePhoto, textOverrides,
}: PortfolioTemplateProps) {
  const BG    = '#070f0a'
  const GREEN = primaryColor || '#00d46a'
  const DIM   = `${GREEN}90`
  const RED   = '#ff4444'

  const name     = textOverrides?.name  || profile.full_name || profile.preferred_name || 'Finance Professional'
  const title    = textOverrides?.title || profile.current_job_title || profile.target_role || 'Investment Analyst'
  const bio      = textOverrides?.bio   || profile.headline || 'Quantitative analyst driving alpha generation through data-driven investment strategies.'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const companies = profile.resume_facts_companies || []
  const projects  = profile.resume_facts_projects  || []
  const schools   = profile.resume_facts_schools   || []
  const metrics   = profile.resume_facts_metrics   || []

  const allSkillRows = [
    { name: 'Equity Research',         cat: 'Analysis',   color: GREEN,    pct: 92 },
    { name: 'Portfolio Management',    cat: 'Strategy',   color: GREEN,    pct: 90 },
    { name: 'Financial Modeling',      cat: 'Analysis',   color: '#00c8ff', pct: 88 },
    { name: 'Risk Assessment',         cat: 'Risk',       color: '#00c8ff', pct: 86 },
    { name: 'Bloomberg Terminal',      cat: 'Tool',       color: accentColor || '#ffd700', pct: 94 },
    { name: 'M&A Advisory',            cat: 'Strategy',   color: GREEN,    pct: 85 },
    { name: 'Derivatives & Options',   cat: 'Asset Class',color: '#00c8ff', pct: 74 },
    { name: 'DCF / LBO Valuation',     cat: 'Analysis',   color: GREEN,    pct: 88 },
    { name: 'Fixed Income',            cat: 'Asset Class',color: '#00c8ff', pct: 78 },
    { name: 'Capital IQ / FactSet',    cat: 'Tool',       color: accentColor || '#ffd700', pct: 82 },
    { name: 'Regulatory Compliance',   cat: 'Risk',       color: '#00c8ff', pct: 80 },
    { name: 'Excel Financial Models',  cat: 'Tool',       color: accentColor || '#ffd700', pct: 96 },
  ]

  const heroMetrics = [
    { label: 'AUM',     val: metrics[0] || '$2.4B' },
    { label: 'Avg. Returns', val: metrics[1] || '18.4%' },
    { label: 'Deals Closed', val: metrics[2] || '47+' },
    { label: 'Years', val: `${profile.years_experience || 12}` },
  ]

  const monoStyle: React.CSSProperties = { fontFamily: "'Courier New', 'Consolas', monospace" }

  return (
    <div style={{ background: BG, color: GREEN, minHeight: '100vh', ...monoStyle }}>

      {/* TICKER TAPE */}
      <div style={{ background: '#000', borderBottom: `1px solid ${GREEN}40`, overflow: 'hidden', height: 36, display: 'flex', alignItems: 'center' }}>
        <motion.div
          animate={{ x: [0, -2000] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: 0, whiteSpace: 'nowrap' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ fontSize: 12, letterSpacing: '0.08em', padding: '0 24px', color: item.includes('-') ? RED : GREEN, borderRight: `1px solid ${GREEN}20` }}>
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: `${BG}ee`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${GREEN}25` }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 60px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: GREEN, fontWeight: 700, fontSize: 16, letterSpacing: '0.1em' }}>[{initials}]</span>
          <div style={{ display: 'flex', gap: 32, fontSize: 12, letterSpacing: '0.15em', color: DIM }}>
            {['PROFILE', 'TRACK_RECORD', 'SECTORS', 'CERTS', 'CONTACT'].map(s => (
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
              PORTFOLIO_PERFORMANCE (QUARTERLY)
            </motion.p>
            {/* CSS Bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '0 0 24px', borderBottom: `1px solid ${GREEN}30`, position: 'relative' }}>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct * 1.36 + 24}px`, borderTop: `1px solid ${GREEN}15`, fontSize: 9, color: DIM, paddingLeft: 2 }}>
                  {pct}%
                </div>
              ))}
              {QUARTERS.map((q, i) => (
                <motion.div key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${q.val * 1.36}px` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  style={{ flex: 1, background: q.pos ? GREEN : RED, position: 'relative', minWidth: 0, maxWidth: 80 }}>
                  <span style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: DIM }}>{q.label}</span>
                  <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: q.pos ? GREEN : RED, fontWeight: 700 }}>
                    {q.pos ? '+' : '-'}{q.val / 10}%
                  </span>
                </motion.div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: DIM, marginTop: 8, letterSpacing: '0.1em' }}>
              SIMULATED ILLUSTRATION — NOT ACTUAL RETURNS
            </p>
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
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>Transaction History</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 40, fontWeight: 900, color: GREEN, marginBottom: 48, letterSpacing: '-0.02em' }}>Track Record</motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {companies.map((company, i) => {
                  const dealTypes = ['M&A Buy-Side', 'IPO Lead', 'Debt Issuance', 'PE Investment', 'Restructuring', 'Cross-Border M&A']
                  const dealType = dealTypes[i % dealTypes.length]
                  return (
                    <motion.div key={i} variants={fadeUp}
                      whileHover={{ borderColor: GREEN }}
                      style={{ padding: '28px', border: `1px solid ${GREEN}30`, background: BG, transition: 'border-color 0.3s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: GREEN }}>{company}</h3>
                        <span style={{ fontSize: 11, letterSpacing: '0.1em', padding: '4px 10px', border: `1px solid ${accentColor || '#ffd700'}50`, color: accentColor || '#ffd700' }}>
                          {dealType}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: DIM, lineHeight: 1.9 }}>
                        <div>Deal Value: <span style={{ color: GREEN }}>{metrics[i] || `$${(i + 1) * 240}M`}</span></div>
                        <div>Status: <span style={{ color: GREEN }}>Completed</span></div>
                        <div>Year: <span style={{ color: GREEN }}>{2024 - i}</span></div>
                      </div>
                      {projects[i] && <p style={{ marginTop: 12, fontSize: 13, color: `${GREEN}80`, borderTop: `1px solid ${GREEN}20`, paddingTop: 12 }}>{projects[i]}</p>}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* SECTORS */}
      {showSections['about'] !== false && (
        <section id="sectors" style={{ padding: '80px 60px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>Sector Expertise</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 36, fontWeight: 900, color: GREEN, marginBottom: 40 }}>Asset Classes</motion.h2>
              {FINANCE_SECTORS.map((sec, i) => (
                <motion.div key={i} variants={fadeUp} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: GREEN }}>{sec.name}</span>
                    <span style={{ color: DIM }}>{sec.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: `${GREEN}20` }}>
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${sec.pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.1 }}
                      style={{ height: '100%', background: `linear-gradient(to right, ${GREEN}, ${accentColor || '#ffd700'})` }} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
            {/* Education */}
            {showSections['education'] !== false && schools.length > 0 && (
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
                <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>Academic Credentials</motion.p>
                <motion.h2 variants={fadeUp} style={{ fontSize: 36, fontWeight: 900, color: GREEN, marginBottom: 40 }}>Education</motion.h2>
                {schools.map((school, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ padding: '20px 24px', border: `1px solid ${GREEN}30`, marginBottom: 12, background: `${GREEN}05` }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 4 }}>{school}</p>
                    <p style={{ fontSize: 13, color: DIM }}>{profile.education || 'Finance & Economics'}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* CERTIFICATIONS */}
      {showSections['projects'] !== false && (
        <section id="certs" style={{ padding: '80px 60px', background: `${GREEN}05`, borderTop: `1px solid ${GREEN}20` }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', color: DIM, marginBottom: 16, textTransform: 'uppercase' }}>Professional Certifications</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 40, fontWeight: 900, color: GREEN, marginBottom: 48 }}>Credentials</motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                {MOCK_CERTS.map((cert, i) => (
                  <motion.div key={i} variants={fadeUp}
                    whileHover={{ y: -4 }}
                    style={{ padding: '36px 24px', border: `2px solid ${accentColor || '#ffd700'}50`, background: BG, textAlign: 'center', transition: 'transform 0.3s' }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: accentColor || '#ffd700', marginBottom: 12 }}>{cert.name}</div>
                    <div style={{ fontSize: 13, color: DIM, letterSpacing: '0.05em', marginBottom: 4 }}>{cert.body}</div>
                    <div style={{ fontSize: 12, color: `${GREEN}80`, padding: '4px 12px', border: `1px solid ${GREEN}30`, display: 'inline-block', marginTop: 8 }}>{cert.level}</div>
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
