import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'

const fadeUp: any = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7 } } }
const fadeIn: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8 } } }
const stagger: any = { show: { transition: { staggerChildren: 0.1 } } }
const staggerFast: any = { show: { transition: { staggerChildren: 0.07 } } }

const MARQUEE_ITEMS = ['Brand Strategy', 'Growth Marketing', 'Content Creation', 'Paid Media', 'SEO/SEM', 'Social Media', 'Email Campaigns', 'Performance Marketing', 'Influencer Collab', 'Analytics']
const CHANNEL_CARDS = [
  { abbr: 'SM', name: 'Social Media',      tools: ['Instagram', 'TikTok', 'LinkedIn'],   pct: 95 },
  { abbr: 'EM', name: 'Email Marketing',   tools: ['Klaviyo', 'Mailchimp', 'HubSpot'],    pct: 88 },
  { abbr: 'SE', name: 'SEO / SEM',         tools: ['Google Ads', 'SEMrush', 'Ahrefs'],    pct: 84 },
  { abbr: 'PA', name: 'Paid Advertising',  tools: ['Meta Ads', 'Google Ads', 'TikTok Ads'], pct: 91 },
  { abbr: 'CM', name: 'Content Marketing', tools: ['WordPress', 'Figma', 'Canva'],         pct: 90 },
  { abbr: 'AN', name: 'Analytics',         tools: ['GA4', 'Mixpanel', 'Tableau'],          pct: 86 },
]

const BRAND_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#1dd1a1', '#fd9644', '#a29bfe']

