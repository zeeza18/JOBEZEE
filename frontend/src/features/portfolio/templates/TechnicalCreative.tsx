import { motion, useScroll, useTransform } from 'framer-motion'
import { GraduationCap, Mail, Github, Linkedin, ExternalLink, Terminal, Code2, Database, Server, Cpu, Zap, Star, Award, Calendar, MapPin } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// ── Animation Variants ──────────────────────────────────────────────────────
// Type assertion for ease
const easeOut = 'easeOut' as const

const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } }
}
const stagger = { show: { transition: { staggerChildren: 0.1 } } }
const slideRight = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: easeOut } }
}

// ── Grid Background Component ────────────────────────────────────────────────
function GridOverlay({ opacity = 0.15 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,255,136,${opacity}) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,${opacity}) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)',
      }}
    />
  )
}

// ── Scanline Overlay ─────────────────────────────────────────────────────────
function ScanlineOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px)',
        zIndex: 1,
      }}
    />
  )
}

// ── Neon Glow Text ───────────────────────────────────────────────────────────
function NeonText({ children, className = '', glowColor = '#00ff88', glowIntensity = 'medium' }: {
  children: React.ReactNode
  className?: string
  glowColor?: string
  glowIntensity?: 'low' | 'medium' | 'high'
}) {
  const shadowSizes = { low: '0 0 10px', medium: '0 0 20px', high: '0 0 40px' }
  return (
    <span
      className={className}
      style={{
        textShadow: `${shadowSizes[glowIntensity]} ${glowColor}, ${shadowSizes[glowIntensity]} ${glowColor}`,
        filter: `drop-shadow(0 0 8px ${glowColor}80)`,
      }}
    >
      {children}
    </span>
  )
}

// ── Glitch Effect Component ─────────────────────────────────────────────────
function GlitchText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      whileHover={{
        x: [0, -2, 2, -1, 0],
        transition: { duration: 0.3, times: [0, 0.25, 0.5, 0.75, 1] }
      }}
      style={{
        textShadow: '0 0 20px rgba(0,255,136,0.5)',
      }}
    >
      {children}
    </motion.span>
  )
}

// ── Typing Cursor ─────────────────────────────────────────────────────────────
function TypingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-5 bg-green-400 ml-1"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
      style={{ boxShadow: '0 0 8px rgba(0,255,136,0.8)' }}
    />
  )
}

