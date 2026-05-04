import { motion, useScroll, useTransform } from 'framer-motion'
import { Mail, Github, Linkedin, MapPin, Calendar, Award, Code2, Sparkles, Send, Heart, Star, Zap, Rocket, Target, Briefcase, GraduationCap, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PortfolioTemplateProps } from '../types'

// placeholder

// ── Rainbow Particles Component ───────────────────────────────────────────────
interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  duration: number
  delay: number
  type: 'circle' | 'square' | 'star' | 'triangle'
}

function RainbowParticles({ count = 30 }: { count?: number }) {
  const colors = ['#7c3aed', '#f472b6', '#fbbf24', '#06b6d4', '#10b981', '#f97316', '#ec4899']
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      type: ['circle', 'square', 'star', 'triangle'][Math.floor(Math.random() * 4)] as Particle['type']
    }))
    setParticles(newParticles)
  }, [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: particle.color,
            borderRadius: particle.type === 'circle' ? '50%' : particle.type === 'square' ? '2px' : '0',
            boxShadow: `0 0 20px ${particle.color}80`
          }}
          animate={{
            y: [-20, -100, -20],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

// ── Floating Shape Component ──────────────────────────────────────────────────
interface FloatingShapeProps {
  size?: number
  color?: string
  delay?: number
  duration?: number
  xRange?: number
  yRange?: number
  shape?: 'circle' | 'blob' | 'rounded'
}

function FloatingShape({
  size = 60,
  color = '#7c3aed',
  delay = 0,
  duration = 6,
  xRange = 20,
  yRange = 30,
  shape = 'circle'
}: FloatingShapeProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      animate={{
        y: [-yRange, yRange, -yRange],
        x: [-xRange / 2, xRange / 2, -xRange / 2],
        rotate: [0, 10, -10, 0],
        scale: [1, 1.1, 1]
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      style={{
        width: size,
        height: shape === 'circle' ? size : shape === 'blob' ? size * 0.8 : size * 0.6,
        borderRadius: shape === 'circle' ? '50%' : shape === 'blob' ? '60% 40% 50% 50%' : '30%',
        background: `linear-gradient(135deg, ${color}, ${color}80)`,
        boxShadow: `0 10px 40px ${color}40, inset 0 -5px 20px ${color}30`,
        filter: 'blur(1px)'
      }}
    />
  )
}

// ── Animated Gradient Background ──────────────────────────────────────────────
function AnimatedGradientBackground() {
  return (
    <>
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          25% { background-position: 100% 50%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
        }

        @keyframes gradientPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes blobMove {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(20px, 10px) scale(1.05); }
        }

        @keyframes rainbowText {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes bounce3d {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.02); }
        }

        @keyframes floatUp {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(-10px) rotate(-5deg); }
        }

        @keyframes spin3d {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
          50% { box-shadow: 0 0 40px currentColor, 0 0 80px currentColor; }
        }

        @keyframes borderGlow {
          0%, 100% { border-color: rgba(124, 58, 237, 0.3); }
          50% { border-color: rgba(244, 114, 182, 0.6); }
        }

        @keyframes ripple {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes progressFill {
          0% { stroke-dashoffset: 283; }
          100% { stroke-dashoffset: var(--target-offset); }
        }

        @keyframes dotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 currentColor; }
          50% { transform: scale(1.2); box-shadow: 0 0 0 8px transparent; }
        }

        @keyframes slideInWave {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes colorCycle {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-200px) rotate(720deg); opacity: 0; }
        }

        .gradient-animate {
          background-size: 400% 400%;
          animation: gradientShift 8s ease infinite;
        }

        .gradient-pulse {
          animation: gradientPulse 4s ease-in-out infinite;
        }

        .blob-animate {
          animation: blobMove 15s ease-in-out infinite;
        }

        .rainbow-text {
          background: linear-gradient(90deg, #7c3aed, #f472b6, #fbbf24, #06b6d4, #7c3aed);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rainbowText 4s linear infinite;
        }

        .bounce-3d {
          animation: bounce3d 2s ease-in-out infinite;
        }

        .float-up {
          animation: floatUp 4s ease-in-out infinite;
        }

        .glow-effect {
          animation: glow 2s ease-in-out infinite;
        }

        .border-glow {
          animation: borderGlow 3s ease-in-out infinite;
        }

        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }

        .progress-animate {
          animation: progressFill 1.5s ease-out forwards;
        }

        .dot-pulse {
          animation: dotPulse 2s ease-in-out infinite;
        }

        .color-cycle {
          animation: colorCycle 10s linear infinite;
        }
      `}</style>

      {/* Base gradient background */}
      <div
        className="absolute inset-0 gradient-animate"
        style={{
          background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 25%, #fce7f3 50%, #fef3c7 75%, #fdf4ff 100%)'
        }}
      />

      {/* Animated blob shapes */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-40"
        style={{ background: 'linear-gradient(135deg, #7c3aed40, #f472b680)' }}
        animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
        style={{ background: 'linear-gradient(135deg, #fbbf2440, #f472b660)' }}
        animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 0.95, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-35"
        style={{ background: 'linear-gradient(135deg, #06b6d440, #7c3aed60)' }}
        animate={{ x: [0, 30, 0], y: [0, 50, 0], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#7c3aed 1px, transparent 1px), linear-gradient(90deg, #7c3aed 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />
    </>
  )
}

// ── Circular Progress Component ───────────────────────────────────────────────
interface CircularProgressProps {
  value: number
  label: string
  color: string
  delay?: number
}

function _CircularProgress({ value, label, color, delay = 0 }: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (animatedValue / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, delay * 1000)
    return () => clearTimeout(timer)
  }, [value, delay])

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="relative w-28 h-28">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: offset }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: delay + 0.2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${color})`
            }}
          />
        </svg>
        {/* Center value */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.5 }}
        >
          <span className="text-2xl font-black" style={{ color }}>{animatedValue}%</span>
        </motion.div>
      </div>
      <span className="text-sm font-semibold text-indigo-900 text-center">{label}</span>
    </motion.div>
  )
}

