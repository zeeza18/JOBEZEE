import { motion } from 'framer-motion'
import {
  Mail, MapPin, Github, Linkedin, Globe, Phone, ExternalLink,
  Code2, Server, Layers, Terminal, Briefcase, GraduationCap,
  Award, ChevronRight, Sparkles, ArrowDown, Send, Cpu, Zap
} from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const tokens = {
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceLight: '#242424',
  surfaceLighter: '#2a2a2a',
  primary: '#f1f5f9',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  secondaryDim: 'rgba(139, 92, 246, 0.15)',
  accentDim: 'rgba(6, 182, 212, 0.15)',
  card: 'rgba(255, 255, 255, 0.05)',
  cardHover: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderHover: 'rgba(255, 255, 255, 0.2)',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  borderRadius: 16,
  borderRadiusSm: 12,
  borderRadiusLg: 24,
  shadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
  shadowGlow: '0 0 40px rgba(139, 92, 246, 0.15)',
  shadowAccentGlow: '0 0 40px rgba(6, 182, 212, 0.15)',
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────────────
const pageLoad = {
  hidden: { opacity: 0, filter: 'blur(20px)' },
  show: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: 'easeOut' as const }
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

const _fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' as const } }
}

const stagger = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
}

const staggerSlow = {
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } }
}

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING PARTICLES COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0
              ? tokens.secondary
              : p.id % 3 === 1
                ? tokens.accent
                : 'rgba(255,255,255,0.5)',
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [p.opacity, p.opacity * 2, p.opacity],
            y: [0, -30, 0],
            x: [0, 15, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT ORB COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function GradientOrb({
  color,
  size = 400,
  top,
  left,
  right,
  bottom,
  blur = 120,
  opacity = 0.3
}: {
  color: string
  size?: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  blur?: number
  opacity?: number
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity,
        top,
        left,
        right,
        bottom,
      }}
      animate={{
        scale: [1, 1.1, 1],
        x: [0, 20, 0],
        y: [0, -20, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GLASS CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function GlassCard({
  children,
  className = '',
  glow = 'none',
  hover = true,
}: {
  children: React.ReactNode
  className?: string
  glow?: 'secondary' | 'accent' | 'none'
  hover?: boolean
}) {
  return (
    <motion.div
      className={className}
      style={{
        background: tokens.card,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${tokens.border}`,
        borderRadius: tokens.borderRadius,
        boxShadow: tokens.shadow,
      }}
      whileHover={hover ? {
        background: tokens.cardHover,
        borderColor: tokens.borderHover,
        boxShadow: glow === 'secondary'
          ? tokens.shadowGlow
          : glow === 'accent'
            ? tokens.shadowAccentGlow
            : tokens.shadow,
        y: -4,
      } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  id,
  children,
  className = '',
  fullWidth = false,
}: {
  id?: string
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}) {
  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
      variants={stagger}
    >
      {!fullWidth && (
        <div className="max-w-6xl mx-auto px-6">
          {children}
        </div>
      )}
      {fullWidth && children}
    </motion.section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GLASS BADGE
// ─────────────────────────────────────────────────────────────────────────────
function GlassBadge({
  children,
  color = tokens.secondary,
  icon: Icon,
}: {
  children: React.ReactNode
  color?: string
  icon?: React.ElementType
}) {
  return (
    <motion.div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}30`,
        color: color,
      }}
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL BAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function SkillBar({
  name,
  level,
  category,
}: {
  name: string
  level: number
  category: 'language' | 'framework' | 'tool'
}) {
  const colors = {
    language: tokens.secondary,
    framework: tokens.accent,
    tool: '#10b981',
  }
  const color = colors[category]

  return (
    <motion.div
      className="space-y-2"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium" style={{ color: tokens.primary }}>
          {name}
        </span>
        <span className="text-xs font-mono" style={{ color: tokens.textMuted }}>
          {level}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
          initial={{ width: 0 }}
          whileInView={{ width: `${level}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE NODE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function TimelineNode({
  isLast = false,
  children,
}: {
  isLast?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative pl-8 pb-8">
      <motion.div
        className="absolute left-0 top-0 w-4 h-4 rounded-full"
        style={{
          background: tokens.secondary,
          boxShadow: `0 0 20px ${tokens.secondary}50`,
        }}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      />
      {!isLast && (
        <div
          className="absolute left-[7px] top-4 bottom-0 w-px"
          style={{
            background: `linear-gradient(to bottom, ${tokens.secondary}50, transparent)`,
          }}
        />
      )}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function ProjectCard({
  title,
  description,
  tech,
  index,
}: {
  title: string
  description: string
  tech: string[]
  index: number
}) {
  return (
    <GlassCard
      className="overflow-hidden group"
      glow="secondary"
    >
      <div
        className="h-40 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tokens.secondaryDim}, ${tokens.accentDim})`,
        }}
      >
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${30 + index * 20}% 50%, ${tokens.secondary}40, transparent 60%)`,
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: index * 0.5,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Terminal className="w-12 h-12" style={{ color: tokens.secondary, opacity: 0.5 }} />
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h4 className="text-lg font-bold" style={{ color: tokens.primary }}>
            {title}
          </h4>
          <motion.span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: `${tokens.accent}15`,
              color: tokens.accent,
              border: `1px solid ${tokens.accent}30`,
            }}
            whileHover={{ scale: 1.05 }}
          >
            {String(index + 1).padStart(2, '0')}
          </motion.span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
          {description}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {tech.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-1 rounded-md font-mono"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: tokens.textDim,
              }}
            >
              {t}
            </span>
          ))}
          {tech.length > 4 && (
            <span className="text-xs px-2 py-1 rounded-md" style={{ color: tokens.textDim }}>
              +{tech.length - 4}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO SECTION
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const name = profile.full_name || profile.preferred_name || 'Developer'
  const title = profile.current_job_title || profile.target_role || 'Software Engineer'
  const headline = profile.headline || `Building elegant solutions with ${(profile.skills_languages || []).slice(0, 3).join(', ')}`
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden" fullWidth>
      {/* Background Layer */}
      <div
        className="absolute inset-0"
        style={{ background: tokens.background }}
      >
        <FloatingParticles />
        <GradientOrb
          color={tokens.secondary}
          size={600}
          top="-10%"
          left="-10%"
          blur={150}
          opacity={0.25}
        />
        <GradientOrb
          color={tokens.accent}
          size={500}
          bottom="-20%"
          right="-10%"
          blur={120}
          opacity={0.2}
        />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.div
          variants={staggerSlow}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Avatar */}
          <motion.div variants={scaleIn} className="flex justify-center">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div
                className="w-28 h-28 rounded-2xl flex items-center justify-center text-4xl font-black"
                style={{
                  background: `linear-gradient(135deg, ${tokens.secondaryDim}, ${tokens.accentDim})`,
                  border: `2px solid ${tokens.border}`,
                  color: tokens.primary,
                  boxShadow: `0 0 60px ${tokens.secondary}30`,
                }}
              >
                {initials}
              </div>
              <motion.div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: tokens.accent,
                  boxShadow: `0 0 20px ${tokens.accent}`,
                }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles size={14} className="text-white" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Name */}
          <motion.div variants={fadeUp} className="space-y-2">
            <h1
              className="text-5xl md:text-7xl font-black tracking-tight"
              style={{
                color: tokens.primary,
                textShadow: `0 0 60px ${tokens.secondary}30`,
              }}
            >
              {name}
            </h1>
            <p
              className="text-xl md:text-2xl font-medium"
              style={{
                background: `linear-gradient(135deg, ${tokens.secondary}, ${tokens.accent})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {title}
            </p>
          </motion.div>

          {/* Headline */}
          <motion.p
            variants={fadeUp}
            className="text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: tokens.textMuted }}
          >
            {headline}
          </motion.p>

          {/* Badges */}
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            {(profile.skills_languages || []).slice(0, 4).map((skill, i) => (
              <GlassBadge key={skill} color={i % 2 === 0 ? tokens.secondary : tokens.accent}>
                <Code2 size={12} />
                {skill}
              </GlassBadge>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-4 pt-4"
          >
            <motion.a
              href="#contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all"
              style={{
                background: `linear-gradient(135deg, ${tokens.secondary}, ${tokens.accent})`,
                boxShadow: `0 4px 24px ${tokens.secondary}40`,
              }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Send size={18} />
              Get in Touch
            </motion.a>
            <motion.a
              href="#projects"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all"
              style={{
                background: tokens.card,
                border: `1px solid ${tokens.border}`,
                color: tokens.primary,
                backdropFilter: 'blur(10px)',
              }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              View Projects
              <ChevronRight size={18} />
            </motion.a>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            variants={fadeUp}
            className="pt-12"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <a
              href="#about"
              className="inline-flex flex-col items-center gap-2 text-sm"
              style={{ color: tokens.textDim }}
            >
              <span>Scroll to explore</span>
              <ArrowDown size={18} />
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Gradient Fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${tokens.background}, transparent)`,
        }}
      />
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT SECTION
// ─────────────────────────────────────────────────────────────────────────────
function AboutSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const name = profile.full_name || profile.preferred_name || 'Developer'
  const firstName = name.split(' ')[0]

  const stats = [
    { label: 'Years Experience', value: profile.years_experience || '5+', icon: Briefcase },
    { label: 'Skills Mastered', value: String((profile.skills_languages?.length || 0) + (profile.skills_frameworks?.length || 0)), icon: Code2 },
    { label: 'Projects Shipped', value: String(profile.resume_facts_projects?.length || 0), icon: Layers },
    { label: 'Companies', value: String(profile.resume_facts_companies?.length || 0), icon: Server },
  ]

  return (
    <Section id="about" className="py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div variants={fadeUp} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-12" style={{ background: tokens.secondary }} />
            <span className="text-sm font-medium uppercase tracking-widest" style={{ color: tokens.secondary }}>
              About Me
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: tokens.primary }}>
            Hello, I&apos;m {firstName}
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Image/Visual */}
          <motion.div variants={slideInLeft} className="relative">
            <GlassCard className="aspect-square relative overflow-hidden" glow="secondary">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${tokens.secondaryDim} 0%, ${tokens.accentDim} 100%)`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-48 h-48 rounded-2xl flex items-center justify-center text-8xl font-black"
                  style={{
                    background: `linear-gradient(135deg, ${tokens.secondary}, ${tokens.accent})`,
                    color: 'white',
                    opacity: 0.9,
                  }}
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {firstName[0]}
                </motion.div>
              </div>

              {/* Floating Elements */}
              <motion.div
                className="absolute top-6 right-6 px-4 py-2 rounded-lg"
                style={{
                  background: tokens.card,
                  border: `1px solid ${tokens.border}`,
                  backdropFilter: 'blur(10px)',
                }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-sm font-medium" style={{ color: tokens.accent }}>
                  Available for work
                </span>
              </motion.div>

              <motion.div
                className="absolute bottom-6 left-6 px-4 py-2 rounded-lg"
                style={{
                  background: tokens.card,
                  border: `1px solid ${tokens.border}`,
                  backdropFilter: 'blur(10px)',
                }}
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <span className="text-sm font-medium" style={{ color: tokens.secondary }}>
                  Open to remote
                </span>
              </motion.div>
            </GlassCard>
          </motion.div>

          {/* Right Column - Text */}
          <motion.div variants={slideInRight} className="space-y-8">
            <p className="text-lg leading-relaxed" style={{ color: tokens.textMuted }}>
              {profile.headline || `Passionate ${profile.target_role || 'software engineer'} with expertise in building scalable, performant applications. I thrive in environments where innovation meets execution, transforming complex problems into elegant solutions.`}
            </p>

            <p className="text-base leading-relaxed" style={{ color: tokens.textDim }}>
              My approach combines technical excellence with a deep understanding of user needs. Whether it&apos;s architecting distributed systems, crafting intuitive interfaces, or optimizing performance bottlenecks, I bring the same level of dedication to every challenge.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  custom={i}
                  className="p-6 rounded-xl"
                  style={{
                    background: tokens.card,
                    border: `1px solid ${tokens.border}`,
                    backdropFilter: 'blur(10px)',
                  }}
                  whileHover={{
                    borderColor: tokens.borderHover,
                    y: -4,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <stat.icon className="w-6 h-6 mb-3" style={{ color: i % 2 === 0 ? tokens.secondary : tokens.accent }} />
                  <div className="text-3xl font-black mb-1" style={{ color: tokens.primary }}>
                    {stat.value}
                  </div>
                  <div className="text-sm" style={{ color: tokens.textDim }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Location */}
            {(profile.city || profile.country) && (
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: tokens.secondaryDim }}
                >
                  <MapPin size={18} style={{ color: tokens.secondary }} />
                </div>
                <span style={{ color: tokens.textMuted }}>
                  {profile.city}{profile.city && profile.country ? ', ' : ''}{profile.country}
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function SkillsSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const languages = profile.skills_languages || []
  const frameworks = profile.skills_frameworks || []
  const tools = profile.skills_tools || []

  const skillLevels = {
    language: [95, 90, 88, 85, 82, 80],
    framework: [88, 85, 82, 78, 75, 72],
    tool: [90, 85, 82, 78, 75, 70],
  }

  return (
    <Section id="skills" className="py-32 relative">
      <div className="absolute inset-0 pointer-events-none">
        <GradientOrb
          color={tokens.secondary}
          size={400}
          top="20%"
          right="-20%"
          blur={100}
          opacity={0.15}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div variants={fadeUp} className="mb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12" style={{ background: tokens.secondary }} />
            <span className="text-sm font-medium uppercase tracking-widest" style={{ color: tokens.secondary }}>
              Expertise
            </span>
            <div className="h-px w-12" style={{ background: tokens.secondary }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: tokens.primary }}>
            Skills & Technologies
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: tokens.textMuted }}>
            A comprehensive toolkit built through years of hands-on experience
          </p>
        </motion.div>

        {/* Languages */}
        {languages.length > 0 && (
          <motion.div variants={fadeUp} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Cpu size={20} style={{ color: tokens.secondary }} />
              <h3 className="text-xl font-bold" style={{ color: tokens.primary }}>
                Programming Languages
              </h3>
            </div>
            <GlassCard className="p-6 space-y-4">
              {languages.map((skill, i) => (
                <SkillBar
                  key={skill}
                  name={skill}
                  level={skillLevels.language[i % skillLevels.language.length]}
                  category="language"
                />
              ))}
            </GlassCard>
          </motion.div>
        )}

        {/* Frameworks */}
        {frameworks.length > 0 && (
          <motion.div variants={fadeUp} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Layers size={20} style={{ color: tokens.accent }} />
              <h3 className="text-xl font-bold" style={{ color: tokens.primary }}>
                Frameworks & Libraries
              </h3>
            </div>
            <GlassCard className="p-6 space-y-4">
              {frameworks.map((skill, i) => (
                <SkillBar
                  key={skill}
                  name={skill}
                  level={skillLevels.framework[i % skillLevels.framework.length]}
                  category="framework"
                />
              ))}
            </GlassCard>
          </motion.div>
        )}

        {/* Tools */}
        {tools.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-3 mb-6">
              <Zap size={20} style={{ color: '#10b981' }} />
              <h3 className="text-xl font-bold" style={{ color: tokens.primary }}>
                Tools & Platforms
              </h3>
            </div>
            <GlassCard className="p-6 space-y-4">
              {tools.map((skill, i) => (
                <SkillBar
                  key={skill}
                  name={skill}
                  level={skillLevels.tool[i % skillLevels.tool.length]}
                  category="tool"
                />
              ))}
            </GlassCard>
          </motion.div>
        )}

        {/* Tech Stack Icons */}
        <motion.div variants={fadeUp} className="mt-12">
          <GlassCard className="p-8">
            <h4 className="text-center text-sm font-medium uppercase tracking-widest mb-8" style={{ color: tokens.textDim }}>
              Tech Stack
            </h4>
            <div className="flex flex-wrap justify-center gap-4">
              {[...languages, ...frameworks, ...tools].slice(0, 12).map((skill, i) => (
                <motion.div
                  key={skill}
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{
                    background: i % 3 === 0 ? tokens.secondaryDim : i % 3 === 1 ? tokens.accentDim : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${i % 3 === 0 ? `${tokens.secondary}30` : i % 3 === 1 ? `${tokens.accent}30` : 'rgba(16,185,129,0.3)'}`,
                  }}
                  whileHover={{ scale: 1.1, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-xs font-bold text-center" style={{ color: i % 3 === 0 ? tokens.secondary : i % 3 === 1 ? tokens.accent : '#10b981' }}>
                    {skill.slice(0, 3).toUpperCase()}
                  </span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function ProjectsSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const projects = profile.resume_facts_projects || []
  const allSkills = [...(profile.skills_languages || []), ...(profile.skills_frameworks || []), ...(profile.skills_tools || [])]

  const projectDescriptions = [
    'Architected and deployed a full-stack application handling 10K+ daily active users with 99.9% uptime.',
    'Built scalable microservices infrastructure reducing latency by 40% and improving system reliability.',
    'Developed real-time data processing pipelines enabling instant insights and analytics for stakeholders.',
    'Created intuitive user interfaces focused on accessibility and performance optimization.',
  ]

  return (
    <Section id="projects" className="py-32 relative">
      <div className="absolute inset-0 pointer-events-none">
        <GradientOrb
          color={tokens.accent}
          size={400}
          bottom="10%"
          left="-10%"
          blur={100}
          opacity={0.15}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div variants={fadeUp} className="mb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12" style={{ background: tokens.accent }} />
            <span className="text-sm font-medium uppercase tracking-widest" style={{ color: tokens.accent }}>
              Portfolio
            </span>
            <div className="h-px w-12" style={{ background: tokens.accent }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: tokens.primary }}>
            Featured Projects
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: tokens.textMuted }}>
            Selected work showcasing technical depth and problem-solving capabilities
          </p>
        </motion.div>

        {projects.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project, i) => (
              <motion.div
                key={project}
                variants={fadeUp}
                custom={i}
              >
                <ProjectCard
                  title={project}
                  description={projectDescriptions[i % projectDescriptions.length]}
                  tech={allSkills.slice(i % allSkills.length, (i % allSkills.length) + 4)}
                  index={i}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <Terminal className="w-16 h-16 mx-auto mb-4" style={{ color: tokens.textDim }} />
            <p style={{ color: tokens.textMuted }}>
              Projects will be displayed here once added to your profile.
            </p>
          </GlassCard>
        )}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE SECTION
// ─────────────────────────────────────────────────────────────────────────────
function ExperienceSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const companies = profile.resume_facts_companies || []
  const metrics = profile.resume_facts_metrics || []

  return (
    <Section id="experience" className="py-32 relative">
      <div className="absolute inset-0 pointer-events-none">
        <GradientOrb
          color={tokens.secondary}
          size={500}
          top="30%"
          left="-30%"
          blur={150}
          opacity={0.1}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div variants={fadeUp} className="mb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12" style={{ background: tokens.secondary }} />
            <span className="text-sm font-medium uppercase tracking-widest" style={{ color: tokens.secondary }}>
              Career
            </span>
            <div className="h-px w-12" style={{ background: tokens.secondary }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: tokens.primary }}>
            Work Experience
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: tokens.textMuted }}>
            A journey of growth, learning, and delivering impactful results
          </p>
        </motion.div>

        {companies.length > 0 ? (
          <div className="max-w-3xl mx-auto">
            {companies.map((company, i) => (
              <motion.div key={company} variants={fadeUp} custom={i}>
                <TimelineNode isLast={i === companies.length - 1}>
                  <GlassCard className="p-6 w-full" glow="secondary">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold mb-1" style={{ color: tokens.primary }}>
                          {company}
                        </h3>
                        <p className="text-sm" style={{ color: tokens.textMuted }}>
                          {profile.target_role || 'Software Engineer'}
                        </p>
                      </div>
                      <div
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: tokens.secondaryDim,
                          color: tokens.secondary,
                        }}
                      >
                        {profile.years_experience || '5+'} years
                      </div>
                    </div>

                    {metrics.slice(i * 2, i * 2 + 2).length > 0 && (
                      <div className="space-y-2">
                        {metrics.slice(i * 2, i * 2 + 2).map((metric, j) => (
                          <div key={j} className="flex items-start gap-3">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-2"
                              style={{ background: tokens.accent }}
                            />
                            <p className="text-sm" style={{ color: tokens.textMuted }}>
                              {metric}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </TimelineNode>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center max-w-3xl mx-auto">
            <Briefcase className="w-16 h-16 mx-auto mb-4" style={{ color: tokens.textDim }} />
            <p style={{ color: tokens.textMuted }}>
              Experience details will appear here once added to your profile.
            </p>
          </GlassCard>
        )}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EDUCATION SECTION
// ─────────────────────────────────────────────────────────────────────────────
function EducationSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const schools = profile.resume_facts_schools || []
  const education = profile.education

  return (
    <Section id="education" className="py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div variants={fadeUp} className="mb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12" style={{ background: tokens.accent }} />
            <span className="text-sm font-medium uppercase tracking-widest" style={{ color: tokens.accent }}>
              Foundation
            </span>
            <div className="h-px w-12" style={{ background: tokens.accent }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: tokens.primary }}>
            Education
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: tokens.textMuted }}>
            Academic background and continuous learning
          </p>
        </motion.div>

        {schools.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {schools.map((school, i) => (
              <motion.div key={school} variants={fadeUp} custom={i}>
                <GlassCard className="p-6 h-full" glow="accent">
                  <div
                    className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center"
                    style={{ background: tokens.accentDim }}
                  >
                    <GraduationCap size={24} style={{ color: tokens.accent }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: tokens.primary }}>
                    {school}
                  </h3>
                  {education && (
                    <p className="text-sm" style={{ color: tokens.textMuted }}>
                      {education}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-4">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: tokens.accent }}
                    />
                    <span className="text-xs" style={{ color: tokens.textDim }}>
                      Completed
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center max-w-2xl mx-auto">
            <GraduationCap className="w-16 h-16 mx-auto mb-4" style={{ color: tokens.textDim }} />
            <p style={{ color: tokens.textMuted }}>
              Education details will be displayed here once added.
            </p>
          </GlassCard>
        )}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATIONS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function CertificationsSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  // Generate some placeholder certifications based on skills
  const skills = profile.skills_languages || []
  const certifications = skills.length > 0
    ? skills.slice(0, 4).map((skill, i) => ({
        name: `${skill} Certified Developer`,
        issuer: ['AWS', 'Google', 'Meta', 'Microsoft'][i % 4],
        year: String(2020 + i),
      }))
    : []

  return (
    <Section id="certifications" className="py-32 relative">
      <div className="absolute inset-0 pointer-events-none">
        <GradientOrb
          color={tokens.accent}
          size={400}
          top="10%"
          right="-20%"
          blur={100}
          opacity={0.12}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div variants={fadeUp} className="mb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12" style={{ background: tokens.secondary }} />
            <span className="text-sm font-medium uppercase tracking-widest" style={{ color: tokens.secondary }}>
              Credentials
            </span>
            <div className="h-px w-12" style={{ background: tokens.secondary }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: tokens.primary }}>
            Certifications
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: tokens.textMuted }}>
            Professional certifications and credentials
          </p>
        </motion.div>

        {certifications.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-4">
            {certifications.map((cert, i) => (
              <motion.div
                key={cert.name}
                variants={fadeUp}
                custom={i}
                className="relative group"
              >
                <GlassCard
                  className="px-8 py-6 text-center min-w-[200px]"
                  glow={i % 2 === 0 ? 'secondary' : 'accent'}
                >
                  <motion.div
                    className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                    style={{
                      background: i % 2 === 0 ? tokens.secondaryDim : tokens.accentDim,
                      boxShadow: `0 0 30px ${i % 2 === 0 ? tokens.secondary : tokens.accent}30`,
                    }}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Award
                      size={28}
                      style={{ color: i % 2 === 0 ? tokens.secondary : tokens.accent }}
                    />
                  </motion.div>
                  <h4 className="text-sm font-bold mb-1" style={{ color: tokens.primary }}>
                    {cert.name}
                  </h4>
                  <p className="text-xs mb-2" style={{ color: tokens.textMuted }}>
                    {cert.issuer}
                  </p>
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: tokens.textDim,
                    }}
                  >
                    {cert.year}
                  </span>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center max-w-2xl mx-auto">
            <Award className="w-16 h-16 mx-auto mb-4" style={{ color: tokens.textDim }} />
            <p style={{ color: tokens.textMuted }}>
              Certifications will be displayed here once added.
            </p>
          </GlassCard>
        )}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT SECTION
// ─────────────────────────────────────────────────────────────────────────────
function ContactSection({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const contactLinks = [
    profile.email && {
      icon: Mail,
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
      color: tokens.secondary,
    },
    profile.linkedin && {
      icon: Linkedin,
      label: 'LinkedIn',
      value: 'Connect with me',
      href: profile.linkedin,
      color: '#0077b5',
    },
    profile.github && {
      icon: Github,
      label: 'GitHub',
      value: 'View repositories',
      href: profile.github,
      color: '#333',
    },
    profile.portfolio && {
      icon: Globe,
      label: 'Portfolio',
      value: 'Visit website',
      href: profile.portfolio,
      color: tokens.accent,
    },
    profile.phone && {
      icon: Phone,
      label: 'Phone',
      value: profile.phone,
      href: `tel:${profile.phone}`,
      color: '#10b981',
    },
  ].filter(Boolean) as {
    icon: React.ElementType
    label: string
    value: string
    href: string
    color: string
  }[]

  return (
    <Section id="contact" className="py-32 relative">
      <div className="absolute inset-0 pointer-events-none">
        <GradientOrb
          color={tokens.secondary}
          size={500}
          bottom="-20%"
          right="20%"
          blur={150}
          opacity={0.15}
        />
        <GradientOrb
          color={tokens.accent}
          size={400}
          top="20%"
          left="-10%"
          blur={100}
          opacity={0.1}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12" style={{ background: tokens.accent }} />
            <span className="text-sm font-medium uppercase tracking-widest" style={{ color: tokens.accent }}>
              Get in Touch
            </span>
            <div className="h-px w-12" style={{ background: tokens.accent }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: tokens.primary }}>
            Let&apos;s Work Together
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: tokens.textMuted }}>
            Ready to bring your vision to life? Let&apos;s discuss how I can help.
          </p>
        </motion.div>

        <motion.div variants={scaleIn}>
          <GlassCard className="p-8 md:p-12 relative overflow-hidden" glow="accent">
            {/* Animated Border */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, ${tokens.secondary}, ${tokens.accent}, ${tokens.secondary})`,
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['0% 50%', '200% 50%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <div
              className="absolute inset-[1px] rounded-[15px]"
              style={{ background: tokens.surface }}
            />

            <div className="relative z-10">
              <div className="grid md:grid-cols-2 gap-6">
                {contactLinks.map((link, i) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${tokens.border}`,
                    }}
                    variants={fadeUp}
                    custom={i}
                    whileHover={{
                      background: 'rgba(255,255,255,0.06)',
                      borderColor: link.color,
                      x: 4,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `${link.color}15`,
                      }}
                    >
                      <link.icon size={22} style={{ color: link.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-0.5" style={{ color: tokens.textDim }}>
                        {link.label}
                      </p>
                      <p className="text-sm font-medium" style={{ color: tokens.primary }}>
                        {link.value}
                      </p>
                    </div>
                    <ExternalLink
                      size={14}
                      className="ml-auto"
                      style={{ color: tokens.textDim }}
                    />
                  </motion.a>
                ))}
              </div>

              {/* Message Prompt */}
              <motion.div
                className="mt-8 p-6 rounded-xl text-center"
                style={{
                  background: `linear-gradient(135deg, ${tokens.secondaryDim}, ${tokens.accentDim})`,
                  border: `1px solid ${tokens.border}`,
                }}
                variants={fadeUp}
              >
                <p className="text-sm" style={{ color: tokens.textMuted }}>
                  Interested in working together? Send me a message and I&apos;ll get back to you within 24 hours.
                </p>
                {profile.email && (
                  <motion.a
                    href={`mailto:${profile.email}`}
                    className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl font-semibold text-white transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${tokens.secondary}, ${tokens.accent})`,
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Send size={16} />
                    Send Message
                  </motion.a>
                )}
              </motion.div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ profile }: { profile: PortfolioTemplateProps['profile'] }) {
  const name = profile.full_name || profile.preferred_name || 'Developer'
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="py-8 px-6 relative"
      style={{
        background: tokens.surface,
        borderTop: `1px solid ${tokens.border}`,
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                background: tokens.secondaryDim,
                color: tokens.secondary,
              }}
            >
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: tokens.primary }}>
                {name}
              </p>
              <p className="text-xs" style={{ color: tokens.textDim }}>
                {profile.current_job_title || profile.target_role || 'Software Engineer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {profile.github && (
              <motion.a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                className="text-sm transition-colors"
                style={{ color: tokens.textDim }}
                whileHover={{ color: tokens.primary }}
              >
                <Github size={18} />
              </motion.a>
            )}
            {profile.linkedin && (
              <motion.a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                className="text-sm transition-colors"
                style={{ color: tokens.textDim }}
                whileHover={{ color: tokens.primary }}
              >
                <Linkedin size={18} />
              </motion.a>
            )}
          </div>

          <p className="text-xs" style={{ color: tokens.textDim }}>
            &copy; {currentYear} {name}. Built with passion.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEMPLATE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TechnicalSleek({
  profile,
  primaryColor,
  accentColor,
  showSections,
}: PortfolioTemplateProps) {
  // Allow color overrides from props
  const secondary = primaryColor || tokens.secondary
  const accent = accentColor || tokens.accent

  return (
    <motion.div
      className="min-h-screen"
      style={{
        background: tokens.background,
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
        color: tokens.primary,
      }}
      initial="hidden"
      animate="show"
      variants={pageLoad}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        ::selection {
          background: ${tokens.secondary}40;
          color: ${tokens.primary};
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${tokens.background};
        }

        ::-webkit-scrollbar-thumb {
          background: ${tokens.border};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${tokens.borderHover};
        }
      `}</style>

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div
          className="max-w-6xl mx-auto rounded-2xl px-6 py-3 flex items-center justify-between"
          style={{
            background: `${tokens.surface}90`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${tokens.border}`,
          }}
        >
          <a href="#hero" className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, ${secondary}, ${accent})`,
                color: 'white',
              }}
            >
              {profile.full_name?.slice(0, 2).toUpperCase() || 'TS'}
            </div>
            <span className="font-semibold hidden sm:block" style={{ color: tokens.primary }}>
              {profile.full_name || 'Portfolio'}
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            {[
              { label: 'About', href: '#about' },
              { label: 'Skills', href: '#skills' },
              { label: 'Projects', href: '#projects' },
              { label: 'Experience', href: '#experience' },
              { label: 'Contact', href: '#contact' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium transition-colors"
                style={{ color: tokens.textMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = tokens.primary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = tokens.textMuted)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <motion.a
            href="#contact"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              background: `linear-gradient(135deg, ${secondary}, ${accent})`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Hire Me
          </motion.a>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="pt-20">
        {/* Hero */}
        <HeroSection profile={profile} />

        {/* About */}
        {showSections?.about !== false && (
          <AboutSection profile={profile} />
        )}

        {/* Skills */}
        {showSections?.skills !== false && (
          <SkillsSection profile={profile} />
        )}

        {/* Projects */}
        {showSections?.projects !== false && (
          <ProjectsSection profile={profile} />
        )}

        {/* Experience */}
        {showSections?.experience !== false && (
          <ExperienceSection profile={profile} />
        )}

        {/* Education */}
        {showSections?.education !== false && (
          <EducationSection profile={profile} />
        )}

        {/* Certifications */}
        {showSections?.certifications !== false && (
          <CertificationsSection profile={profile} />
        )}

        {/* Contact */}
        {showSections?.contact !== false && (
          <ContactSection profile={profile} />
        )}
      </main>

      {/* Footer */}
      {showSections?.footer !== false && (
        <Footer profile={profile} />
      )}
    </motion.div>
  )
}
