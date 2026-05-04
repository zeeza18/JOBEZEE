import { motion, useInView } from 'framer-motion'
import { useRef, useMemo } from 'react'
import type { PortfolioTemplateProps } from '../types'
import { getThemeById } from '../themes/themeSystem'

// ── Animation Variants ─────────────────────────────────────────────────────────
const fadeUp: any = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } }
}

const fadeIn: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8 } }
}

const fadeLeft: any = {
  hidden: { opacity: 0, x: -50 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' as const } }
}

const fadeRight: any = {
  hidden: { opacity: 0, x: 50 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' as const } }
}

const stagger: any = {
  show: { transition: { staggerChildren: 0.1 } },
}

const scaleUp: any = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

const slideUp: any = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

// ── Floating Shape Component ──────────────────────────────────────────────────
function FloatingShape({
  size = 200,
  color,
  duration = 8,
  delay = 0,
  top,
  left,
  right,
  bottom,
  blur = false
}: {
  size?: number
  color: string
  duration?: number
  delay?: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  blur?: boolean
}) {
  return (
    <motion.div
      animate={{
        x: [0, 30, 0],
        y: [0, -25, 0],
        rotate: [0, 5, 0],
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: blur
          ? `radial-gradient(circle, ${color}40 0%, transparent 70%)`
          : `radial-gradient(circle, ${color}25 0%, transparent 60%)`,
        filter: blur ? 'blur(40px)' : 'none',
        top,
        left,
        right,
        bottom,
        pointerEvents: 'none'
      }}
    />
  )
}

// ── Animated Dots Pattern ──────────────────────────────────────────────────────
function DotsPattern({ color, opacity = 0.15 }: { color: string; opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle, ${color} ${opacity} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        pointerEvents: 'none'
      }}
    />
  )
}

// ── Grid Lines Background ──────────────────────────────────────────────────────
function GridLines({ color, opacity = 0.05 }: { color: string; opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
          linear-gradient(90deg, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none'
      }}
    />
  )
}

// ── Glass Card Component ───────────────────────────────────────────────────────
function GlassCard({
  children,
  className = '',
  hover = true
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -8, scale: 1.02 } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        borderRadius: 16
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Animated Border Card ────────────────────────────────────────────────────────
function AnimatedBorderCard({
  children,
  primaryColor
}: {
  children: React.ReactNode
  primaryColor: string
}) {
  return (
    <motion.div
      whileHover={{
        boxShadow: `0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 2px ${primaryColor}40`
      }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden'
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Section Wrapper ────────────────────────────────────────────────────────────
function SectionWrapper({
  children,
  id,
  className = ''
}: {
  children: React.ReactNode
  id?: string
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ── Section Title ───────────────────────────────────────────────────────────────
function SectionTitle({
  title,
  subtitle,
  primaryColor,
  accentColor
}: {
  title: string
  subtitle?: string
  primaryColor: string
  accentColor: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div ref={ref} className="text-center mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12
        }}
      >
        <span
          style={{
            width: 40,
            height: 3,
            background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
            borderRadius: 2
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 3,
            color: primaryColor
          }}
        >
          Portfolio
        </span>
        <span
          style={{
            width: 40,
            height: 3,
            background: `linear-gradient(90deg, ${accentColor}, ${primaryColor})`,
            borderRadius: 2
          }}
        />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: subtitle ? 16 : 0,
          lineHeight: 1.2
        }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontSize: '1.125rem',
            color: '#64748b',
            maxWidth: 600,
            margin: '0 auto'
          }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  )
}

// ── Skill Bar Component ─────────────────────────────────────────────────────────
function SkillBar({
  name,
  percentage,
  primaryColor,
  accentColor,
  delay = 0
}: {
  name: string
  percentage: number
  primaryColor: string
  accentColor: string
  delay?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <div ref={ref} className="mb-6">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        <span
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#0f172a'
          }}
        >
          {name}
        </span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: delay + 0.3 }}
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {percentage}%
        </motion.span>
      </div>
      <div
        style={{
          height: 8,
          background: '#e2e8f0',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : {}}
          transition={{ duration: 1.2, ease: 'easeOut', delay }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
            borderRadius: 4,
            boxShadow: `0 0 12px ${primaryColor}50`
          }}
        />
      </div>
    </div>
  )
}