// ── Gradient Card Component ───────────────────────────────────────────────────
interface GradientCardProps {
  children: React.ReactNode
  className?: string
  gradient?: string[]
  delay?: number
}

function GradientCard({ children, className = '', gradient = ['#7c3aed', '#f472b6'], delay = 0 }: GradientCardProps) {
  return (
    <motion.div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ duration: 0.5, delay }}
      style={{ '--gradient-colors': gradient.join(', ') } as React.CSSProperties}
    >
      {/* Animated border gradient */}
      <div
        className="absolute inset-0 rounded-2xl p-[2px]"
        style={{
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]}, ${gradient[2] || gradient[0]})`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '2px'
        }}
      />
      {/* Card content */}
      <div
        className="relative rounded-2xl bg-white/90 backdrop-blur-sm p-6"
        style={{ boxShadow: `0 4px 24px ${gradient[0]}20` }}
      >
        {children}
      </div>
    </motion.div>
  )
}

// ── Rainbow Button Component ───────────────────────────────────────────────────
interface RainbowButtonProps {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'secondary' | 'outline'
  icon?: React.ReactNode
  className?: string
}

function RainbowButton({ children, onClick, href, variant = 'primary', icon, className = '' }: RainbowButtonProps) {
  const baseClasses = 'relative inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95'

  const variants = {
    primary: 'text-white shadow-lg',
    secondary: 'bg-white/90 text-indigo-900 border-2 border-indigo-200',
    outline: 'bg-transparent text-indigo-900 border-2 border-indigo-300'
  }

  const content = (
    <>
      {variant === 'primary' && (
        <div
          className="absolute inset-0 gradient-animate opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #f472b6, #fbbf24, #7c3aed)' }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {children}
      </span>
    </>
  )

  if (href) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`${baseClasses} ${variants[variant]} ${className}`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {content}
    </motion.button>
  )
}

// ── Timeline Dot Component ────────────────────────────────────────────────────
interface TimelineDotProps {
  color?: string
  delay?: number
  isLast?: boolean
}

function TimelineDot({ color = '#7c3aed', delay = 0, isLast = false }: TimelineDotProps) {
  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, scale: 0 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <motion.div
        className="w-5 h-5 rounded-full border-4 border-white z-10"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}80)`,
          boxShadow: `0 0 20px ${color}60`
        }}
        animate={{
          scale: [1, 1.2, 1],
          boxShadow: [`0 0 20px ${color}60`, `0 0 40px ${color}80`, `0 0 20px ${color}60`]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay }}
      />
      {!isLast && (
        <motion.div
          className="w-1 flex-1 min-h-[80px]"
          style={{ background: `linear-gradient(180deg, ${color}60, transparent)` }}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: delay + 0.2 }}
        />
      )}
    </motion.div>
  )
}

// ── Skill Badge Component ─────────────────────────────────────────────────────
interface SkillBadgeProps {
  name: string
  color: string
  delay?: number
  index?: number
}

function SkillBadge({ name, color, delay = 0, index = 0 }: SkillBadgeProps) {
  return (
    <motion.span
      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.1, y: -2 }}
      transition={{ duration: 0.4, delay: delay + index * 0.05 }}
      style={{
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        border: `2px solid ${color}40`,
        color: color,
        boxShadow: `0 4px 12px ${color}20`
      }}
    >
      <motion.span
        className="w-2 h-2 rounded-full mr-2"
        style={{ background: color }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
      />
      {name}
    </motion.span>
  )
}

