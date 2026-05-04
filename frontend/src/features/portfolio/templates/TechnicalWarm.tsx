import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Code2, Server, Terminal,
  Briefcase, GraduationCap, Award, Mail, Linkedin, Github,
  ExternalLink, MapPin, Calendar, Heart, Star,
  Layers, Zap, Shield, Coffee, MessageCircle
} from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// ── Warm color palette ─────────────────────────────────────────────────────────
const WARM = {
  primary:    '#1c1917',   // near-black stone
  secondary:  '#f97316',   // warm orange
  accent:     '#eab308',   // warm yellow
  background: '#fffbeb',   // warm cream
  surface:    '#fef9c3',   // soft yellow
  card:       '#ffffff',   // white cards
  border:     '#fde68a',   // warm amber border
  text:       '#1c1917',   // dark text
  textMuted:  '#78716c',   // warm gray
  shadow:     '0 2px 12px rgba(249,115,22,0.15)',
  gradient:   ['#f97316', '#eab308'],
  pillBg:     '#fef3c7',    // light amber pill background
  green:      '#22c55e',   // success green
  teal:       '#14b8a6',   // teal accent
}

// ── Animation presets ──────────────────────────────────────────────────────────
const fadeUp: any = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}
const fadeIn: any = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.8 } },
}
const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.9 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}
const stagger: any = {
  show: { transition: { staggerChildren: 0.1 } },
}
const staggerSlow: any = {
  show: { transition: { staggerChildren: 0.15 } },
}

// ── Floating organic shape ─────────────────────────────────────────────────────
function FloatingBlob({
  size = 300,
  color = WARM.secondary,
  opacity = 0.12,
  top,
  left,
  right,
  bottom,
  delay = 0,
}: {
  size?: number
  color?: string
  opacity?: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  delay?: number
}) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1], rotate: [0, 8, 0, -8, 0] }}
      transition={{ duration: 12 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className="absolute pointer-events-none"
      style={{ width: size, height: size, top, left, right, bottom }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  )
}

// ── Organic circle ─────────────────────────────────────────────────────────────
function OrganicCircle({
  size = 80,
  color = WARM.accent,
  opacity = 0.3,
  top,
  left,
  right,
  bottom,
  delay = 0,
}: {
  size?: number
  color?: string
  opacity?: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  delay?: number
}) {
  return (
    <motion.div
      animate={{ y: [0, -16, 0], opacity: [opacity, opacity * 1.5, opacity] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
      className="absolute pointer-events-none rounded-full"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
      }}
    />
  )
}

// ── Warm pill badge ───────────────────────────────────────────────────────────
function _PillBadge({
  label,
  color = WARM.secondary,
  icon,
}: {
  label: string
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <motion.span
      whileHover={{ scale: 1.05, boxShadow: `0 0 16px ${color}40` }}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold cursor-default"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
        fontFamily: "'Nunito', 'Quicksand', sans-serif",
      }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </motion.span>
  )
}

