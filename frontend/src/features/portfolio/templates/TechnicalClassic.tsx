import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Award, GraduationCap, ExternalLink, ChevronRight } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// Animation variants
const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

const _slideInLeft: any = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

const slideInRight: any = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

const stagger: any = {
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

// Underline animation component for hero name
function UnderlineReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      className="relative inline-block"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04, delayChildren: delay } },
      }}>
      <motion.span className="relative z-10">{children}</motion.span>
      <motion.div
        className="absolute bottom-0 left-0 h-[3px] w-0"
        style={{ background: '#d97706' }}
        variants={{
          hidden: { width: 0 },
          show: { width: '100%', transition: { duration: 0.7, ease: 'easeOut', delay: delay + 0.3 } },
        }}
      />
    </motion.div>
  )
}

// Section header component with decorative elements
function SectionHeader({
  title,
  subtitle,
  primaryColor,
}: {
  title: string
  subtitle?: string
  primaryColor: string
}) {
  return (
    <motion.div
      className="mb-10"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}>
      <div className="flex items-center gap-4 mb-3">
        <div className="w-10 h-[2px]" style={{ background: primaryColor }} />
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            fontFamily: "'Merriweather', 'Georgia', serif",
            color: primaryColor,
          }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="text-sm leading-relaxed ml-14" style={{ color: '#64748b', fontFamily: "'Source Sans Pro', sans-serif" }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}