// ── Main Template Component ────────────────────────────────────────────────────
export default function TechnicalVibrant({ profile, primaryColor, accentColor, showSections, profilePhoto }: PortfolioTemplateProps) {
  // Extract profile data
  const name = profile.full_name || profile.preferred_name || 'Developer'
  const title = profile.current_job_title || profile.target_role || 'Software Engineer'
  const bio = profile.headline || `Passionate ${title} with expertise in building scalable applications and crafting exceptional user experiences.`
  const location = profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.city || 'Remote'
  const email = profile.email || ''
  const linkedin = profile.linkedin || ''
  const github = profile.github || ''

  // Skills
  const languages = profile.skills_languages || []
  const frameworks = profile.skills_frameworks || []
  const tools = profile.skills_tools || []
  const allSkills = [...languages, ...frameworks, ...tools]

  // Projects
  const projects = (profile.resume_facts_projects || []) as string[]

  // Companies (used for experience display)
  const companies = profile.resume_facts_companies || []

  // Schools (used for education display)
  const schools = profile.resume_facts_schools || []

  // Stats
  const yearsExp = profile.years_experience || 0
  const companiesCount = (profile.resume_facts_companies || []).length
  const skillsCount = allSkills.length

  // Theme colors
  const colors = {
    primary: primaryColor || '#7c3aed',
    secondary: accentColor || '#f472b6',
    accent: '#fbbf24',
    gradient: ['#7c3aed', '#f472b6', '#fbbf24', '#06b6d4'],
    background: '#fdf4ff',
    text: '#1e1b4b',
    textMuted: '#7c3aed'
  }

  // Scroll animation
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, 100])

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: colors.background,
        fontFamily: "'Poppins', sans-serif",
        color: colors.text
      }}
    >
      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

        * {
          scroll-behavior: smooth;
        }

        ::-webkit-scrollbar {
          width: 10px;
        }

        ::-webkit-scrollbar-track {
          background: #fdf4ff;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #7c3aed, #f472b6);
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #6d28d9, #ec4899);
        }
      `}</style>

      {/* ── HERO SECTION ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <AnimatedGradientBackground />
        <RainbowParticles count={40} />

        {/* Floating decorative shapes */}
        <FloatingShape size={80} color="#7c3aed" delay={0} duration={7} xRange={30} yRange={40} />
        <FloatingShape size={60} color="#f472b6" delay={1} duration={8} xRange={20} yRange={50} />
        <FloatingShape size={100} color="#fbbf24" delay={2} duration={9} xRange={40} yRange={30} />
        <FloatingShape size={50} color="#06b6d4" delay={0.5} duration={6} xRange={25} yRange={35} />
        <FloatingShape size={70} color="#10b981" delay={1.5} duration={10} xRange={35} yRange={45} />
        <FloatingShape size={40} color="#f97316" delay={3} duration={8} xRange={15} yRange={55} />

        {/* Floating geometric shapes */}
        <motion.div
          className="absolute top-1/4 left-[10%] w-16 h-16 border-4 border-dashed rounded-full"
          style={{ borderColor: '#7c3aed40' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-[15%] w-20 h-20"
          style={{
            background: 'linear-gradient(135deg, #f472b640, #fbbf2440)',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%'
          }}
          animate={{
            rotate: [0, 180, 360],
            borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '70% 30% 30% 70% / 70% 70% 30% 30%', '30% 70% 70% 30% / 30% 30% 70% 70%']
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Hero content */}
        <motion.div
          style={{ y: heroY }}
          className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 200 }}
            className="mb-8"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold mb-8"
              style={{
                background: 'linear-gradient(135deg, #7c3aed20, #f472b620)',
                border: '2px solid #7c3aed40',
                color: '#7c3aed'
              }}
              animate={{
                boxShadow: ['0 0 20px #7c3aed30', '0 0 40px #7c3aed50', '0 0 20px #7c3aed30']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: '#10b981' }}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              Available for opportunities
            </motion.div>
          </motion.div>

          {/* Name with rainbow animation */}
          <motion.h1
            className="text-6xl md:text-8xl font-black mb-6 leading-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.span
              className="block rainbow-text"
              animate={{
                textShadow: [
                  '0 0 40px #7c3aed80',
                  '0 0 60px #f472b680',
                  '0 0 40px #fbbf2480',
                  '0 0 60px #7c3aed80'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {name}
            </motion.span>
          </motion.h1>

          {/* Title with bouncing animation */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.h2
              className="text-2xl md:text-4xl font-bold"
              style={{ color: colors.secondary }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {title}
            </motion.h2>
          </motion.div>

          {/* Bio */}
          <motion.p
            className="text-lg md:text-xl text-indigo-800/80 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {bio}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <RainbowButton href={`mailto:${email}`} variant="primary" icon={<Mail size={18} />}>
              Get in Touch
            </RainbowButton>
            {linkedin && (
              <RainbowButton href={linkedin} variant="secondary" icon={<Linkedin size={18} />}>
                LinkedIn
              </RainbowButton>
            )}
            {github && (
              <RainbowButton href={github} variant="outline" icon={<Github size={18} />}>
                GitHub
              </RainbowButton>
            )}
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="grid grid-cols-3 gap-6 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            {[
              { label: 'Years Exp.', value: yearsExp || '—', icon: <TrendingUp size={20} /> },
              { label: 'Skills', value: skillsCount || '—', icon: <Code2 size={20} /> },
              { label: 'Companies', value: companiesCount || '—', icon: <Briefcase size={20} /> }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1, type: 'spring' }}
              >
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2"
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradient[index % colors.gradient.length]}20, ${colors.gradient[(index + 1) % colors.gradient.length]}20)`,
                    border: `2px solid ${colors.gradient[index % colors.gradient.length]}40`
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <span style={{ color: colors.gradient[index % colors.gradient.length] }}>{stat.icon}</span>
                </motion.div>
                <div
                  className="text-3xl font-black mb-1"
                  style={{
                    background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-xs font-medium text-indigo-600/70">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium text-indigo-600/60 uppercase tracking-wider">Scroll</span>
            <motion.div
              className="w-6 h-10 rounded-full border-2 border-indigo-300 flex items-start justify-center p-1.5"
              style={{ borderColor: '#7c3aed40' }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.primary }}
                animate={{ y: [0, 18, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── ABOUT SECTION ──────────────────────────────────────────────────── */}
      {showSections.about && (
        <section id="about" className="relative py-32 px-6 overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #fdf4ff 0%, #faf5ff 50%, #fdf4ff 100%)' }} />

          {/* Floating shapes */}
          <FloatingShape size={120} color="#f472b6" delay={0} duration={12} xRange={50} yRange={60} shape="blob" />
          <FloatingShape size={80} color="#fbbf24" delay={2} duration={10} xRange={40} yRange={50} shape="circle" />
          <FloatingShape size={60} color="#06b6d4" delay={1} duration={14} xRange={30} yRange={40} />

          <div className="relative z-10 max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
                style={{
                  background: `${colors.primary}15`,
                  color: colors.primary,
                  border: `2px solid ${colors.primary}30`
                }}
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles size={16} />
                About Me
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                <span className="rainbow-text">Passionate</span> About Technology
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Image/Visual */}
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <GradientCard gradient={[colors.primary, colors.secondary, colors.accent]}>
                  <div className="aspect-square rounded-xl overflow-hidden relative">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-8xl font-black"
                        style={{
                          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                    )}

                    {/* Decorative elements */}
                    <motion.div
                      className="absolute -top-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: colors.accent }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    >
                      <Star size={24} className="text-white fill-white" />
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-4 -left-4 w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: colors.secondary }}
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Zap size={20} className="text-white" />
                    </motion.div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 mt-4 text-indigo-700">
                    <MapPin size={16} />
                    <span className="text-sm font-medium">{location}</span>
                  </div>
                </GradientCard>
              </motion.div>

              {/* Right: Bio text */}
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <p className="text-lg text-indigo-800/80 leading-relaxed">
                  {bio}
                </p>

                {/* Highlights */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: <Rocket size={20} />, label: 'Fast Learner', color: colors.primary },
                    { icon: <Target size={20} />, label: 'Problem Solver', color: colors.secondary },
                    { icon: <Zap size={20} />, label: 'Quick Builder', color: colors.accent },
                    { icon: <Star size={20} />, label: 'Quality Focus', color: '#06b6d4' }
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      className="flex items-center gap-3 p-4 rounded-xl"
                      style={{
                        background: `${item.color}10`,
                        border: `2px solid ${item.color}30`
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                    >
                      <motion.div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: item.color }}
                        whileHover={{ rotate: 20 }}
                      >
                        <span className="text-white">{item.icon}</span>
                      </motion.div>
                      <span className="font-semibold text-indigo-900">{item.label}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Tech stack indicators */}
                <div className="pt-4">
                  <p className="text-sm font-semibold text-indigo-700 mb-3">Tech Stack</p>
                  <div className="flex flex-wrap gap-2">
                    {languages.slice(0, 5).map((lang, index) => (
                      <SkillBadge
                        key={lang}
                        name={lang}
                        color={colors.gradient[index % colors.gradient.length]}
                        delay={0.1}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ── SKILLS SECTION ─────────────────────────────────────────────────── */}
      {showSections.skills && allSkills.length > 0 && (
        <section id="skills" className="relative py-32 px-6 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}05 0%, ${colors.secondary}08 50%, ${colors.accent}05 100%)`
            }}
          />

          {/* Animated background blobs */}
          <motion.div
            className="absolute top-20 left-[5%] w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{ background: colors.primary }}
            animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
            transition={{ duration: 15, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-[5%] w-80 h-80 rounded-full blur-3xl opacity-15"
            style={{ background: colors.secondary }}
            animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, delay: 3 }}
          />

          <div className="relative z-10 max-w-6xl mx-auto">
            {/* Section header */}
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
                style={{
                  background: `${colors.secondary}15`,
                  color: colors.secondary,
                  border: `2px solid ${colors.secondary}30`
                }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Code2 size={16} />
                Skills & Expertise
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Technologies I <span className="rainbow-text">Master</span>
              </h2>
              <p className="text-indigo-700/70 max-w-xl mx-auto">
                Constantly learning and adapting to build better solutions
              </p>
            </motion.div>

            {/* Skills categories */}
            <div className="space-y-16">
              {/* Languages */}
              {languages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <motion.span
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Code2 size={20} className="text-white" />
                    </motion.span>
                    <span style={{ color: colors.primary }}>Programming Languages</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {languages.map((skill, index) => (
                      <motion.div
                        key={skill}
                        className="relative group"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                      >
                        <div
                          className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"
                          style={{ background: colors.gradient[index % colors.gradient.length] }}
                        />
                        <div
                          className="relative p-5 rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-indigo-100 text-center"
                          style={{
                            borderColor: `${colors.gradient[index % colors.gradient.length]}30`,
                            boxShadow: `0 4px 16px ${colors.gradient[index % colors.gradient.length]}15`
                          }}
                        >
                          <motion.div
                            className="text-2xl font-black mb-2"
                            style={{
                              background: `linear-gradient(135deg, ${colors.gradient[index % colors.gradient.length]}, ${colors.gradient[(index + 1) % colors.gradient.length]})`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent'
                            }}
                          >
                            {skill}
                          </motion.div>
                          <div
                            className="h-1 rounded-full mt-2"
                            style={{
                              background: `linear-gradient(90deg, ${colors.gradient[index % colors.gradient.length]}, ${colors.gradient[(index + 1) % colors.gradient.length]})`
                            }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Frameworks */}
              {frameworks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <motion.span
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})` }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Sparkles size={20} className="text-white" />
                    </motion.span>
                    <span style={{ color: colors.secondary }}>Frameworks & Libraries</span>
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {frameworks.map((skill, index) => (
                      <SkillBadge
                        key={skill}
                        name={skill}
                        color={colors.gradient[(index + 1) % colors.gradient.length]}
                        delay={0.1}
                        index={index}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tools */}
              {tools.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <motion.span
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})` }}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Award size={20} className="text-white" />
                    </motion.span>
                    <span style={{ color: colors.accent }}>Tools & Platforms</span>
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {tools.map((skill, index) => (
                      <SkillBadge
                        key={skill}
                        name={skill}
                        color={colors.gradient[(index + 2) % colors.gradient.length]}
                        delay={0.15}
                        index={index}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Skill stats visualization */}
            <motion.div
              className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {[
                { label: 'Languages', value: languages.length, color: colors.primary },
                { label: 'Frameworks', value: frameworks.length, color: colors.secondary },
                { label: 'Tools', value: tools.length, color: colors.accent },
                { label: 'Total Skills', value: allSkills.length, color: '#06b6d4' }
              ].map((stat, index) => (
                <GradientCard
                  key={stat.label}
                  gradient={[stat.color, `${stat.color}80`]}
                  delay={index * 0.1}
                  className="text-center p-6"
                >
                  <motion.div
                    className="text-4xl font-black mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${stat.color}, ${colors.gradient[(index + 1) % colors.gradient.length]})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', delay: index * 0.1 + 0.3 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-sm font-medium text-indigo-700/70">{stat.label}</div>
                </GradientCard>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── PROJECTS SECTION ───────────────────────────────────────────────── */}
      {showSections.projects && projects.length > 0 && (
        <section id="projects" className="relative py-32 px-6 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #fdf4ff 50%, #fae8ff 100%)' }}
          />

          {/* Floating decorations */}
          <FloatingShape size={100} color="#7c3aed" delay={0} duration={15} xRange={60} yRange={70} shape="blob" />
          <FloatingShape size={70} color="#f472b6" delay={2} duration={12} xRange={40} yRange={50} />
          <FloatingShape size={50} color="#fbbf24" delay={1} duration={18} xRange={30} yRange={40} shape="circle" />

          <div className="relative z-10 max-w-6xl mx-auto">
            {/* Section header */}
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
                style={{
                  background: `${colors.accent}15`,
                  color: '#d97706',
                  border: `2px solid ${colors.accent}30`
                }}
              >
                <Rocket size={16} />
                Featured Projects
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Things I've <span className="rainbow-text">Built</span>
              </h2>
              <p className="text-indigo-700/70 max-w-xl mx-auto">
                From concept to deployment, here are some highlights
              </p>
            </motion.div>

            {/* Projects grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {projects.map((project, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <GradientCard
                    gradient={[
                      colors.gradient[index % colors.gradient.length],
                      colors.gradient[(index + 1) % colors.gradient.length],
                      colors.gradient[(index + 2) % colors.gradient.length]
                    ]}
                    className="h-full"
                  >
                    {/* Project header */}
                    <div className="flex items-start justify-between mb-4">
                      <motion.div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${colors.gradient[index % colors.gradient.length]}, ${colors.gradient[(index + 1) % colors.gradient.length]})`
                        }}
                        whileHover={{ rotate: 10, scale: 1.1 }}
                      >
                        <Star size={24} className="text-white fill-white" />
                      </motion.div>

                                          </div>

                    <h3 className="text-xl font-bold text-indigo-900 mb-3">
                      {project}
                    </h3>

                    {/* Project description */}
                    <p className="text-indigo-700/70 text-sm leading-relaxed mb-4">
                      A showcase of my technical expertise and problem-solving abilities in building scalable solutions.
                    </p>

                    {/* Tech tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {languages.slice(0, 3).map((tech, i) => (
                        <span
                          key={tech}
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: `${colors.gradient[(index + i) % colors.gradient.length]}20`,
                            color: colors.gradient[(index + i) % colors.gradient.length]
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Project stats */}
                    <div className="flex items-center gap-4 pt-4 border-t border-indigo-100">
                      <div className="flex items-center gap-1.5">
                        <motion.div
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#10b981' }}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-xs font-medium text-indigo-600">Completed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium text-indigo-600">{Math.floor(Math.random() * 50 + 10)} Stars</span>
                      </div>
                    </div>
                  </GradientCard>
                </motion.div>
              ))}
            </div>

            {/* View more button */}
            {github && (
              <motion.div
                className="text-center mt-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <RainbowButton href={github} variant="outline" icon={<Github size={18} />}>
                  View All Projects on GitHub
                </RainbowButton>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ── EXPERIENCE SECTION ────────────────────────────────────────────── */}
      {showSections.experience && companies.length > 0 && (
        <section id="experience" className="relative py-32 px-6 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.secondary}05 50%, ${colors.accent}08 100%)` }}
          />

          {/* Floating decorations */}
          <motion.div
            className="absolute top-40 right-[10%] w-32 h-32 rounded-full blur-2xl opacity-20"
            style={{ background: colors.primary }}
            animate={{ y: [-20, 20, -20], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-40 left-[8%] w-40 h-40 rounded-full blur-2xl opacity-15"
            style={{ background: colors.secondary }}
            animate={{ y: [20, -20, 20], scale: [1.1, 1, 1.1] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          />

          <div className="relative z-10 max-w-5xl mx-auto">
            {/* Section header */}
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
                style={{
                  background: `${colors.primary}15`,
                  color: colors.primary,
                  border: `2px solid ${colors.primary}30`
                }}
              >
                <Briefcase size={16} />
                Work Experience
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                My Professional <span className="rainbow-text">Journey</span>
              </h2>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <motion.div
                className="absolute left-[27px] md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-2 rounded-full"
                style={{
                  background: `linear-gradient(180deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`
                }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5 }}
              />

              {/* Experience items */}
              {companies.map((company, index) => {
                const isLeft = index % 2 === 0
                return (
                  <motion.div
                    key={index}
                    className={`relative flex items-center gap-8 mb-12 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    {/* Timeline dot */}
                    <TimelineDot
                      color={colors.gradient[index % colors.gradient.length]}
                      delay={index * 0.1}
                    />

                    {/* Card */}
                    <div className={`flex-1 ${isLeft ? 'md:text-right' : 'md:text-left'} ml-4 md:ml-0`}>
                      <GradientCard
                        gradient={[
                          colors.gradient[index % colors.gradient.length],
                          colors.gradient[(index + 1) % colors.gradient.length]
                        ]}
                        delay={index * 0.1 + 0.2}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <motion.div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${colors.gradient[index % colors.gradient.length]}, ${colors.gradient[(index + 1) % colors.gradient.length]})`
                            }}
                            whileHover={{ rotate: 15, scale: 1.1 }}
                          >
                            <Briefcase size={20} className="text-white" />
                          </motion.div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-indigo-900">
                              {title}
                            </h3>
                            <p className="text-sm font-semibold" style={{ color: colors.gradient[index % colors.gradient.length] }}>
                              {typeof company === 'string' ? company : 'Company'}
                            </p>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar size={14} className="text-indigo-500" />
                          <span className="text-xs font-medium text-indigo-600/70">
                            {yearsExp ? `${yearsExp} years experience` : 'Present'}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-indigo-700/70 leading-relaxed">
                          Contributed to key projects and initiatives, collaborating with cross-functional teams to deliver high-impact solutions at {typeof company === 'string' ? company : 'this organization'}.
                        </p>

                        {/* Skills used */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {languages.slice(0, 4).map((skill, i) => (
                            <span
                              key={skill}
                              className="px-2 py-1 rounded-lg text-xs font-medium"
                              style={{
                                background: `${colors.gradient[(index + i) % colors.gradient.length]}20`,
                                color: colors.gradient[(index + i) % colors.gradient.length]
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </GradientCard>
                    </div>

                    {/* Empty space for alternating layout */}
                    <div className="hidden md:block flex-1" />
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── EDUCATION SECTION ─────────────────────────────────────────────── */}
      {showSections.education && schools.length > 0 && (
        <section id="education" className="relative py-32 px-6 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, #fdf4ff 0%, #faf5ff 50%, #fdf4ff 100%)' }}
          />

          <div className="relative z-10 max-w-5xl mx-auto">
            {/* Section header */}
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
                style={{
                  background: `${colors.secondary}15`,
                  color: colors.secondary,
                  border: `2px solid ${colors.secondary}30`
                }}
              >
                <GraduationCap size={16} />
                Education
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Academic <span className="rainbow-text">Background</span>
              </h2>
            </motion.div>

            {/* Education cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {schools.map((school, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40, rotateX: 10 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <GradientCard
                    gradient={[
                      colors.gradient[(index + 1) % colors.gradient.length],
                      colors.gradient[(index + 2) % colors.gradient.length],
                      colors.gradient[index % colors.gradient.length]
                    ]}
                    className="h-full"
                  >
                    <div className="flex items-start gap-4">
                      <motion.div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${colors.gradient[(index + 1) % colors.gradient.length]}, ${colors.gradient[(index + 2) % colors.gradient.length]})`
                        }}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.8 }}
                      >
                        <GraduationCap size={24} className="text-white" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-indigo-900 mb-1">
                          {school}
                        </h3>
                        <p className="text-sm font-semibold mb-2" style={{ color: colors.gradient[(index + 1) % colors.gradient.length] }}>
                          Education
                        </p>
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-indigo-500" />
                          <span className="text-xs text-indigo-600/70">
                            {yearsExp ? `${yearsExp} years` : 'Recent'}
                          </span>
                        </div>
                                              </div>
                    </div>
                  </GradientCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT SECTION ────────────────────────────────────────────────── */}
      <section id="contact" className="relative py-32 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, #faf5ff 0%, ${colors.primary}08 50%, ${colors.secondary}08 100%)`
          }}
        />

        {/* Floating shapes */}
        <FloatingShape size={120} color="#7c3aed" delay={0} duration={12} xRange={50} yRange={60} shape="blob" />
        <FloatingShape size={80} color="#f472b6" delay={2} duration={10} xRange={40} yRange={50} />
        <FloatingShape size={60} color="#fbbf24" delay={1} duration={14} xRange={30} yRange={40} shape="circle" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Section header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
              style={{
                background: `${colors.accent}15`,
                color: '#d97706',
                border: `2px solid ${colors.accent}30`
              }}
            >
              <Mail size={16} />
              Get In Touch
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Let's Work <span className="rainbow-text">Together</span>
            </h2>
            <p className="text-indigo-700/70 max-w-xl mx-auto">
              Have a project in mind? Let's create something amazing
            </p>
          </motion.div>

          {/* Contact card */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <GradientCard
              gradient={[colors.primary, colors.secondary, colors.accent]}
              className="p-8 md:p-12"
            >
              <div className="grid md:grid-cols-2 gap-8">
                {/* Contact info */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-indigo-900 mb-6">Contact Information</h3>

                  {email && (
                    <motion.a
                      href={`mailto:${email}`}
                      className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]"
                      style={{
                        background: `${colors.primary}10`,
                        border: `2px solid ${colors.primary}20`
                      }}
                      whileHover={{ x: 5, background: `${colors.primary}20` }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: colors.primary }}
                      >
                        <Mail size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-indigo-600/70 uppercase tracking-wider">Email</p>
                        <p className="font-semibold text-indigo-900">{email}</p>
                      </div>
                    </motion.a>
                  )}

                  {linkedin && (
                    <motion.a
                      href={linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]"
                      style={{
                        background: `${colors.secondary}10`,
                        border: `2px solid ${colors.secondary}20`
                      }}
                      whileHover={{ x: 5, background: `${colors.secondary}20` }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: colors.secondary }}
                      >
                        <Linkedin size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-indigo-600/70 uppercase tracking-wider">LinkedIn</p>
                        <p className="font-semibold text-indigo-900">Connect with me</p>
                      </div>
                    </motion.a>
                  )}

                  {github && (
                    <motion.a
                      href={github}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]"
                      style={{
                        background: `${colors.accent}10`,
                        border: `2px solid ${colors.accent}20`
                      }}
                      whileHover={{ x: 5, background: `${colors.accent}20` }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: colors.accent }}
                      >
                        <Github size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-indigo-600/70 uppercase tracking-wider">GitHub</p>
                        <p className="font-semibold text-indigo-900">View my code</p>
                      </div>
                    </motion.a>
                  )}

                  {location && (
                    <motion.div
                      className="flex items-center gap-4 p-4 rounded-xl"
                      style={{
                        background: '#10b98110',
                        border: '2px solid #10b98120'
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: '#10b981' }}
                      >
                        <MapPin size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-indigo-600/70 uppercase tracking-wider">Location</p>
                        <p className="font-semibold text-indigo-900">{location}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Contact form */}
                <div>
                  <h3 className="text-2xl font-bold text-indigo-900 mb-6">Send a Message</h3>
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div>
                      <input
                        type="text"
                        placeholder="Your Name"
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-indigo-900 placeholder-indigo-400/50 outline-none transition-all"
                        style={{
                          background: 'white',
                          border: '2px solid #e9d5ff',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.1)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = colors.primary}
                        onBlur={(e) => e.target.style.borderColor = '#e9d5ff'}
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Your Email"
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-indigo-900 placeholder-indigo-400/50 outline-none transition-all"
                        style={{
                          background: 'white',
                          border: '2px solid #e9d5ff',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.1)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = colors.primary}
                        onBlur={(e) => e.target.style.borderColor = '#e9d5ff'}
                      />
                    </div>
                    <div>
                      <textarea
                        rows={4}
                        placeholder="Your Message"
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-indigo-900 placeholder-indigo-400/50 outline-none transition-all resize-none"
                        style={{
                          background: 'white',
                          border: '2px solid #e9d5ff',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.1)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = colors.primary}
                        onBlur={(e) => e.target.style.borderColor = '#e9d5ff'}
                      />
                    </div>
                    <motion.button
                      type="submit"
                      className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Send size={18} />
                        Send Message
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-white opacity-0 hover:opacity-10"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 0.6 }}
                      />
                    </motion.button>
                  </form>
                </div>
              </div>
            </GradientCard>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="relative py-12 px-6 overflow-hidden">
        {/* Rainbow divider */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-2"
          style={{
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent}, #06b6d4, ${colors.primary})`,
            backgroundSize: '200% 100%'
          }}
          animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <span className="font-bold text-indigo-900">{name}</span>
            </motion.div>

            {/* Social links */}
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {email && (
                <motion.a
                  href={`mailto:${email}`}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{ background: `${colors.primary}15`, color: colors.primary }}
                  whileHover={{ scale: 1.1, background: colors.primary, color: 'white' }}
                >
                  <Mail size={18} />
                </motion.a>
              )}
              {linkedin && (
                <motion.a
                  href={linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{ background: `${colors.secondary}15`, color: colors.secondary }}
                  whileHover={{ scale: 1.1, background: colors.secondary, color: 'white' }}
                >
                  <Linkedin size={18} />
                </motion.a>
              )}
              {github && (
                <motion.a
                  href={github}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{ background: `${colors.accent}15`, color: colors.accent }}
                  whileHover={{ scale: 1.1, background: colors.accent, color: 'white' }}
                >
                  <Github size={18} />
                </motion.a>
              )}
            </motion.div>

            {/* Copyright */}
            <motion.p
              className="text-sm text-indigo-600/60 flex items-center gap-1"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Made with <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" /> in {new Date().getFullYear()}
            </motion.p>
          </div>

          {/* Tagline */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-2xl font-black rainbow-text">
              Building the future, one line at a time
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}
