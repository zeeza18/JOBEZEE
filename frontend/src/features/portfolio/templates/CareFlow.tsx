import { motion } from 'framer-motion'
import { Stethoscope, Activity, FlaskConical, GraduationCap, Building2, Heart } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

const fadeUp: any = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.65 } } }
const fadeIn: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.7 } } }
const stagger: any = { show: { transition: { staggerChildren: 0.1 } } }

const SPECIALTIES = [
  { label: 'Cardiology',      Icon: Heart       },
  { label: 'Internal Med',    Icon: Activity    },
  { label: 'Clinical Research',Icon: FlaskConical },
  { label: 'Diagnostics',     Icon: Stethoscope },
  { label: 'Surgery',         Icon: Activity    },
  { label: 'Critical Care',   Icon: Heart       },
]
const MOCK_JOURNALS = ['NEJM', 'Lancet', 'JAMA', 'BMJ', 'Nature Medicine']

export default function CareFlow({
  profile, primaryColor, accentColor, showSections, heroGradient, profilePhoto, textOverrides,
}: PortfolioTemplateProps) {
  const TEAL  = primaryColor || '#0d9488'
  const LIGHT = accentColor  || '#5eead4'
  const WHITE = '#ffffff'

  const name     = textOverrides?.name  || profile.full_name || profile.preferred_name || 'Healthcare Professional'
  const title    = textOverrides?.title || profile.current_job_title || profile.target_role || 'Physician'
  const bio      = textOverrides?.bio   || profile.headline || 'Dedicated healthcare professional committed to evidence-based practice and exceptional patient outcomes.'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const companies  = profile.resume_facts_companies || []
  const projects   = profile.resume_facts_projects  || []
  const schools    = profile.resume_facts_schools   || []
  const metrics    = profile.resume_facts_metrics   || []

  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]

  // Split skills into clinical categories — real data only
  const clinicalSkills  = allSkills.slice(0, 6)
  const procedures      = allSkills.slice(6, 12)
  const medicalSystems  = profile.skills_tools?.length ? profile.skills_tools.slice(0, 6) : allSkills.slice(12, 18)

  const heroStats = [
    { label: 'Years Practice',    val: `${profile.years_experience || 12}+` },
    { label: 'Patients Treated',  val: metrics[0] || '4,800+' },
    { label: 'Research Papers',   val: metrics[1] || '18+' },
    { label: 'Facilities',        val: metrics[2] || companies.length || '6' },
  ]

  const credentials = title.toUpperCase().includes('DOCTOR') || title.toUpperCase().includes('PHYSICIAN') ? 'MD' :
    title.toUpperCase().includes('NURSE') ? 'RN' :
    title.toUpperCase().includes('THERAPIST') ? 'PhD' :
    title.toUpperCase().includes('SURGEON') ? 'MD, FACS' : 'MD/PhD'

  return (
    <div style={{ background: WHITE, color: '#1f2937', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e5f9f6', boxShadow: '0 1px 12px rgba(13,148,136,0.08)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 60px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: TEAL, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: WHITE, fontSize: 14, fontWeight: 700 }}>+</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, color: TEAL, letterSpacing: '-0.01em' }}>{name.split(' ')[0]}, {credentials}</span>
          </div>
          <div style={{ display: 'flex', gap: 36, fontSize: 14, color: '#6b7280' }}>
            {['Specializations', 'Affiliations', 'Research', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
                {s}
              </a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`} style={{ background: TEAL, color: WHITE, padding: '10px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Book Consultation
            </a>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 70 }}>
        {/* Left */}
        <motion.div initial="hidden" animate="show" variants={stagger}
          style={{ padding: '80px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.div variants={fadeIn} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: `${TEAL}12`, borderRadius: 20, marginBottom: 24, width: 'fit-content' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL }} />
            <span style={{ fontSize: 12, color: TEAL, fontWeight: 600, letterSpacing: '0.05em' }}>AVAILABLE FOR CONSULTATION</span>
          </motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(38px, 4vw, 58px)', fontWeight: 800, lineHeight: 1.1, color: '#111827', letterSpacing: '-0.03em', marginBottom: 8 }}>
            {name}
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: 20, color: TEAL, fontWeight: 600, marginBottom: 20, letterSpacing: '-0.01em' }}>
            {credentials} &nbsp;·&nbsp; {title}
          </motion.p>
          <motion.div variants={fadeIn} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: `${LIGHT}25`, border: `1px solid ${TEAL}30`, borderRadius: 4, marginBottom: 24, width: 'fit-content' }}>
            <span style={{ fontSize: 13, color: TEAL, fontWeight: 500 }}>{profile.target_role || profile.current_job_title || 'General Medicine'}</span>
          </motion.div>
          <motion.p variants={fadeUp} style={{ fontSize: 16, lineHeight: 1.85, color: '#4b5563', marginBottom: 40, maxWidth: 460 }}>
            {bio}
          </motion.p>
          {/* Stats */}
          <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
            {heroStats.map((stat, i) => (
              <motion.div key={i} variants={fadeUp} style={{ padding: '16px 12px', background: '#f0fdfa', border: `1px solid ${TEAL}25`, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: TEAL, lineHeight: 1 }}>{stat.val}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, letterSpacing: '0.05em', lineHeight: 1.4 }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12 }}>
            {profile.email && (
              <a href={`mailto:${profile.email}`} style={{ background: TEAL, color: WHITE, padding: '14px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                Request Consultation
              </a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin} style={{ border: `2px solid ${TEAL}40`, color: TEAL, padding: '14px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                Professional Profile
              </a>
            )}
          </motion.div>
        </motion.div>

        {/* Right: Teal gradient panel + avatar */}
        <div style={{ background: heroGradient || `linear-gradient(135deg, #f0fdfa, #ccfbf1, #99f6e4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} style={{ textAlign: 'center' }}>
            {/* Avatar */}
            <div style={{ width: 200, height: 200, borderRadius: '50%', background: `linear-gradient(135deg, ${TEAL}, ${LIGHT})`, padding: 4, margin: '0 auto 28px', boxShadow: `0 20px 60px ${TEAL}40` }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profilePhoto
                  ? <img src={profilePhoto} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 60, fontWeight: 800, color: TEAL }}>{initials}</span>}
              </div>
            </div>
            {/* Affiliation info */}
            {companies.slice(0, 2).map((company, i) => (
              <div key={i} style={{ marginBottom: 12, padding: '12px 20px', background: 'rgba(255,255,255,0.8)', borderRadius: 8, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.9)' }}>
                <div style={{ fontSize: 12, color: TEAL, fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}><Building2 style={{ width: 14, height: 14 }} /> {company}</div>
              </div>
            ))}
            {/* Cross decoration */}
            <div style={{ position: 'absolute', top: 40, right: 40, opacity: 0.15 }}>
              <div style={{ width: 60, height: 12, background: TEAL, borderRadius: 2 }} />
              <div style={{ width: 12, height: 60, background: TEAL, borderRadius: 2, position: 'absolute', top: -24, left: 24 }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* SPECIALIZATIONS */}
      {showSections['skills'] !== false && (
        <section id="specializations" style={{ padding: '100px 60px', background: '#f9fafb' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEAL, marginBottom: 12, fontWeight: 600 }}>
                Clinical Expertise
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 64, color: '#111827' }}>
                Specializations & Skills
              </motion.h2>
              {/* Three columns by skill type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                {[
                  { heading: 'Clinical Skills',         items: clinicalSkills, Icon: Stethoscope },
                  { heading: 'Procedures & Treatments', items: procedures,     Icon: Activity    },
                  { heading: 'Medical Systems',         items: medicalSystems, Icon: FlaskConical },
                ].map((col, ci) => (
                  <motion.div key={ci} variants={fadeIn} style={{ background: WHITE, borderRadius: 12, padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                    <col.Icon style={{ width: 32, height: 32, color: TEAL, marginBottom: 16 }} />
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>{col.heading}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {col.items.slice(0, 6).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: '#374151' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* Specialty grid */}
              <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginTop: 48 }}>
                {SPECIALTIES.map((spec, i) => (
                  <motion.div key={i} variants={fadeUp}
                    whileHover={{ y: -4, boxShadow: `0 12px 32px ${TEAL}25` }}
                    style={{ padding: '24px 16px', background: WHITE, borderRadius: 10, textAlign: 'center', border: '1px solid #f3f4f6', transition: 'box-shadow 0.3s, transform 0.3s', cursor: 'default' }}>
                    <spec.Icon style={{ width: 28, height: 28, color: TEAL, margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.05em' }}>{spec.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* HOSPITAL AFFILIATIONS */}
      {showSections['experience'] !== false && companies.length > 0 && (
        <section id="affiliations" style={{ padding: '100px 60px' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEAL, marginBottom: 12, fontWeight: 600 }}>
                Professional Experience
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 64, color: '#111827' }}>
                Hospital Affiliations
              </motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                {companies.map((company, i) => (
                  <motion.div key={i} variants={fadeUp}
                    whileHover={{ y: -4, boxShadow: '0 20px 48px rgba(0,0,0,0.1)' }}
                    style={{ padding: '32px', background: WHITE, borderRadius: 12, border: '1px solid #f3f4f6', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'transform 0.3s, box-shadow 0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                      <div style={{ width: 48, height: 48, background: `${TEAL}15`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Building2 style={{ width: 24, height: 24, color: TEAL }} /></div>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{company}</h3>
                        <p style={{ fontSize: 14, color: TEAL, fontWeight: 600 }}>{title}</p>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                      {2024 - i * 3} – {i === 0 ? 'Present' : 2024 - (i - 1) * 3}
                    </div>
                    {projects[i] && (
                      <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>{projects[i]}</p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
                      {['Patient Care', 'Research', 'Teaching'].map(tag => (
                        <span key={tag} style={{ fontSize: 11, padding: '3px 10px', background: `${TEAL}12`, color: TEAL, borderRadius: 20, fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* RESEARCH & PUBLICATIONS */}
      {showSections['projects'] !== false && (
        <section id="research" style={{ padding: '100px 60px', background: '#f0fdfa' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEAL, marginBottom: 12, fontWeight: 600 }}>
                Academic Contributions
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 64, color: '#111827' }}>
                Research & Publications
              </motion.h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(projects.length > 0 ? projects : ['Outcomes of Novel Treatment Protocol in Tertiary Care Settings', 'Longitudinal Study of Patient Recovery Metrics Post-Intervention', 'Evidence-Based Approaches in Modern Clinical Practice']).map((pub, i) => (
                  <motion.div key={i} variants={fadeUp}
                    style={{ padding: '28px 32px', background: WHITE, borderRadius: 10, border: '1px solid #e5f9f6', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
                    <div style={{ width: 48, height: 48, background: `${TEAL}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: TEAL, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 17, fontWeight: 600, color: '#111827', marginBottom: 8, lineHeight: 1.5 }}>{pub}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{name}, et al.</span>
                        <span style={{ fontSize: 12, padding: '3px 10px', background: `${TEAL}15`, color: TEAL, borderRadius: 4, fontWeight: 700 }}>
                          {MOCK_JOURNALS[i % MOCK_JOURNALS.length]}
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>2024</span>
                        {metrics[i] && <span style={{ fontSize: 12, color: '#6b7280' }}>Citations: {metrics[i]}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* EDUCATION */}
      {showSections['education'] !== false && schools.length > 0 && (
        <section id="education" style={{ padding: '80px 60px' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEAL, marginBottom: 12, fontWeight: 600 }}>Education</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 44, fontWeight: 800, color: '#111827', marginBottom: 48, letterSpacing: '-0.03em' }}>Academic Training</motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                {schools.map((school, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ padding: '28px', background: WHITE, borderRadius: 10, border: '1px solid #f3f4f6', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <GraduationCap style={{ width: 28, height: 28, color: TEAL, marginBottom: 12 }} />
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{school}</p>
                    <p style={{ fontSize: 14, color: TEAL, fontWeight: 600, marginBottom: 4 }}>{profile.education || 'Medicine'}</p>
                    <p style={{ fontSize: 13, color: '#9ca3af' }}>{2024 - i * 4} – {2024 - i * 4 + 4}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      {showSections['contact'] !== false && (
        <section id="contact" style={{ padding: '100px 60px', background: `linear-gradient(135deg, #f0fdfa, #ccfbf1)` }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeIn} style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}><Stethoscope style={{ width: 40, height: 40, color: TEAL }} /></motion.div>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEAL, marginBottom: 16, fontWeight: 600 }}>
                Consultations
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
                I'm available for consultation
              </motion.h2>
              <motion.p variants={fadeUp} style={{ fontSize: 17, color: '#4b5563', lineHeight: 1.85, marginBottom: 40 }}>
                {profile.city && `Based in ${profile.city}${profile.country ? `, ${profile.country}` : ''}. `}
                Available for patient consultations, research collaborations, speaking engagements, and advisory roles.
              </motion.p>
              <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {profile.email && (
                  <a href={`mailto:${profile.email}`} style={{ background: TEAL, color: WHITE, padding: '16px 40px', borderRadius: 8, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: `0 8px 32px ${TEAL}40` }}>
                    Request Consultation
                  </a>
                )}
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} style={{ border: `2px solid ${TEAL}`, color: TEAL, padding: '16px 40px', borderRadius: 8, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
                    Call Office
                  </a>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  )
}
