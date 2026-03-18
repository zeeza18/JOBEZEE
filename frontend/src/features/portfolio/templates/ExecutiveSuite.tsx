import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp: any = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7 } } }
const fadeIn: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8 } } }
const slideLeft: any = { hidden: { opacity: 0, x: -60 }, show: { opacity: 1, x: 0, transition: { duration: 0.8 } } }
const stagger: any = { show: { transition: { staggerChildren: 0.12 } } }

const PRINCIPLES = [
  { icon: '◈', title: 'Vision-Led Growth', desc: 'Setting bold, audacious targets and rallying entire organizations to achieve the previously impossible.' },
  { icon: '◉', title: 'People First', desc: 'Building cultures of trust, accountability, and high performance that outlast any individual tenure.' },
  { icon: '◆', title: 'Value Creation', desc: 'Translating bold strategy into measurable outcomes and compounding shareholder value year over year.' },
]

const MOCK_PUBLICATIONS = [
  { pub: 'Forbes', title: 'Building Resilient Organizations in Volatile Markets', year: '2024' },
  { pub: 'Harvard Business Review', title: 'The New Playbook for Executive Leadership', year: '2023' },
  { pub: 'Fortune', title: 'How to Scale Culture Across Global Teams', year: '2023' },
]

export default function ExecutiveSuite({
  profile, primaryColor, showSections, heroGradient, profilePhoto, textOverrides,
}: PortfolioTemplateProps) {
  const NAVY = '#0c1628'
  const GOLD = primaryColor || '#c9a84c'

  const name     = textOverrides?.name  || profile.full_name || profile.preferred_name || 'Executive Leader'
  const title    = textOverrides?.title || profile.current_job_title || profile.target_role || 'Chief Executive Officer'
  const bio      = textOverrides?.bio   || profile.headline || 'Seasoned executive driving transformation, growth, and sustainable value creation across global enterprises.'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const companies = profile.resume_facts_companies || []
  const projects  = profile.resume_facts_projects  || []
  const schools   = profile.resume_facts_schools   || []
  const metrics   = profile.resume_facts_metrics   || []

  const impactStats = [
    { value: metrics[0] || '₹450Cr+', label: 'Revenue Grown' },
    { value: metrics[1] || '3,000+',  label: 'Professionals Led' },
    { value: metrics[2] || '12+',     label: 'Companies Scaled' },
    { value: `${profile.years_experience || '20'}+`, label: 'Years in Leadership' },
  ]

  return (
    <div style={{ background: NAVY, color: '#e8dcc8', fontFamily: "'Georgia', 'Times New Roman', serif", minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: `${NAVY}f0`, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${GOLD}30` }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 60px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.05em', color: GOLD }}>{initials}</span>
          <div style={{ display: 'flex', gap: 40, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', color: 'rgba(232,220,200,0.5)' }}>
            {['Impact', 'Career', 'Philosophy', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,220,200,0.5)')}>
                {s}
              </a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`}
              style={{ padding: '10px 24px', border: `1px solid ${GOLD}`, color: GOLD, textDecoration: 'none', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', transition: 'background 0.2s, color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = NAVY }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = GOLD }}>
              Connect
            </a>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 70 }}>
        {/* Left */}
        <motion.div initial="hidden" animate="show" variants={stagger}
          style={{ padding: '100px 60px 100px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 24, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
            Executive Profile
          </motion.p>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(40px, 4.5vw, 64px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#f5edd8', marginBottom: 20 }}>
            {name}
          </motion.h1>
          <motion.div variants={fadeIn} style={{ width: 80, height: 3, background: GOLD, marginBottom: 20 }} />
          <motion.p variants={fadeUp} style={{ fontSize: 20, fontWeight: 400, color: GOLD, marginBottom: 28, letterSpacing: '0.02em' }}>
            {title}
          </motion.p>
          <motion.p variants={fadeUp} style={{ fontSize: 16, lineHeight: 1.9, color: 'rgba(232,220,200,0.7)', marginBottom: 48, maxWidth: 480 }}>
            {bio}
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href="#impact"
              style={{ background: GOLD, color: NAVY, padding: '14px 32px', fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              View Impact
            </a>
            {profile.linkedin && (
              <a href={profile.linkedin}
                style={{ border: `1px solid ${GOLD}50`, color: GOLD, padding: '14px 32px', fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                LinkedIn
              </a>
            )}
          </motion.div>
        </motion.div>

        {/* Right — Avatar + Animated Stat Cards */}
        <div style={{ background: heroGradient || `linear-gradient(135deg, #0d1e38, #162040)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 80 }}>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.3 }} style={{ position: 'relative' }}>
            {/* Gold ring avatar */}
            <div style={{ width: 240, height: 240, borderRadius: '50%', padding: 4, background: `conic-gradient(${GOLD}, ${primaryColor}, ${GOLD})` }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1a2540', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profilePhoto
                  ? <img src={profilePhoto} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 72, fontWeight: 900, color: GOLD, fontFamily: 'Georgia, serif' }}>{initials}</span>}
              </div>
            </div>
            {/* Floating stat cards */}
            {[
              { label: 'Revenue Impact', val: metrics[0] || '₹450Cr+', offsetTop: -30, offsetRight: -130 },
              { label: 'Team Size',      val: metrics[1] || '3,000+',   offsetTop: 80,  offsetRight: -150 },
              { label: 'Years Led',      val: `${profile.years_experience || 20}+`, offsetTop: 180, offsetLeft: -110 },
            ].map((card, i) => (
              <motion.div key={i}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3 + i * 0.8, repeat: Infinity, delay: i * 0.9 }}
                style={{
                  position: 'absolute',
                  top: card.offsetTop,
                  right: card.offsetRight,
                  left: card.offsetLeft,
                  background: NAVY,
                  border: `1px solid ${GOLD}50`,
                  padding: '14px 20px',
                  borderRadius: 4,
                  minWidth: 120,
                  boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${GOLD}20`,
                }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: GOLD, fontFamily: 'Georgia, serif' }}>{card.val}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,220,200,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginTop: 4 }}>{card.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* IMPACT STATS */}
      {showSections['skills'] !== false && (
        <section id="impact" style={{ padding: '100px 80px', background: 'rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.2) 40px, rgba(255,255,255,0.2) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.2) 40px, rgba(255,255,255,0.2) 41px)' }} />
          <div style={{ maxWidth: 1300, margin: '0 auto', position: 'relative' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 16, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
                Quantified Impact
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ textAlign: 'center', fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em', color: '#f5edd8', marginBottom: 80 }}>
                A Career Defined by Results
              </motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                {impactStats.map((stat, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ textAlign: 'center', padding: '52px 24px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${GOLD}20` }}>
                    <div style={{ fontSize: 52, fontWeight: 900, color: GOLD, lineHeight: 1, marginBottom: 16 }}>{stat.value}</div>
                    <div style={{ fontSize: 13, color: 'rgba(232,220,200,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CAREER TIMELINE */}
      {showSections['experience'] !== false && companies.length > 0 && (
        <section id="career" style={{ padding: '100px 80px' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 80, alignItems: 'start' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={slideLeft} style={{ position: 'sticky', top: 100 }}>
              <p style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 16, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>Career</p>
              <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.02em', color: '#f5edd8', lineHeight: 1.1 }}>Executive Timeline</h2>
              <div style={{ width: 60, height: 3, background: GOLD, marginTop: 20, marginBottom: 24 }} />
              <p style={{ fontSize: 14, color: 'rgba(232,220,200,0.5)', lineHeight: 1.8, fontFamily: 'system-ui, sans-serif' }}>
                A track record of scaling organizations and delivering exceptional shareholder value.
              </p>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
              style={{ paddingLeft: 40, borderLeft: `2px solid ${GOLD}25` }}>
              {companies.map((company, i) => (
                <motion.div key={i} variants={fadeUp} style={{ marginBottom: 56, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -49, top: 8, width: 16, height: 16, background: GOLD, transform: 'rotate(45deg)', boxShadow: `0 0 0 4px ${NAVY}` }} />
                  <p style={{ fontSize: 12, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginBottom: 8 }}>
                    {2024 - i * 3} – {i === 0 ? 'Present' : 2024 - (i - 1) * 3}
                  </p>
                  <h3 style={{ fontSize: 28, fontWeight: 700, color: '#f5edd8', marginBottom: 4 }}>{company}</h3>
                  <p style={{ fontSize: 16, color: GOLD, marginBottom: 20, fontStyle: 'italic' }}>{title}</p>
                  <ul style={{ paddingLeft: 20, color: 'rgba(232,220,200,0.6)', fontSize: 15, lineHeight: 2.1, fontFamily: 'system-ui, sans-serif' }}>
                    {projects.slice(i * 2, i * 2 + 2).map((p, j) => <li key={j}>{p}</li>)}
                    {projects.length <= i * 2 && <li>Led cross-functional transformation initiatives across the organization</li>}
                    <li>Delivered {impactStats[0].value} in measurable business impact</li>
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* BOARD / ADVISORY */}
      {showSections['projects'] !== false && projects.length > 0 && (
        <section style={{ padding: '80px 80px', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 16, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
                Board & Advisory
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 42, fontWeight: 900, color: '#f5edd8', marginBottom: 48, letterSpacing: '-0.02em' }}>
                Strategic Engagements
              </motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {projects.map((proj, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ padding: '24px', border: `1px solid ${GOLD}25`, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: GOLD, flexShrink: 0 }}>
                      {proj.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f5edd8', fontFamily: 'system-ui, sans-serif' }}>{proj}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* LEADERSHIP PHILOSOPHY */}
      {showSections['about'] !== false && (
        <section id="philosophy" style={{ padding: '100px 80px' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 16, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
                Philosophy
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ textAlign: 'center', fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em', color: '#f5edd8', marginBottom: 72 }}>
                Leadership Principles
              </motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                {PRINCIPLES.map((p, i) => (
                  <motion.div key={i} variants={fadeUp}
                    whileHover={{ y: -6 }}
                    style={{ padding: '52px 40px', border: `1px solid ${GOLD}25`, background: 'rgba(255,255,255,0.02)', transition: 'transform 0.3s' }}>
                    <div style={{ fontSize: 40, color: GOLD, marginBottom: 24 }}>{p.icon}</div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#f5edd8', marginBottom: 16 }}>{p.title}</h3>
                    <p style={{ fontSize: 15, color: 'rgba(232,220,200,0.6)', lineHeight: 1.85, fontFamily: 'system-ui, sans-serif' }}>{p.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* PRESS / SPEAKING */}
      <section style={{ padding: '80px 80px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 16, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
              Press & Thought Leadership
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 42, fontWeight: 900, color: '#f5edd8', marginBottom: 48, letterSpacing: '-0.02em' }}>Featured In</motion.h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {MOCK_PUBLICATIONS.map((pub, i) => (
                <motion.div key={i} variants={fadeUp} style={{ padding: '36px', border: `1px solid ${GOLD}25`, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>{pub.pub}</span>
                    <span style={{ fontSize: 12, color: 'rgba(232,220,200,0.3)', fontFamily: 'system-ui, sans-serif' }}>{pub.year}</span>
                  </div>
                  <p style={{ fontSize: 17, color: '#f5edd8', lineHeight: 1.6, fontStyle: 'italic' }}>"{pub.title}"</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* EDUCATION */}
      {showSections['education'] !== false && schools.length > 0 && (
        <section id="education" style={{ padding: '80px 80px' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 16, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>Education</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 42, fontWeight: 900, color: '#f5edd8', marginBottom: 48, letterSpacing: '-0.02em' }}>Academic Credentials</motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                {schools.map((school, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ padding: '32px', border: `1px solid ${GOLD}25`, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 32, color: GOLD, marginBottom: 16 }}>◈</div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#f5edd8', marginBottom: 8 }}>{school}</p>
                    <p style={{ fontSize: 14, color: 'rgba(232,220,200,0.5)', fontFamily: 'system-ui, sans-serif' }}>{profile.education || 'Business Administration'}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      {showSections['contact'] !== false && (
        <section id="contact" style={{ padding: '120px 80px', textAlign: 'center', background: 'rgba(0,0,0,0.35)' }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} style={{ maxWidth: 700, margin: '0 auto' }}>
            <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 24, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
              Executive Consultation
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#f5edd8', lineHeight: 1.1, marginBottom: 24 }}>
              Ready to Drive Results Together?
            </motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: 17, color: 'rgba(232,220,200,0.6)', marginBottom: 52, lineHeight: 1.8, fontFamily: 'system-ui, sans-serif' }}>
              {profile.city && profile.country ? `Based in ${profile.city}, ${profile.country}. ` : ''}
              Available for board advisory, consulting engagements, and senior leadership roles.
            </motion.p>
            {profile.email && (
              <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                style={{ display: 'inline-block', background: GOLD, color: NAVY, padding: '20px 52px', fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Schedule Consultation
              </motion.a>
            )}
          </motion.div>
        </section>
      )}
    </div>
  )
}