// ── Floating Terminal Window ────────────────────────────────────────────────
function TerminalWindow({ delay = 0, className = '' }: { delay?: number; className?: string }) {
  return (
    <motion.div
      className={`absolute bg-[#0d0d1a] border border-[#00ff8840] rounded-lg overflow-hidden ${className}`}
      initial={{ y: 20, opacity: 0, rotateX: 10 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,255,136,0.2)' }}
      style={{ boxShadow: '0 0 20px rgba(0,255,136,0.1)' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-[#12122a] border-b border-[#00ff8820]">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-2 text-xs font-mono text-[#00ff8880]">terminal</span>
      </div>
      <div className="p-4 font-mono text-sm">
        <p className="text-[#00ff88]">$ whoami</p>
        <motion.p
          className="text-[#e0e0ff]"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[#ff00ff]">const</span> developer = <span className="text-yellow-400">await</span> learn();
        </motion.p>
      </div>
    </motion.div>
  )
}

// ── Neon Card ────────────────────────────────────────────────────────────────
function NeonCard({ children, className = '', glowColor = '#00ff88', onHover = true }: {
  children: React.ReactNode
  className?: string
  glowColor?: string
  onHover?: boolean
}) {
  return (
    <motion.div
      className={`relative bg-[#0d0d1a] border border-[${glowColor}30] rounded-lg overflow-hidden ${className}`}
      whileHover={onHover ? {
        scale: 1.02,
        boxShadow: `0 0 30px ${glowColor}40, 0 0 60px ${glowColor}20`,
        borderColor: `${glowColor}60`
      } : {}}
      style={{
        boxShadow: `0 0 15px ${glowColor}15, inset 0 0 30px ${glowColor}05`,
        borderColor: `${glowColor}30`,
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50" style={{ color: glowColor }} />
      {children}
    </motion.div>
  )
}

// ── Skill Bar ────────────────────────────────────────────────────────────────
function SkillBar({ name, level, index, color }: { name: string; level: number; index: number; color: string }) {
  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-sm text-[#e0e0ff]">{name}</span>
        <span className="font-mono text-xs" style={{ color }}>{level}%</span>
      </div>
      <div className="h-2 bg-[#0a0a1a] rounded overflow-hidden relative">
        <motion.div
          className="h-full rounded relative"
          initial={{ width: 0 }}
          whileInView={{ width: `${level}%` }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}80)`,
            boxShadow: `0 0 10px ${color}60`,
          }}
        >
          <div className="absolute top-0 right-0 w-1 h-full bg-white opacity-80" style={{ boxShadow: `0 0 8px ${color}` }} />
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Timeline Node ────────────────────────────────────────────────────────────
function TimelineNode({ isLast = false }: { isLast?: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        className="w-4 h-4 rounded-full border-2 border-[#00ff88] z-10"
        whileHover={{ scale: 1.5, boxShadow: '0 0 20px rgba(0,255,136,0.6)' }}
        style={{ background: '#0a0a1a', boxShadow: '0 0 10px rgba(0,255,136,0.4)' }}
      />
      {!isLast && (
        <div className="w-0.5 h-full absolute top-4" style={{ background: 'linear-gradient(180deg, #00ff8840, transparent)' }} />
      )}
    </div>
  )
}

// ── Circuit Traces ────────────────────────────────────────────────────────────
function CircuitTraces() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ff88" />
          <stop offset="100%" stopColor="#ff00ff" />
        </linearGradient>
      </defs>
      {/* Horizontal traces */}
      <motion.line x1="0%" y1="20%" x2="80%" y2="20%" stroke="url(#circuitGradient)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.line x1="20%" y1="50%" x2="100%" y2="50%" stroke="url(#circuitGradient)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.line x1="0%" y1="80%" x2="60%" y2="80%" stroke="url(#circuitGradient)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, repeat: Infinity }}
      />
      {/* Nodes */}
      <motion.circle cx="80%" cy="20%" r="3" fill="#00ff88"
        animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle cx="100%" cy="50%" r="3" fill="#ff00ff"
        animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle cx="60%" cy="80%" r="3" fill="#00ff88"
        animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
      />
    </svg>
  )
}

// ── Matrix Rain Decoration ───────────────────────────────────────────────────
function MatrixRain() {
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'
  return (
    <div className="absolute right-0 top-0 h-full w-32 overflow-hidden pointer-events-none opacity-10">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="font-mono text-xs text-[#00ff88] leading-none"
          initial={{ y: -100, opacity: 1 }}
          animate={{ y: '100vh', opacity: [1, 0] }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'linear'
          }}
          style={{ position: 'absolute', left: `${i * 5}%` }}
        >
          {chars[Math.floor(Math.random() * chars.length)]}
        </motion.div>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function TechnicalCreative({ profile, primaryColor = '#00ff88', accentColor = '#ff00ff', showSections }: PortfolioTemplateProps) {
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 150])

  // Extract profile data
  const name = profile.full_name || profile.preferred_name || 'Developer'
  const title = profile.current_job_title || profile.target_role || 'Full Stack Developer'
  const headline = profile.headline || 'Building the future, one commit at a time'
  const bio = profile.headline || 'Passionate developer with a love for clean code, innovative solutions, and pixel-perfect interfaces.'
  const email = profile.email || ''
  const github = profile.github || ''
  const linkedin = profile.linkedin || ''

  // Skills aggregation
  const allSkills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || []),
  ]
  const languages = profile.skills_languages || []
  const frameworks = profile.skills_frameworks || []
  const tools = profile.skills_tools || []

  // Experience & Education
  const companies = profile.resume_facts_companies || []
  const projects = profile.resume_facts_projects || []
  const schools = profile.resume_facts_schools || []
  const metrics = profile.resume_facts_metrics || []

  // Certifications (placeholder - extend UserProfile if needed)
  const certifications: string[] = []

  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  // Generate random skill levels for demo (in real use, these would come from profile)
  const skillLevels = languages.map(() => 70 + Math.floor(Math.random() * 30))
  const frameworkLevels = frameworks.map(() => 60 + Math.floor(Math.random() * 35))
  const toolLevels = tools.map(() => 65 + Math.floor(Math.random() * 30))

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#0a0a1a', color: '#e0e0ff', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
          75% { opacity: 0.95; }
        }

        .glitch-effect:hover {
          animation: glitch 0.3s ease-in-out;
        }

        .flicker {
          animation: flicker 3s ease-in-out infinite;
        }
      `}</style>

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          background: 'rgba(10,10,26,0.85)',
          borderBottom: '1px solid rgba(0,255,136,0.15)',
          boxShadow: '0 0 30px rgba(0,255,136,0.1)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                boxShadow: `0 0 20px ${primaryColor}60`,
              }}
            >
              <span className="text-white">{initials}</span>
            </div>
            <div>
              <span className="font-bold text-white text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>{name.split(' ')[0]}</span>
              <span className="text-xs text-[#8888aa] block">portfolio_v2.0</span>
            </div>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {['About', 'Skills', 'Projects', 'Experience', 'Education', 'Contact'].map((item, i) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-[#8888aa] hover:text-white transition-colors relative group"
                whileHover={{ y: -2 }}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span className="text-xs mr-1 opacity-50">0{i + 1}.</span>
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ background: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }} />
              </motion.a>
            ))}
          </div>

          <motion.a
            href={`mailto:${email}`}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              boxShadow: `0 0 20px ${primaryColor}40`,
            }}
            whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${primaryColor}60` }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>./contact</span>
          </motion.a>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <motion.section
        id="about"
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
        style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #0f0f23 50%, #0a0a1a 100%)' }}
      >
        {/* Background Elements */}
        <GridOverlay opacity={0.08} />
        <ScanlineOverlay />
        <CircuitTraces />
        <MatrixRain />

        {/* Animated Grid Lines */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            backgroundPosition: ['0px 0px', '60px 60px'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,136,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,136,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating Terminals */}
        <TerminalWindow delay={0.5} className="top-32 left-[10%] hidden lg:block" />
        <TerminalWindow delay={0.7} className="top-48 right-[15%] hidden lg:block" />
        <TerminalWindow delay={0.9} className="bottom-32 left-[20%] hidden xl:block" />

        {/* Hero Content */}
        <motion.div
          className="relative z-10 text-center px-6 max-w-5xl mx-auto"
          style={{ y: heroY }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              background: `${primaryColor}10`,
              borderColor: `${primaryColor}40`,
              boxShadow: `0 0 20px ${primaryColor}20`,
            }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-sm font-medium" style={{ color: primaryColor, fontFamily: "'JetBrains Mono', monospace" }}>
              System Online & Ready
            </span>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-8xl lg:text-9xl font-black mb-6 leading-none"
            style={{ fontFamily: "'Syne', sans-serif" }}
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <GlitchText className="block text-white">{name}</GlitchText>
            <motion.span
              className="block"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 30px rgba(0,255,136,0.5))',
              }}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              {title}
            </motion.span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-[#8888aa] max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {headline}
            <TypingCursor />
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
          >
            {github && (
              <motion.a
                href={github}
                target="_blank"
                rel="noreferrer"
                className="group px-6 py-3 rounded-lg border font-semibold text-sm flex items-center gap-2 transition-all"
                style={{
                  background: 'rgba(0,255,136,0.05)',
                  borderColor: `${primaryColor}40`,
                  color: primaryColor,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: `0 0 30px ${primaryColor}40`,
                  borderColor: primaryColor,
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="w-4 h-4" />
                GitHub
                <span className="opacity-50 group-hover:opacity-100 transition-opacity">↗</span>
              </motion.a>
            )}
            {linkedin && (
              <motion.a
                href={linkedin}
                target="_blank"
                rel="noreferrer"
                className="group px-6 py-3 rounded-lg border font-semibold text-sm flex items-center gap-2 transition-all"
                style={{
                  background: 'rgba(255,0,255,0.05)',
                  borderColor: `${accentColor}40`,
                  color: accentColor,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: `0 0 30px ${accentColor}40`,
                  borderColor: accentColor,
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
                <span className="opacity-50 group-hover:opacity-100 transition-opacity">↗</span>
              </motion.a>
            )}
            <motion.a
              href="#contact"
              className="px-6 py-3 rounded-lg font-semibold text-sm flex items-center gap-2 text-white transition-all"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                boxShadow: `0 0 20px ${primaryColor}40`,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${primaryColor}60` }}
              whileTap={{ scale: 0.95 }}
            >
              ./hire_me
            </motion.a>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <motion.div
              className="w-6 h-10 rounded-full border-2 flex justify-center pt-2"
              style={{ borderColor: `${primaryColor}60` }}
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.div
                className="w-1.5 h-3 rounded-full"
                style={{ background: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }}
                animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Decorative Corner Elements */}
        <motion.div
          className="absolute top-20 left-6 w-20 h-20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="w-full h-full border-l-2 border-t-2" style={{ borderColor: `${primaryColor}40` }} />
          <div className="w-full h-full border-l-2 border-t-2 mt-2" style={{ borderColor: `${accentColor}40` }} />
        </motion.div>
        <motion.div
          className="absolute bottom-20 right-6 w-20 h-20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <div className="w-full h-full border-r-2 border-b-2 ml-auto" style={{ borderColor: `${primaryColor}40` }} />
          <div className="w-full h-full border-r-2 border-b-2 ml-auto mt-2" style={{ borderColor: `${accentColor}40` }} />
        </motion.div>
      </motion.section>

      {/* ABOUT SECTION */}
      {showSections.about && (
        <motion.section
          className="relative py-32 px-6 overflow-hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #0f0f23 100%)' }} />
          <GridOverlay opacity={0.05} />
          <ScanlineOverlay />

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div variants={fadeUp} className="mb-16 flex items-center gap-4">
              <div className="w-2 h-12 rounded-full" style={{ background: `linear-gradient(180deg, ${primaryColor}, ${accentColor})`, boxShadow: `0 0 20px ${primaryColor}` }} />
              <h2 className="text-5xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                <NeonText glowColor={primaryColor}>About</NeonText>
                <span className="text-[#8888aa] ml-4">Me</span>
              </h2>
              <div className="flex-1 h-px ml-4" style={{ background: `linear-gradient(90deg, ${primaryColor}40, transparent)` }} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: Bio */}
              <motion.div variants={fadeUp}>
                <NeonCard glowColor={primaryColor} className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Terminal className="w-5 h-5" style={{ color: primaryColor }} />
                    <span className="text-sm font-mono" style={{ color: primaryColor }}>bio.md</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-lg leading-relaxed text-[#e0e0ff]">
                      {bio}
                    </p>
                    {profile.years_experience && (
                      <p className="text-[#8888aa]">
                        <span className="font-mono" style={{ color: primaryColor }}>{profile.years_experience}+</span> years of hands-on experience in building scalable applications.
                      </p>
                    )}
                    {profile.city && (
                      <p className="text-[#8888aa]">
                        <MapPin className="w-4 h-4 inline mr-2" style={{ color: accentColor }} />
                        <span className="font-mono">{[profile.city, profile.state].filter(Boolean).join(', ')}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-6 flex items-center gap-2">
                    <span className="text-[#8888aa] font-mono">$</span>
                    <TypingCursor />
                  </div>
                </NeonCard>
              </motion.div>

              {/* Right: Stats Grid */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Years Experience', value: profile.years_experience || '—', icon: Calendar, color: primaryColor },
                  { label: 'Projects Shipped', value: projects.length || '—', icon: Code2, color: accentColor },
                  { label: 'Companies', value: companies.length || '—', icon: Server, color: primaryColor },
                  { label: 'Skills Mastered', value: allSkills.length || '—', icon: Zap, color: accentColor },
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${stat.color}30` }}
                  >
                    <NeonCard glowColor={stat.color} className="p-6 text-center">
                      <stat.icon className="w-8 h-8 mx-auto mb-3" style={{ color: stat.color, filter: `drop-shadow(0 0 10px ${stat.color})` }} />
                      <p className="text-3xl font-black mb-1" style={{ color: stat.color, fontFamily: "'Syne', sans-serif" }}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-[#8888aa] font-mono uppercase tracking-wider">{stat.label}</p>
                    </NeonCard>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.section>
      )}

      {/* SKILLS SECTION */}
      {showSections.skills && allSkills.length > 0 && (
        <motion.section
          id="skills"
          className="relative py-32 px-6 overflow-hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="absolute inset-0" style={{ background: '#0f0f23' }} />
          <GridOverlay opacity={0.1} />

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div variants={fadeUp} className="mb-16 text-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <Cpu className="w-6 h-6" style={{ color: primaryColor, filter: `drop-shadow(0 0 10px ${primaryColor})` }} />
                <span className="text-sm font-mono" style={{ color: primaryColor }}>skills.config</span>
              </div>
              <h2 className="text-5xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                Tech <NeonText glowColor={primaryColor}>Stack</NeonText>
              </h2>
              <p className="text-[#8888aa] mt-4 max-w-xl mx-auto">
                The weapons I wield to build extraordinary things
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Languages */}
              {languages.length > 0 && (
                <motion.div variants={slideRight}>
                  <NeonCard glowColor={primaryColor} className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-8 rounded-full" style={{ background: primaryColor, boxShadow: `0 0 15px ${primaryColor}` }} />
                      <h3 className="font-bold text-white uppercase tracking-widest text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Languages
                      </h3>
                    </div>
                    {languages.map((skill, i) => (
                      <SkillBar key={skill} name={skill} level={skillLevels[i] || 80} index={i} color={primaryColor} />
                    ))}
                  </NeonCard>
                </motion.div>
              )}

              {/* Frameworks */}
              {frameworks.length > 0 && (
                <motion.div variants={slideRight} transition={{ delay: 0.1 }}>
                  <NeonCard glowColor={accentColor} className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-8 rounded-full" style={{ background: accentColor, boxShadow: `0 0 15px ${accentColor}` }} />
                      <h3 className="font-bold text-white uppercase tracking-widest text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Frameworks
                      </h3>
                    </div>
                    {frameworks.map((skill, i) => (
                      <SkillBar key={skill} name={skill} level={frameworkLevels[i] || 75} index={i} color={accentColor} />
                    ))}
                  </NeonCard>
                </motion.div>
              )}

              {/* Tools */}
              {tools.length > 0 && (
                <motion.div variants={slideRight} transition={{ delay: 0.2 }}>
                  <NeonCard glowColor="#00ffff" className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-8 rounded-full" style={{ background: '#00ffff', boxShadow: '0 0 15px #00ffff' }} />
                      <h3 className="font-bold text-white uppercase tracking-widest text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Tools & DevOps
                      </h3>
                    </div>
                    {tools.map((skill, i) => (
                      <SkillBar key={skill} name={skill} level={toolLevels[i] || 70} index={i} color="#00ffff" />
                    ))}
                  </NeonCard>
                </motion.div>
              )}
            </div>

            {/* Skill Tags */}
            <motion.div variants={fadeUp} className="mt-12 text-center">
              <NeonCard glowColor={primaryColor} className="p-6 max-w-4xl mx-auto">
                <p className="text-sm text-[#8888aa] mb-4 font-mono">
                  <span style={{ color: primaryColor }}>$</span> grep "additional_skills" profile.json
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {allSkills.slice(0, 12).map((skill, i) => (
                    <motion.span
                      key={skill}
                      className="px-4 py-2 rounded-lg text-sm font-medium cursor-default"
                      style={{
                        background: `rgba(${i % 2 === 0 ? '0,255,136' : '255,0,255'}, 0.1)`,
                        border: `1px solid rgba(${i % 2 === 0 ? '0,255,136' : '255,0,255'}, 0.3)`,
                        color: i % 2 === 0 ? primaryColor : accentColor,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${i % 2 === 0 ? primaryColor : accentColor}40` }}
                    >
                      {skill}
                    </motion.span>
                  ))}
                  {allSkills.length > 12 && (
                    <span className="px-4 py-2 rounded-lg text-sm text-[#8888aa]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      +{allSkills.length - 12} more
                    </span>
                  )}
                </div>
              </NeonCard>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* PROJECTS SECTION */}
      {showSections.projects && projects.length > 0 && (
        <motion.section
          id="projects"
          className="relative py-32 px-6 overflow-hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #0a0a1a 100%)' }} />
          <GridOverlay opacity={0.08} />

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div variants={fadeUp} className="mb-16 text-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <Code2 className="w-6 h-6" style={{ color: accentColor, filter: `drop-shadow(0 0 10px ${accentColor})` }} />
                <span className="text-sm font-mono" style={{ color: accentColor }}>projects.index</span>
              </div>
              <h2 className="text-5xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
                <span className="text-white">Featured</span> <NeonText glowColor={accentColor}>Projects</NeonText>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ y: -10 }}
                  className="group cursor-pointer"
                >
                  <NeonCard glowColor={i % 2 === 0 ? primaryColor : accentColor} className="p-6 h-full">
                    {/* Project Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs" style={{ color: i % 2 === 0 ? primaryColor : accentColor }}>
                        P.{String(i + 1).padStart(2, '0')}
                      </span>
                      <motion.div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${i % 2 === 0 ? primaryColor : accentColor}20` }}
                        whileHover={{ rotate: 90 }}
                      >
                        <ExternalLink className="w-4 h-4" style={{ color: i % 2 === 0 ? primaryColor : accentColor }} />
                      </motion.div>
                    </div>

                    {/* Project Title */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#00ff88] transition-colors" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {project}
                    </h3>

                    <p className="text-[#8888aa] text-sm mb-6 line-clamp-3">
                      Built a scalable solution leveraging modern technologies to deliver exceptional user experience and performance.
                    </p>

                    {/* Tech Tags */}
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {(i % 2 === 0 ? languages : frameworks).slice(0, 3).map((tech) => (
                        <span
                          key={tech}
                          className="px-3 py-1 rounded text-xs font-mono"
                          style={{
                            background: `${i % 2 === 0 ? primaryColor : accentColor}10`,
                            color: i % 2 === 0 ? primaryColor : accentColor,
                            border: `1px solid ${i % 2 === 0 ? primaryColor : accentColor}30`,
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Glitch Effect on Hover */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `linear-gradient(135deg, ${i % 2 === 0 ? primaryColor : accentColor}05, transparent)`,
                        border: `1px solid ${i % 2 === 0 ? primaryColor : accentColor}40`,
                      }}
                    />
                  </NeonCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EXPERIENCE SECTION */}
      {showSections.experience && companies.length > 0 && (
        <motion.section
          id="experience"
          className="relative py-32 px-6 overflow-hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="absolute inset-0" style={{ background: '#0a0a1a' }} />
          <CircuitTraces />
          <GridOverlay opacity={0.06} />

          <div className="max-w-6xl mx-auto relative z-10">
            <motion.div variants={fadeUp} className="mb-16 text-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <Database className="w-6 h-6" style={{ color: primaryColor, filter: `drop-shadow(0 0 10px ${primaryColor})` }} />
                <span className="text-sm font-mono" style={{ color: primaryColor }}>career.log</span>
              </div>
              <h2 className="text-5xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
                Work <NeonText glowColor={primaryColor}>Experience</NeonText>
              </h2>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {companies.map((company, i) => (
                <motion.div
                  key={i}
                  variants={slideRight}
                  className="relative pl-12 pb-12"
                >
                  {/* Timeline Node */}
                  <div className="absolute left-0 top-0">
                    <TimelineNode isLast={i === companies.length - 1} />
                  </div>

                  {/* Content Card */}
                  <NeonCard glowColor={primaryColor} className="p-6 ml-6">
                    <div className="flex items-start gap-4">
                      <motion.div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}20, ${accentColor}20)`,
                          border: `1px solid ${primaryColor}40`,
                          color: primaryColor,
                          fontFamily: "'Syne', sans-serif",
                          boxShadow: `0 0 20px ${primaryColor}20`,
                        }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        {company.slice(0, 1).toUpperCase()}
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>{company}</h3>
                        <p className="text-sm mb-3" style={{ color: primaryColor, fontFamily: "'JetBrains Mono', monospace" }}>
                          Software Engineer
                        </p>
                        <div className="space-y-2">
                          {(metrics.slice(i * 2, i * 2 + 2) || []).map((metric, j) => (
                            <motion.p
                              key={j}
                              className="text-[#8888aa] text-sm flex items-start gap-3"
                              initial={{ opacity: 0, x: -10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: j * 0.1 }}
                            >
                              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }} />
                              {metric}
                            </motion.p>
                          ))}
                        </div>
                      </div>
                      <div
                        className="px-3 py-1 rounded-full text-xs font-mono shrink-0"
                        style={{
                          background: `${primaryColor}15`,
                          border: `1px solid ${primaryColor}30`,
                          color: primaryColor,
                        }}
                      >
                        #{String(i + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </NeonCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* EDUCATION SECTION */}
      {showSections.education && schools.length > 0 && (
        <motion.section
          id="education"
          className="relative py-32 px-6 overflow-hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #0f0f23 100%)' }} />
          <GridOverlay opacity={0.05} />

          <div className="max-w-6xl mx-auto relative z-10">
            <motion.div variants={fadeUp} className="mb-16 text-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <GraduationCap className="w-6 h-6" style={{ color: accentColor, filter: `drop-shadow(0 0 10px ${accentColor})` }} />
                <span className="text-sm font-mono" style={{ color: accentColor }}>education.dat</span>
              </div>
              <h2 className="text-5xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
                <span className="text-white">Academic</span> <NeonText glowColor={accentColor}>Background</NeonText>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {schools.map((school, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ scale: 1.02 }}
                  className="group"
                >
                  <NeonCard glowColor={accentColor} className="p-6 relative overflow-hidden">
                    {/* Glowing Corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 opacity-50 group-hover:opacity-100 transition-opacity" style={{ borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 opacity-50 group-hover:opacity-100 transition-opacity" style={{ borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 opacity-50 group-hover:opacity-100 transition-opacity" style={{ borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 opacity-50 group-hover:opacity-100 transition-opacity" style={{ borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />

                    <div className="flex items-center gap-4">
                      <motion.div
                        className="w-16 h-16 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}20, ${accentColor}20)`,
                          border: `1px solid ${accentColor}30`,
                        }}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <GraduationCap className="w-8 h-8" style={{ color: accentColor, filter: `drop-shadow(0 0 10px ${accentColor})` }} />
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{school}</h3>
                        <p className="text-sm text-[#8888aa]">{profile.education || 'Computer Science'}</p>
                      </div>
                    </div>
                  </NeonCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* CERTIFICATIONS SECTION */}
      {showSections.certifications && certifications.length > 0 && (
        <motion.section
          className="relative py-32 px-6 overflow-hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="absolute inset-0" style={{ background: '#0f0f23' }} />
          <GridOverlay opacity={0.06} />

          <div className="max-w-6xl mx-auto relative z-10">
            <motion.div variants={fadeUp} className="mb-16 text-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <Award className="w-6 h-6" style={{ color: '#ffd700', filter: 'drop-shadow(0 0 10px #ffd700)' }} />
                <span className="text-sm font-mono" style={{ color: '#ffd700' }}>certifications.json</span>
              </div>
              <h2 className="text-5xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
                <NeonText glowColor="#ffd700" glowIntensity="low">Certifications</NeonText>
              </h2>
            </motion.div>

            {/* Neon Badge Row */}
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
              {certifications.map((cert, i) => (
                <motion.div
                  key={i}
                  className="group px-6 py-4 rounded-xl flex items-center gap-3 cursor-default"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05))',
                    border: '1px solid rgba(255,215,0,0.3)',
                    boxShadow: '0 0 15px rgba(255,215,0,0.1)',
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 0 30px rgba(255,215,0,0.3)',
                    borderColor: 'rgba(255,215,0,0.6)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Star className="w-5 h-5 text-[#ffd700]" style={{ filter: 'drop-shadow(0 0 8px #ffd700)' }} />
                  <span className="text-sm font-semibold text-white">{cert}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* CONTACT SECTION */}
      {showSections.contact && (
        <motion.section
          id="contact"
          className="relative py-32 px-6 overflow-hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #0a0a1a 100%)' }} />
          <GridOverlay opacity={0.1} />
          <CircuitTraces />

          <div className="max-w-3xl mx-auto relative z-10">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-6">
                <Terminal className="w-6 h-6" style={{ color: primaryColor, filter: `drop-shadow(0 0 10px ${primaryColor})` }} />
                <span className="text-sm font-mono" style={{ color: primaryColor }}>contact.sh</span>
              </div>
              <h2 className="text-5xl font-black mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                Let&apos;s <NeonText glowColor={primaryColor}>Connect</NeonText>
              </h2>
              <p className="text-[#8888aa] max-w-lg mx-auto">
                Got a project in mind or just want to chat? Drop me a message and let&apos;s build something amazing together.
              </p>
            </motion.div>

            {/* Terminal-style Form */}
            <motion.div variants={fadeUp}>
              <NeonCard glowColor={primaryColor} className="p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: `${primaryColor}30` }}>
                  <Terminal className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="text-sm font-mono" style={{ color: primaryColor }}>message_compose</span>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-mono mb-2" style={{ color: primaryColor }}>
                      $ name
                    </label>
                    <div className="bg-[#0a0a1a] rounded-lg px-4 py-3 border" style={{ borderColor: `${primaryColor}30` }}>
                      <span className="text-white font-semibold">{name}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono mb-2" style={{ color: primaryColor }}>
                      $ email
                    </label>
                    <div className="bg-[#0a0a1a] rounded-lg px-4 py-3 border flex items-center gap-2" style={{ borderColor: `${primaryColor}30` }}>
                      <Mail className="w-4 h-4" style={{ color: primaryColor }} />
                      <a href={`mailto:${email}`} className="text-[#00ff88] hover:underline">{email}</a>
                      <TypingCursor />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono mb-2" style={{ color: primaryColor }}>
                      $ message_preview
                    </label>
                    <div className="bg-[#0a0a1a] rounded-lg px-4 py-3 border min-h-[100px]" style={{ borderColor: `${primaryColor}30` }}>
                      <p className="text-[#8888aa]">Your message will appear here...</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[#8888aa] font-mono">$</span>
                        <TypingCursor />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                  {email && (
                    <motion.a
                      href={`mailto:${email}`}
                      className="px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-3 text-white transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        boxShadow: `0 0 30px ${primaryColor}40`,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      whileHover={{ scale: 1.05, boxShadow: `0 0 50px ${primaryColor}60` }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Mail className="w-5 h-5" />
                      Send Message
                    </motion.a>
                  )}

                  <div className="flex gap-4">
                    {github && (
                      <motion.a
                        href={github}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-4 rounded-xl border font-semibold text-sm flex items-center gap-2 transition-all"
                        style={{
                          borderColor: `${primaryColor}50`,
                          color: primaryColor,
                          background: `${primaryColor}10`,
                        }}
                        whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${primaryColor}30` }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Github className="w-5 h-5" />
                        GitHub
                      </motion.a>
                    )}
                    {linkedin && (
                      <motion.a
                        href={linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-4 rounded-xl border font-semibold text-sm flex items-center gap-2 transition-all"
                        style={{
                          borderColor: `${accentColor}50`,
                          color: accentColor,
                          background: `${accentColor}10`,
                        }}
                        whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${accentColor}30` }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Linkedin className="w-5 h-5" />
                        LinkedIn
                      </motion.a>
                    )}
                  </div>
                </div>
              </NeonCard>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* FOOTER */}
      <footer
        className="relative py-12 px-6 overflow-hidden"
        style={{ background: '#0a0a1a', borderTop: `1px solid ${primaryColor}20` }}
      >
        <GridOverlay opacity={0.03} />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  boxShadow: `0 0 15px ${primaryColor}40`,
                }}
              >
                <span className="text-white">{initials}</span>
              </div>
              <div>
                <span className="font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{name}</span>
                <span className="text-xs text-[#8888aa] block font-mono">v2.0.26 — Made with <span style={{ color: primaryColor }}>&lt;/&gt;</span></span>
              </div>
            </motion.div>

            <motion.div
              className="flex items-center gap-6 text-[#8888aa] text-sm font-mono"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <span>© {new Date().getFullYear()} All Rights Reserved</span>
              <span style={{ color: primaryColor }}>|</span>
              <span className="text-[#00ff88]">STATUS: ONLINE</span>
              <motion.span
                className="w-2 h-2 rounded-full"
                style={{ background: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <motion.div
              className="flex gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              {github && (
                <motion.a
                  href={github}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-lg flex items-center justify-center border transition-all"
                  style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
                  whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${primaryColor}40`, borderColor: primaryColor }}
                >
                  <Github className="w-5 h-5" />
                </motion.a>
              )}
              {linkedin && (
                <motion.a
                  href={linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-lg flex items-center justify-center border transition-all"
                  style={{ borderColor: `${accentColor}40`, color: accentColor }}
                  whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${accentColor}40`, borderColor: accentColor }}
                >
                  <Linkedin className="w-5 h-5" />
                </motion.a>
              )}
            </motion.div>
          </div>

          {/* Bottom decorative bar */}
          <motion.div
            className="mt-8 h-px w-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${primaryColor}40, ${accentColor}40, transparent)`,
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </footer>
    </div>
  )
}