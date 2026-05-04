import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Code2, Server,
  Briefcase, GraduationCap, Award, Mail, Linkedin, Github,
  ExternalLink, MapPin, Calendar, Heart, Star,
  Layers, Zap, Shield, Coffee, MessageCircle, Leaf, TreePine,
  Flower2, Sprout, Gem, Sparkles,
  Clock, Building2
} from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// ── Nature/Organic color palette ───────────────────────────────────────────────
const NATURE = {
  primary:    '#1a2e1a',   // deep forest green
  secondary:  '#4ade80',   // fresh leaf green
  accent:     '#a3e635',   // lime/chlorophyll green
  background: '#f0fdf4',   // soft mint cream
  surface:    '#dcfce7',   // pale green surface
  card:       '#ffffff',   // white cards
  border:     '#bbf7d0',   // soft green border
  text:       '#1a2e1a',   // dark forest text
  textMuted:  '#4b5563',   // gray for muted text
  shadow:     '0 2px 12px rgba(74,222,128,0.12)',
  gradient:   ['#4ade80', '#a3e635'],
  pillBg:     '#dcfce7',    // light green pill background
  leaf:       '#22c55e',   // leaf green
  bark:       '#78716c',   // earthy bark color
  sky:        '#7dd3fc',   // sky blue accent
  soil:       '#a16207',   // soil brown
  warmWhite:  '#fafffe',   // warm white
  cream:      '#fefce8',   // cream accent
}

// ── CSS Keyframes for floating animations ─────────────────────────────────────
const cssKeyframes = `
  @keyframes floatGentle {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-12px) rotate(3deg); }
    66% { transform: translateY(-6px) rotate(-2deg); }
  }
  @keyframes floatLeaf {
    0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
    50% { transform: translateY(-20px) rotate(10deg) scale(1.05); }
  }
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0px) translateX(0px); }
    25% { transform: translateY(-15px) translateX(5px); }
    50% { transform: translateY(-8px) translateX(-5px); }
    75% { transform: translateY(-18px) translateX(3px); }
  }
  @keyframes pulseGreen {
    0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
    50% { box-shadow: 0 0 0 12px rgba(74, 222, 128, 0); }
  }
  @keyframes breatheScale {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes sway {
    0%, 100% { transform: rotate(-5deg); }
    50% { transform: rotate(5deg); }
  }
  @keyframes drift {
    0% { transform: translateX(-100%) rotate(0deg); opacity: 0; }
    10% { opacity: 0.7; }
    90% { opacity: 0.7; }
    100% { transform: translateX(100%) rotate(360deg); opacity: 0; }
  }
  @keyframes leafSway {
    0%, 100% { transform: rotate(-8deg) scaleY(1); }
    50% { transform: rotate(8deg) scaleY(0.95); }
  }
`

// ── Animation presets ──────────────────────────────────────────────────────────
const fadeUp: any = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}
const fadeIn: any = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' as const } },
}
const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.9 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const stagger: any = {
  show: { transition: { staggerChildren: 0.12 } },
}
const staggerSlow: any = {
  show: { transition: { staggerChildren: 0.18 } },
}

// ── Floating Organic Blob ───────────────────────────────────────────────────────
function OrganicBlob({
  size = 400,
  color = NATURE.secondary,
  opacity = 0.1,
  top,
  left,
  right,
  bottom,
  delay = 0,
  borderRadius = '60% 40% 50% 50% / 50% 60% 40% 50%',
}: {
  size?: number
  color?: string
  opacity?: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  delay?: number
  borderRadius?: string
}) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1.08, 1.02, 1],
        rotate: [0, 5, 0, -5, 0],
        borderRadius: [
          '60% 40% 50% 50% / 50% 60% 40% 50%',
          '40% 60% 50% 50% / 60% 40% 50% 50%',
          '50% 50% 40% 60% / 40% 50% 60% 50%',
          '60% 40% 50% 50% / 50% 60% 40% 50%',
        ],
      }}
      transition={{ duration: 15 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className="absolute pointer-events-none"
      style={{ width: size, height: size, top, left, right, bottom }}
    >
      <div
        className="w-full h-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          borderRadius,
          filter: 'blur(1px)',
        }}
      />
    </motion.div>
  )
}