// ── Timeline Item Component ────────────────────────────────────────────────────
function TimelineItem({
  title,
  company,
  period,
  description,
  isLast = false,
  primaryColor,
  accentColor,
  index = 0
}: {
  title: string
  company: string
  period: string
  description?: string
  isLast?: boolean
  primaryColor: string
  accentColor: string
  index?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut', delay: index * 0.15 }}
      style={{
        display: 'flex',
        gap: 32,
        position: 'relative',
        paddingBottom: isLast ? 0 : 48
      }}
    >
      {/* Timeline dot */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 0,
          zIndex: 2
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 0.4, delay: index * 0.15 + 0.3 }}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#ffffff',
            border: `3px solid ${primaryColor}`,
            boxShadow: `0 0 0 4px ${primaryColor}30`
          }}
        />
      </div>

      {/* Content card */}
      <div
        style={{
          width: 'calc(50% - 16px)',
          marginLeft: index % 2 === 0 ? 0 : 'auto',
          marginRight: index % 2 === 0 ? 'auto' : 0
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}
          className="group hover:shadow-xl hover:-translate-y-1"
        >
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: `${primaryColor}15`,
              color: primaryColor,
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: 12
            }}
          >
            {period}
          </span>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 4
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: primaryColor,
              marginBottom: description ? 12 : 0
            }}
          >
            {company}
          </p>
          {description && (
            <p
              style={{
                fontSize: '0.9rem',
                color: '#64748b',
                lineHeight: 1.6
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Project Card Component ─────────────────────────────────────────────────────
function ProjectCard({
  title,
  description,
  techStack = [],
  gradient,
  primaryColor,
  accentColor,
  delay = 0
}: {
  title: string
  description?: string
  techStack?: string[]
  gradient: string
  primaryColor: string
  accentColor: string
  delay?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -12, scale: 1.02 }}
      style={{
        background: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Gradient header */}
      <div
        style={{
          height: 160,
          background: gradient,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative elements */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 150,
            height: 150,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.15)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)'
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 8
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              fontSize: '0.9rem',
              color: '#64748b',
              lineHeight: 1.6,
              marginBottom: 16
            }}
          >
            {description}
          </p>
        )}

        {/* Tech stack tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {techStack.slice(0, 5).map((tech, i) => (
            <motion.span
              key={tech}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: delay + i * 0.05 }}
              style={{
                padding: '4px 12px',
                background: `${primaryColor}10`,
                color: primaryColor,
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              {tech}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Hover overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${primaryColor}90, ${accentColor}90)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <span
          style={{
            padding: '12px 24px',
            background: '#ffffff',
            borderRadius: 30,
            fontWeight: 700,
            color: primaryColor,
            fontSize: '0.9rem'
          }}
        >
          View Project
        </span>
      </motion.div>
    </motion.div>
  )
}

// ── Education Card Component ───────────────────────────────────────────────────
function EducationCard({
  degree,
  school,
  year,
  description,
  primaryColor,
  delay = 0
}: {
  degree: string
  school: string
  year?: string
  description?: string
  primaryColor: string
  delay?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: 28,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        gap: 20
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={primaryColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      </div>

      {/* Content */}
      <div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: 1
          }}
        >
          {year || 'Not specified'}
        </span>
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: '#0f172a',
            marginTop: 4,
            marginBottom: 4
          }}
        >
          {degree}
        </h3>
        <p
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: primaryColor,
            marginBottom: description ? 12 : 0
          }}
        >
          {school}
        </p>
        {description && (
          <p
            style={{
              fontSize: '0.85rem',
              color: '#64748b',
              lineHeight: 1.6
            }}
          >
            {description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── Certification Badge Component ─────────────────────────────────────────────
function CertificationBadge({
  name,
  issuer,
  year,
  primaryColor,
  accentColor,
  delay = 0
}: {
  name: string
  issuer: string
  year?: string
  primaryColor: string
  accentColor: string
  delay?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay }}
      whileHover={{
        scale: 1.05,
        boxShadow: `0 20px 40px ${primaryColor}30`
      }}
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
        boxShadow: `0 4px 20px ${primaryColor}10`,
        border: `2px solid transparent`,
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      className="group"
    >
      {/* Badge icon */}
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.4 }}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: `0 8px 24px ${primaryColor}30`
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      </motion.div>

      <h4
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: 6
        }}
      >
        {name}
      </h4>
      <p
        style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: primaryColor,
          marginBottom: 4
        }}
      >
        {issuer}
      </p>
      {year && (
        <span
          style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            fontFamily: "'JetBrains Mono', monospace"
          }}
        >
          {year}
        </span>
      )}

      {/* Glow effect on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
          zIndex: -1,
          filter: 'blur(12px)',
          opacity: 0.4
        }}
      />
    </motion.div>
  )
}

// ── Social Link Button ─────────────────────────────────────────────────────────
function SocialLink({
  href,
  icon,
  label,
  primaryColor
}: {
  href?: string
  icon: React.ReactNode
  label: string
  primaryColor: string
}) {
  if (!href) return null

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.1, y: -4 }}
      whileTap={{ scale: 0.95 }}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0f172a',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      title={label}
    >
      {icon}
    </motion.a>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TechnicalModern({
  profile,
  primaryColor: PC,
  accentColor: AC,
  showSections,
  heroGradient,
  profilePhoto,
}: PortfolioTemplateProps) {
  // Theme configuration
  const theme = getThemeById('technical-modern')
  const primaryColor = PC || theme?.colors.secondary || '#6366f1'
  const accentColor = AC || theme?.colors.accent || '#22d3ee'

  // Build data from profile
  const name = profile.full_name || 'Alex Morgan'
  const title = profile.current_job_title || 'Full Stack Developer'
  const bio = profile.headline || 'Building digital experiences with clean code and thoughtful design.'
  const firstName = name.split(' ')[0]
  const lastName = name.split(' ').slice(1).join(' ') || ''
  const initials = name
    .split(' ')
    .map((w: string) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Skills aggregation
  const skills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || [])
  ]

  // Generate skill percentages (for demo - would normally come from profile)
  const skillPercentages = useMemo(() => {
    return skills.map((skill, i) => ({
      name: skill,
      percentage: Math.max(70, 100 - i * 5)
    }))
  }, [skills])

  // Projects from profile
  const projects = profile.resume_facts_projects || []

  // Experience from profile
  const experience = profile.resume_facts_companies || []

  // Education from profile
  const education = profile.education || []

  // Certifications from profile
  const certifications: string[] = []

  // Project gradients
  const projectGradients = [
    `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
    `linear-gradient(135deg, #8b5cf6, #ec4899)`,
    `linear-gradient(135deg, #10b981, #06b6d4)`,
    `linear-gradient(135deg, #f59e0b, #ef4444)`,
    `linear-gradient(135deg, #06b6d4, #3b82f6)`,
    `linear-gradient(135deg, #ec4899, #f43f5e)`
  ]

  // Hero background
  const heroBg =
    heroGradient ||
    `linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)`

  return (
    <div
      style={{
        background: '#f8fafc',
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif",
        overflowX: 'hidden'
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        style={{
          minHeight: '100vh',
          background: heroBg,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingShape
            size={600}
            color={primaryColor}
            duration={12}
            delay={0}
            top="-10%"
            right="-15%"
            blur
          />
          <FloatingShape
            size={400}
            color={accentColor}
            duration={10}
            delay={2}
            bottom="-15%"
            left="-10%"
            blur
          />
          <FloatingShape
            size={200}
            color={primaryColor}
            duration={8}
            delay={4}
            top="30%"
            left="20%"
          />
          <FloatingShape
            size={150}
            color={accentColor}
            duration={7}
            delay={3}
            top="60%"
            right="25%"
          />
          <DotsPattern color="#ffffff" opacity={0.08} />
          <GridLines color="#ffffff" opacity={0.03} />

          {/* Floating geometric shapes */}
          <motion.div
            animate={{
              rotate: [0, 360],
              y: [0, -20, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: '15%',
              right: '15%',
              width: 80,
              height: 80,
              border: `2px solid ${primaryColor}30`,
              borderRadius: 16
            }}
          />
          <motion.div
            animate={{
              rotate: [360, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              bottom: '25%',
              left: '10%',
              width: 60,
              height: 60,
              border: `2px solid ${accentColor}30`,
              borderRadius: '50%'
            }}
          />
          <motion.div
            animate={{
              x: [0, 15, 0],
              rotate: [0, 45, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '40%',
              right: '8%',
              width: 40,
              height: 40,
              background: `${accentColor}20`,
              borderRadius: 8
            }}
          />
        </div>

        {/* Hero content */}
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '120px 48px 80px',
            position: 'relative',
            zIndex: 10,
            width: '100%'
          }}
        >
          <div style={{ maxWidth: 900 }}>
            {/* Greeting */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                fontSize: '1.1rem',
                fontWeight: 500,
                color: accentColor,
                marginBottom: 16,
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              {'// '}Hello, I'm
            </motion.p>

            {/* Name - massive typography */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              style={{
                fontSize: 'clamp(3rem, 10vw, 7rem)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1,
                marginBottom: 24,
                letterSpacing: '-0.02em'
              }}
            >
              <motion.span
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{
                  display: 'inline-block',
                  background: `linear-gradient(135deg, #ffffff, ${accentColor})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {firstName}
              </motion.span>
              {lastName && (
                <>
                  <br />
                  <motion.span
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{
                      display: 'inline-block',
                      color: '#ffffff'
                    }}
                  >
                    {lastName}
                  </motion.span>
                </>
              )}
            </motion.h1>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: 50,
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                marginBottom: 32
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 12px #22c55e'
                }}
                className="animate-pulse"
              />
              <span
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#ffffff'
                }}
              >
                {title}
              </span>
            </motion.div>

            {/* Bio */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{
                fontSize: '1.25rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.7,
                maxWidth: 600,
                marginBottom: 40
              }}
            >
              {bio}
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
            >
              <motion.a
                href="#projects"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '16px 32px',
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  color: '#ffffff',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: `0 8px 24px ${primaryColor}40`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                View My Work
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </motion.a>
              <motion.a
                href="#contact"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '16px 32px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Get In Touch
              </motion.a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              style={{
                display: 'flex',
                gap: 48,
                marginTop: 64,
                paddingTop: 40,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {[
                { value: projects.length || '5+', label: 'Projects' },
                { value: experience.length || '3+', label: 'Companies' },
                { value: skills.length || '10+', label: 'Technologies' }
              ].map((stat, i) => (
                <div key={stat.label}>
                  <p
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      lineHeight: 1,
                      marginBottom: 8
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: 2
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.75rem',
            letterSpacing: 2
          }}
        >
          <span>SCROLL</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ABOUT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.about !== false && (
        <SectionWrapper id="about">
          <div
            style={{
              maxWidth: 1400,
              margin: '0 auto',
              padding: '120px 48px'
            }}
          >
            <SectionTitle
              title="About Me"
              subtitle="Get to know me better - my background, passion, and what drives me"
              primaryColor={primaryColor}
              accentColor={accentColor}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: 64,
                alignItems: 'center'
              }}
            >
              {/* Image / Visual side */}
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-100px' }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.15 } }
                }}
                style={{ position: 'relative' }}
              >
                {/* Profile image or initials */}
                <motion.div
                  variants={fadeUp}
                  style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    borderRadius: 24,
                    overflow: 'hidden',
                    position: 'relative',
                    background: `linear-gradient(135deg, ${primaryColor}20, ${accentColor}20)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '8rem',
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      {initials}
                    </span>
                  )}

                  {/* Decorative elements */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      border: `2px dashed ${primaryColor}40`
                    }}
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      bottom: -15,
                      left: -15,
                      width: 80,
                      height: 80,
                      borderRadius: 16,
                      border: `2px solid ${accentColor}40`,
                      transform: 'rotate(45deg)'
                    }}
                  />
                </motion.div>

                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  style={{
                    position: 'absolute',
                    bottom: 32,
                    right: -20,
                    background: '#ffffff',
                    padding: '16px 24px',
                    borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1
                      }}
                    >
                      {experience.length || '3+'}
                    </p>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: 1
                      }}
                    >
                      Years Exp.
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Text side */}
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-100px' }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.15 } }
                }}
              >
                <motion.h3
                  variants={fadeUp}
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: 24,
                    lineHeight: 1.3
                  }}
                >
                  Passionate about building{' '}
                  <span
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    exceptional digital products
                  </span>
                </motion.h3>

                <motion.p
                  variants={fadeUp}
                  style={{
                    fontSize: '1.1rem',
                    color: '#64748b',
                    lineHeight: 1.8,
                    marginBottom: 24
                  }}
                >
                  {bio}
                </motion.p>

                <motion.p
                  variants={fadeUp}
                  style={{
                    fontSize: '1rem',
                    color: '#64748b',
                    lineHeight: 1.8,
                    marginBottom: 40
                  }}
                >
                  With a strong foundation in modern web technologies and a keen eye
                  for design, I specialize in creating seamless user experiences that
                  combine beautiful aesthetics with robust functionality. I'm
                  constantly learning and adapting to stay at the forefront of
                  technology.
                </motion.p>

                {/* Info grid */}
                <motion.div
                  variants={fadeUp}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 20
                  }}
                >
                  {[
                    { label: 'Location', value: 'San Francisco, CA' },
                    { label: 'Experience', value: `${experience.length || 3}+ Years` },
                    { label: 'Projects', value: `${projects.length || 5}+ Completed` },
                    { label: 'Focus', value: 'Full Stack Development' }
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: 16,
                        background: '#ffffff',
                        borderRadius: 12,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                          marginBottom: 4
                        }}
                      >
                        {item.label}
                      </p>
                      <p
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* SKILLS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.skills !== false && (
        <SectionWrapper>
          <div
            style={{
              background: `linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)`,
              padding: '120px 48px'
            }}
          >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <SectionTitle
                title="Technical Skills"
                subtitle="My toolkit for bringing ideas to life"
                primaryColor={primaryColor}
                accentColor={accentColor}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: 48
                }}
              >
                {/* Languages */}
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-100px' }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08 } }
                  }}
                  style={{
                    background: '#ffffff',
                    padding: 32,
                    borderRadius: 24,
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 32
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                      >
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        Languages
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Core programming
                      </p>
                    </div>
                  </div>

                  {skillPercentages.slice(0, 6).map((skill, i) => (
                    <SkillBar
                      key={skill.name}
                      name={skill.name}
                      percentage={skill.percentage}
                      primaryColor={primaryColor}
                      accentColor={accentColor}
                      delay={i * 0.1}
                    />
                  ))}
                </motion.div>

                {/* Frameworks */}
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-100px' }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08 } }
                  }}
                  style={{
                    background: '#ffffff',
                    padding: 32,
                    borderRadius: 24,
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 32
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, #8b5cf6, #ec4899)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        Frameworks
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Libraries & frameworks
                      </p>
                    </div>
                  </div>

                  {skillPercentages.slice(6, 12).map((skill, i) => (
                    <SkillBar
                      key={skill.name}
                      name={skill.name}
                      percentage={skill.percentage}
                      primaryColor="#8b5cf6"
                      accentColor="#ec4899"
                      delay={i * 0.1}
                    />
                  ))}
                </motion.div>

                {/* Tools */}
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-100px' }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08 } }
                  }}
                  style={{
                    background: '#ffffff',
                    padding: 32,
                    borderRadius: 24,
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 32
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, #10b981, #06b6d4)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                      >
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        Tools
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        DevOps & utilities
                      </p>
                    </div>
                  </div>

                  {skillPercentages.slice(12, 18).map((skill, i) => (
                    <SkillBar
                      key={skill.name}
                      name={skill.name}
                      percentage={skill.percentage}
                      primaryColor="#10b981"
                      accentColor="#06b6d4"
                      delay={i * 0.1}
                    />
                  ))}
                </motion.div>
              </div>

              {/* Skill tags */}
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={stagger}
                style={{
                  marginTop: 48,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  justifyContent: 'center'
                }}
              >
                {skills.slice(0, 20).map((skill, i) => (
                  <motion.span
                    key={skill}
                    variants={scaleUp}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: `0 4px 16px ${primaryColor}30`
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#ffffff',
                      borderRadius: 50,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      border: '1px solid #e2e8f0',
                      cursor: 'default'
                    }}
                  >
                    {skill}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* PROJECTS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.projects !== false && (
        <SectionWrapper id="projects">
          <div
            style={{
              maxWidth: 1400,
              margin: '0 auto',
              padding: '120px 48px'
            }}
          >
            <SectionTitle
              title="Featured Projects"
              subtitle="A selection of my recent work and personal experiments"
              primaryColor={primaryColor}
              accentColor={accentColor}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: 32
              }}
            >
              {projects.length > 0 ? (
                (projects as string[]).map((p, i) => (
                  <ProjectCard
                    key={p || i}
                    title={p}
                    description=""
                    techStack={[]}
                    gradient={projectGradients[i % projectGradients.length]}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    delay={i * 0.1}
                  />
                ))
              ) : (
                // Default projects when none provided
                [
                  {
                    title: 'CloudScale Analytics',
                    description: 'Real-time analytics platform processing millions of events per second with sub-millisecond latency.',
                    techStack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Kubernetes']
                  },
                  {
                    title: 'DevFlow CLI',
                    description: 'A powerful command-line tool for automating development workflows and CI/CD pipelines.',
                    techStack: ['TypeScript', 'Go', 'Docker', 'GitHub Actions']
                  },
                  {
                    title: 'NeuroLearn AI',
                    description: 'Machine learning platform for personalized education with adaptive curriculum generation.',
                    techStack: ['Python', 'TensorFlow', 'FastAPI', 'React', 'AWS']
                  },
                  {
                    title: 'SecureVault',
                    description: 'Enterprise-grade password manager with zero-knowledge encryption and biometric authentication.',
                    techStack: ['Rust', 'WebAssembly', 'React Native', 'GraphQL']
                  },
                  {
                    title: 'DataMesh Pro',
                    description: 'Distributed data mesh architecture enabling domain-oriented data ownership and governance.',
                    techStack: ['Apache Kafka', 'Spark', 'Terraform', 'Python']
                  },
                  {
                    title: 'DesignSync',
                    description: 'Collaborative design system platform bridging designers and developers with real-time sync.',
                    techStack: ['Next.js', 'Figma API', 'Socket.io', 'MongoDB']
                  }
                ].map((project, i) => (
                  <ProjectCard
                    key={project.title}
                    title={project.title}
                    description={project.description}
                    techStack={project.techStack}
                    gradient={projectGradients[i % projectGradients.length]}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    delay={i * 0.1}
                  />
                ))
              )}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* EXPERIENCE SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.experience !== false && (
        <SectionWrapper>
          <div
            style={{
              background: `linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)`,
              padding: '120px 48px'
            }}
          >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <SectionTitle
                title="Work Experience"
                subtitle="My professional journey building impactful products"
                primaryColor={primaryColor}
                accentColor={accentColor}
              />

              {/* Timeline */}
              <div
                style={{
                  position: 'relative',
                  paddingTop: 40
                }}
              >
                {/* Timeline line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: `linear-gradient(180deg, ${primaryColor}, ${accentColor})`,
                    transform: 'translateX(-50%)'
                  }}
                />

                {experience.length > 0 ? (
                  (experience as string[]).map((exp, i) => (
                    <TimelineItem
                      key={exp || i}
                      title={exp}
                      company=""
                      period=""
                      description=""
                      primaryColor={primaryColor}
                      accentColor={accentColor}
                      index={i}
                      isLast={i === experience.length - 1}
                    />
                  ))
                ) : (
                  // Default experience
                  [
                    { title: 'Senior Full Stack Engineer', company: 'TechCorp Inc.', period: '2022 - Present', description: 'Leading development of microservices architecture serving 10M+ users with 99.9% uptime.' },
                    { title: 'Full Stack Developer', company: 'StartupXYZ', period: '2020 - 2022', description: 'Built core product features and mentored junior developers. Reduced page load times by 60%.' },
                    { title: 'Frontend Developer', company: 'Digital Agency Co.', period: '2018 - 2020', description: 'Developed responsive web applications for Fortune 500 clients using React and Vue.js.' }
                  ].map((exp, i) => (
                    <TimelineItem
                      key={exp.company}
                      title={exp.title}
                      company={exp.company}
                      period={exp.period}
                      description={exp.description}
                      primaryColor={primaryColor}
                      accentColor={accentColor}
                      index={i}
                      isLast={i === 2}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* EDUCATION SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.education !== false && (
        <SectionWrapper>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '120px 48px'
            }}
          >
            <SectionTitle
              title="Education"
              subtitle="Academic foundation and continuous learning"
              primaryColor={primaryColor}
              accentColor={accentColor}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: 24
              }}
            >
              {education.length > 0 ? (
                (education as string[]).map((edu, i) => (
                  <EducationCard
                    key={edu || i}
                    degree="Degree"
                    school={edu}
                    year=""
                    description=""
                    primaryColor={primaryColor}
                    delay={i * 0.1}
                  />
                ))
              ) : (
                // Default education
                [
                  { degree: 'M.S. Computer Science', school: 'Stanford University', year: '2020', description: 'Specialized in Distributed Systems and Machine Learning' },
                  { degree: 'B.S. Software Engineering', school: 'UC Berkeley', year: '2018', description: 'Dean\'s List Graduate with focus on Web Technologies' }
                ].map((edu, i) => (
                  <EducationCard
                    key={edu.school}
                    degree={edu.degree}
                    school={edu.school}
                    year={edu.year}
                    description={edu.description}
                    primaryColor={primaryColor}
                    delay={i * 0.1}
                  />
                ))
              )}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* CERTIFICATIONS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.certifications !== false && certifications.length > 0 && (
        <SectionWrapper>
          <div
            style={{
              background: `linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)`,
              padding: '120px 48px'
            }}
          >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <SectionTitle
                title="Certifications"
                subtitle="Professional credentials and achievements"
                primaryColor={primaryColor}
                accentColor={accentColor}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 24
                }}
              >
                {certifications.map((cert: string | { name: string; issuer?: string; year?: string }, i: number) => {
                  const certName = typeof cert === 'string' ? cert : cert.name
                  const certIssuer = typeof cert === 'string' ? '' : cert.issuer
                  const certYear = typeof cert === 'string' ? '' : cert.year

                  return (
                    <CertificationBadge
                      key={certName}
                      name={certName}
                      issuer={certIssuer || 'Professional Institution'}
                      year={certYear}
                      primaryColor={primaryColor}
                      accentColor={accentColor}
                      delay={i * 0.08}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* CONTACT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.contact !== false && (
        <SectionWrapper id="contact">
          <section
            style={{
              background: heroBg,
              position: 'relative',
              overflow: 'hidden',
              padding: '120px 48px'
            }}
          >
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <FloatingShape
                size={500}
                color={primaryColor}
                duration={15}
                delay={0}
                top="-20%"
                right="-15%"
                blur
              />
              <FloatingShape
                size={400}
                color={accentColor}
                duration={12}
                delay={3}
                bottom="-20%"
                left="-10%"
                blur
              />
              <DotsPattern color="#ffffff" opacity={0.05} />
            </div>

            <div
              style={{
                maxWidth: 800,
                margin: '0 auto',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10
              }}
            >
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.12 } }
                }}
              >
                <motion.p
                  variants={fadeUp}
                  style={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: accentColor,
                    marginBottom: 16,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  {'// '}Let's Connect
                </motion.p>

                <motion.h2
                  variants={fadeUp}
                  style={{
                    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                    fontWeight: 800,
                    color: '#ffffff',
                    marginBottom: 24,
                    lineHeight: 1.2
                  }}
                >
                  Ready to build something{' '}
                  <span
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    amazing together?
                  </span>
                </motion.h2>

                <motion.p
                  variants={fadeUp}
                  style={{
                    fontSize: '1.2rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.7,
                    marginBottom: 48,
                    maxWidth: 600,
                    margin: '0 auto 48px'
                  }}
                >
                  I'm always interested in hearing about new projects and opportunities.
                  Whether you have a question or just want to say hi, I'll try my best
                  to get back to you!
                </motion.p>

                {/* Contact button */}
                <motion.div variants={fadeUp} style={{ marginBottom: 48 }}>
                  <motion.a
                    href={profile.email ? `mailto:${profile.email}` : '#'}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '20px 48px',
                      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                      color: '#ffffff',
                      borderRadius: 16,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      textDecoration: 'none',
                      boxShadow: `0 12px 40px ${primaryColor}50`
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {profile.email ? 'Say Hello' : 'Get In Touch'}
                  </motion.a>
                </motion.div>

                {/* Social links */}
                <motion.div
                  variants={fadeUp}
                  style={{
                    display: 'flex',
                    gap: 16,
                    justifyContent: 'center'
                  }}
                >
                  <SocialLink
                    href={profile.linkedin}
                    label="LinkedIn"
                    primaryColor={primaryColor}
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    }
                  />
                  <SocialLink
                    href={profile.github}
                    label="GitHub"
                    primaryColor={primaryColor}
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    }
                  />
                  <SocialLink
                    href={profile.email ? `mailto:${profile.email}` : undefined}
                    label="Email"
                    primaryColor={primaryColor}
                    icon={
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    }
                  />
                </motion.div>
              </motion.div>
            </div>
          </section>
        </SectionWrapper>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showSections?.footer !== false && (
        <footer
          style={{
            background: '#0a0a0a',
            padding: '48px 48px 32px'
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 32
            }}
          >
            {/* Logo / Name */}
            <div style={{ textAlign: 'center' }}>
              <span
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                <span style={{ color: primaryColor }}>{'<'}</span>
                {firstName}
                <span style={{ color: primaryColor }}>{' />'}</span>
              </span>
            </div>

            {/* Navigation */}
            <nav
              style={{
                display: 'flex',
                gap: 32,
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}
            >
              {['About', 'Skills', 'Projects', 'Experience', 'Contact'].map(
                (item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = '#ffffff')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')
                    }
                  >
                    {item}
                  </a>
                )
              )}
            </nav>

            {/* Divider */}
            <div
              style={{
                width: '100%',
                maxWidth: 600,
                height: 1,
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
              }}
            />

            {/* Copyright */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '0.85rem'
              }}
            >
              <span>Built with</span>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ color: '#ef4444' }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </motion.span>
              <span>
                {new Date().getFullYear()} {name}. All rights reserved.
              </span>
            </div>
          </div>
        </footer>
      )}

      {/* Global styles */}
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html {
          scroll-behavior: smooth;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        ::-webkit-scrollbar-thumb {
          background: ${primaryColor}50;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${primaryColor};
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
