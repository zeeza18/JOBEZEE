import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'
import { buildAllSkills } from './skillUtils'

const fadeUp: any = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7 } } }
const slideLeft: any = { hidden: { opacity: 0, x: -60 }, show: { opacity: 1, x: 0, transition: { duration: 0.8 } } }
const slideRight: any = { hidden: { opacity: 0, x: 60 }, show: { opacity: 1, x: 0, transition: { duration: 0.8 } } }
const stagger: any = { show: { transition: { staggerChildren: 0.1 } } }
const staggerSlow: any = { show: { transition: { staggerChildren: 0.15 } } }

const GALLERY_GRADIENTS = [
  'linear-gradient(135deg,#ff6b6b,#feca57)',
  'linear-gradient(135deg,#48dbfb,#ff9ff3)',
  'linear-gradient(135deg,#54a0ff,#5f27cd)',
  'linear-gradient(135deg,#1dd1a1,#10ac84)',
  'linear-gradient(135deg,#fd9644,#e84393)',
  'linear-gradient(135deg,#a29bfe,#6c5ce7)',
]

export default function ArtCanvas({
  profile, primaryColor, accentColor, showSections, heroGradient, profilePhoto, textOverrides,
}: PortfolioTemplateProps) {
  const name    = textOverrides?.name  || profile.full_name || profile.preferred_name || 'Creative Artist'
  const title   = textOverrides?.title || profile.current_job_title || profile.target_role || 'Visual Creative'
  const bio     = textOverrides?.bio   || profile.headline || 'I craft visuals that move people and brands that endure.'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const projects = profile.resume_facts_projects || []
  const companies = profile.resume_facts_companies || []
  const nameParts = name.split(' ')
  const firstName = nameParts[0] || name
  const lastName  = nameParts.slice(1).join(' ') || ''

  // Real data drives gallery — fallback to skill categories if no projects
  const skillCategories = profile.skills_languages?.length
    ? profile.skills_languages.slice(0, 6)
    : ['Design', 'Branding', 'Illustration', 'Art Direction', 'Typography', 'Motion']
  const allSkills = buildAllSkills(profile)

  const galleryItems = skillCategories.map((cat, i) => ({
    category: cat,
    title: projects[i] || cat,
    gradient: GALLERY_GRADIENTS[i % GALLERY_GRADIENTS.length],
    span: i === 0 || i === 3 ? 'col-span-2' : 'col-span-1',
  }))

  return (
    <div className="min-h-screen" style={{ background: '#0d0d0d', color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', color: primaryColor }}>
            {firstName.toUpperCase()}
          </span>
          <div style={{ display: 'flex', gap: 40, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            {['Work', 'About', 'Skills', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                {s}
              </a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`} style={{ fontSize: 13, color: accentColor, textDecoration: 'none', fontWeight: 600, letterSpacing: '0.05em' }}>
              Hire Me
            </a>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '140px 48px 80px', maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
        {/* Grain overlay */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.03,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'grid', gridTemplateColumns: '1fr auto', gap: 80, alignItems: 'center' }}>
          <motion.div initial="hidden" animate="show" variants={staggerSlow}>
            <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 24, fontWeight: 600 }}>
              Portfolio — {new Date().getFullYear()}
            </motion.p>
            <motion.div variants={fadeUp}>
              <div style={{ fontSize: 'clamp(64px, 10vw, 120px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em', marginBottom: 8 }}>
                {firstName}
              </div>
              <div style={{ fontSize: 'clamp(64px, 10vw, 120px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em', color: primaryColor, marginBottom: 40 }}>
                {lastName || title}
              </div>
            </motion.div>
            <motion.p variants={fadeUp} style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 520, lineHeight: 1.7, marginBottom: 48 }}>
              {bio}
            </motion.p>
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="#work" style={{ background: primaryColor, color: '#000', padding: '14px 32px', borderRadius: 2, fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}>
                VIEW WORK
              </a>
              {profile.email && (
                <a href={`mailto:${profile.email}`} style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '14px 32px', borderRadius: 2, fontSize: 14, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em' }}>
                  GET IN TOUCH
                </a>
              )}
            </motion.div>
          </motion.div>

          {/* Avatar */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.4 }} style={{ flexShrink: 0 }}>
            <div style={{ width: 260, height: 260, borderRadius: '50%', padding: 3, background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profilePhoto
                  ? <img src={profilePhoto} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 72, fontWeight: 900, color: primaryColor }}>{initials}</span>}
              </div>
            </div>
            {profile.years_experience && (
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ color: primaryColor, fontWeight: 700, fontSize: 32 }}>{profile.years_experience}</span>
                <span style={{ display: 'block', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: 11 }}>Years Creating</span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* GALLERY / WORK */}
      {showSections['projects'] !== false && (
        <section id="work" style={{ padding: '100px 48px', maxWidth: 1400, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 16, fontWeight: 600 }}>
              Selected Work
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 64, lineHeight: 1 }}>
              Work & Projects
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, gridAutoRows: '280px' }}>
            {galleryItems.map((item, i) => (
              <motion.div key={i} variants={fadeUp}
                style={{ gridColumn: item.span, background: item.gradient, borderRadius: 4, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.3 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.3s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 28 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
                  <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 600 }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{item.title}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* ABOUT */}
      {showSections['about'] !== false && (
        <section id="about" style={{ padding: '100px 48px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={slideLeft}>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 24, fontWeight: 600 }}>About</p>
              <blockquote style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: 32, color: '#fff' }}>
                "{bio}"
              </blockquote>
              <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
                {[
                  { label: 'Available for', value: 'Freelance' },
                  { label: 'Based in', value: profile.city || 'Remote' },
                  { label: 'Experience', value: profile.years_experience ? `${profile.years_experience} yrs` : '5+ yrs' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: primaryColor }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={slideRight}>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 24, fontWeight: 600 }}>Disciplines</p>
              <motion.div variants={stagger}>
                {skillCategories.map((disc, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.1em' }}>0{i + 1}</span>
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{disc}</span>
                    <div style={{ marginLeft: 'auto', width: 24, height: 1, background: primaryColor }} />
                  </motion.div>
                ))}
              </motion.div>
              <div style={{ marginTop: 40, padding: '20px 24px', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: `1px solid ${primaryColor}30` }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
                  Open to: <span style={{ color: primaryColor, fontWeight: 600 }}>Freelance</span> &nbsp;·&nbsp;
                  <span style={{ color: primaryColor, fontWeight: 600 }}>Full-time</span> &nbsp;·&nbsp;
                  <span style={{ color: primaryColor, fontWeight: 600 }}>Commissions</span>
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* SKILLS */}
      {showSections['skills'] !== false && (
        <section id="skills" style={{ padding: '100px 48px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 16, fontWeight: 600 }}>
                Creative Stack
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 56 }}>
                Creative Toolkit
              </motion.h2>
              <motion.div variants={stagger} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {allSkills.slice(0, 16).map((tool, i) => (
                  <motion.span key={i} variants={fadeUp}
                    whileHover={{ scale: 1.05, borderColor: primaryColor }}
                    style={{ padding: '10px 20px', borderRadius: 2, border: '1px solid rgba(255,255,255,0.12)', fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500, cursor: 'default', transition: 'border-color 0.2s' }}>
                    {tool}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* EXPERIENCE */}
      {showSections['experience'] !== false && companies.length > 0 && (
        <section id="experience" style={{ padding: '100px 48px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 16, fontWeight: 600 }}>
                Clients & Studios
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 56 }}>
                Worked With
              </motion.h2>
              <motion.div variants={stagger}>
                {companies.map((company, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 48, fontWeight: 900, color: 'rgba(255,255,255,0.08)', width: 80, flexShrink: 0, letterSpacing: '-0.04em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>{company}</span>
                    <div style={{ marginLeft: 'auto', height: 1, width: 60, background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* EDUCATION */}
      {showSections['education'] !== false && profile.resume_facts_schools && profile.resume_facts_schools.length > 0 && (
        <section id="education" style={{ padding: '80px 48px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 16, fontWeight: 600 }}>Education</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 48 }}>Academic Background</motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                {profile.resume_facts_schools.map((school, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ padding: 32, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${primaryColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 2, background: primaryColor, opacity: 0.8 }} />
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{school}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{profile.education || 'Design & Visual Arts'}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      {showSections['contact'] !== false && (
        <section id="contact" style={{ padding: '120px 48px', background: heroGradient || `linear-gradient(135deg, ${primaryColor}15, ${accentColor}10)`, textAlign: 'center' }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} style={{ maxWidth: 800, margin: '0 auto' }}>
            <motion.p variants={fadeUp} style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor, marginBottom: 24, fontWeight: 600 }}>
              Let's Connect
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 32 }}>
              Let's create something beautiful
            </motion.h2>
            {profile.email && (
              <motion.a variants={fadeUp} href={`mailto:${profile.email}`}
                style={{ display: 'inline-block', fontSize: 'clamp(18px, 2.5vw, 28px)', color: accentColor, textDecoration: 'none', fontWeight: 700, letterSpacing: '-0.01em', borderBottom: `2px solid ${accentColor}`, paddingBottom: 4 }}>
                {profile.email}
              </motion.a>
            )}
            <motion.div variants={fadeUp} style={{ marginTop: 56, display: 'flex', justifyContent: 'center', gap: 24 }}>
              {profile.linkedin && <a href={profile.linkedin} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LinkedIn</a>}
              {profile.github && <a href={profile.github} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>GitHub</a>}
              {profile.portfolio && <a href={profile.portfolio} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Portfolio</a>}
            </motion.div>
          </motion.div>
        </section>
      )}
    </div>
  )
}