// ── Floating Leaf Decoration ───────────────────────────────────────────────────
function FloatingLeaf({
  size = 40,
  top,
  left,
  right,
  bottom,
  delay = 0,
  color = NATURE.secondary,
}: {
  size?: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  delay?: number
  color?: string
}) {
  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        rotate: [0, 15, -10, 5, 0],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{ duration: 8 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className="absolute pointer-events-none"
      style={{ top, left, right, bottom }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity={0.6}>
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l.29-.27A6.5 6.5 0 0 0 12 17c5 0 9.27-2.53 11-7-1.86.72-4.07 1.18-6 .98 1.27-1.82 2.02-4.04 2-6.68z"/>
      </svg>
    </motion.div>
  )
}

// ── Organic Circle ─────────────────────────────────────────────────────────────
function OrganicCircle({
  size = 100,
  color = NATURE.accent,
  colorStrength = 0.3,
  top,
  left,
  right,
  bottom,
  delay = 0,
}: {
  size?: number
  color?: string
  colorStrength?: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  delay?: number
}) {
  const opacityVal = Math.min(1, colorStrength)
  return (
    <motion.div
      animate={{
        y: [0, -16, 0],
        opacity: [opacityVal * 0.5, opacityVal, opacityVal * 0.5],
        scale: [1, 1.05, 1],
      }}
      transition={{ duration: 7 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        borderRadius: '60% 40% 50% 50% / 50% 60% 40% 50%',
        background: `radial-gradient(circle at 40% 40%, ${color}${Math.round(opacityVal * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
      }}
    />
  )
}

// ── Nature Pill Badge ───────────────────────────────────────────────────────────
function _NaturePillBadge({
  label,
  color = NATURE.secondary,
  icon,
}: {
  label: string
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.06, y: -2, boxShadow: `0 4px 20px ${color}30` }}
      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold cursor-default"
      style={{
        background: `${color}12`,
        color,
        border: `1.5px solid ${color}30`,
        fontFamily: "'DM Sans', sans-serif",
        backdropFilter: 'blur(8px)',
      }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </motion.span>
  )
}

// ── Nature Card ───────────────────────────────────────────────────────────────
function NatureCard({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-[24px] p-7 ${className}`}
      style={{
        background: '#ffffff',
        border: `1.5px solid ${NATURE.border}`,
        boxShadow: NATURE.shadow,
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Timeline Branch Node ──────────────────────────────────────────────────────
function TimelineBranchNode({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 180, damping: 12 }}
      className="w-5 h-5 rounded-full shrink-0 mt-2 relative"
      style={{
        background: `linear-gradient(135deg, ${NATURE.secondary}, ${NATURE.accent})`,
        boxShadow: `0 0 16px ${NATURE.secondary}50`,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full"
        style={{ background: NATURE.secondary, transformOrigin: 'center' }}
      />
    </motion.div>
  )
}

// ── Section Heading ────────────────────────────────────────────────────────────
function SectionHeading({
  title,
  subtitle,
  icon,
  delay = 0,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  delay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="mb-14 text-center"
    >
      <div className="inline-flex items-center justify-center gap-3 mb-5">
        {icon && (
          <motion.div
            initial={{ rotate: -15, scale: 0.8 }}
            animate={inView ? { rotate: 0, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: delay + 0.2, type: 'spring' }}
            className="w-12 h-12 rounded-[18px] flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${NATURE.secondary}20, ${NATURE.accent}20)`,
              border: `1.5px solid ${NATURE.secondary}35`,
            }}
          >
            {icon}
          </motion.div>
        )}
        <h2
          className="text-4xl md:text-5xl font-bold"
          style={{
            color: NATURE.primary,
            fontFamily: "'Fraunces', 'Lora', serif",
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
      </div>
      {subtitle && (
        <p
          className="text-lg max-w-2xl mx-auto"
          style={{
            color: NATURE.textMuted,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.7,
          }}
        >
          {subtitle}
        </p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.6, delay: delay + 0.3 }}
        className="w-20 h-1.5 rounded-full mx-auto mt-5"
        style={{
          background: `linear-gradient(90deg, ${NATURE.secondary}, ${NATURE.accent})`,
          transformOrigin: 'center',
        }}
      />
    </motion.div>
  )
}

// ── Skill Pill with Nature Colors ──────────────────────────────────────────────
const NATURE_SKILL_COLORS = [
  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  { bg: '#f7fdf5', color: '#15803d', border: '#86efac' },
  { bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
  { bg: '#dcfce7', color: '#22c55e', border: '#86efac' },
  { bg: '#f0fdf4', color: '#4ade80', border: '#bbf7d0' },
  { bg: '#fafaf5', color: '#84cc16', border: '#d9f99d' },
  { bg: '#f7fdf5', color: '#65a30d', border: '#c4f5a0' },
  { bg: '#ecfdf5', color: '#a3e635', border: '#d9f99d' },
]

function SkillPill({ skill, index }: { skill: string; index: number }) {
  const colorSet = NATURE_SKILL_COLORS[index % NATURE_SKILL_COLORS.length]
  return (
    <motion.span
      whileHover={{ scale: 1.1, y: -3, boxShadow: `0 6px 20px ${colorSet.color}25` }}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center px-4 py-2.5 rounded-full text-sm font-medium cursor-default"
      style={{
        background: colorSet.bg,
        color: colorSet.color,
        border: `1.5px solid ${colorSet.border}`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {skill}
    </motion.span>
  )
}

// ── Project Card with Nature Theme ────────────────────────────────────────────
function NatureProjectCard({
  title,
  description,
  tech,
  year,
  link,
  index,
}: {
  title: string
  description: string
  tech: string[]
  year: string
  link?: string
  index: number
}) {
  const natureGradients = [
    `linear-gradient(145deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)`,
    `linear-gradient(145deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)`,
    `linear-gradient(145deg, #f7fdf5 0%, #d9f99d 50%, #bef264 100%)`,
    `linear-gradient(145deg, #f0fdf4 0%, #bbf7d0 50%, #86efac 100%)`,
    `linear-gradient(145deg, #ecfdf5 0%, #a7f3d0 50%, #6ee7b7 100%)`,
  ]
  const grad = natureGradients[index % natureGradients.length]

  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.03 }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-[24px] overflow-hidden relative"
      style={{
        background: '#ffffff',
        border: `1.5px solid ${NATURE.border}`,
        boxShadow: NATURE.shadow,
      }}
    >
      {/* Nature gradient header strip */}
      <div className="h-2 w-full" style={{ background: grad }} />

      {/* Leaf decoration in corner */}
      <motion.div
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-3 right-3 opacity-30"
      >
        <Leaf size={28} style={{ color: NATURE.secondary }} />
      </motion.div>

      {/* Content */}
      <div className="p-7">
        <div className="flex items-start justify-between mb-4">
          <h3
            className="text-xl font-bold pr-8"
            style={{
              color: NATURE.primary,
              fontFamily: "'Fraunces', 'Lora', serif",
            }}
          >
            {title}
          </h3>
          {link && (
            <motion.a
              href={link}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.2, rotate: 10, y: -2 }}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `${NATURE.secondary}15`,
                color: NATURE.secondary,
                border: `1.5px solid ${NATURE.secondary}30`,
              }}
            >
              <ExternalLink size={15} />
            </motion.a>
          )}
        </div>

        <p
          className="text-sm mb-5 leading-relaxed"
          style={{
            color: NATURE.textMuted,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>

        {/* Tech stack nature pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {tech.slice(0, 5).map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                background: `${NATURE.accent}10`,
                color: '#4d7c0f',
                border: `1px solid ${NATURE.accent}30`,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Year badge with nature styling */}
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: NATURE.textMuted }} />
          <span
            className="text-xs font-medium"
            style={{ color: NATURE.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {year}
          </span>
        </div>
      </div>

      {/* Hover nature glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-[24px]"
        style={{
          background: `linear-gradient(135deg, ${NATURE.secondary}05, ${NATURE.accent}05)`,
          border: `2px solid ${NATURE.secondary}25`,
        }}
      />
    </motion.div>
  )
}

// ── Circular Certification Badge ───────────────────────────────────────────────
function CertificationBadge({
  name,
  issuer,
  year,
  index,
}: {
  name: string
  issuer: string
  year: string
  index: number
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.08, y: -4 }}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex flex-col items-center gap-3 p-5 rounded-[24px]"
      style={{
        background: '#ffffff',
        border: `1.5px solid ${NATURE.border}`,
        boxShadow: NATURE.shadow,
      }}
    >
      <motion.div
        whileHover={{ rotate: 8, scale: 1.1 }}
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${NATURE.secondary}20, ${NATURE.accent}20)`,
          border: `2px solid ${NATURE.secondary}35`,
          boxShadow: `0 4px 16px ${NATURE.secondary}15`,
        }}
      >
        <Gem size={24} style={{ color: NATURE.secondary }} />
      </motion.div>
      <div className="text-center">
        <p
          className="text-sm font-bold mb-1"
          style={{ color: NATURE.primary, fontFamily: "'Fraunces', serif" }}
        >
          {name}
        </p>
        <p
          className="text-xs"
          style={{ color: NATURE.textMuted, fontFamily: "'DM Sans', sans-serif" }}
        >
          {issuer} - {year}
        </p>
      </div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TechnicalNature({
  profile,
  primaryColor: _primaryColor,
  accentColor: _accentColor,
  showSections,
  profilePhoto,
  textOverrides,
}: PortfolioTemplateProps) {
  // ── Resolve profile data ─────────────────────────────────────────────────────
  const name = textOverrides?.name || profile.full_name || profile.preferred_name || 'Your Name'
  const title = textOverrides?.title || profile.current_job_title || profile.target_role || 'Software Engineer'
  const bio = textOverrides?.bio || profile.headline || `Passionate developer who believes in building sustainable, thoughtful solutions. Nature inspires my approach to clean code and mindful design.`
  const firstName = name.split(' ')[0]
  const initials = name.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase()

  const allSkills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || []),
  ]

  const companies = (profile.resume_facts_companies || []) as string[]
  const projectList = (profile.resume_facts_projects || []) as string[]
  const educationList = profile.education ? [profile.education] : []

  // ── Timeline fade helper ─────────────────────────────────────────────────────
  const timelineFade: any = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: NATURE.background,
        color: NATURE.text,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Inject CSS keyframes */}
      <style>{cssKeyframes}</style>

      {/* ═══════════════════════════════════════════════════════════════════════
          NAVIGATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: 'rgba(240,253,244,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: NATURE.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo with nature icon */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-11 h-11 rounded-[14px] flex items-center justify-center"
              style={{
                background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                boxShadow: `0 4px 16px ${NATURE.secondary}40`,
              }}
            >
              <Leaf size={20} className="text-white" />
            </motion.div>
            <span
              className="font-bold text-lg"
              style={{
                color: NATURE.primary,
                fontFamily: "'Fraunces', serif",
              }}
            >
              {firstName}
            </span>
          </motion.div>

          {/* Nav links with nature styling */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex items-center gap-1"
          >
            {['About', 'Skills', 'Projects', 'Experience', 'Contact'].map((item, _i) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: `${NATURE.secondary}10`,
                  color: NATURE.primary,
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all duration-300"
                style={{ color: NATURE.textMuted }}
              >
                {item}
              </motion.a>
            ))}
          </motion.div>

          {/* CTA with nature gradient */}
          {profile.email && (
            <motion.a
              href={`mailto:${profile.email}`}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-[18px] text-sm font-bold text-white"
              style={{
                background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                boxShadow: `0 4px 20px ${NATURE.secondary}40`,
              }}
            >
              <Mail size={14} />
              Say Hello
            </motion.a>
          )}
        </div>
      </motion.nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="about"
        className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-20"
        style={{
          background: `linear-gradient(185deg, #f0fdf4 0%, #dcfce7 40%, #f0fdf4 100%)`,
        }}
      >
        {/* Large organic blobs */}
        <OrganicBlob size={700} color={NATURE.secondary} opacity={0.09} top="-15%" left="-20%" delay={0} />
        <OrganicBlob size={500} color={NATURE.accent} opacity={0.12} right="-10%" bottom="5%" delay={4} borderRadius="55% 45% 60% 40% / 45% 55% 45% 55%" />
        <OrganicBlob size={350} color={NATURE.leaf} opacity={0.08} top="25%" right="15%" delay={8} />

        {/* Floating leaf decorations */}
        <FloatingLeaf size={45} top="15%" left="8%" delay={0} />
        <FloatingLeaf size={35} top="25%" right="12%" delay={2} color={NATURE.accent} />
        <FloatingLeaf size={50} top="55%" left="5%" delay={1} color={NATURE.leaf} />
        <FloatingLeaf size={30} bottom="30%" right="8%" delay={3} />
        <FloatingLeaf size={40} top="40%" left="18%" delay={5} color={NATURE.accent} />
        <FloatingLeaf size={55} bottom="20%" left="22%" delay={7} color={NATURE.leaf} />

        {/* Organic circles scattered */}
        <OrganicCircle size={150} color={NATURE.secondary} top="18%" left="12%" delay={0} />
        <OrganicCircle size={100} color={NATURE.accent} top="55%" left="6%" delay={2} />
        <OrganicCircle size={120} color={NATURE.leaf} bottom="28%" right="18%" delay={4} />
        <OrganicCircle size={80} color={NATURE.secondary} top="42%" right="10%" delay={6} />

        {/* Nature dot pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${NATURE.secondary}12 1.5px, transparent 1.5px)`,
            backgroundSize: '48px 48px',
            opacity: 0.6,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerSlow}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16 items-center"
          >
            {/* Left: Text content */}
            <motion.div variants={fadeUp} className="lg:col-span-7">
              {/* Availability badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full mb-7"
                style={{
                  background: `${NATURE.leaf}12`,
                  border: `1.5px solid ${NATURE.leaf}35`,
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 rounded-full"
                  style={{ background: NATURE.leaf }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: '#15803d', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Open to opportunities
                </span>
              </motion.div>

              {/* Main heading */}
              <motion.h1
                variants={fadeUp}
                className="text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.1] mb-5"
                style={{
                  color: NATURE.primary,
                  fontFamily: "'Fraunces', 'Lora', serif",
                  letterSpacing: '-0.03em',
                }}
              >
                Hi, I'm{' '}
                <span
                  style={{
                    background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {firstName}
                </span>
              </motion.h1>

              {/* Title with organic line */}
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-7">
                <motion.div
                  className="w-14 h-0.5 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${NATURE.secondary}, ${NATURE.accent})` }}
                />
                <div className="flex items-center gap-2">
                  <TreePine size={18} style={{ color: NATURE.secondary }} />
                  <p
                    className="text-xl font-semibold"
                    style={{
                      color: NATURE.secondary,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {title}
                  </p>
                </div>
              </motion.div>

              {/* Bio */}
              <motion.p
                variants={fadeUp}
                className="text-lg leading-[1.8] mb-10 max-w-xl"
                style={{
                  color: NATURE.textMuted,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {bio}
              </motion.p>

              {/* Stats row */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-5 mb-12">
                {[
                  {
                    value: profile.years_experience || '5+',
                    label: 'Years Exp.',
                    icon: <Zap size={16} />,
                  },
                  {
                    value: Math.max(1, companies.length),
                    label: 'Companies',
                    icon: <Briefcase size={16} />,
                  },
                  {
                    value: allSkills.length || 8,
                    label: 'Skills',
                    icon: <Code2 size={16} />,
                  },
                  {
                    value: Math.max(1, projectList.length),
                    label: 'Projects',
                    icon: <Star size={16} />,
                  },
                ].map(({ value, label, icon }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.12 }}
                    whileHover={{ y: -4, scale: 1.03 }}
                    className="flex items-center gap-3 px-5 py-4 rounded-[20px]"
                    style={{
                      background: '#ffffff',
                      border: `1.5px solid ${NATURE.border}`,
                      boxShadow: `0 3px 16px ${NATURE.secondary}10`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${NATURE.secondary}15`,
                        color: NATURE.secondary,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <p
                        className="text-2xl font-bold"
                        style={{
                          background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {value}
                      </p>
                      <p
                        className="text-xs font-medium"
                        style={{ color: NATURE.textMuted }}
                      >
                        {label}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Action buttons */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                {profile.github && (
                  <motion.a
                    href={profile.github}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.06, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-[18px] text-sm font-bold text-white"
                    style={{
                      background: NATURE.primary,
                      boxShadow: `0 6px 20px ${NATURE.primary}25`,
                    }}
                  >
                    <Github size={16} />
                    GitHub
                  </motion.a>
                )}
                {profile.linkedin && (
                  <motion.a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.06, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-[18px] text-sm font-bold text-white"
                    style={{
                      background: `linear-gradient(145deg, #0a66c2, #0077b5)`,
                      boxShadow: `0 6px 20px rgba(10,102,194,0.3)`,
                    }}
                  >
                    <Linkedin size={16} />
                    LinkedIn
                  </motion.a>
                )}
                {profile.email && (
                  <motion.a
                    href={`mailto:${profile.email}`}
                    whileHover={{ scale: 1.06, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-[18px] text-sm font-bold text-white"
                    style={{
                      background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                      boxShadow: `0 6px 20px ${NATURE.secondary}40`,
                    }}
                  >
                    <Mail size={16} />
                    Email Me
                  </motion.a>
                )}
              </motion.div>
            </motion.div>

            {/* Right: Profile visual with nature styling */}
            <motion.div
              variants={fadeIn}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="relative">
                {/* Outer glow rings */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.25, 0.15] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -inset-12 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${NATURE.secondary}40, transparent 70%)`,
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute -inset-20 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${NATURE.accent}30, transparent 70%)`,
                  }}
                />

                {/* Rotating dashed ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-6 rounded-full border-2 border-dashed"
                  style={{ borderColor: `${NATURE.accent}45` }}
                />

                {/* Avatar container with organic border */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 14 }}
                  className="w-56 h-56 md:w-80 md:h-80 rounded-full flex items-center justify-center overflow-hidden relative"
                  style={{
                    background: `linear-gradient(145deg, ${NATURE.secondary}25, ${NATURE.accent}25)`,
                    border: `5px solid #ffffff`,
                    boxShadow: `0 10px 40px ${NATURE.secondary}30, 0 0 0 10px ${NATURE.secondary}10`,
                  }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name}
                      className="w-full h-full object-cover"
                      style={{
                        borderRadius: '50%',
                        filter: 'sepia(0.05) saturate(0.95)',
                      }}
                    />
                  ) : (
                    <span
                      className="text-7xl md:text-8xl font-bold"
                      style={{
                        background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {initials}
                    </span>
                  )}
                </motion.div>

                {/* Floating badge: open to work */}
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -right-5 top-8 px-5 py-3 rounded-[18px] flex items-center gap-2.5 text-sm font-bold text-white shadow-xl"
                  style={{
                    background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                    boxShadow: `0 8px 30px ${NATURE.secondary}50`,
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2.5 h-2.5 rounded-full bg-white"
                  />
                  Open to work
                </motion.div>

                {/* Floating badge: top skill */}
                <motion.div
                  animate={{ y: [0, 8, 0], rotate: [2, -2, 2] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -left-5 bottom-14 px-5 py-2.5 rounded-[18px] text-sm font-semibold shadow-lg"
                  style={{
                    background: '#ffffff',
                    color: NATURE.textMuted,
                    border: `1.5px solid ${NATURE.border}`,
                    boxShadow: `0 4px 16px ${NATURE.secondary}12`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sprout size={14} style={{ color: NATURE.secondary }} />
                    {allSkills[0] || 'Full Stack'}
                  </div>
                </motion.div>

                {/* Small decorative badge */}
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [-5, 5, -5] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute -right-3 bottom-24 w-14 h-14 rounded-[16px] flex items-center justify-center"
                  style={{
                    background: `${NATURE.accent}20`,
                    border: `1.5px solid ${NATURE.accent}40`,
                    boxShadow: `0 4px 16px ${NATURE.accent}15`,
                  }}
                >
                  <Heart size={20} style={{ color: NATURE.secondary }} />
                </motion.div>

                {/* Leaf decoration */}
                <motion.div
                  animate={{ rotate: [0, 10, 0, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                  className="absolute -left-6 top-16 opacity-50"
                >
                  <Leaf size={32} style={{ color: NATURE.leaf }} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll indicator with nature styling */}
          <motion.div
            animate={{ y: [0, 14, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          >
            <span
              className="text-xs font-medium"
              style={{ color: NATURE.textMuted }}
            >
              Scroll
            </span>
            <div
              className="w-0.5 h-10 rounded-full"
              style={{
                background: `linear-gradient(to bottom, ${NATURE.secondary}, transparent)`,
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          ABOUT / WHO I AM SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        className="py-28 px-6 relative"
        style={{ background: '#ffffff' }}
      >
        {/* Background organic shapes */}
        <OrganicBlob size={400} color={NATURE.secondary} opacity={0.06} top="-5%" right="-10%" delay={2} />
        <OrganicBlob size={300} color={NATURE.accent} opacity={0.08} bottom="10%" left="-8%" delay={5} />

        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title="Who I Am"
            subtitle="A bit about my journey and what drives my work"
            icon={<Flower2 size={22} style={{ color: NATURE.secondary }} />}
            delay={0}
          />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-10 xl:gap-16 items-center"
          >
            {/* Photo with nature frame */}
            <motion.div variants={fadeUp} className="flex justify-center">
              <div className="relative">
                {/* Organic glow behind photo */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -inset-6 rounded-[32px]"
                  style={{
                    background: `linear-gradient(145deg, ${NATURE.secondary}15, ${NATURE.accent}15)`,
                  }}
                />
                <div
                  className="relative w-72 h-72 md:w-80 md:h-80 rounded-[32px] overflow-hidden flex items-center justify-center"
                  style={{
                    background: `linear-gradient(145deg, #f0fdf4, #dcfce7)`,
                    border: `2px solid ${NATURE.border}`,
                    boxShadow: `0 10px 40px ${NATURE.secondary}20`,
                  }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: 30, filter: 'sepia(0.05) saturate(0.95)' }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="w-36 h-36 rounded-full flex items-center justify-center"
                        style={{
                          background: `linear-gradient(145deg, ${NATURE.secondary}30, ${NATURE.accent}30)`,
                          border: `3px solid white`,
                          boxShadow: `0 6px 24px ${NATURE.secondary}25`,
                        }}
                      >
                        <span
                          className="text-5xl font-bold"
                          style={{
                            background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {initials}
                        </span>
                      </motion.div>
                      <p
                        className="text-base font-semibold"
                        style={{ color: NATURE.textMuted }}
                      >
                        {name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Decorative rotating ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full border-2 border-dashed"
                  style={{ borderColor: `${NATURE.secondary}40` }}
                />

                {/* Decorative badges */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -bottom-4 -left-4 w-14 h-14 rounded-[16px] flex items-center justify-center"
                  style={{
                    background: `${NATURE.accent}20`,
                    border: `1.5px solid ${NATURE.accent}40`,
                  }}
                >
                  <Star size={20} style={{ color: NATURE.accent }} />
                </motion.div>

                <motion.div
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-3 -left-6 opacity-60"
                >
                  <Leaf size={36} style={{ color: NATURE.leaf }} />
                </motion.div>
              </div>
            </motion.div>

            {/* Bio text with nature cards */}
            <motion.div variants={fadeUp} className="space-y-7">
              <div
                className="p-7 rounded-[24px]"
                style={{
                  background: NATURE.surface,
                  border: `1.5px solid ${NATURE.border}`,
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${NATURE.secondary}20`,
                      color: NATURE.secondary,
                    }}
                  >
                    <Coffee size={18} />
                  </div>
                  <h3
                    className="font-bold text-lg"
                    style={{
                      color: NATURE.primary,
                      fontFamily: "'Fraunces', serif",
                    }}
                  >
                    About Me
                  </h3>
                </div>
                <p
                  className="leading-[1.8]"
                  style={{
                    color: NATURE.textMuted,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {bio}
                </p>
              </div>

              {/* Quick facts with nature styling */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: <MapPin size={16} />,
                    label: 'Location',
                    value: profile.city || profile.country || 'Remote',
                  },
                  {
                    icon: <Briefcase size={16} />,
                    label: 'Role',
                    value: profile.current_job_title || title,
                  },
                  {
                    icon: <Code2 size={16} />,
                    label: 'Focus',
                    value: allSkills.slice(0, 2).join(', ') || 'Full Stack',
                  },
                ].map(({ icon, label, value }) => (
                  <motion.div
                    key={label}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="p-5 rounded-[20px]"
                    style={{
                      background: '#ffffff',
                      border: `1.5px solid ${NATURE.border}`,
                      boxShadow: `0 2px 12px ${NATURE.secondary}08`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: NATURE.secondary }}>{icon}</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: NATURE.textMuted }}
                      >
                        {label}
                      </span>
                    </div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: NATURE.primary }}
                    >
                      {value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SKILLS SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.skills && allSkills.length > 0 && (
        <section
          id="skills"
          className="py-28 px-6 relative"
          style={{
            background: `linear-gradient(180deg, #ffffff 0%, ${NATURE.surface} 100%)`,
          }}
        >
          {/* Background nature pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, ${NATURE.secondary}10 1.5px, transparent 1.5px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Floating leaf decorations */}
          <FloatingLeaf size={35} top="12%" right="8%" delay={0} />
          <FloatingLeaf size={28} top="60%" left="5%" delay={2} color={NATURE.accent} />

          <div className="relative max-w-7xl mx-auto">
            <SectionHeading
              title="Skills & Tech"
              subtitle="The tools and technologies that grow my craft"
              icon={<Layers size={22} style={{ color: NATURE.secondary }} />}
              delay={0}
            />

            {/* Skill categories as nature cards */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-12"
            >
              {([
                {
                  label: 'Languages',
                  items: profile.skills_languages || [],
                  icon: <Code2 size={18} />,
                  color: '#16a34a',
                  bg: '#f0fdf4',
                },
                {
                  label: 'Frameworks',
                  items: profile.skills_frameworks || [],
                  icon: <Layers size={18} />,
                  color: '#15803d',
                  bg: '#ecfdf5',
                },
                {
                  label: 'Tools & Platforms',
                  items: profile.skills_tools || [],
                  icon: <Server size={18} />,
                  color: '#059669',
                  bg: '#f0fdf4',
                },
              ] as {
                label: string
                items: string[]
                icon: React.ReactNode
                color: string
                bg: string
              }[]).map(({ label, items, icon, color, bg }, catIndex) =>
                items.length > 0 && (
                  <motion.div
                    key={label}
                    variants={fadeUp}
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-[24px] p-7"
                    style={{
                      background: '#ffffff',
                      border: `1.5px solid ${NATURE.border}`,
                      boxShadow: `0 3px 16px ${color}08`,
                    }}
                  >
                    {/* Category header with nature styling */}
                    <div
                      className="flex items-center gap-3 mb-6 p-4 rounded-[18px]"
                      style={{ background: bg }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}15`, color }}
                      >
                        {icon}
                      </div>
                      <div>
                        <h3
                          className="font-bold text-base"
                          style={{
                            color: NATURE.primary,
                            fontFamily: "'Fraunces', serif",
                          }}
                        >
                          {label}
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: NATURE.textMuted }}
                        >
                          {items.length} skills
                        </p>
                      </div>
                    </div>

                    {/* Skill pills */}
                    <div className="flex flex-wrap gap-2.5">
                      {items.map((skill, skillIndex) => (
                        <SkillPill
                          key={skill}
                          skill={skill}
                          index={catIndex * 12 + skillIndex}
                        />
                      ))}
                    </div>
                  </motion.div>
                )
              )}
            </motion.div>

            {/* All skills as a flowing cloud */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap gap-3 justify-center mt-10"
            >
              {allSkills.map((skill, i) => (
                <SkillPill key={`${skill}-${i}`} skill={skill} index={i} />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PROJECTS SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.projects && (
        <section
          id="projects"
          className="py-28 px-6 relative"
          style={{
            background: NATURE.surface,
          }}
        >
          {/* Nature decorations */}
          <OrganicBlob size={450} color={NATURE.secondary} opacity={0.06} top="-10%" right="-15%" delay={1} />
          <FloatingLeaf size={40} top="15%" right="10%" delay={0} />
          <FloatingLeaf size={32} bottom="20%" left="5%" delay={3} color={NATURE.accent} />

          <div className="relative max-w-7xl mx-auto">
            <SectionHeading
              title="Featured Projects"
              subtitle="Growing ideas from concept to harvest"
              icon={<Sparkles size={22} style={{ color: NATURE.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7"
            >
              {(projectList.length > 0 ? projectList : [
                {
                  title: 'Open Source Library',
                  desc: 'A flourishing open-source toolkit with 2k+ GitHub stars, helping developers ship faster with nature-inspired architecture.',
                  tech: ['TypeScript', 'Node.js', 'Webpack'],
                  year: '2024',
                },
                {
                  title: 'E-Commerce Platform',
                  desc: 'A high-performance shopping ecosystem handling 10k+ daily transactions with 99.9% uptime and sustainable practices.',
                  tech: ['React', 'PostgreSQL', 'Redis'],
                  year: '2024',
                },
                {
                  title: 'Developer Dashboard',
                  desc: 'A real-time analytics dashboard with live data visualization, featuring organic design patterns and customizable widgets.',
                  tech: ['Next.js', 'D3.js', 'Tailwind'],
                  year: '2023',
                },
              ]).map((proj: any, i: number) => (
                <NatureProjectCard
                  key={proj.title || proj}
                  title={proj.title || proj}
                  description={proj.desc || proj.description || `A meaningful project showcasing technical depth and creative problem-solving.`}
                  tech={proj.tech || allSkills.slice(0, 4)}
                  year={proj.year || new Date().getFullYear().toString()}
                  index={i}
                />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EXPERIENCE SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.experience && companies.length > 0 && (
        <section
          id="experience"
          className="py-28 px-6 relative"
          style={{ background: '#ffffff' }}
        >
          <OrganicBlob size={350} color={NATURE.secondary} opacity={0.06} bottom="5%" left="-10%" delay={3} />

          <div className="max-w-7xl mx-auto">
            <SectionHeading
              title="Experience"
              subtitle="The journey of growth through different seasons"
              icon={<TreePine size={22} style={{ color: NATURE.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="relative"
            >
              {/* Organic flowing timeline line */}
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-6 top-0 bottom-0 w-0.5 rounded-full origin-top"
                style={{
                  background: `linear-gradient(to bottom, ${NATURE.secondary}, ${NATURE.accent})`,
                  opacity: 0.35,
                }}
              />

              <div className="space-y-9">
                {companies.map((company, i) => (
                  <motion.div
                    key={company}
                    variants={timelineFade}
                    className="relative pl-16"
                  >
                    <TimelineBranchNode delay={i * 0.15} />

                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      transition={{ duration: 0.35 }}
                      className="rounded-[24px] p-7"
                      style={{
                        background: '#ffffff',
                        border: `1.5px solid ${NATURE.border}`,
                        boxShadow: NATURE.shadow,
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                        <div>
                          <h3
                            className="text-xl font-bold mb-1.5"
                            style={{
                              color: NATURE.primary,
                              fontFamily: "'Fraunces', serif",
                            }}
                          >
                            {title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Building2 size={16} style={{ color: NATURE.secondary }} />
                            <p
                              className="font-semibold text-base"
                              style={{
                                color: NATURE.secondary,
                                fontFamily: "'DM Sans', sans-serif",
                              }}
                            >
                              {company}
                            </p>
                          </div>
                        </div>
                        {projectList[i] && (
                          <div
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
                            style={{
                              background: `${NATURE.accent}12`,
                              color: '#4d7c0f',
                              border: `1px solid ${NATURE.accent}35`,
                            }}
                          >
                            <Star size={13} />
                            Featured
                          </div>
                        )}
                      </div>
                      {projectList[i] && (
                        <p
                          className="text-sm leading-relaxed"
                          style={{
                            color: NATURE.textMuted,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {projectList[i]}
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EDUCATION SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.education && (
        <section
          id="education"
          className="py-28 px-6 relative"
          style={{
            background: `linear-gradient(180deg, #ffffff 0%, ${NATURE.surface} 100%)`,
          }}
        >
          <FloatingLeaf size={38} top="15%" left="8%" delay={1} />
          <FloatingLeaf size={30} bottom="25%" right="10%" delay={4} color={NATURE.accent} />

          <div className="relative max-w-7xl mx-auto">
            <SectionHeading
              title="Education"
              subtitle="The roots that ground my knowledge"
              icon={<GraduationCap size={22} style={{ color: NATURE.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7"
            >
              {educationList.length > 0 ? educationList.map((edu, _i) => (
                <motion.div
                  key={edu}
                  variants={scaleIn}
                  whileHover={{ y: -6, scale: 1.04 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-[24px] p-7 text-center"
                  style={{
                    background: '#ffffff',
                    border: `1.5px solid ${NATURE.border}`,
                    boxShadow: NATURE.shadow,
                  }}
                >
                  {/* Nature icon */}
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className="w-16 h-16 rounded-[20px] mx-auto mb-5 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(145deg, ${NATURE.secondary}20, ${NATURE.accent}20)`,
                      border: `1.5px solid ${NATURE.secondary}35`,
                    }}
                  >
                    <GraduationCap size={28} style={{ color: NATURE.secondary }} />
                  </motion.div>

                  <h3
                    className="text-lg font-bold mb-1.5"
                    style={{
                      color: NATURE.primary,
                      fontFamily: "'Fraunces', serif",
                    }}
                  >
                    {edu}
                  </h3>
                  <p
                    className="font-semibold mb-1"
                    style={{
                      color: NATURE.secondary,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {profile.education ? 'Academic Institution' : 'University'}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: NATURE.textMuted }}
                  >
                    {profile.years_experience ? `${profile.years_experience} years experience` : 'Degree'}
                  </p>
                </motion.div>
              )) : (
                <>
                  <NatureCard>
                    <div
                      className="w-14 h-14 rounded-[18px] mx-auto mb-4 flex items-center justify-center"
                      style={{
                        background: `${NATURE.secondary}15`,
                        color: NATURE.secondary,
                      }}
                    >
                      <GraduationCap size={22} />
                    </div>
                    <h3
                      className="font-bold mb-1.5"
                      style={{ color: NATURE.primary, fontFamily: "'Fraunces', serif" }}
                    >
                      B.S. Computer Science
                    </h3>
                    <p
                      className="font-semibold mb-1"
                      style={{ color: NATURE.secondary }}
                    >
                      University Name
                    </p>
                    <p className="text-sm" style={{ color: NATURE.textMuted }}>
                      2020 — 2024
                    </p>
                  </NatureCard>
                  <NatureCard>
                    <div
                      className="w-14 h-14 rounded-[18px] mx-auto mb-4 flex items-center justify-center"
                      style={{
                        background: `${NATURE.accent}15`,
                        color: '#4d7c0f',
                      }}
                    >
                      <Award size={22} />
                    </div>
                    <h3
                      className="font-bold mb-1.5"
                      style={{ color: NATURE.primary, fontFamily: "'Fraunces', serif" }}
                    >
                      AWS Solutions Architect
                    </h3>
                    <p
                      className="font-semibold mb-1"
                      style={{ color: NATURE.secondary }}
                    >
                      Amazon Web Services
                    </p>
                    <p className="text-sm" style={{ color: NATURE.textMuted }}>
                      Certified 2024
                    </p>
                  </NatureCard>
                  <NatureCard>
                    <div
                      className="w-14 h-14 rounded-[18px] mx-auto mb-4 flex items-center justify-center"
                      style={{
                        background: `${NATURE.leaf}15`,
                        color: NATURE.leaf,
                      }}
                    >
                      <Shield size={22} />
                    </div>
                    <h3
                      className="font-bold mb-1.5"
                      style={{ color: NATURE.primary, fontFamily: "'Fraunces', serif" }}
                    >
                      CSM Certified
                    </h3>
                    <p
                      className="font-semibold mb-1"
                      style={{ color: NATURE.secondary }}
                    >
                      Scrum Alliance
                    </p>
                    <p className="text-sm" style={{ color: NATURE.textMuted }}>
                      Certified 2023
                    </p>
                  </NatureCard>
                </>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CERTIFICATIONS SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.certifications && (
        <section
          id="certifications"
          className="py-28 px-6 relative"
          style={{ background: '#ffffff' }}
        >
          <OrganicBlob size={400} color={NATURE.accent} opacity={0.08} top="-10%" right="-12%" delay={2} />

          <div className="relative max-w-7xl mx-auto">
            <SectionHeading
              title="Certifications"
              subtitle="Professional credentials and achievements earned"
              icon={<Gem size={22} style={{ color: NATURE.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5"
            >
              {[
                { name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', year: '2024' },
                { name: 'Google Cloud Professional', issuer: 'Google', year: '2024' },
                { name: 'Kubernetes Administrator', issuer: 'CNCF', year: '2023' },
                { name: 'Meta Frontend Developer', issuer: 'Meta', year: '2023' },
                { name: 'HashiCorp Terraform Associate', issuer: 'HashiCorp', year: '2022' },
              ].map((cert: any, i: number) => (
                <CertificationBadge
                  key={cert.name}
                  name={cert.name}
                  issuer={cert.issuer}
                  year={cert.year}
                  index={i}
                />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CONTACT SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="contact"
        className="py-32 px-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
        }}
      >
        {/* Nature decorations on CTA */}
        <OrganicCircle size={250} color="#ffffff" colorStrength={0.08} top="-25%" left="-10%" delay={0} />
        <OrganicCircle size={180} color="#ffffff" colorStrength={0.06} bottom="-15%" right="12%" delay={3} />
        <OrganicBlob size={300} color="#ffffff" opacity={0.05} top="20%" right="-8%" delay={6} borderRadius="50% 50% 45% 55% / 55% 45% 55% 45%" />

        {/* Floating leaves on CTA */}
        <FloatingLeaf size={40} top="15%" left="10%" delay={0} color="#ffffff" />
        <FloatingLeaf size={32} bottom="20%" right="15%" delay={2} color="#ffffff" />
        <FloatingLeaf size={36} top="40%" left="20%" delay={4} color="#ffffff" />

        {/* Nature dot pattern on CTA */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Nature badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8"
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <MessageCircle size={16} className="text-white" />
              <span className="text-sm font-semibold text-white">Let's connect</span>
            </motion.div>

            <h2
              className="text-5xl md:text-6xl font-bold text-white mb-5"
              style={{
                fontFamily: "'Fraunces', 'Lora', serif",
                letterSpacing: '-0.02em',
              }}
            >
              Ready to grow together?
            </h2>
            <p
              className="text-lg text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              I'm always excited to discuss new opportunities, interesting projects, or just have a friendly conversation about technology and nature-inspired design.
            </p>

            <div className="flex flex-wrap gap-5 justify-center mb-8">
              {profile.email && (
                <motion.a
                  href={`mailto:${profile.email}`}
                  whileHover={{ scale: 1.1, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-8 py-4 rounded-[20px] text-lg font-bold text-green-800"
                  style={{
                    background: '#ffffff',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  }}
                >
                  <Mail size={20} style={{ color: NATURE.secondary }} />
                  {profile.email}
                </motion.a>
              )}
              {profile.linkedin && (
                <motion.a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.1, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-8 py-4 rounded-[20px] text-lg font-bold bg-white/15 text-white border-2 border-white/35"
                >
                  <Linkedin size={20} />
                  LinkedIn Profile
                </motion.a>
              )}
              {profile.github && (
                <motion.a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.1, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-8 py-4 rounded-[20px] text-lg font-bold bg-white/15 text-white border-2 border-white/35"
                >
                  <Github size={20} />
                  GitHub
                </motion.a>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2"
            >
              <Clock size={14} className="text-white/60" />
              <p className="text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Response time: usually within 24 hours
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════════ */}
      <footer
        className="py-12 px-6 relative"
        style={{
          background: NATURE.primary,
        }}
      >
        {/* Subtle nature pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle, ${NATURE.secondary} 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-7xl mx-auto">
          {/* Name and tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                style={{
                  background: `linear-gradient(145deg, ${NATURE.secondary}, ${NATURE.accent})`,
                }}
              >
                <Leaf size={18} className="text-white" />
              </motion.div>
              <p
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {name}
              </p>
            </div>
            <p
              className="text-sm"
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {title} -Rooted in code, inspired by nature
            </p>
          </motion.div>

          {/* Social links with nature hover */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {profile.github && (
              <motion.a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.15, y: -3, backgroundColor: `${NATURE.secondary}30` }}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <Github size={18} />
              </motion.a>
            )}
            {profile.linkedin && (
              <motion.a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.15, y: -3, backgroundColor: `${NATURE.secondary}30` }}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <Linkedin size={18} />
              </motion.a>
            )}
            {profile.email && (
              <motion.a
                href={`mailto:${profile.email}`}
                whileHover={{ scale: 1.15, y: -3, backgroundColor: `${NATURE.secondary}30` }}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <Mail size={18} />
              </motion.a>
            )}
          </div>

          {/* Divider with nature gradient */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-16 h-0.5 rounded-full mx-auto mb-6"
            style={{
              background: `linear-gradient(90deg, ${NATURE.secondary}, ${NATURE.accent})`,
              transformOrigin: 'center',
            }}
          />

          {/* Copyright */}
          <p
            className="text-xs text-center"
            style={{
              color: 'rgba(255,255,255,0.25)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            © {new Date().getFullYear()} {name} -Crafted with care and inspired by nature
          </p>
        </div>
      </footer>
    </div>
  )
}
