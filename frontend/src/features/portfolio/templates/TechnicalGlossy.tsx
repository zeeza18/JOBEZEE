import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import {
  Mail, Github, Linkedin, Globe, ExternalLink,
  Code2, Database, Server, Cloud, GraduationCap, Award, Calendar,
  ChevronRight, Sparkles, Zap, Star, Layers
} from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// ── Animation Variants ────────────────────────────────────────────────────────
const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

const fadeIn: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' as const } }
}

const stagger: any = {
  show: { transition: { staggerChildren: 0.08 } }
}

const scaleUp: any = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } }
}

const slideRight: any = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
}

// ── Glass Card Component ───────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  onClick?: () => void
}

function GlassCard({ children, className = '', hover = true, glow = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-[20px]
        bg-[rgba(255,255,255,0.08)]
        backdrop-blur-[20px]
        border border-[rgba(255,255,255,0.12)]
        shadow-[0_8px_32px_rgba(59,130,246,0.15)]
        transition-all duration-300 ease-out
        ${hover ? 'hover:bg-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.18)]' : ''}
        ${glow ? 'hover:shadow-[0_8px_40px_rgba(59,130,246,0.25)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Inner glass shine gradient */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
        }}
      />
      {children}
    </motion.div>
  )
}

// ── Shine Sweep Effect Component ───────────────────────────────────────────────
function _ShineSweep({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none ${className}`}>
      <div
        className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 55%, transparent 60%)',
          transform: 'translateX(-100%)',
          animation: 'shineSweep 0.8s ease-out forwards',
        }}
      />
      <style>{`
        @keyframes shineSweep {
          0% { transform: translateX(-100%) rotate(0deg); }
          100% { transform: translateX(100%) rotate(0deg); }
        }
        .group:hover .opacity-0 {
          animation: shineSweep 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

// ── Glowing Orb Component ───────────────────────────────────────────────────────
interface OrbProps {
  size: string
  color: string
  blur: string
  top: string
  left: string
  delay?: number
}

function GlowingOrb({ size, color, blur, top, left, delay = 0 }: OrbProps) {
  return (
    <motion.div
      className="absolute rounded-full blur-[100px]"
      style={{
        width: size,
        height: size,
        background: color,
        top,
        left,
        filter: `blur(${blur})`,
      }}
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.4, 0.6, 0.4],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  )
}

// ── Animated Section Wrapper ───────────────────────────────────────────────────
interface SectionWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
}

function SectionWrapper({ children, className = '', id }: SectionWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'show' : 'hidden'}
      variants={stagger}
      className={`relative ${className}`}
    >
      {children}
    </motion.section>
  )
}

// ── Skill Badge Component ───────────────────────────────────────────────────────
interface SkillBadgeProps {
  name: string
  color: string
  delay?: number
}

function SkillBadge({ name, color, delay: _delay = 0 }: SkillBadgeProps) {
  return (
    <motion.div
      variants={scaleUp}
      className="group relative"
    >
      <GlassCard hover={true} glow={true} className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="text-sm font-medium text-white/90 whitespace-nowrap">{name}</span>
        </div>
      </GlassCard>
      {/* Shine effect */}
      <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
        <div
          className="absolute top-1/2 left-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
            transform: 'translateX(-100%) translateY(-50%)',
            transition: 'transform 0.6s ease-out',
          }}
        />
      </div>
    </motion.div>
  )
}

// ── Project Card Component ─────────────────────────────────────────────────────
interface ProjectCardProps {
  name: string
  description: string
  technologies: string[]
  link?: string
  index: number
  primaryColor: string
}

function ProjectCard({ name, description, technologies, link, index, primaryColor }: ProjectCardProps) {
  return (
    <motion.div variants={fadeUp} className="group">
      <GlassCard hover={true} glow={true} className="p-6 h-full flex flex-col">
        {/* Project number */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`,
              boxShadow: `0 4px 15px ${primaryColor}40`,
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-white/70" />
            </a>
          )}
        </div>

        {/* Project content */}
        <h3 className="text-lg font-bold text-white mb-2">{name}</h3>
        <p className="text-sm text-white/60 mb-4 flex-1 leading-relaxed">{description}</p>

        {/* Technologies */}
        <div className="flex flex-wrap gap-2">
          {technologies.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10"
            >
              {tech}
            </span>
          ))}
          {technologies.length > 4 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">
              +{technologies.length - 4}
            </span>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}

// ── Timeline Item Component ─────────────────────────────────────────────────────
interface TimelineItemProps {
  company: string
  role: string
  period: string
  description: string
  color: string
  index: number
}

function TimelineItem({ company, role, period, description, color, index: _index }: TimelineItemProps) {
  return (
    <motion.div variants={slideRight} className="relative pl-8 group">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />

      {/* Timeline dot */}
      <motion.div
        className="absolute left-0 top-2 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}80)`,
          boxShadow: `0 0 20px ${color}50`,
        }}
        whileHover={{ scale: 1.2 }}
      >
        <div className="w-2 h-2 rounded-full bg-white" />
      </motion.div>

      {/* Content card */}
      <GlassCard hover={true} className="ml-6 p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-white font-semibold text-base">{company}</h3>
            <p className="text-white/70 text-sm">{role}</p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/60"
            style={{ fontFamily: 'inherit' }}
          >
            {period}
          </span>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">{description}</p>
      </GlassCard>
    </motion.div>
  )
}