export default function BrandStudio({
  profile, primaryColor, accentColor, showSections, heroGradient, textOverrides,
}: PortfolioTemplateProps) {
  const name     = textOverrides?.name  || profile.full_name || profile.preferred_name || 'Marketing Strategist'
  const title    = textOverrides?.title || profile.current_job_title || profile.target_role || 'Brand & Growth Marketer'
  const bio      = textOverrides?.bio   || profile.headline || 'I build brands that people talk about and campaigns that move the needle — measurably.'
  // initials unused — avatar not shown in this template

  const companies = profile.resume_facts_companies || []
  const projects  = profile.resume_facts_projects  || []
  const schools   = profile.resume_facts_schools   || []
  const metrics   = profile.resume_facts_metrics   || []

  const allSkills = ['Meta Ads', 'Google Ads', 'HubSpot', 'Klaviyo', 'Hootsuite', 'Canva', 'Figma', 'Google Analytics', 'Ahrefs', 'SEMrush', 'Mailchimp', 'TikTok Ads', 'Tableau', 'Salesforce']

  const metricsWall = [
    { val: metrics[0] || '24M+',   label: 'Total Impressions' },
    { val: metrics[1] || '8.4%',   label: 'Avg. Click-Through Rate' },
    { val: metrics[2] || '$2.1M',  label: 'Revenue Attributed' },
    { val: metrics[3] || '340%',   label: 'Average Campaign ROI' },
    { val: `${profile.years_experience || '6'}+`, label: 'Years Growing Brands' },
    { val: companies.length > 0 ? `${companies.length}+` : '8+', label: 'Brands Scaled' },
  ]

  const heroBg = heroGradient || `linear-gradient(135deg, ${primaryColor || '#7c3aed'} 0%, ${accentColor || '#ec4899'} 50%, #f97316 100%)`

  return (
    <div style={{ background: '#0f0f14', color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(15,15,20,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 56px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', background: heroBg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {name.split(' ')[0]}
          </span>
          <div style={{ display: 'flex', gap: 36, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {['Campaigns', 'Brands', 'Channels', 'Contact'].map(s => (
              <a key={s} href={`#${s.toLowerCase()}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
                {s}
              </a>
            ))}
          </div>
          {profile.email && (
            <a href={`mailto:${profile.email}`} style={{ background: heroBg, color: '#fff', padding: '10px 24px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Let's Grow →
            </a>
          )}
        </div>
      </nav>

      {/* HERO — full-bleed gradient */}
      <section id="hero" style={{ background: heroBg, minHeight: '100vh', paddingTop: 68, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Noise overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', pointerEvents: 'none' }} />

        <motion.div initial="hidden" animate="show" variants={stagger} style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 56px', position: 'relative' }}>
          <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 24, fontWeight: 600 }}>
            Brand & Growth Marketing
          </motion.p>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(56px, 9vw, 112px)', fontWeight: 900, lineHeight: 0.92, letterSpacing: '-0.04em', color: '#fff', marginBottom: 24 }}>
            {name}
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 48, maxWidth: 640, lineHeight: 1.5 }}>
            {title}
          </motion.p>
          <motion.p variants={fadeUp} style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 560, lineHeight: 1.8, marginBottom: 48 }}>
            {bio}
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16 }}>
            <a href="#campaigns" style={{ background: '#fff', color: '#0f0f14', padding: '16px 36px', borderRadius: 6, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              View Work
            </a>
            {profile.email && (
              <a href={`mailto:${profile.email}`} style={{ border: '2px solid rgba(255,255,255,0.4)', color: '#fff', padding: '16px 36px', borderRadius: 6, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                Get in Touch
              </a>
            )}
          </motion.div>
        </motion.div>

        {/* Scrolling marquee */}
        <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', padding: '12px 0' }}>
          <motion.div
            animate={{ x: [0, -1800] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'flex', gap: 0, whiteSpace: 'nowrap' }}>
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} style={{ fontSize: 13, fontWeight: 600, padding: '0 32px', color: 'rgba(255,255,255,0.7)', borderRight: '1px solid rgba(255,255,255,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Bottom stats bar */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '24px 56px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 60, flexWrap: 'wrap' }}>
            {metricsWall.slice(0, 4).map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{m.val}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAMPAIGN SHOWCASE */}
      {showSections['projects'] !== false && (
        <section id="campaigns" style={{ padding: '100px 56px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor || '#ec4899', marginBottom: 16, fontWeight: 600 }}>
                Campaign Work
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 72 }}>
                Case Studies
              </motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
                {(projects.length > 0 ? projects : ['Brand Relaunch Campaign', 'Performance Marketing Scale', 'Influencer Partnership Series']).map((proj, i) => {
                  const mockMetrics = [
                    { label: 'Reach',       val: `${(i + 1) * 1.2 + 0.8}M` },
                    { label: 'Conversions', val: `${(i + 1) * 4 + 8}K` },
                    { label: 'ROI',         val: `${(i + 1) * 80 + 180}%` },
                  ]
                  const skillTags = allSkills.slice(i * 2, i * 2 + 3)
                  return (
                    <motion.div key={i} variants={fadeUp}
                      whileHover={{ y: -6, borderColor: primaryColor || '#7c3aed' }}
                      style={{ padding: '36px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, transition: 'transform 0.3s, border-color 0.3s' }}>
                      <div style={{ fontSize: 48, fontWeight: 900, color: 'rgba(255,255,255,0.08)', letterSpacing: '-0.04em', marginBottom: 16 }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, lineHeight: 1.3 }}>{proj}</h3>
                      {/* Mock metrics */}
                      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                        {mockMetrics.map((m, j) => (
                          <div key={j} style={{ textAlign: 'center', flex: 1, padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: primaryColor || '#7c3aed' }}>{m.val}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: '0.05em' }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* Before/after bars */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Performance Lift</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>Before</div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                              <div style={{ height: '100%', width: '28%', background: 'rgba(255,255,255,0.2)', borderRadius: 3 }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: accentColor || '#ec4899', marginBottom: 3 }}>After</div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                              <motion.div initial={{ width: '28%' }} whileInView={{ width: `${60 + i * 10}%` }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3 }}
                                style={{ height: '100%', background: `linear-gradient(to right, ${primaryColor || '#7c3aed'}, ${accentColor || '#ec4899'})`, borderRadius: 3 }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(skillTags.length > 0 ? skillTags : ['Strategy', 'Analytics', 'Creative']).map(tag => (
                          <span key={tag} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, color: 'rgba(255,255,255,0.5)' }}>{tag}</span>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* BRANDS WORKED WITH */}
      {showSections['experience'] !== false && companies.length > 0 && (
        <section id="brands" style={{ padding: '80px 56px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor || '#ec4899', marginBottom: 16, fontWeight: 600 }}>
                Client Portfolio
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ textAlign: 'center', fontSize: 44, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 64 }}>
                Brands I've Grown
              </motion.h2>
              <motion.div variants={staggerFast} style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
                {companies.map((company, i) => (
                  <motion.div key={i} variants={fadeUp}
                    whileHover={{ scale: 1.05, y: -4 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, transition: 'transform 0.3s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: BRAND_COLORS[i % BRAND_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                      {company.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{company}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CHANNEL EXPERTISE */}
      {showSections['skills'] !== false && (
        <section id="channels" style={{ padding: '100px 56px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor || '#ec4899', marginBottom: 16, fontWeight: 600 }}>
                Channel Mastery
              </motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 64 }}>
                How I Drive Growth
              </motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {CHANNEL_CARDS.map((ch, i) => (
                  <motion.div key={i} variants={fadeUp}
                    whileHover={{ y: -6, borderColor: primaryColor || '#7c3aed' }}
                    style={{ padding: '36px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, transition: 'transform 0.3s, border-color 0.3s' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${primaryColor || '#7c3aed'}22`, border: `1px solid ${primaryColor || '#7c3aed'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: primaryColor || '#7c3aed', marginBottom: 16 }}>{ch.abbr}</div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{ch.name}</h3>
                    {/* Proficiency bar */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                        <span>Proficiency</span><span>{ch.pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${ch.pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.08 }}
                          style={{ height: '100%', background: `linear-gradient(to right, ${primaryColor || '#7c3aed'}, ${accentColor || '#ec4899'})` }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ch.tools.map(tool => (
                        <span key={tool} style={{ fontSize: 12, padding: '4px 10px', background: `${primaryColor || '#7c3aed'}20`, color: primaryColor || '#a78bfa', borderRadius: 20, fontWeight: 500 }}>{tool}</span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* METRICS WALL */}
      <section style={{ padding: '100px 56px', background: '#060609' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} style={{ textAlign: 'center', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor || '#ec4899', marginBottom: 16, fontWeight: 600 }}>
              Results
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ textAlign: 'center', fontSize: 44, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 80 }}>
              Numbers That Matter
            </motion.h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {metricsWall.map((m, i) => (
                <motion.div key={i} variants={fadeUp} style={{ padding: '56px 40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${primaryColor || '#7c3aed'}08, transparent)`, pointerEvents: 'none' }} />
                  <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.03em', background: `linear-gradient(135deg, ${primaryColor || '#7c3aed'}, ${accentColor || '#ec4899'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1, marginBottom: 16 }}>
                    {m.val}
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>{m.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      {showSections['about'] !== false && (
        <section style={{ padding: '100px 56px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeIn} style={{ fontSize: 80, color: primaryColor || '#7c3aed', lineHeight: 0.6, marginBottom: 40, fontFamily: 'Georgia, serif' }}>"</motion.div>
              <motion.blockquote variants={fadeUp} style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 500, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', marginBottom: 32 }}>
                {profile.headline || `${name} transformed our digital presence and delivered results beyond what we thought possible. A true growth partner.`}
              </motion.blockquote>
              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${primaryColor || '#7c3aed'}, ${accentColor || '#ec4899'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                  {companies[0]?.charAt(0) || 'C'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>CEO, {companies[0] || 'Brand Partner'}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Client Testimonial</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* EDUCATION */}
      {showSections['education'] !== false && schools.length > 0 && (
        <section id="education" style={{ padding: '80px 56px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor || '#ec4899', marginBottom: 16, fontWeight: 600 }}>Education</motion.p>
              <motion.h2 variants={fadeUp} style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 48 }}>Background</motion.h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {schools.map((school, i) => (
                  <motion.div key={i} variants={fadeUp} style={{ padding: '28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: primaryColor || '#7c3aed', opacity: 0.7, marginBottom: 12 }} />
                    <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{school}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{profile.education || 'Marketing & Communications'}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      {showSections['contact'] !== false && (
        <section id="contact" style={{ padding: '120px 56px', background: heroBg, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', pointerEvents: 'none' }} />
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
            <motion.p variants={fadeUp} style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 24, fontWeight: 600 }}>
              Let's Collaborate
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, color: '#fff', marginBottom: 32 }}>
              Let's grow together
            </motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 52 }}>
              {profile.city && `Based in ${profile.city}. `}Ready to build your next campaign, scale your brand, or craft a strategy that converts.
            </motion.p>
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {profile.email && (
                <a href={`mailto:${profile.email}`} style={{ background: '#fff', color: '#0f0f14', padding: '18px 48px', borderRadius: 8, fontSize: 16, fontWeight: 800, textDecoration: 'none' }}>
                  Start a Project →
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin} style={{ border: '2px solid rgba(255,255,255,0.5)', color: '#fff', padding: '18px 48px', borderRadius: 8, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
                  LinkedIn
                </a>
              )}
            </motion.div>
          </motion.div>
        </section>
      )}
    </div>
  )
}