// Skill category with structured list
function SkillCategory({
  category,
  skills,
  color,
  delay = 0,
}: {
  category: string
  skills: string[]
  color: string
  delay?: number
}) {
  return (
    <motion.div
      className="mb-8 last:mb-0"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      transition={{ delay: delay * 0.1 }}>
      <h3
        className="text-sm font-semibold uppercase tracking-widest mb-4 pb-2 border-b"
        style={{
          fontFamily: "'Source Sans Pro', sans-serif",
          color: '#64748b',
          borderColor: '#e2e8f0',
        }}>
        {category}
      </h3>
      <div className="space-y-2">
        {skills.map((skill, index) => (
          <motion.div
            key={skill}
            className="flex items-center justify-between py-1.5 px-3 rounded transition-colors hover:bg-gray-50 group"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * index }}
            whileHover={{ x: 4 }}>
            <span
              className="text-sm font-medium group-hover:font-semibold transition-all"
              style={{
                fontFamily: "'Source Sans Pro', sans-serif",
                color: '#1e293b',
              }}>
              {skill}
            </span>
            <div
              className="w-1.5 h-1.5 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"
              style={{ background: color }}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// Timeline item for experience
function TimelineItem({
  title,
  organization,
  location,
  startDate,
  endDate,
  description,
  isLast = false,
  primaryColor,
}: {
  title: string
  organization: string
  location?: string
  startDate?: string
  endDate?: string
  description?: string
  isLast?: boolean
  primaryColor: string
}) {
  return (
    <motion.div
      className="flex gap-6 relative"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-30px' }}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className="w-4 h-4 rounded-full border-2 z-10 shrink-0 mt-1"
          style={{
            borderColor: primaryColor,
            background: '#ffffff',
          }}
        />
        {!isLast && (
          <div
            className="w-[2px] flex-1 mt-2"
            style={{ background: '#e2e8f0', minHeight: '80px' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div>
            <h4
              className="text-lg font-bold"
              style={{
                fontFamily: "'Merriweather', 'Georgia', serif",
                color: '#1e293b',
              }}>
              {title}
            </h4>
            <p
              className="text-sm font-medium"
              style={{
                fontFamily: "'Source Sans Pro', sans-serif",
                color: primaryColor,
              }}>
              {organization}
            </p>
          </div>
          {(startDate || endDate) && (
            <div
              className="text-xs font-semibold px-3 py-1 rounded shrink-0"
              style={{
                fontFamily: "'Source Sans Pro', sans-serif",
                background: `${primaryColor}0f`,
                color: primaryColor,
              }}>
              {startDate || 'N/A'} – {endDate || 'Present'}
            </div>
          )}
        </div>

        {location && (
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <span className="text-xs" style={{ color: '#64748b', fontFamily: "'Source Sans Pro', sans-serif" }}>
              {location}
            </span>
          </div>
        )}

        {description && (
          <p
            className="text-sm leading-relaxed"
            style={{
              fontFamily: "'Source Sans Pro', sans-serif",
              color: '#475569',
            }}>
            {description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// Project card with proper hierarchy
function ProjectCard({
  title,
  description,
  technologies,
  link,
  index,
  primaryColor,
  accentColor,
}: {
  title: string
  description?: string
  technologies?: string[]
  link?: string
  index: number
  primaryColor: string
  accentColor: string
}) {
  return (
    <motion.div
      className="p-6 bg-white rounded border transition-all hover:shadow-md group"
      style={{
        fontFamily: "'Source Sans Pro', sans-serif",
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderColor: '#e2e8f0',
      }}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      {/* Card number */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-xs font-black text-white mb-4"
        style={{ background: primaryColor }}>
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Title */}
      <h4
        className="text-base font-bold mb-2"
        style={{
          fontFamily: "'Merriweather', 'Georgia', serif",
          color: '#1e293b',
        }}>
        {title}
      </h4>

      {/* Description */}
      {description && (
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#64748b' }}>
          {description}
        </p>
      )}

      {/* Technologies */}
      {technologies && technologies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {technologies.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{
                background: `${accentColor}12`,
                color: '#92400e',
                fontFamily: "'Source Sans Pro', sans-serif",
              }}>
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Link */}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors mt-2"
          style={{ color: primaryColor }}
          onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = primaryColor)}>
          View Project <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  )
}

// Education card
function EducationCard({
  institution,
  degree,
  field,
  graduationDate,
  gpa,
  achievements,
  primaryColor,
  accentColor,
}: {
  institution: string
  degree?: string
  field?: string
  graduationDate?: string
  gpa?: string
  achievements?: string[]
  primaryColor: string
  accentColor: string
}) {
  return (
    <motion.div
      className="p-6 bg-white rounded border"
      style={{
        fontFamily: "'Source Sans Pro', sans-serif",
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderColor: '#e2e8f0',
      }}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}>
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded flex items-center justify-center shrink-0"
          style={{ background: `${primaryColor}0f` }}>
          <GraduationCap className="w-6 h-6" style={{ color: primaryColor }} />
        </div>
        <div className="flex-1">
          <h4
            className="text-base font-bold mb-1"
            style={{
              fontFamily: "'Merriweather', 'Georgia', serif",
              color: '#1e293b',
            }}>
            {institution}
          </h4>
          {degree && (
            <p className="text-sm font-medium mb-1" style={{ color: '#1e3a5f' }}>
              {degree}
              {field && ` in ${field}`}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {graduationDate && (
              <span className="text-xs" style={{ color: '#64748b' }}>
                {graduationDate}
              </span>
            )}
            {gpa && (
              <>
                <span className="w-1 h-1 rounded-full" style={{ background: '#cbd5e1' }} />
                <span className="text-xs font-semibold" style={{ color: accentColor }}>
                  GPA: {gpa}
                </span>
              </>
            )}
          </div>
          {achievements && achievements.length > 0 && (
            <div className="mt-3 space-y-1">
              {achievements.slice(0, 2).map((achievement, i) => (
                <p key={i} className="text-xs flex items-start gap-2" style={{ color: '#64748b' }}>
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: accentColor }} />
                  {achievement}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Certification badge
function CertificationBadge({
  name,
  issuer,
  date,
  primaryColor,
  accentColor,
}: {
  name: string
  issuer?: string
  date?: string
  primaryColor: string
  accentColor: string
}) {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 rounded border bg-white transition-all hover:shadow-sm"
      style={{
        fontFamily: "'Source Sans Pro', sans-serif",
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderColor: '#e2e8f0',
      }}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      whileHover={{ y: -1 }}>
      <div
        className="w-10 h-10 rounded flex items-center justify-center shrink-0"
        style={{ background: `${accentColor}15` }}>
        <Award className="w-5 h-5" style={{ color: accentColor }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
          {name}
        </p>
        <p className="text-xs" style={{ color: '#64748b' }}>
          {issuer}
          {date && ` • ${date}`}
        </p>
      </div>
    </motion.div>
  )
}

// Contact link component
function ContactLink({
  icon: Icon,
  label,
  value,
  href,
  primaryColor,
}: {
  icon: React.ElementType
  label: string
  value?: string
  href?: string
  primaryColor: string
}) {
  const content = (
    <div className="flex items-center gap-3 py-3 border-b transition-colors group">
      <Icon className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8', fontFamily: "'Source Sans Pro', sans-serif" }}>
          {label}
        </p>
        <p
          className="text-sm truncate"
          style={{ fontFamily: "'Source Sans Pro', sans-serif", color: '#1e293b' }}>
          {value || 'Not provided'}
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="block"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2 }}>
        {content}
      </motion.a>
    )
  }

  return content
}

// Main template component
export default function TechnicalClassic({
  profile,
  primaryColor = '#1e3a5f',
  accentColor = '#d97706',
  showSections,
  heroGradient,
  profilePhoto,
  textOverrides,
}: PortfolioTemplateProps) {
  const name = textOverrides?.name || profile.full_name || profile.preferred_name || 'Professional'
  const title = textOverrides?.title || profile.current_job_title || profile.target_role || 'Software Engineer'
  const bio = textOverrides?.bio || profile.headline || 'Dedicated professional with a strong technical background and proven track record of delivering high-quality results.'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  // Gather all skills
  const allSkills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || []),
  ]

  // Organize skills by category
  const languages = profile.skills_languages || []
  const frameworks = profile.skills_frameworks || []
  const tools = profile.skills_tools || []
  const otherSkills = tools.filter(
    (s) => !languages.includes(s) && !frameworks.includes(s)
  )

  // Gather resume data
  const companies = profile.resume_facts_companies || []
  const projects = profile.resume_facts_projects || []
  const schools = profile.resume_facts_schools || []
  const metrics = profile.resume_facts_metrics || []
  const certifications: string[] = []

  // Build location string
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ')

  // Build contact links
  const contactLinks = [
    profile.email && {
      icon: Mail,
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
    },
    profile.phone && {
      icon: Phone,
      label: 'Phone',
      value: profile.phone,
      href: undefined,
    },
    location && {
      icon: MapPin,
      label: 'Location',
      value: location,
      href: undefined,
    },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string; href?: string }[]

  const socialLinks = [
    profile.linkedin && {
      icon: Linkedin,
      label: 'LinkedIn',
      value: profile.linkedin,
      href: profile.linkedin,
    },
    profile.github && {
      icon: Github,
      label: 'GitHub',
      value: profile.github,
      href: profile.github,
    },
    profile.portfolio && {
      icon: Globe,
      label: 'Portfolio',
      value: profile.portfolio,
      href: profile.portfolio,
    },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string; href?: string }[]

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#ffffff',
        color: '#1e293b',
        fontFamily: "'Source Sans Pro', 'Helvetica Neue', sans-serif",
      }}>
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* HEADER / NAVIGATION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: primaryColor,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          borderColor: `${primaryColor}dd`,
        }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Initials */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}>
              <div
                className="w-9 h-9 rounded flex items-center justify-center text-sm font-black text-white border border-white/20">
                {initials}
              </div>
              <span
                className="text-sm font-bold text-white/90 tracking-wide"
                style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
                {name}
              </span>
            </motion.div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              {[
                { label: 'About', id: 'about' },
                { label: 'Experience', id: 'experience' },
                { label: 'Skills', id: 'skills' },
                { label: 'Projects', id: 'projects' },
                { label: 'Education', id: 'education' },
                { label: 'Contact', id: 'contact' },
              ].map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white transition-colors py-1 relative group">
                  {link.label}
                  <span
                    className="absolute bottom-0 left-0 w-0 h-[2px] bg-white/50 group-hover:w-full transition-all duration-300"
                  />
                </a>
              ))}
            </nav>

            {/* CTA Button */}
            {profile.email && (
              <motion.a
                href={`mailto:${profile.email}`}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all"
                style={{
                  background: accentColor,
                  color: '#ffffff',
                  fontFamily: "'Source Sans Pro', sans-serif",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}>
                <Mail className="w-3.5 h-3.5" />
                Contact Me
              </motion.a>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="border-b"
        style={{
          background: heroGradient || `linear-gradient(180deg, ${primaryColor}05 0%, #ffffff 100%)`,
          borderColor: '#e2e8f0',
        }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            {/* Left: Text Content */}
            <motion.div
              className="lg:col-span-2"
              initial="hidden"
              animate="show"
              variants={stagger}>
              {/* Label */}
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 mb-6">
                <div className="w-8 h-[2px]" style={{ background: accentColor }} />
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{
                    fontFamily: "'Source Sans Pro', sans-serif",
                    color: primaryColor,
                  }}>
                  Portfolio
                </span>
              </motion.div>

              {/* Name with animated underline */}
              <motion.h1
                variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-[3.25rem] font-black leading-tight mb-4"
                style={{
                  fontFamily: "'Merriweather', 'Georgia', serif",
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}>
                <UnderlineReveal delay={0.1}>{name}</UnderlineReveal>
              </motion.h1>

              {/* Title */}
              <motion.p
                variants={fadeUp}
                className="text-lg md:text-xl font-semibold mb-6"
                style={{
                  fontFamily: "'Source Sans Pro', sans-serif",
                  color: primaryColor,
                }}>
                {title}
              </motion.p>

              {/* Bio */}
              <motion.div variants={fadeUp}>
                <div className="w-16 h-[2px] mb-4" style={{ background: '#e2e8f0' }} />
                <p
                  className="text-base leading-relaxed max-w-2xl"
                  style={{
                    fontFamily: "'Source Sans Pro', sans-serif",
                    color: '#475569',
                  }}>
                  {bio}
                </p>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                variants={fadeUp}
                className="flex flex-wrap gap-6 mt-8 pt-6"
                style={{ borderTop: '1px solid #e2e8f0' }}>
                {[
                  { label: 'Years Experience', value: profile.years_experience || '5+' },
                  { label: 'Skills', value: `${allSkills.length || 15}+` },
                  { label: 'Projects', value: `${projects.length || 8}+` },
                  { label: 'Companies', value: `${companies.length || 3}` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p
                      className="text-2xl font-black"
                      style={{
                        fontFamily: "'Merriweather', 'Georgia', serif",
                        color: primaryColor,
                      }}>
                      {value}
                    </p>
                    <p
                      className="text-xs uppercase tracking-wider mt-1"
                      style={{
                        fontFamily: "'Source Sans Pro', sans-serif",
                        color: '#94a3b8',
                      }}>
                      {label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: Profile Visual */}
            <motion.div
              className="flex justify-center lg:justify-end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}>
              <div className="relative">
                {/* Card frame */}
                <div
                  className="w-56 h-64 rounded bg-white border overflow-hidden"
                  style={{
                    boxShadow: '0 8px 32px rgba(30,58,95,0.12)',
                    borderColor: '#e2e8f0',
                  }}>
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}15)` }}>
                      <div
                        className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black mb-4"
                        style={{
                          background: primaryColor,
                          color: '#ffffff',
                          fontFamily: "'Merriweather', 'Georgia', serif",
                        }}>
                        {initials}
                      </div>
                      <div className="text-center px-4">
                        <p
                          className="text-sm font-bold"
                          style={{
                            fontFamily: "'Merriweather', 'Georgia', serif",
                            color: primaryColor,
                          }}>
                          {name}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                          {title}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Decorative corner accent */}
                <div
                  className="absolute -bottom-2 -right-2 w-16 h-16 rounded opacity-20"
                  style={{ background: accentColor }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ABOUT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections.about !== false && (
        <section id="about" className="py-16 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <SectionHeader
              title="About Me"
              subtitle="Professional background and career overview"
              primaryColor={primaryColor}
            />

            <motion.div
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}>
              {/* Bio Column */}
              <motion.div className="lg:col-span-2" variants={fadeUp}>
                <div className="bg-white rounded p-8 border" style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3
                    className="text-lg font-bold mb-4"
                    style={{
                      fontFamily: "'Merriweather', 'Georgia', serif",
                      color: primaryColor,
                    }}>
                    Professional Summary
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-6"
                    style={{ fontFamily: "'Source Sans Pro', sans-serif", color: '#475569' }}>
                    {profile.headline || bio}
                  </p>
                  {textOverrides?.bio && (
                    <p
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "'Source Sans Pro', sans-serif", color: '#475569' }}>
                      {textOverrides.bio}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Key Details Column */}
              <motion.div variants={fadeUp}>
                <div className="bg-white rounded p-6 border" style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3
                    className="text-base font-bold mb-4 pb-3 border-b"
                    style={{
                      fontFamily: "'Merriweather', 'Georgia', serif",
                      color: primaryColor,
                      borderColor: '#e2e8f0',
                    }}>
                    Key Details
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Role', value: title },
                      { label: 'Experience', value: profile.years_experience ? `${profile.years_experience} Years` : undefined },
                      { label: 'Location', value: location || undefined },
                      { label: 'Status', value: profile.work_authorization || 'Available' },
                    ]
                      .filter((item) => item.value)
                      .map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-start py-2 border-b" style={{ borderColor: '#f1f5f9' }}>
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                            {label}
                          </span>
                          <span className="text-sm font-medium text-right" style={{ color: '#1e293b' }}>
                            {value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Quick Links */}
                {socialLinks.length > 0 && (
                  <div className="mt-6 bg-white rounded p-6 border" style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3
                      className="text-base font-bold mb-4 pb-3 border-b"
                      style={{
                        fontFamily: "'Merriweather', 'Georgia', serif",
                        color: primaryColor,
                        borderColor: '#e2e8f0',
                      }}>
                      Connect
                    </h3>
                    <div className="space-y-1">
                      {socialLinks.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 py-2 text-sm transition-colors hover:text-[#1e3a5f]"
                          style={{ color: '#64748b' }}>
                          <link.icon className="w-4 h-4" style={{ color: primaryColor }} />
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* EXPERIENCE SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections.experience !== false && companies.length > 0 && (
        <section id="experience" className="py-16 border-b" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <SectionHeader
              title="Work Experience"
              subtitle="Professional career history and key contributions"
              primaryColor={primaryColor}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Timeline */}
              <motion.div
                className="lg:col-span-2"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={stagger}>
                {companies.map((company, index) => {
                  const yearsAgo = companies.length - index
                  const startYear = new Date().getFullYear() - yearsAgo
                  const endYear = index === 0 ? 'Present' : String(startYear + 2)

                  return (
                    <TimelineItem
                      key={index}
                      title={title}
                      organization={company}
                      location={location}
                      startDate={String(startYear)}
                      endDate={endYear}
                      description={
                        metrics[index]
                          ? metrics[index]
                          : `Contributed to key initiatives and projects at ${company}, delivering measurable impact through technical expertise and collaborative leadership.`
                      }
                      isLast={index === companies.length - 1}
                      primaryColor={primaryColor}
                    />
                  )
                })}
              </motion.div>

              {/* Sidebar Stats */}
              <motion.div
                variants={slideInRight}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}>
                <div className="bg-white rounded p-6 border sticky top-24" style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3
                    className="text-sm font-bold uppercase tracking-widest mb-5 pb-3 border-b"
                    style={{
                      fontFamily: "'Source Sans Pro', sans-serif",
                      color: '#64748b',
                      borderColor: '#e2e8f0',
                    }}>
                    Career Overview
                  </h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Total Years', value: profile.years_experience || `${companies.length * 3}+` },
                      { label: 'Companies', value: String(companies.length) },
                      { label: 'Projects Led', value: String(projects.length) },
                      { label: 'Team Size', value: metrics[1] || '5–20' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: '#f1f5f9' }}>
                        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                          {label}
                        </span>
                        <span className="text-sm font-bold" style={{ fontFamily: "'Merriweather', serif", color: primaryColor }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Notable Achievement */}
                  {metrics[0] && (
                    <div className="mt-6 p-4 rounded" style={{ background: `${accentColor}0f` }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: accentColor }}>
                        Notable Achievement
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                        {metrics[0]}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* SKILLS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections.skills !== false && allSkills.length > 0 && (
        <section id="skills" className="py-16 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <SectionHeader
              title="Technical Skills"
              subtitle="Comprehensive competencies across technologies and tools"
              primaryColor={primaryColor}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <SkillCategory
                category="Programming Languages"
                skills={languages}
                color={primaryColor}
                delay={0}
              />
              <SkillCategory
                category="Frameworks & Libraries"
                skills={frameworks}
                color={accentColor}
                delay={1}
              />
              <SkillCategory
                category="Tools & Platforms"
                skills={tools}
                color="#2563eb"
                delay={2}
              />
              {otherSkills.length > 0 && (
                <SkillCategory
                  category="Additional Skills"
                  skills={otherSkills}
                  color="#64748b"
                  delay={3}
                />
              )}
            </div>

            {/* Skills Summary Bar */}
            <motion.div
              className="mt-10 p-6 bg-white rounded border"
              style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}>
              <h4
                className="text-sm font-bold uppercase tracking-widest mb-4"
                style={{ fontFamily: "'Source Sans Pro', sans-serif", color: '#64748b' }}>
                Skill Proficiency Summary
              </h4>
              <div className="flex flex-wrap gap-2">
                {allSkills.slice(0, 20).map((skill) => (
                  <motion.span
                    key={skill}
                    className="text-xs px-3 py-1.5 rounded border font-medium"
                    style={{
                      background: '#f8fafc',
                      borderColor: '#e2e8f0',
                      color: '#475569',
                      fontFamily: "'Source Sans Pro', sans-serif",
                    }}
                    whileHover={{
                      background: `${primaryColor}0f`,
                      borderColor: primaryColor,
                      color: primaryColor,
                    }}>
                    {skill}
                  </motion.span>
                ))}
                {allSkills.length > 20 && (
                  <span
                    className="text-xs px-3 py-1.5 rounded border font-semibold"
                    style={{
                      background: `${accentColor}0f`,
                      borderColor: accentColor,
                      color: accentColor,
                    }}>
                    +{allSkills.length - 20} more
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* PROJECTS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections.projects !== false && projects.length > 0 && (
        <section id="projects" className="py-16 border-b" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <SectionHeader
              title="Featured Projects"
              subtitle="Key technical projects and achievements"
              primaryColor={primaryColor}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <ProjectCard
                  key={index}
                  title={project}
                  description={`Delivered impactful technical solution at ${companies[index % companies.length] || 'a leading organization'}, demonstrating expertise in full-stack development and system architecture.`}
                  technologies={allSkills.slice(index * 2, index * 2 + 3)}
                  link={profile.github || undefined}
                  index={index}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                />
              ))}
            </div>

            {/* GitHub CTA */}
            {profile.github && (
              <motion.div
                className="mt-10 text-center"
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}>
                <motion.a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-bold transition-all"
                  style={{
                    background: primaryColor,
                    color: '#ffffff',
                    fontFamily: "'Source Sans Pro', sans-serif",
                  }}
                  whileHover={{ scale: 1.02, opacity: 0.9 }}>
                  <Github className="w-4 h-4" />
                  View All Projects on GitHub
                </motion.a>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* EDUCATION SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections.education !== false && (schools.length > 0 || profile.education) && (
        <section id="education" className="py-16 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <SectionHeader
              title="Education"
              subtitle="Academic background and qualifications"
              primaryColor={primaryColor}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schools.length > 0 ? (
                schools.map((school, index) => (
                  <EducationCard
                    key={index}
                    institution={school}
                    degree="Bachelor of Science"
                    field="Computer Science"
                    graduationDate={undefined}
                    gpa={undefined}
                    achievements={metrics.slice(index * 2, index * 2 + 2)}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                  />
                ))
              ) : schools.length === 0 && (
                <EducationCard
                  institution={profile.education || 'University'}
                  degree={profile.education ? 'Degree' : undefined}
                  field="Field of Study"
                  graduationDate={undefined}
                  gpa={undefined}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* CERTIFICATIONS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.certifications !== false && certifications.length > 0 && (
        <section id="certifications" className="py-16 border-b" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <SectionHeader
              title="Certifications"
              subtitle="Professional certifications and credentials"
              primaryColor={primaryColor}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certifications.map((cert, index) => (
                <CertificationBadge
                  key={index}
                  name={cert}
                  issuer="Professional Certification"
                  date={new Date().getFullYear() - Math.floor(index / 2) > 2018 ? String(new Date().getFullYear() - Math.floor(index / 2)) : undefined}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* CONTACT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections.contact !== false && (
        <section id="contact" className="py-20" style={{ background: primaryColor }}>
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              className="text-center mb-12"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}>
              <h2
                className="text-3xl md:text-4xl font-black text-white mb-4"
                style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
                Let&apos;s Connect
              </h2>
              <div className="w-16 h-[3px] mx-auto mb-4" style={{ background: accentColor }} />
              <p
                className="text-sm max-w-md mx-auto"
                style={{
                  fontFamily: "'Source Sans Pro', sans-serif",
                  color: 'rgba(255,255,255,0.7)',
                }}>
                I am actively seeking new opportunities. Feel free to reach out if you would like to discuss potential collaborations or job openings.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-4xl mx-auto">
              {/* Contact Details */}
              <motion.div
                className="bg-white rounded p-8"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  fontFamily: "'Source Sans Pro', sans-serif",
                }}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}>
                <h3
                  className="text-lg font-bold mb-6 pb-4 border-b"
                  style={{
                    fontFamily: "'Merriweather', 'Georgia', serif",
                    color: primaryColor,
                    borderColor: '#e2e8f0',
                  }}>
                  Contact Information
                </h3>
                <div className="space-y-1">
                  {contactLinks.map((link) => (
                    <ContactLink
                      key={link.label}
                      icon={link.icon}
                      label={link.label}
                      value={link.value}
                      href={link.href}
                      primaryColor={primaryColor}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Social Links */}
              <motion.div
                className="bg-white rounded p-8"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  fontFamily: "'Source Sans Pro', sans-serif",
                }}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}>
                <h3
                  className="text-lg font-bold mb-6 pb-4 border-b"
                  style={{
                    fontFamily: "'Merriweather', 'Georgia', serif",
                    color: primaryColor,
                    borderColor: '#e2e8f0',
                  }}>
                  Professional Profiles
                </h3>
                <div className="space-y-1">
                  {socialLinks.map((link) => (
                    <ContactLink
                      key={link.label}
                      icon={link.icon}
                      label={link.label}
                      value={link.value.replace(/^https?:\/\//, '').split('/')[0]}
                      href={link.href}
                      primaryColor={primaryColor}
                    />
                  ))}
                </div>

                {/* CTA Button */}
                {profile.email && (
                  <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e2e8f0' }}>
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded text-sm font-bold uppercase tracking-wider transition-all hover:opacity-90"
                      style={{
                        background: primaryColor,
                        color: '#ffffff',
                        fontFamily: "'Source Sans Pro', sans-serif",
                      }}>
                      <Mail className="w-4 h-4" />
                      Send Email
                    </a>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <footer
        className="py-6 px-6 border-t"
        style={{
          borderColor: `${primaryColor}30`,
          background: '#f8fafc',
        }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-xs font-black text-white"
              style={{ background: primaryColor }}>
              {initials}
            </div>
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "'Merriweather', 'Georgia', serif", color: '#475569' }}>
              {name}
            </span>
          </div>
          <p className="text-xs" style={{ color: '#94a3b8', fontFamily: "'Source Sans Pro', sans-serif" }}>
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer" style={{ color: '#94a3b8' }}>
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer" style={{ color: '#94a3b8' }}>
                <Github className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}