// ── Certification Badge Component ───────────────────────────────────────────────
interface CertBadgeProps {
  name: string
  issuer: string
  year: string
  color: string
}

function CertBadge({ name, issuer, year, color }: CertBadgeProps) {
  return (
    <motion.div variants={scaleUp} className="group">
      <GlassCard hover={true} glow={true} className="p-5 text-center">
        {/* Badge icon */}
        <div
          className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${color}30, ${color}10)`,
            border: `2px solid ${color}40`,
            boxShadow: `0 0 20px ${color}20`,
          }}
        >
          <Award className="w-7 h-7" style={{ color }} />
        </div>
        <h4 className="text-white font-semibold text-sm mb-1">{name}</h4>
        <p className="text-white/50 text-xs mb-1">{issuer}</p>
        <span className="text-white/30 text-xs">{year}</span>
      </GlassCard>
    </motion.div>
  )
}

// ── Contact Form Component ──────────────────────────────────────────────────────
interface ContactFormProps {
  email: string
  linkedin?: string
  github?: string
  portfolio?: string
}

function ContactForm({ email, linkedin, github, portfolio }: ContactFormProps) {
  return (
    <GlassCard hover={false} className="p-8 max-w-xl mx-auto">
      <div className="space-y-6">
        {/* Email */}
        {email && (
          <motion.a
            variants={fadeUp}
            href={`mailto:${email}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-cyan-500/30">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white/50 text-xs mb-0.5">Email</p>
              <p className="text-white font-medium">{email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
          </motion.a>
        )}

        {/* Social links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {linkedin && (
            <motion.a
              variants={scaleUp}
              href={linkedin}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-white/80"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </motion.a>
          )}
          {github && (
            <motion.a
              variants={scaleUp}
              href={github}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-white/80"
            >
              <Github className="w-4 h-4" />
              GitHub
            </motion.a>
          )}
          {portfolio && (
            <motion.a
              variants={scaleUp}
              href={portfolio}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-white/80"
            >
              <Globe className="w-4 h-4" />
              Portfolio
            </motion.a>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

// ── Main Template Component ─────────────────────────────────────────────────────
export default function TechnicalGlossy({
  profile,
  primaryColor = '#3b82f6',
  accentColor = '#0ea5e9',
  showSections,
  profilePhoto,
}: PortfolioTemplateProps) {
  // Profile data
  const name = profile.full_name || profile.preferred_name || 'Professional'
  const title = profile.current_job_title || profile.target_role || 'Software Engineer'
  const headline = profile.headline || 'Building exceptional digital experiences'
  const bio = `Senior technical professional with ${profile.years_experience || '5'} years of experience delivering scalable, high-performance solutions. Passionate about clean architecture and best practices.`

  // Skills aggregation
  const allSkills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || []),
  ]

  const languages = profile.skills_languages || ['TypeScript', 'Python', 'Go', 'Rust']
  const frameworks = profile.skills_frameworks || ['React', 'Next.js', 'Node.js', 'FastAPI']
  const tools = profile.skills_tools || ['Docker', 'Kubernetes', 'AWS', 'PostgreSQL']

  // Projects
  const projects = profile.resume_facts_projects?.length
    ? profile.resume_facts_projects
    : [
        { name: 'Cloud-Native API Platform', description: 'Built a scalable microservices architecture serving 2M+ daily requests with 99.9% uptime', technologies: ['Go', 'Kubernetes', 'AWS'], link: '#' },
        { name: 'Real-Time Analytics Dashboard', description: 'Developed interactive data visualization platform processing 50K events/second', technologies: ['React', 'D3.js', 'Kafka'], link: '#' },
        { name: 'Distributed Cache System', description: 'Implemented high-performance caching layer with sub-millisecond latency', technologies: ['Rust', 'Redis', 'gRPC'], link: '#' },
        { name: 'Developer CLI Toolkit', description: 'Created comprehensive command-line tools improving developer productivity by 40%', technologies: ['Go', 'Cobra', 'Viper'], link: '#' },
      ]

  const [projectLink] = useState('#')

  // Experience
  const companies = profile.resume_facts_companies?.length
    ? profile.resume_facts_companies
    : ['TechCorp Inc.', 'StartupXYZ', 'Innovation Labs']

  const experience = companies.map((company, i) => ({
    company,
    role: i === 0 ? 'Senior Software Engineer' : i === 1 ? 'Software Engineer' : 'Junior Developer',
    period: i === 0 ? '2022 - Present' : i === 1 ? '2019 - 2022' : '2017 - 2019',
    description: profile.resume_facts_metrics?.[i] ||
      `Led development of key platform features, mentored junior engineers, and drove architectural decisions that improved system performance by 50%.`,
  }))

  // Education
  const schools = profile.resume_facts_schools?.length
    ? profile.resume_facts_schools
    : ['Stanford University', 'MIT']

  // Certifications (placeholder - would come from profile)
  const certifications = [
    { name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', year: '2024', color: '#FF9900' },
    { name: 'Kubernetes Administrator', issuer: 'CNCF', year: '2023', color: '#326CE5' },
    { name: 'Google Cloud Professional', issuer: 'Google', year: '2023', color: '#4285F4' },
    { name: 'Meta Frontend Developer', issuer: 'Meta', year: '2022', color: '#0668E1' },
  ]

  // Animated gradient for hero
  const [gradientOffset, setGradientOffset] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setGradientOffset((prev) => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Profile photo initials
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: '#000000',
        color: '#ffffff',
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <GlowingOrb size="600px" color={primaryColor} blur="150px" top="-20%" left="-10%" delay={0} />
        <GlowingOrb size="500px" color={accentColor} blur="120px" top="30%" left="60%" delay={2} />
        <GlowingOrb size="400px" color={primaryColor} blur="100px" top="60%" left="-20%" delay={4} />
        <GlowingOrb size="450px" color={accentColor} blur="110px" top="80%" left="70%" delay={6} />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <GlassCard hover={false} className="px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                  }}
                >
                  {initials}
                </div>
                <span className="font-semibold text-white">{name}</span>
              </div>

              {/* Nav links */}
              <div className="hidden md:flex items-center gap-8">
                {['About', 'Skills', 'Projects', 'Experience', 'Contact'].map((link) => (
                  <a
                    key={link}
                    href={`#${link.toLowerCase()}`}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link}
                  </a>
                ))}
              </div>

              {/* CTA */}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    boxShadow: `0 4px 15px ${primaryColor}40`,
                  }}
                >
                  <Mail className="w-4 h-4" />
                  Get in Touch
                </a>
              )}
            </div>
          </GlassCard>
        </div>
      </nav>

      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <SectionWrapper id="hero" className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            {/* Left content */}
            <motion.div variants={stagger} className="relative z-10">
              {/* Badge */}
              <motion.div variants={fadeUp} className="mb-6">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: `${primaryColor}20`,
                    border: `1px solid ${primaryColor}40`,
                    color: primaryColor,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: primaryColor }}
                  />
                  Available for opportunities
                </div>
              </motion.div>

              {/* Main heading */}
              <motion.div variants={fadeUp}>
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4"
                  style={{
                    background: `linear-gradient(${gradientOffset}deg, #ffffff, #ffffffcc, ${primaryColor}, ${accentColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {name}
                </h1>
              </motion.div>

              {/* Title */}
              <motion.p
                variants={fadeUp}
                className="text-xl md:text-2xl font-medium mb-4"
                style={{ color: primaryColor }}
              >
                {title}
              </motion.p>

              {/* Headline */}
              <motion.p variants={fadeUp} className="text-lg text-white/60 mb-8 max-w-lg leading-relaxed">
                {headline}
              </motion.p>

              {/* CTA buttons */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                      boxShadow: `0 8px 30px ${primaryColor}40`,
                    }}
                  >
                    <Mail className="w-4 h-4" />
                    Contact Me
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition-all border border-white/10"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {profile.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition-all border border-white/10"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
              </motion.div>
            </motion.div>

            {/* Right content - Profile card */}
            <motion.div
              variants={fadeIn}
              className="relative flex justify-center lg:justify-end"
            >
              <GlassCard hover={true} glow={true} className="p-8 w-full max-w-md">
                {/* Profile image or initials */}
                <div className="relative mb-6">
                  {profilePhoto ? (
                    <div
                      className="w-40 h-40 mx-auto rounded-2xl overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}40, ${accentColor}40)`,
                        boxShadow: `0 20px 60px ${primaryColor}30`,
                      }}
                    >
                      <img
                        src={profilePhoto}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-40 h-40 mx-auto rounded-2xl flex items-center justify-center text-5xl font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        boxShadow: `0 20px 60px ${primaryColor}30`,
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  {/* Floating badges */}
                  <motion.div
                    className="absolute -right-4 top-4 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-white/90">
                      <Sparkles className="w-3 h-3" style={{ color: primaryColor }} />
                      Premium
                    </div>
                  </motion.div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-1">
                      {profile.years_experience || '5'}+
                    </p>
                    <p className="text-xs text-white/50">Years</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-1">{allSkills.length || 12}+</p>
                    <p className="text-xs text-white/50">Skills</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-1">
                      {projects.length || 4}+
                    </p>
                    <p className="text-xs text-white/50">Projects</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── ABOUT SECTION ─────────────────────────────────────────────────────── */}
      {showSections?.about && (
        <SectionWrapper id="about" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  color: accentColor,
                }}
              >
                About Me
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Crafting Digital Excellence
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                A passionate technologist dedicated to building scalable, performant, and user-centric solutions that make a real impact.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bio card */}
              <GlassCard hover={true} className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)`,
                    }}
                  >
                    <Layers className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Background</h3>
                    <p className="text-white/50 text-sm">Professional journey</p>
                  </div>
                </div>
                <p className="text-white/70 leading-relaxed mb-6">{bio}</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: Code2, label: 'Clean Code' },
                    { icon: Server, label: 'Scalable Systems' },
                    { icon: Cloud, label: 'Cloud Native' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-sm text-white/70"
                    >
                      <Icon className="w-4 h-4" style={{ color: accentColor }} />
                      {label}
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Quick facts */}
              <GlassCard hover={true} className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}30, ${primaryColor}30)`,
                    }}
                  >
                    <Zap className="w-6 h-6" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Key Strengths</h3>
                    <p className="text-white/50 text-sm">What sets me apart</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Full-Stack Development', value: 'React, Node.js, Python, Go' },
                    { label: 'Cloud & DevOps', value: 'AWS, GCP, Kubernetes, Terraform' },
                    { label: 'Database Systems', value: 'PostgreSQL, MongoDB, Redis' },
                    { label: 'System Design', value: 'Microservices, Event-driven architecture' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-white/50 text-sm">{label}</span>
                      <span className="text-white text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ── SKILLS SECTION ────────────────────────────────────────────────────── */}
      {showSections?.skills && allSkills.length > 0 && (
        <SectionWrapper id="skills" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{
                  background: `${primaryColor}20`,
                  border: `1px solid ${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                Technical Skills
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Technology Stack
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                A comprehensive toolkit spanning languages, frameworks, and infrastructure technologies.
              </p>
            </motion.div>

            {/* Languages */}
            {languages.length > 0 && (
              <motion.div variants={fadeUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Code2 className="w-5 h-5" style={{ color: primaryColor }} />
                  <h3 className="text-xl font-semibold text-white">Languages</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {languages.map((skill, i) => (
                    <SkillBadge key={skill} name={skill} color={primaryColor} delay={i * 0.05} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Frameworks */}
            {frameworks.length > 0 && (
              <motion.div variants={fadeUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Database className="w-5 h-5" style={{ color: accentColor }} />
                  <h3 className="text-xl font-semibold text-white">Frameworks & Libraries</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {frameworks.map((skill, i) => (
                    <SkillBadge key={skill} name={skill} color={accentColor} delay={i * 0.05} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tools */}
            {tools.length > 0 && (
              <motion.div variants={fadeUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Server className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                  <h3 className="text-xl font-semibold text-white">Tools & Infrastructure</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {tools.map((skill, i) => (
                    <SkillBadge key={skill} name={skill} color="#8b5cf6" delay={i * 0.05} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Skills overview grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Languages', value: languages.length, color: primaryColor, icon: Code2 },
                { label: 'Frameworks', value: frameworks.length, color: accentColor, icon: Database },
                { label: 'Tools', value: tools.length, color: '#8b5cf6', icon: Server },
                { label: 'Experience', value: `${profile.years_experience || '5'}+`, color: '#10b981', icon: Star },
              ].map(({ label, value, color, icon: Icon }) => (
                <motion.div key={label} variants={scaleUp}>
                  <GlassCard hover={true} className="p-6 text-center">
                    <Icon className="w-6 h-6 mx-auto mb-3" style={{ color }} />
                    <p className="text-3xl font-bold text-white mb-1">{value}</p>
                    <p className="text-sm text-white/50">{label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ── PROJECTS SECTION ───────────────────────────────────────────────────── */}
      {showSections?.projects && projects.length > 0 && (
        <SectionWrapper id="projects" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  color: accentColor,
                }}
              >
                Portfolio
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Featured Projects
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                A selection of impactful projects showcasing technical expertise and problem-solving abilities.
              </p>
            </motion.div>

            {/* Projects grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, i) => {
                const proj = typeof project === 'string' ? { name: project, description: 'A showcase project', technologies: [], link: projectLink } : project
                return (
                  <ProjectCard
                    key={i}
                    name={proj.name}
                    description={proj.description}
                    technologies={proj.technologies}
                    link={proj.link}
                    index={i}
                    primaryColor={primaryColor}
                  />
                )
              })}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ── EXPERIENCE SECTION ────────────────────────────────────────────────── */}
      {showSections?.experience && companies.length > 0 && (
        <SectionWrapper id="experience" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{
                  background: `${primaryColor}20`,
                  border: `1px solid ${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                Career
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Work Experience
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                A track record of delivering high-impact solutions across diverse industries and technologies.
              </p>
            </motion.div>

            {/* Timeline */}
            <div className="space-y-6 max-w-3xl mx-auto">
              {experience.map((exp, i) => (
                <TimelineItem
                  key={i}
                  company={exp.company}
                  role={exp.role}
                  period={exp.period}
                  description={exp.description}
                  color={i === 0 ? primaryColor : accentColor}
                  index={i}
                />
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ── EDUCATION SECTION ───────────────────────────────────────────────── */}
      {showSections?.education && schools.length > 0 && (
        <SectionWrapper id="education" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  color: accentColor,
                }}
              >
                Formation
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Education
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                Academic foundation that laid the groundwork for technical excellence.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {schools.map((school, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <GlassCard hover={true} className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)`,
                        }}
                      >
                        <GraduationCap className="w-7 h-7" style={{ color: primaryColor }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-1">{school}</h3>
                        <p className="text-white/50 text-sm mb-2">{profile.education || 'Computer Science'}</p>
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <Calendar className="w-3 h-3" />
                          <span>2015 - 2019</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ── CERTIFICATIONS SECTION ────────────────────────────────────────────── */}
      {showSections?.certifications && (
        <SectionWrapper id="certifications" className="py-24 px-6">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{
                  background: `${primaryColor}20`,
                  border: `1px solid ${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                Credentials
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Certifications
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                Industry-recognized certifications validating technical expertise.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {certifications.map((cert, i) => (
                <CertBadge
                  key={i}
                  name={cert.name}
                  issuer={cert.issuer}
                  year={cert.year}
                  color={cert.color}
                />
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ── CONTACT SECTION ──────────────────────────────────────────────────── */}
      {showSections?.contact && (
        <SectionWrapper id="contact" className="py-24 px-6">
          <div className="mx-auto max-w-4xl">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  color: accentColor,
                }}
              >
                Get In Touch
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Let&apos;s Work Together
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                Ready to bring your vision to life? Let&apos;s connect and discuss how I can contribute to your team&apos;s success.
              </p>
            </motion.div>

            <ContactForm
              email={profile.email}
              linkedin={profile.linkedin}
              github={profile.github}
              portfolio={profile.portfolio}
            />
          </div>
        </SectionWrapper>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-white/5">
        <GlassCard hover={false} className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                }}
              >
                {initials}
              </div>
              <span className="text-white/70 text-sm">{name}</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/40">
              <span>&copy; {new Date().getFullYear()} All rights reserved</span>
              <span className="hidden md:block">|</span>
              <span className="hidden md:block">Built with JOBEZEE</span>
            </div>

            <div className="flex items-center gap-4">
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Linkedin className="w-4 h-4 text-white/50" />
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Github className="w-4 h-4 text-white/50" />
                </a>
              )}
            </div>
          </div>
        </GlassCard>
      </footer>

      {/* Custom CSS for additional effects */}
      <style>{`
        @keyframes gradientShift {
          0% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(20deg); }
          100% { filter: hue-rotate(0deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .glass-shine {
          position: relative;
          overflow: hidden;
        }

        .glass-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transition: left 0.5s;
        }

        .glass-shine:hover::before {
          left: 100%;
        }
      `}</style>
    </div>
  )
}