// ── Warm card ─────────────────────────────────────────────────────────────────
function WarmCard({
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
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className={`rounded-[20px] p-6 ${className}`}
      style={{
        background: '#ffffff',
        border: `1px solid ${WARM.border}`,
        boxShadow: WARM.shadow,
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Timeline node ─────────────────────────────────────────────────────────────
function TimelineNode({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, type: 'spring', stiffness: 200 }}
      className="w-4 h-4 rounded-full shrink-0 mt-1.5"
      style={{ background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`, boxShadow: `0 0 12px ${WARM.secondary}60` }}
    />
  )
}

// ── Section heading ────────────────────────────────────────────────────────────
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
  const inView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="mb-12 text-center"
    >
      <div className="inline-flex items-center justify-center gap-3 mb-4">
        {icon && (
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${WARM.secondary}20, ${WARM.accent}20)`,
              border: `1px solid ${WARM.secondary}30`,
            }}
          >
            {icon}
          </div>
        )}
        <h2
          className="text-4xl md:text-5xl font-extrabold"
          style={{
            color: WARM.primary,
            fontFamily: "'Nunito', 'Quicksand', sans-serif",
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
      </div>
      {subtitle && (
        <p
          className="text-lg max-w-2xl mx-auto"
          style={{ color: WARM.textMuted, fontFamily: "'Nunito', sans-serif" }}
        >
          {subtitle}
        </p>
      )}
      <div
        className="w-24 h-1 rounded-full mx-auto mt-4"
        style={{ background: `linear-gradient(90deg, ${WARM.secondary}, ${WARM.accent})` }}
      />
    </motion.div>
  )
}

// ── Skill pill with category colors ───────────────────────────────────────────
const SKILL_COLORS = [
  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  { bg: '#fefce8', color: '#ca8a04', border: '#fde047' },
  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' },
  { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' },
  { bg: '#f0fdfb', color: '#0d9488', border: '#99f6e4' },
  { bg: '#fef9c3', color: '#a16207', border: '#fde047' },
]

function SkillPill({ skill, index }: { skill: string; index: number }) {
  const colorSet = SKILL_COLORS[index % SKILL_COLORS.length]
  return (
    <motion.span
      whileHover={{ scale: 1.08, y: -2 }}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold cursor-default"
      style={{
        background: colorSet.bg,
        color: colorSet.color,
        border: `1px solid ${colorSet.border}`,
        fontFamily: "'Nunito', 'Quicksand', sans-serif",
        boxShadow: `0 2px 8px ${colorSet.color}15`,
      }}
    >
      {skill}
    </motion.span>
  )
}

// ── Project card with warm gradient overlay ────────────────────────────────────
function ProjectCard({
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
  const gradients = [
    `linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)`,
    `linear-gradient(135deg, #fefce8 0%, #fef08a 100%)`,
    `linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)`,
    `linear-gradient(135deg, #eff6ff 0%, #bae6fd 100%)`,
    `linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)`,
  ]
  const grad = gradients[index % gradients.length]

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.03 }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group rounded-[20px] overflow-hidden"
      style={{
        background: '#ffffff',
        border: `1px solid ${WARM.border}`,
        boxShadow: WARM.shadow,
      }}
    >
      {/* Color header strip */}
      <div
        className="h-2 w-full"
        style={{ background: grad }}
      />

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3
            className="text-xl font-extrabold"
            style={{ color: WARM.primary, fontFamily: "'Nunito', sans-serif" }}
          >
            {title}
          </h3>
          {link && (
            <motion.a
              href={link}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.2, rotate: 10 }}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `${WARM.secondary}15`,
                color: WARM.secondary,
              }}
            >
              <ExternalLink size={14} />
            </motion.a>
          )}
        </div>

        <p
          className="text-sm mb-4 leading-relaxed"
          style={{ color: WARM.textMuted, fontFamily: "'Nunito', sans-serif" }}
        >
          {description}
        </p>

        {/* Tech stack pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tech.map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{
                background: `${WARM.accent}10`,
                color: '#a16207',
                border: `1px solid ${WARM.accent}30`,
                fontFamily: "'Fira Code', 'Courier New', monospace",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Year badge */}
        <div className="flex items-center gap-1.5">
          <Calendar size={12} style={{ color: WARM.textMuted }} />
          <span className="text-xs" style={{ color: WARM.textMuted, fontFamily: "'Nunito', sans-serif" }}>
            {year}
          </span>
        </div>
      </div>

      {/* Hover gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[20px]"
        style={{
          background: `linear-gradient(135deg, ${WARM.secondary}05, ${WARM.accent}05)`,
          border: `2px solid ${WARM.secondary}30`,
        }}
      />
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TechnicalWarm({
  profile,
  primaryColor: _pc,
  accentColor: _ac,
  showSections,
  profilePhoto,
  textOverrides,
}: PortfolioTemplateProps) {
  // ── Resolve profile data ──────────────────────────────────────────────────
  const name = textOverrides?.name || profile.full_name || profile.preferred_name || 'Your Name'
  const title = textOverrides?.title || profile.current_job_title || profile.target_role || 'Software Engineer'
  const bio   = textOverrides?.bio  || profile.headline || `Passionate developer with a human touch. Building products that matter and crafting experiences that connect.`
  const firstName = name.split(' ')[0]
  const initials  = name.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase()

  const allSkills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || []),
  ]

  const companies = (profile.resume_facts_companies || []) as string[]
  const projectList = (profile.resume_facts_projects || []) as string[]
  const educationList = profile.education ? [profile.education] : []
  const certs: string[] = []

  // ── Timeline fade helper ──────────────────────────────────────────────────
  const timelineFade = {
    hidden: { opacity: 0, x: -20 },
    show:   { opacity: 1, x: 0,  transition: { duration: 0.5 } },
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: WARM.background,
        color: WARM.text,
        fontFamily: "'Nunito', 'Quicksand', sans-serif",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION
      ═══════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: 'rgba(255,251,235,0.92)',
          backdropFilter: 'blur(20px)',
          borderColor: WARM.border,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-white"
              style={{
                background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                boxShadow: `0 4px 12px ${WARM.secondary}40`,
              }}
            >
              {initials}
            </div>
            <span className="font-extrabold text-lg" style={{ color: WARM.primary }}>
              {firstName}
            </span>
          </motion.div>

          {/* Nav links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex items-center gap-1"
          >
            {['About', 'Skills', 'Projects', 'Experience', 'Contact'].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                whileHover={{ scale: 1.05, backgroundColor: `${WARM.secondary}10` }}
                className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors"
                style={{ color: WARM.textMuted }}
              >
                {item}
              </motion.a>
            ))}
          </motion.div>

          {/* CTA button */}
          {profile.email && (
            <motion.a
              href={`mailto:${profile.email}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                boxShadow: `0 4px 16px ${WARM.secondary}40`,
              }}
            >
              <Mail size={14} />
              Say Hello
            </motion.a>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="about"
        className="relative min-h-screen flex items-center overflow-hidden pt-24"
        style={{
          background: `linear-gradient(180deg, #fffbeb 0%, #fef9c3 50%, #fff7ed 100%)`,
        }}
      >
        {/* Floating organic shapes */}
        <FloatingBlob size={600} color={WARM.secondary} opacity={0.08} top="-10%" left="-15%" delay={0} />
        <FloatingBlob size={400} color={WARM.accent}    opacity={0.1}  right="-5%"  bottom="10%" delay={3} />
        <FloatingBlob size={300} color="#fb923c"        opacity={0.06} top="30%"    right="20%"  delay={6} />

        {/* Smaller floating circles */}
        <OrganicCircle size={120} color={WARM.secondary} top="20%"  left="10%"  delay={0} />
        <OrganicCircle size={80}  color={WARM.accent}    top="60%"  left="5%"   delay={1.5} />
        <OrganicCircle size={100} color="#fbbf24"        bottom="25%" right="15%" delay={3} />
        <OrganicCircle size={60}  color={WARM.secondary} top="40%"  right="8%"  delay={5} />

        {/* Decorative dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${WARM.secondary}15 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            opacity: 0.5,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-20 w-full">
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerSlow}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
          >
            {/* Left: Text content */}
            <motion.div variants={fadeUp} className="lg:col-span-7">
              {/* Availability badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{
                  background: `${WARM.green}15`,
                  border: `1px solid ${WARM.green}40`,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: WARM.green }} />
                <span className="text-sm font-semibold" style={{ color: '#15803d', fontFamily: "'Nunito', sans-serif" }}>
                  Open to opportunities
                </span>
              </motion.div>

              {/* Main heading */}
              <motion.h1
                variants={fadeUp}
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-4"
                style={{
                  color: WARM.primary,
                  fontFamily: "'Nunito', 'Quicksand', sans-serif",
                  letterSpacing: '-0.03em',
                }}
              >
                Hi, I'm{' '}
                <span
                  style={{
                    background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {firstName}
                </span>
              </motion.h1>

              {/* Title */}
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-0.5 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${WARM.secondary}, ${WARM.accent})` }}
                />
                <p
                  className="text-xl font-bold"
                  style={{ color: WARM.secondary, fontFamily: "'Nunito', sans-serif" }}
                >
                  {title}
                </p>
              </motion.div>

              {/* Bio */}
              <motion.p
                variants={fadeUp}
                className="text-lg leading-relaxed mb-8 max-w-xl"
                style={{ color: WARM.textMuted, fontFamily: "'Nunito', sans-serif" }}
              >
                {bio}
              </motion.p>

              {/* Stats row */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-10">
                {[
                  { value: profile.years_experience || '5+', label: 'Years Exp.', icon: <Zap size={16} /> },
                  { value: Math.max(1, companies.length), label: 'Companies', icon: <Briefcase size={16} /> },
                  { value: allSkills.length || 8, label: 'Skills', icon: <Code2 size={16} /> },
                  { value: Math.max(1, projectList.length), label: 'Projects', icon: <Star size={16} /> },
                ].map(({ value, label, icon }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${WARM.border}`,
                      boxShadow: `0 2px 12px ${WARM.secondary}10`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${WARM.secondary}15`,
                        color: WARM.secondary,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <p
                        className="text-2xl font-extrabold"
                        style={{
                          background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {value}
                      </p>
                      <p className="text-xs font-medium" style={{ color: WARM.textMuted }}>
                        {label}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Action buttons */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                {profile.github && (
                  <motion.a
                    href={profile.github}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white"
                    style={{
                      background: WARM.primary,
                      boxShadow: `0 4px 12px ${WARM.primary}30`,
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
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, #0a66c2, #0077b5)`,
                      boxShadow: `0 4px 12px rgba(10,102,194,0.3)`,
                    }}
                  >
                    <Linkedin size={16} />
                    LinkedIn
                  </motion.a>
                )}
                {profile.email && (
                  <motion.a
                    href={`mailto:${profile.email}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                      color: '#ffffff',
                      boxShadow: `0 4px 16px ${WARM.secondary}40`,
                    }}
                  >
                    <Mail size={16} />
                    Email Me
                  </motion.a>
                )}
              </motion.div>
            </motion.div>

            {/* Right: Profile visual */}
            <motion.div
              variants={fadeIn}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="relative">
                {/* Outer glow */}
                <div
                  className="absolute -inset-8 rounded-full opacity-20"
                  style={{
                    background: `radial-gradient(circle, ${WARM.secondary}60, transparent 70%)`,
                  }}
                />

                {/* Soft ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-4 rounded-full border-2 border-dashed"
                  style={{ borderColor: `${WARM.accent}40` }}
                />

                {/* Avatar container */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
                  className="w-56 h-56 md:w-72 md:h-72 rounded-full flex items-center justify-center overflow-hidden relative"
                  style={{
                    background: `linear-gradient(135deg, ${WARM.secondary}30, ${WARM.accent}30)`,
                    border: `4px solid #ffffff`,
                    boxShadow: `0 8px 32px ${WARM.secondary}30, 0 0 0 8px ${WARM.secondary}10`,
                  }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '50%' }}
                    />
                  ) : (
                    <span
                      className="text-7xl font-extrabold"
                      style={{
                        background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {initials}
                    </span>
                  )}
                </motion.div>

                {/* Floating badge: open to work */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -right-4 top-6 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                    boxShadow: `0 8px 24px ${WARM.secondary}50`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Open to work
                </motion.div>

                {/* Floating badge: top skill */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute -left-4 bottom-10 px-4 py-2 rounded-2xl text-sm font-semibold shadow-md"
                  style={{
                    background: '#ffffff',
                    color: WARM.textMuted,
                    border: `1px solid ${WARM.border}`,
                    boxShadow: `0 4px 12px ${WARM.secondary}15`,
                  }}
                >
                  {allSkills[0] || 'Full Stack'}
                </motion.div>

                {/* Small decorative badge */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                  className="absolute -right-2 bottom-20 w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `${WARM.accent}20`,
                    border: `1px solid ${WARM.accent}40`,
                  }}
                >
                  <Heart size={20} style={{ color: WARM.secondary }} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-xs font-semibold" style={{ color: WARM.textMuted }}>Scroll</span>
            <div
              className="w-0.5 h-8 rounded-full"
              style={{ background: `linear-gradient(to bottom, ${WARM.secondary}, transparent)` }}
            />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ABOUT / WHO I AM
      ═══════════════════════════════════════════════════════════════ */}
      <section
        className="py-24 px-6 relative"
        style={{ background: '#ffffff' }}
      >
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            title="Who I Am"
            subtitle="A bit about me and what drives me"
            icon={<Layers size={20} style={{ color: WARM.secondary }} />}
            delay={0}
          />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          >
            {/* Photo */}
            <motion.div variants={fadeUp} className="flex justify-center">
              <div className="relative">
                {/* Warm glow behind photo */}
                <div
                  className="absolute -inset-4 rounded-[24px]"
                  style={{
                    background: `linear-gradient(135deg, ${WARM.secondary}15, ${WARM.accent}15)`,
                  }}
                />
                <div
                  className="relative w-72 h-72 rounded-[24px] overflow-hidden flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, #fff7ed, #fef9c3)`,
                    border: `2px solid ${WARM.border}`,
                    boxShadow: `0 8px 32px ${WARM.secondary}20`,
                  }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: 22 }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-32 h-32 rounded-full flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${WARM.secondary}30, ${WARM.accent}30)`,
                          border: `3px solid white`,
                          boxShadow: `0 4px 16px ${WARM.secondary}20`,
                        }}
                      >
                        <span className="text-5xl font-extrabold" style={{
                          background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}>
                          {initials}
                        </span>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: WARM.textMuted }}>{name}</p>
                    </div>
                  )}
                </div>

                {/* Decorative shapes around photo */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-4 -right-4 w-20 h-20 rounded-full border-2 border-dashed"
                  style={{ borderColor: `${WARM.secondary}40` }}
                />
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -bottom-3 -left-3 w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `${WARM.accent}20`, border: `1px solid ${WARM.accent}40` }}
                >
                  <Star size={18} style={{ color: WARM.accent }} />
                </motion.div>
              </div>
            </motion.div>

            {/* Bio text */}
            <motion.div variants={fadeUp} className="space-y-6">
              <div
                className="p-6 rounded-[20px]"
                style={{
                  background: WARM.surface,
                  border: `1px solid ${WARM.border}`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${WARM.secondary}20`, color: WARM.secondary }}
                  >
                    <Coffee size={16} />
                  </div>
                  <h3 className="font-bold text-lg" style={{ color: WARM.primary }}>About Me</h3>
                </div>
                <p
                  className="leading-relaxed"
                  style={{ color: WARM.textMuted, fontFamily: "'Nunito', sans-serif" }}
                >
                  {bio}
                </p>
              </div>

              {/* Quick facts */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <MapPin size={16} />, label: 'Location', value: profile.city ? `${profile.city}, ${profile.country}` : 'Remote' },
                  { icon: <Briefcase size={16} />, label: 'Role', value: profile.current_job_title || title },
                  { icon: <Code2 size={16} />, label: 'Focus', value: allSkills.slice(0, 2).join(', ') || 'Full Stack' },
                ].map(({ icon, label, value }) => (
                  <div
                    key={label}
                    className="p-4 rounded-2xl"
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${WARM.border}`,
                      boxShadow: `0 2px 8px ${WARM.secondary}08`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: WARM.secondary }}>{icon}</span>
                      <span className="text-xs font-semibold" style={{ color: WARM.textMuted }}>{label}</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: WARM.primary }}>{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SKILLS SECTION
      ═══════════════════════════════════════════════════════════════ */}
      {showSections.skills && allSkills.length > 0 && (
        <section
          id="skills"
          className="py-24 px-6 relative"
          style={{
            background: `linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)`,
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, ${WARM.secondary}08 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          <div className="relative max-w-6xl mx-auto">
            <SectionHeading
              title="Skills & Tech"
              subtitle="The tools and technologies I work with daily"
              icon={<Terminal size={20} style={{ color: WARM.secondary }} />}
              delay={0}
            />

            {/* Skill categories as warm cards */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
            >
              {([
                {
                  label: 'Languages',
                  items: profile.skills_languages || [],
                  icon: <Code2 size={18} />,
                  color: '#ea580c',
                  bg: '#fff7ed',
                },
                {
                  label: 'Frameworks',
                  items: profile.skills_frameworks || [],
                  icon: <Layers size={18} />,
                  color: '#ca8a04',
                  bg: '#fefce8',
                },
                {
                  label: 'Tools & Platforms',
                  items: profile.skills_tools || [],
                  icon: <Server size={18} />,
                  color: '#16a34a',
                  bg: '#f0fdf4',
                },
              ] as { label: string; items: string[]; icon: React.ReactNode; color: string; bg: string }[]).map(
                ({ label, items, icon, color, bg }, catIndex) =>
                  items.length > 0 && (
                    <motion.div
                      key={label}
                      variants={fadeUp}
                      whileHover={{ y: -4, scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-[20px] p-6"
                      style={{
                        background: '#ffffff',
                        border: `1px solid ${WARM.border}`,
                        boxShadow: `0 2px 12px ${color}10`,
                      }}
                    >
                      {/* Category header */}
                      <div
                        className="flex items-center gap-3 mb-5 p-3 rounded-2xl"
                        style={{ background: bg }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${color}15`, color }}
                        >
                          {icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-base" style={{ color: WARM.primary }}>{label}</h3>
                          <p className="text-xs" style={{ color: WARM.textMuted }}>{items.length} skills</p>
                        </div>
                      </div>

                      {/* Skill pills */}
                      <div className="flex flex-wrap gap-2">
                        {items.map((skill, skillIndex) => (
                          <SkillPill
                            key={skill}
                            skill={skill}
                            index={catIndex * 10 + skillIndex}
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
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center mt-8"
            >
              {allSkills.map((skill, i) => (
                <SkillPill key={`${skill}-${i}`} skill={skill} index={i} />
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PROJECTS SECTION
      ═══════════════════════════════════════════════════════════════ */}
      {showSections.projects && projectList.length > 0 && (
        <section
          id="projects"
          className="py-24 px-6"
          style={{
            background: WARM.surface,
          }}
        >
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title="Featured Projects"
              subtitle="Work I'm proud of — from concept to delivery"
              icon={<Star size={20} style={{ color: WARM.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {projectList.slice(0, 6).map((proj, i) => (
                <ProjectCard
                  key={proj}
                  title={proj}
                  description={`A meaningful project showcasing technical depth and creative problem-solving.`}
                  tech={allSkills.slice(0, 4)}
                  year={new Date().getFullYear().toString()}
                  index={i}
                />
              ))}
            </motion.div>

            {/* If no projects, show sample cards */}
            {projectList.length === 0 && (
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={stagger}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {[
                  {
                    title: 'Open Source Library',
                    desc: 'A popular open-source toolkit with 2k+ GitHub stars, helping developers ship faster.',
                    tech: ['TypeScript', 'Node.js', 'Webpack'],
                    year: '2024',
                  },
                  {
                    title: 'E-Commerce Platform',
                    desc: 'High-performance shopping experience handling 10k+ daily transactions with 99.9% uptime.',
                    tech: ['React', 'PostgreSQL', 'Redis'],
                    year: '2023',
                  },
                  {
                    title: 'Developer Dashboard',
                    desc: 'Real-time analytics dashboard with live data visualization and customizable widgets.',
                    tech: ['Next.js', 'D3.js', 'Tailwind'],
                    year: '2023',
                  },
                ].map((sample, i) => (
                  <ProjectCard
                    key={sample.title}
                    title={sample.title}
                    description={sample.desc}
                    tech={sample.tech}
                    year={sample.year}
                    index={i}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EXPERIENCE SECTION
      ═══════════════════════════════════════════════════════════════ */}
      {showSections.experience && companies.length > 0 && (
        <section
          id="experience"
          className="py-24 px-6"
          style={{ background: '#ffffff' }}
        >
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title="Experience"
              subtitle="Where I've been and what I've built along the way"
              icon={<Briefcase size={20} style={{ color: WARM.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="relative"
            >
              {/* Timeline line */}
              <div
                className="absolute left-6 top-0 bottom-0 w-0.5 rounded-full"
                style={{
                  background: `linear-gradient(to bottom, ${WARM.secondary}, ${WARM.accent})`,
                  opacity: 0.3,
                }}
              />

              <div className="space-y-8">
                {companies.map((company, i) => (
                  <motion.div
                    key={company}
                    variants={timelineFade}
                    className="relative pl-16"
                  >
                    <TimelineNode delay={i * 0.15} />

                    <motion.div
                      whileHover={{ scale: 1.01, y: -2 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-[20px] p-6"
                      style={{
                        background: '#ffffff',
                        border: `1px solid ${WARM.border}`,
                        boxShadow: WARM.shadow,
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <h3
                            className="text-xl font-extrabold mb-1"
                            style={{ color: WARM.primary, fontFamily: "'Nunito', sans-serif" }}
                          >
                            {title}
                          </h3>
                          <p
                            className="font-semibold"
                            style={{ color: WARM.secondary, fontFamily: "'Nunito', sans-serif" }}
                          >
                            {company}
                          </p>
                        </div>
                        {projectList[i] && (
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{
                              background: `${WARM.accent}10`,
                              color: '#a16207',
                              border: `1px solid ${WARM.accent}30`,
                            }}
                          >
                            <Star size={12} />
                            Featured
                          </div>
                        )}
                      </div>
                      {projectList[i] && (
                        <p className="text-sm leading-relaxed mb-3" style={{ color: WARM.textMuted }}>
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

      {/* ═══════════════════════════════════════════════════════════════
          EDUCATION SECTION
      ═══════════════════════════════════════════════════════════════ */}
      {showSections.education && educationList.length > 0 && (
        <section
          id="education"
          className="py-24 px-6"
          style={{
            background: `linear-gradient(180deg, #ffffff 0%, ${WARM.surface} 100%)`,
          }}
        >
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title="Education"
              subtitle="Foundations that shaped my thinking"
              icon={<GraduationCap size={20} style={{ color: WARM.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {educationList.map((edu) => (
                <motion.div
                  key={edu}
                  variants={scaleIn}
                  whileHover={{ y: -4, scale: 1.03 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-[20px] p-6 text-center"
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${WARM.border}`,
                    boxShadow: WARM.shadow,
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${WARM.secondary}20, ${WARM.accent}20)`,
                      border: `1px solid ${WARM.secondary}30`,
                    }}
                  >
                    <GraduationCap size={24} style={{ color: WARM.secondary }} />
                  </div>

                  <h3
                    className="text-lg font-extrabold mb-1"
                    style={{ color: WARM.primary, fontFamily: "'Nunito', sans-serif" }}
                  >
                    {edu}
                  </h3>
                  <p
                    className="font-semibold mb-1"
                    style={{ color: WARM.secondary, fontFamily: "'Nunito', sans-serif" }}
                  >
                    {profile.education ? 'University' : 'Academic Institution'}
                  </p>
                  <p className="text-sm" style={{ color: WARM.textMuted }}>
                    {profile.years_experience ? `${profile.years_experience} years experience` : 'Degree'}
                  </p>
                </motion.div>
              ))}

              {/* Sample education cards if empty */}
              {educationList.length === 0 && (
                <>
                  <WarmCard>
                    <div
                      className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: `${WARM.secondary}15`, color: WARM.secondary }}
                    >
                      <GraduationCap size={20} />
                    </div>
                    <h3 className="font-extrabold mb-1" style={{ color: WARM.primary }}>B.S. Computer Science</h3>
                    <p className="font-semibold mb-1" style={{ color: WARM.secondary }}>University Name</p>
                    <p className="text-sm" style={{ color: WARM.textMuted }}>2020 — 2024</p>
                  </WarmCard>
                  <WarmCard>
                    <div
                      className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: `${WARM.accent}15`, color: '#a16207' }}
                    >
                      <Award size={20} />
                    </div>
                    <h3 className="font-extrabold mb-1" style={{ color: WARM.primary }}>AWS Solutions Architect</h3>
                    <p className="font-semibold mb-1" style={{ color: WARM.secondary }}>Amazon Web Services</p>
                    <p className="text-sm" style={{ color: WARM.textMuted }}>Certified 2024</p>
                  </WarmCard>
                  <WarmCard>
                    <div
                      className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: `${WARM.teal}15`, color: WARM.teal }}
                    >
                      <Shield size={20} />
                    </div>
                    <h3 className="font-extrabold mb-1" style={{ color: WARM.primary }}>CSM Certified</h3>
                    <p className="font-semibold mb-1" style={{ color: WARM.secondary }}>Scrum Alliance</p>
                    <p className="text-sm" style={{ color: WARM.textMuted }}>Certified 2023</p>
                  </WarmCard>
                </>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CERTIFICATIONS SECTION
      ═══════════════════════════════════════════════════════════════ */}
      {showSections.certifications && certs.length > 0 && (
        <section
          id="certifications"
          className="py-20 px-6"
          style={{ background: '#ffffff' }}
        >
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title="Certifications"
              subtitle="Credentials and professional achievements"
              icon={<Award size={20} style={{ color: WARM.secondary }} />}
              delay={0}
            />

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
              className="flex flex-wrap gap-4 justify-center"
            >
              {(certs.length > 0 ? certs : [
                { name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', year: '2024' },
                { name: 'Google Cloud Professional', issuer: 'Google', year: '2023' },
                { name: 'Kubernetes Administrator', issuer: 'CNCF', year: '2023' },
                { name: 'Meta Frontend Developer', issuer: 'Meta', year: '2023' },
                { name: 'HashiCorp Terraform Associate', issuer: 'HashiCorp', year: '2022' },
              ]).map((cert: any, i: number) => (
                <motion.div
                  key={cert.name || i}
                  variants={scaleIn}
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 px-5 py-3 rounded-full"
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${WARM.border}`,
                    boxShadow: `0 2px 8px ${WARM.secondary}08`,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})` }}
                  >
                    <Star size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: WARM.primary }}>{cert.name}</p>
                    <p className="text-xs" style={{ color: WARM.textMuted }}>{cert.issuer} · {cert.year}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CONTACT SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="contact"
        className="py-28 px-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${WARM.secondary}, ${WARM.accent})`,
        }}
      >
        {/* Floating blobs on CTA */}
        <OrganicCircle size={200} color="#ffffff" opacity={0.1} top="-20%" left="-10%" delay={0} />
        <OrganicCircle size={150} color="#ffffff" opacity={0.08} bottom="-10%" right="10%" delay={2} />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
            >
              <MessageCircle size={16} className="text-white" />
              <span className="text-sm font-semibold text-white">Let's connect</span>
            </div>

            <h2
              className="text-5xl md:text-6xl font-extrabold text-white mb-4"
              style={{ fontFamily: "'Nunito', 'Quicksand', sans-serif" }}
            >
              Ready to work together?
            </h2>
            <p
              className="text-lg text-white/80 mb-10 max-w-2xl mx-auto"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              I'm always excited to discuss new opportunities, interesting projects, or just have a friendly chat about technology.
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-8">
              {profile.email && (
                <motion.a
                  href={`mailto:${profile.email}`}
                  whileHover={{ scale: 1.08, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold bg-white text-stone-800"
                  style={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  }}
                >
                  <Mail size={20} style={{ color: WARM.secondary }} />
                  {profile.email}
                </motion.a>
              )}
              {profile.linkedin && (
                <motion.a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.08, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold bg-white/10 text-white border-2 border-white/30"
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
                  whileHover={{ scale: 1.08, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold bg-white/10 text-white border-2 border-white/30"
                >
                  <Github size={20} />
                  GitHub
                </motion.a>
              )}
            </div>

            <p className="text-white/60 text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Response time: usually within 24 hours
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <footer
        className="py-10 px-6 text-center"
        style={{
          background: WARM.primary,
        }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Name and tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <p
              className="text-2xl font-extrabold text-white mb-1"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {name}
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Nunito', sans-serif" }}>
              {title} · Building with heart
            </p>
          </motion.div>

          {/* Social links */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {profile.github && (
              <motion.a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                <Github size={18} />
              </motion.a>
            )}
            {profile.linkedin && (
              <motion.a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                <Linkedin size={18} />
              </motion.a>
            )}
            {profile.email && (
              <motion.a
                href={`mailto:${profile.email}`}
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                <Mail size={18} />
              </motion.a>
            )}
          </div>

          {/* Divider */}
          <div
            className="w-16 h-0.5 rounded-full mx-auto mb-4"
            style={{ background: `linear-gradient(90deg, ${WARM.secondary}, ${WARM.accent})`, opacity: 0.5 }}
          />

          {/* Copyright */}
          <p
            className="text-xs"
            style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Nunito', sans-serif" }}
          >
            © {new Date().getFullYear()} {name} · Built with passion and a warm heart
          </p>
        </div>
      </footer>
    </div>
  )
}