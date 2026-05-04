import { motion } from 'framer-motion'

import type { PortfolioTemplateProps } from '../types'
import { getThemeById } from '../themes/themeSystem'

// ── Motion helpers ───────────────────────────────────────────────────────────
const fadeUp: any = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } } }
const slideLeft: any = { hidden: { opacity: 0, x: -50 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } } }
const stagger: any = { show: { transition: { staggerChildren: 0.12 } } }

// ── Vintage color system ────────────────────────────────────────────────────
const COLORS = {
  primary: '#2d1b00',
  secondary: '#92400e',
  accent: '#b45309',
  background: '#fef3c7',
  surface: '#fff7ed',
  text: '#2d1b00',
  textMuted: '#92400e',
  card: '#fffbf0',
  border: '#d97706',
  shadow: '#b45309',
}

// ── Typography system ───────────────────────────────────────────────────────
const FONTS = {
  heading: "'Playfair Display', 'Georgia', serif",
  body: "'Lora', 'Times New Roman', serif",
  mono: "'Courier Prime', 'Courier New', monospace",
}

// ── Decorative components ────────────────────────────────────────────────────

// Vintage paper texture overlay
function PaperTexture() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-30"
      style={{
        backgroundImage: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E"),
          linear-gradient(180deg, rgba(255,235,205,0.3) 0%, rgba(210,180,140,0.2) 100%)
        `,
        mixBlendMode: 'multiply',
      }}
    />
  )
}

// Worn edge decoration
function WornEdge({ position }: { position: 'top' | 'bottom' | 'left' | 'right' }) {
  const styles: Record<string, React.CSSProperties> = {
    top: {
      top: 0, left: 0, right: 0, height: 8,
      background: 'linear-gradient(to bottom, #fef3c7 0%, transparent 100%)',
    },
    bottom: {
      bottom: 0, left: 0, right: 0, height: 8,
      background: 'linear-gradient(to top, #fef3c7 0%, transparent 100%)',
    },
    left: {
      top: 0, bottom: 0, left: 0, width: 8,
      background: 'linear-gradient(to right, #fef3c7 0%, transparent 100%)',
    },
    right: {
      top: 0, bottom: 0, right: 0, width: 8,
      background: 'linear-gradient(to left, #fef3c7 0%, transparent 100%)',
    },
  }
  return <div className="absolute pointer-events-none" style={styles[position]} />
}

// Vintage ornamental divider
function OrnamentalDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${COLORS.accent})` }} />
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: FONTS.mono, color: COLORS.accent, fontSize: '10px' }}>✦</span>
        <span style={{ fontFamily: FONTS.heading, color: COLORS.primary, fontSize: '14px' }}>❖</span>
        <span style={{ fontFamily: FONTS.mono, color: COLORS.accent, fontSize: '10px' }}>✦</span>
      </div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${COLORS.accent})` }} />
    </div>
  )
}

// Vintage stamp badge
function _StampBadge({ text, color = COLORS.accent }: { text: string; color?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 2 }}
      className="relative px-4 py-2 border-2 border-dashed"
      style={{
        borderColor: color,
        background: `${color}15`,
        transform: `rotate(${(text.length % 3 - 1) * 2}deg)`,
      }}
    >
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ fontFamily: FONTS.mono, color }}
      >
        {text}
      </span>
      <div className="absolute inset-0" style={{
        background: `radial-gradient(circle at 2px 2px, ${color}20 1px, transparent 1px)`,
        backgroundSize: '6px 6px',
      }} />
    </motion.div>
  )
}

// Polaroid-style frame
function _PolaroidFrame({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, rotate: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="relative bg-white p-3 pb-8 shadow-md"
      style={{
        boxShadow: '3px 3px 0px rgba(180, 83, 9, 0.3), inset 0 0 0 1px rgba(180, 83, 9, 0.1)',
        transform: `rotate(${(Math.random() * 4 - 2).toFixed(2)}deg)`,
      }}
    >
      <div className="overflow-hidden">
        {children}
      </div>
      {caption && (
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-mono text-gray-600 pt-4">
          {caption}
        </p>
      )}
      <WornEdge position="bottom" />
    </motion.div>
  )
}

// ── Section wrapper with vintage styling ────────────────────────────────────
function VintageSection({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative py-16 md:py-24">
      <PaperTexture />
      {children}
    </section>
  )
}

// Vintage card with worn edges
function VintageCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`relative bg-gradient-to-br from-amber-50 to-orange-50 p-8 ${className}`}
      style={{
        border: `2px solid ${COLORS.border}`,
        boxShadow: `2px 2px 0px ${COLORS.shadow}`,
        borderRadius: 0,
      }}
    >
      <WornEdge position="top" />
      <WornEdge position="bottom" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />
      {children}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TechnicalRetro({
  profile,
  primaryColor: _pc,
  accentColor: _ac,
  showSections,
  profilePhoto,
  textOverrides,
}: PortfolioTemplateProps) {
  // Get theme config for this retro theme
  const _themeConfig = getThemeById('technical-retro')

  // Profile data with fallbacks
  const name = textOverrides?.name || profile.full_name || profile.preferred_name || 'John Doe'
  const title = textOverrides?.title || profile.current_job_title || profile.target_role || 'Software Engineer'
  const bio = textOverrides?.bio || profile.headline || `Passionate ${title} with expertise in building robust, scalable solutions.`
  const allSkills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || []),
    ...(profile.skills_frameworks || []),
  ].filter(Boolean)
  const firstName = name.split(' ')[0]
  const lastName = name.split(' ').slice(1).join(' ')
  const initials = name.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase()

  // Combine all profile data for various sections
  const experienceItems = profile.resume_facts_companies || []
  const projectItems = profile.resume_facts_projects || []
  const educationItems = profile.resume_facts_schools || []
  const certItems = profile.resume_facts_projects || []

  // Split skills into categories for vintage bar chart display
  const skillGroups = [
    { label: 'Languages', skills: profile.skills_languages || [] },
    { label: 'Frameworks', skills: profile.skills_frameworks || [] },
    { label: 'Tools', skills: profile.skills_tools || [] },
  ].filter(g => g.skills.length > 0)

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: COLORS.background,
        color: COLORS.text,
        fontFamily: FONTS.body,
      }}
    >
      {/* ── GLOBAL STYLES ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Lora:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap');

        .retro-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .retro-body {
          font-family: 'Lora', 'Times New Roman', serif;
          line-height: 1.8;
        }

        .retro-mono {
          font-family: 'Courier Prime', 'Courier New', monospace;
        }

        .vintage-underline {
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 4px;
          text-decoration-color: currentColor;
        }

        .sepia-filter {
          filter: sepia(0.4) contrast(0.95) brightness(0.95);
        }

        .vintage-frame {
          border: 3px double ${COLORS.border};
          position: relative;
        }

        .vintage-frame::before {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid ${COLORS.accent}40;
          pointer-events: none;
        }

        .typewriter-text {
          font-family: 'Courier Prime', monospace;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        @keyframes paperFold {
          0%, 100% { transform: perspective(1000px) rotateX(0deg); }
          50% { transform: perspective(1000px) rotateX(2deg); }
        }

        @keyframes vintageFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.8; }
          94% { opacity: 1; }
          95% { opacity: 0.9; }
          96% { opacity: 1; }
        }

        .vintage-flicker {
          animation: vintageFlicker 4s infinite;
        }

        ::selection {
          background: ${COLORS.accent}40;
          color: ${COLORS.primary};
        }

        ::-webkit-scrollbar {
          width: 12px;
        }

        ::-webkit-scrollbar-track {
          background: ${COLORS.surface};
        }

        ::-webkit-scrollbar-thumb {
          background: ${COLORS.border};
          border: 2px solid ${COLORS.surface};
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.accent};
        }
      `}</style>

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background: `
            linear-gradient(135deg, #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #fbbf24 75%, #fef3c7 100%),
            radial-gradient(ellipse at 30% 20%, rgba(180, 83, 9, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(146, 64, 14, 0.1) 0%, transparent 50%)
          `,
        }}
      >
        <PaperTexture />

        {/* Decorative vintage frames */}
        <motion.div
          animate={{ rotate: 0 }}
          className="absolute top-8 left-8 w-32 h-32 border-2 border-dashed border-amber-700/30 opacity-50"
        />
        <motion.div
          animate={{ rotate: 0 }}
          className="absolute bottom-8 right-8 w-40 h-40 border-2 border-dashed border-amber-700/30 opacity-50"
        />
        <div className="absolute top-1/4 right-1/4 w-16 h-16 opacity-20" style={{ color: COLORS.accent, fontSize: '48px' }}>❧</div>
        <div className="absolute bottom-1/4 left-1/4 w-16 h-16 opacity-20" style={{ color: COLORS.accent, fontSize: '48px' }}>✧</div>

        {/* Central hero content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mb-8"
          >
            <p className="typewriter-text text-sm mb-6 tracking-widest" style={{ color: COLORS.secondary }}>
              — Portfolio —
            </p>

            {/* Vintage name display with serif typography */}
            <div className="relative inline-block">
              <h1
                className="retro-heading text-6xl md:text-8xl lg:text-9xl leading-none mb-4 vintage-flicker"
                style={{
                  color: COLORS.primary,
                  textShadow: '3px 3px 0px rgba(180, 83, 9, 0.2)',
                }}
              >
                {firstName}
              </h1>
              <h1
                className="retro-heading text-6xl md:text-8xl lg:text-9xl leading-none mb-6"
                style={{
                  color: COLORS.secondary,
                  textShadow: '2px 2px 0px rgba(180, 83, 9, 0.15)',
                }}
              >
                {lastName}
              </h1>
              {/* Underline decoration */}
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
            </div>
          </motion.div>

          {/* Title with vintage styling */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-700" />
              <p className="typewriter-text text-sm tracking-widest" style={{ color: COLORS.accent }}>
                {title}
              </p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-700" />
            </div>
          </motion.div>

          {/* Bio / tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="retro-body text-lg md:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: COLORS.textMuted }}
          >
            {bio}
          </motion.p>

          {/* Profile photo with vintage frame */}
          {profilePhoto && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="relative inline-block"
            >
              <div
                className="relative p-4 bg-white vintage-frame"
                style={{ transform: 'rotate(-2deg)' }}
              >
                <img
                  src={profilePhoto}
                  alt={name}
                  className="w-40 h-40 md:w-48 md:h-48 object-cover sepia-filter"
                  style={{ filter: 'sepia(0.3) contrast(1.05)' }}
                />
                {/* Polaroid-style caption */}
                <div className="absolute -bottom-6 left-0 right-0 text-center">
                  <span className="retro-mono text-xs" style={{ color: COLORS.secondary }}>
                    Circa {new Date().getFullYear()}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Call to action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-16 flex items-center justify-center gap-6"
          >
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="retro-mono text-xs uppercase tracking-widest px-6 py-3 border-2 transition-all hover:translate-x-1"
                style={{
                  borderColor: COLORS.primary,
                  color: COLORS.primary,
                  boxShadow: '2px 2px 0px ' + COLORS.shadow,
                }}
              >
                Contact Me
              </a>
            )}
            <a
              href="#about"
              className="retro-mono text-xs uppercase tracking-widest px-6 py-3 transition-all hover:translate-x-1"
              style={{
                background: COLORS.primary,
                color: COLORS.surface,
                boxShadow: '2px 2px 0px ' + COLORS.shadow,
              }}
            >
              View Portfolio
            </a>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <span className="retro-mono text-xs tracking-widest" style={{ color: COLORS.secondary }}>
              ↓ Scroll ↓
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT SECTION ───────────────────────────────────────────────────── */}
      {showSections.about && (
        <VintageSection id="about">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Section header */}
              <div className="text-center mb-12">
                <motion.p variants={fadeUp} className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                  Section I
                </motion.p>
                <motion.h2 variants={fadeUp} className="retro-heading text-4xl md:text-5xl mb-4" style={{ color: COLORS.primary }}>
                  About Me
                </motion.h2>
                <OrnamentalDivider />
              </div>

              {/* Vintage card with worn edges */}
              <motion.div variants={fadeUp} className="relative">
                <VintageCard>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left: Profile info */}
                    <div className="md:col-span-1">
                      <div className="text-center md:text-left">
                        {profilePhoto ? (
                          <div className="relative inline-block mb-6">
                            <img
                              src={profilePhoto}
                              alt={name}
                              className="w-full max-w-xs sepia-filter mx-auto"
                              style={{
                                border: `2px solid ${COLORS.border}`,
                                filter: 'sepia(0.35) contrast(1.02)',
                              }}
                            />
                            {/* Decorative corner */}
                            <span
                              className="absolute -top-2 -right-2 text-2xl"
                              style={{ color: COLORS.accent }}
                            >
                              ✦
                            </span>
                          </div>
                        ) : (
                          <div
                            className="w-32 h-32 mx-auto mb-6 flex items-center justify-center"
                            style={{
                              background: COLORS.surface,
                              border: `2px solid ${COLORS.border}`,
                            }}
                          >
                            <span className="retro-heading text-4xl" style={{ color: COLORS.secondary }}>
                              {initials}
                            </span>
                          </div>
                        )}

                        <h3 className="retro-heading text-2xl mb-2" style={{ color: COLORS.primary }}>
                          {name}
                        </h3>
                        <p className="typewriter-text text-xs mb-4" style={{ color: COLORS.accent }}>
                          {title}
                        </p>

                        {/* Contact info in vintage style */}
                        <div className="space-y-2">
                          {profile.email && (
                            <p className="retro-mono text-xs" style={{ color: COLORS.textMuted }}>
                              ✉ {profile.email}
                            </p>
                          )}
                          {profile.phone && (
                            <p className="retro-mono text-xs" style={{ color: COLORS.textMuted }}>
                              ☎ {profile.phone}
                            </p>
                          )}
                          {(profile.city || profile.country) && (
                            <p className="retro-mono text-xs" style={{ color: COLORS.textMuted }}>
                              ⚑ {[profile.city, profile.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Bio content */}
                    <div className="md:col-span-2">
                      <div className="relative">
                        {/* Decorative quote marks */}
                        <span
                          className="absolute -top-4 -left-4 retro-heading text-6xl opacity-20"
                          style={{ color: COLORS.accent }}
                        >
                          "
                        </span>
                        <div className="retro-body text-base leading-relaxed" style={{ color: COLORS.text }}>
                          <p className="mb-4">
                            {bio}
                          </p>
                          {profile.headline && (
                            <p className="mb-4">{profile.headline}</p>
                          )}
                          {profile.headline && (
                            <p>{profile.headline}</p>
                          )}
                        </div>
                        <span
                          className="absolute -bottom-4 -right-4 retro-heading text-6xl opacity-20"
                          style={{ color: COLORS.accent }}
                        >
                          "
                        </span>
                      </div>

                      {/* Stats in vintage style */}
                      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {profile.years_experience && (
                          <div className="text-center p-4" style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}>
                            <p className="retro-heading text-3xl mb-1" style={{ color: COLORS.primary }}>{profile.years_experience}</p>
                            <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>Years Exp.</p>
                          </div>
                        )}
                        {(profile.resume_facts_companies || []).length > 0 && (
                          <div className="text-center p-4" style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}>
                            <p className="retro-heading text-3xl mb-1" style={{ color: COLORS.primary }}>{(profile.resume_facts_companies || []).length}</p>
                            <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>Companies</p>
                          </div>
                        )}
                        {allSkills.length > 0 && (
                          <div className="text-center p-4" style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}>
                            <p className="retro-heading text-3xl mb-1" style={{ color: COLORS.primary }}>{allSkills.length}</p>
                            <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>Skills</p>
                          </div>
                        )}
                        {(profile.resume_facts_projects || []).length > 0 && (
                          <div className="text-center p-4" style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}>
                            <p className="retro-heading text-3xl mb-1" style={{ color: COLORS.primary }}>{(profile.resume_facts_projects || []).length}</p>
                            <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>Projects</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </VintageCard>
              </motion.div>
            </motion.div>
          </div>
        </VintageSection>
      )}

      {/* ── SKILLS SECTION ─────────────────────────────────────────────────── */}
      {showSections.skills && allSkills.length > 0 && (
        <VintageSection id="skills">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Section header */}
              <div className="text-center mb-12">
                <motion.p variants={fadeUp} className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                  Section II
                </motion.p>
                <motion.h2 variants={fadeUp} className="retro-heading text-4xl md:text-5xl mb-4" style={{ color: COLORS.primary }}>
                  Technical Skills
                </motion.h2>
                <OrnamentalDivider />
              </div>

              {/* Skill categories with vintage bar charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {skillGroups.map((group, _groupIndex) => (
                  <motion.div
                    key={group.label}
                    variants={fadeUp}
                    className="relative"
                  >
                    <VintageCard>
                      <h3
                        className="retro-heading text-xl mb-6 pb-2 border-b-2"
                        style={{ borderColor: COLORS.accent, color: COLORS.primary }}
                      >
                        {group.label}
                      </h3>

                      {/* Vintage bar chart style skills */}
                      <div className="space-y-4">
                        {group.skills.slice(0, 8).map((skill, skillIndex) => {
                          // Calculate proficiency as a visual percentage
                          const proficiency = 60 + (100 - skill.length * 5) % 40
                          return (
                            <div key={skillIndex} className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <span className="retro-mono text-xs" style={{ color: COLORS.text }}>
                                  {skill}
                                </span>
                                <span className="retro-mono text-xs" style={{ color: COLORS.accent }}>
                                  {proficiency}%
                                </span>
                              </div>
                              {/* Vintage bar */}
                              <div
                                className="h-2 w-full"
                                style={{ background: `${COLORS.border}30` }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${proficiency}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 1, delay: skillIndex * 0.1, ease: 'easeOut' }}
                                  className="h-full"
                                  style={{
                                    background: `repeating-linear-gradient(
                                      90deg,
                                      ${COLORS.accent} 0px,
                                      ${COLORS.accent} 8px,
                                      ${COLORS.secondary} 8px,
                                      ${COLORS.secondary} 10px
                                    )`,
                                    boxShadow: `1px 1px 0px ${COLORS.shadow}`,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </VintageCard>
                  </motion.div>
                ))}
              </div>

              {/* Additional skills as vintage tags */}
              <motion.div variants={fadeUp} className="mt-8 text-center">
                <div className="inline-flex flex-wrap justify-center gap-3 p-6" style={{ background: COLORS.surface, border: `2px solid ${COLORS.border}` }}>
                  {allSkills.slice(18).map((skill, i) => (
                    <span
                      key={i}
                      className="retro-mono text-xs px-3 py-1"
                      style={{
                        background: COLORS.background,
                        border: `1px dashed ${COLORS.border}`,
                        color: COLORS.textMuted,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </VintageSection>
      )}

      {/* ── PROJECTS SECTION ────────────────────────────────────────────────── */}
      {showSections.projects && projectItems.length > 0 && (
        <VintageSection id="projects">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Section header */}
              <div className="text-center mb-12">
                <motion.p variants={fadeUp} className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                  Section III
                </motion.p>
                <motion.h2 variants={fadeUp} className="retro-heading text-4xl md:text-5xl mb-4" style={{ color: COLORS.primary }}>
                  Selected Works
                </motion.h2>
                <OrnamentalDivider />
              </div>

              {/* Polaroid-style project cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projectItems.map((project, index) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    whileHover={{ y: -8, rotate: 0 }}
                    className="relative"
                  >
                    {/* Polaroid frame */}
                    <div
                      className="relative bg-white p-3 pb-10"
                      style={{
                        boxShadow: '3px 3px 0px rgba(180, 83, 9, 0.25), 0 4px 12px rgba(0,0,0,0.1)',
                        transform: `rotate(${(index % 3 - 1) * 1.5}deg)`,
                      }}
                    >
                      {/* Project image area */}
                      <div
                        className="w-full aspect-video flex items-center justify-center overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
                          border: `1px solid ${COLORS.border}40`,
                        }}
                      >
                        <span className="retro-heading text-4xl opacity-30" style={{ color: COLORS.accent }}>
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>

                      {/* Project info */}
                      <div className="pt-3">
                        <h3 className="retro-heading text-lg mb-2" style={{ color: COLORS.primary }}>
                          {project}
                        </h3>
                        <p className="retro-body text-xs" style={{ color: COLORS.textMuted }}>
                          A showcase of technical excellence and innovation.
                        </p>
                      </div>

                      {/* Number badge */}
                      <div
                        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center"
                        style={{
                          background: COLORS.primary,
                          color: COLORS.surface,
                          fontFamily: FONTS.mono,
                          fontSize: '12px',
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      {/* Decorative tape */}
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 opacity-60"
                        style={{ background: COLORS.accent }}
                      />
                    </div>

                    {/* Project number below */}
                    <p className="typewriter-text text-xs text-center mt-4" style={{ color: COLORS.secondary }}>
                      Project No. {String(index + 1).padStart(2, '0')}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </VintageSection>
      )}

      {/* ── EXPERIENCE SECTION ──────────────────────────────────────────────── */}
      {showSections.experience && experienceItems.length > 0 && (
        <VintageSection id="experience">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Section header */}
              <div className="text-center mb-12">
                <motion.p variants={fadeUp} className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                  Section IV
                </motion.p>
                <motion.h2 variants={fadeUp} className="retro-heading text-4xl md:text-5xl mb-4" style={{ color: COLORS.primary }}>
                  Work History
                </motion.h2>
                <OrnamentalDivider />
              </div>

              {/* Typewriter-style timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div
                  className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5"
                  style={{ background: `linear-gradient(to bottom, transparent, ${COLORS.border}, ${COLORS.border}, transparent)` }}
                />

                {/* Experience entries */}
                {experienceItems.map((company, index) => (
                  <motion.div
                    key={index}
                    variants={slideLeft}
                    className={`relative mb-12 ${index % 2 === 0 ? 'md:pr-1/2 md:text-right' : 'md:pl-1/2 md:ml-auto'}`}
                  >
                    {/* Timeline node */}
                    <div
                      className="absolute left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 border-2 z-10"
                      style={{
                        background: COLORS.surface,
                        borderColor: COLORS.accent,
                        top: '8px',
                      }}
                    />

                    {/* Content card */}
                    <div
                      className={`ml-16 md:ml-0 ${index % 2 === 0 ? 'md:mr-8 md:text-right' : 'md:ml-8'}`}
                    >
                      <VintageCard>
                        {/* Typewriter header */}
                        <div className="mb-4">
                          <p className="typewriter-text text-xs mb-2" style={{ color: COLORS.accent }}>
                            {`> ${company.toUpperCase()}_`}
                          </p>
                          <h3 className="retro-heading text-xl" style={{ color: COLORS.primary }}>
                            {company}
                          </h3>
                          <p className="retro-mono text-xs" style={{ color: COLORS.textMuted }}>
                            Position: {profile.resume_facts_metrics?.[index] || title}
                          </p>
                        </div>

                        {/* Metrics in typewriter style */}
                        <div className="border-t-2 border-dashed pt-4 mt-4" style={{ borderColor: COLORS.border }}>
                          {profile.resume_facts_metrics?.slice(index * 2, index * 2 + 2).map((metric, mi) => (
                            <p key={mi} className="retro-mono text-xs mb-2" style={{ color: COLORS.text }}>
                              • {metric}
                            </p>
                          ))}
                        </div>

                        {/* Decorative end mark */}
                        <div className="absolute -bottom-2 right-4 typewriter-text text-xs" style={{ color: COLORS.accent }}>
                          [EOF]
                        </div>
                      </VintageCard>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </VintageSection>
      )}

      {/* ── EDUCATION SECTION ───────────────────────────────────────────────── */}
      {showSections.education && educationItems.length > 0 && (
        <VintageSection id="education">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Section header */}
              <div className="text-center mb-12">
                <motion.p variants={fadeUp} className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                  Section V
                </motion.p>
                <motion.h2 variants={fadeUp} className="retro-heading text-4xl md:text-5xl mb-4" style={{ color: COLORS.primary }}>
                  Education
                </motion.h2>
                <OrnamentalDivider />
              </div>

              {/* Old-fashioned diploma style cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {educationItems.map((edu: string, index: number) => (
                  <motion.div key={index} variants={fadeUp}>
                    {/* Diploma-style card */}
                    <div
                      className="relative bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center"
                      style={{
                        border: `3px double ${COLORS.border}`,
                        boxShadow: `4px 4px 0px ${COLORS.shadow}`,
                      }}
                    >
                      {/* Decorative corner flourishes */}
                      <span className="absolute top-2 left-2 text-lg" style={{ color: COLORS.accent, opacity: 0.5 }}>✦</span>
                      <span className="absolute top-2 right-2 text-lg" style={{ color: COLORS.accent, opacity: 0.5 }}>✦</span>
                      <span className="absolute bottom-2 left-2 text-lg" style={{ color: COLORS.accent, opacity: 0.5 }}>✦</span>
                      <span className="absolute bottom-2 right-2 text-lg" style={{ color: COLORS.accent, opacity: 0.5 }}>✦</span>

                      {/* Diploma header */}
                      <p className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                        CERTIFICATE OF ACHIEVEMENT
                      </p>

                      {/* Institution */}
                      <h3 className="retro-heading text-2xl mb-2" style={{ color: COLORS.primary }}>
                        {edu}
                      </h3>

                      {/* Decorative divider */}
                      <div className="flex items-center justify-center gap-2 my-4">
                        <div className="h-px w-16" style={{ background: COLORS.border }} />
                        <span style={{ color: COLORS.accent }}>❖</span>
                        <div className="h-px w-16" style={{ background: COLORS.border }} />
                      </div>

                      {/* Year */}
                      <p className="retro-mono text-sm" style={{ color: COLORS.textMuted }}>
                        Class of {profile.years_experience?.[index] || 'Present'}
                      </p>

                      {/* Seal */}
                      <div
                        className="mt-6 mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: COLORS.primary,
                          color: COLORS.surface,
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        <span className="retro-heading text-xl">A+</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </VintageSection>
      )}

      {/* ── CERTIFICATIONS SECTION ──────────────────────────────────────────── */}
      {(showSections.certifications || certItems.length > 0) && (
        <VintageSection id="certifications">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Section header */}
              <div className="text-center mb-12">
                <motion.p variants={fadeUp} className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                  Section VI
                </motion.p>
                <motion.h2 variants={fadeUp} className="retro-heading text-4xl md:text-5xl mb-4" style={{ color: COLORS.primary }}>
                  Certifications
                </motion.h2>
                <OrnamentalDivider />
              </div>

              {/* Stamp-style badges */}
              <div className="flex flex-wrap justify-center gap-6">
                {certItems.map((cert: string, index: number) => (
                  <motion.div
                    key={index}
                    variants={fadeUp}
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    className="relative"
                  >
                    {/* Stamp badge */}
                    <div
                      className="w-32 h-32 flex flex-col items-center justify-center text-center p-4"
                      style={{
                        background: `${COLORS.accent}15`,
                        border: `2px dashed ${COLORS.accent}`,
                        borderRadius: '50%',
                        transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (index * 3)}deg)`,
                      }}
                    >
                      {/* Seal icon */}
                      <span className="text-2xl mb-2" style={{ color: COLORS.accent }}>★</span>
                      <p className="retro-mono text-xs leading-tight" style={{ color: COLORS.primary }}>
                        {cert}
                      </p>
                      {/* Decorative dots */}
                      <div className="absolute inset-2 border border-dashed rounded-full" style={{ borderColor: `${COLORS.accent}40` }} />
                    </div>

                    {/* Certificate number */}
                    <p className="typewriter-text text-xs text-center mt-2" style={{ color: COLORS.textMuted }}>
                      No. {String(index + 1).padStart(4, '0')}
                    </p>
                  </motion.div>
                ))}

                {/* Fallback demo certifications if none provided */}
                {certItems.length === 0 && (
                  <>
                    {['AWS Solutions Architect', 'Google Cloud Professional', 'Kubernetes Admin'].map((cert: string, index: number) => (
                      <motion.div
                        key={cert}
                        variants={fadeUp}
                        whileHover={{ scale: 1.1, rotate: -3 }}
                        className="relative"
                      >
                        <div
                          className="w-32 h-32 flex flex-col items-center justify-center text-center p-4"
                          style={{
                            background: `${COLORS.accent}15`,
                            border: `2px dashed ${COLORS.accent}`,
                            borderRadius: '50%',
                            transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (index * 3)}deg)`,
                          }}
                        >
                          <span className="text-2xl mb-2" style={{ color: COLORS.accent }}>★</span>
                          <p className="retro-mono text-xs leading-tight" style={{ color: COLORS.primary }}>
                            {cert}
                          </p>
                        </div>
                        <p className="typewriter-text text-xs text-center mt-2" style={{ color: COLORS.textMuted }}>
                          No. {String(index + 101).padStart(4, '0')}
                        </p>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </VintageSection>
      )}

      {/* ── CONTACT SECTION ────────────────────────────────────────────────── */}
      {showSections.contact && (
        <VintageSection id="contact">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Section header */}
              <div className="text-center mb-12">
                <motion.p variants={fadeUp} className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                  Section VII
                </motion.p>
                <motion.h2 variants={fadeUp} className="retro-heading text-4xl md:text-5xl mb-4" style={{ color: COLORS.primary }}>
                  Get In Touch
                </motion.h2>
                <OrnamentalDivider />
              </div>

              {/* Vintage letter-style contact card */}
              <motion.div variants={fadeUp}>
                <div
                  className="relative bg-white p-8 md:p-12"
                  style={{
                    border: `3px double ${COLORS.border}`,
                    boxShadow: `5px 5px 0px ${COLORS.shadow}`,
                  }}
                >
                  {/* Letter header */}
                  <div className="text-center mb-8 pb-6 border-b-2" style={{ borderColor: COLORS.border }}>
                    <p className="typewriter-text text-xs tracking-widest mb-4" style={{ color: COLORS.accent }}>
                      — CORRESPONDENCE —
                    </p>
                    <h3 className="retro-heading text-3xl mb-2" style={{ color: COLORS.primary }}>
                      Let's Connect
                    </h3>
                    <p className="retro-body text-sm" style={{ color: COLORS.textMuted }}>
                      I'd love to hear from you. Drop me a line!
                    </p>
                  </div>

                  {/* Contact details in vintage style */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Left: Contact info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 flex items-center justify-center"
                          style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}
                        >
                          <span style={{ color: COLORS.accent }}>✉</span>
                        </div>
                        <div>
                          <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>EMAIL</p>
                          <p className="retro-body text-sm">{profile.email || 'email@example.com'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 flex items-center justify-center"
                          style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}
                        >
                          <span style={{ color: COLORS.accent }}>☎</span>
                        </div>
                        <div>
                          <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>PHONE</p>
                          <p className="retro-body text-sm">{profile.phone || '(555) 123-4567'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 flex items-center justify-center"
                          style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}
                        >
                          <span style={{ color: COLORS.accent }}>⚑</span>
                        </div>
                        <div>
                          <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>LOCATION</p>
                          <p className="retro-body text-sm">
                            {[profile.city, profile.country].filter(Boolean).join(', ') || 'City, Country'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Social links */}
                    <div className="space-y-4">
                      {profile.linkedin && (
                        <a
                          href={profile.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 group"
                        >
                          <div
                            className="w-10 h-10 flex items-center justify-center transition-colors"
                            style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}
                          >
                            <span style={{ color: COLORS.accent }}>in</span>
                          </div>
                          <div>
                            <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>LINKEDIN</p>
                            <p className="retro-body text-sm group-hover:underline">Connect with me</p>
                          </div>
                        </a>
                      )}

                      {profile.github && (
                        <a
                          href={profile.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 group"
                        >
                          <div
                            className="w-10 h-10 flex items-center justify-center transition-colors"
                            style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}
                          >
                            <span style={{ color: COLORS.accent }}>⌥</span>
                          </div>
                          <div>
                            <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>GITHUB</p>
                            <p className="retro-body text-sm group-hover:underline">View my code</p>
                          </div>
                        </a>
                      )}

                      {profile.personal_website && (
                        <a
                          href={profile.personal_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 group"
                        >
                          <div
                            className="w-10 h-10 flex items-center justify-center transition-colors"
                            style={{ background: COLORS.background, border: `1px solid ${COLORS.border}` }}
                          >
                            <span style={{ color: COLORS.accent }}>◎</span>
                          </div>
                          <div>
                            <p className="typewriter-text text-xs" style={{ color: COLORS.secondary }}>WEBSITE</p>
                            <p className="retro-body text-sm group-hover:underline">Visit my site</p>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Signature in vintage style */}
                  <div className="text-center pt-6 border-t-2" style={{ borderColor: COLORS.border }}>
                    <p className="typewriter-text text-xs mb-2" style={{ color: COLORS.secondary }}>SINCERELY YOURS,</p>
                    <p className="retro-heading text-3xl italic" style={{ color: COLORS.primary, fontFamily: 'Georgia, serif' }}>
                      {name}
                    </p>
                    <p className="retro-mono text-xs mt-2" style={{ color: COLORS.textMuted }}>
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </VintageSection>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer
        className="relative py-12 text-center"
        style={{
          background: COLORS.primary,
          color: COLORS.surface,
        }}
      >
        <PaperTexture />

        <div className="relative z-10">
          {/* Decorative header */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-amber-600" />
            <span className="text-2xl" style={{ color: COLORS.accent }}>❖</span>
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-amber-600" />
          </div>

          {/* Footer content */}
          <p className="retro-heading text-2xl mb-2">{name}</p>
          <p className="typewriter-text text-xs tracking-widest mb-6" style={{ color: COLORS.accent }}>
            {title.toUpperCase()}
          </p>

          {/* Navigation links */}
          <div className="flex items-center justify-center gap-6 mb-8">
            {['About', 'Skills', 'Work', 'Contact'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="retro-mono text-xs uppercase tracking-widest transition-all hover:translate-y-1"
                style={{ color: COLORS.surface }}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t" style={{ borderColor: `${COLORS.accent}40` }}>
            <p className="retro-mono text-xs" style={{ color: COLORS.textMuted }}>
              © {new Date().getFullYear()} {name}. All rights reserved.
            </p>
            <p className="retro-mono text-xs mt-1" style={{ color: COLORS.textMuted }}>
              Crafted with vintage charm ✦
            </p>
          </div>
        </div>

        {/* Decorative bottom corners */}
        <div className="absolute bottom-4 left-4 text-lg opacity-30" style={{ color: COLORS.accent }}>✦</div>
        <div className="absolute bottom-4 right-4 text-lg opacity-30" style={{ color: COLORS.accent }}>✦</div>
      </footer>
    </div>
  )
}