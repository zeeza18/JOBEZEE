import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import {
  Mail, Github, Linkedin, Globe, ExternalLink,
  Code2, Database, Server, Cloud,
  GraduationCap, Award, Briefcase, MapPin, Calendar,
  Sparkles, Zap, Star, Layers, BriefcaseBusiness,
  Shield, Rocket, Target,
  ArrowRight, Menu, X, Send, CheckCircle
} from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// ── Enhanced Parallax Hook ─────────────────────────────────────────────────────
// @ts-ignore - intentionally unused, kept for future parallax enhancement
function _useParallax(value: number, distance: number) {
  const springValue = useSpring(value, { stiffness: 100, damping: 30, restDelta: 0.001 })
  const translateY = useTransform(springValue, [0, 1], [-distance, distance])
  return translateY
}

// ── Scroll Progress Hook ────────────────────────────────────────────────────────
function useScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
  return scaleX
}

// ── Counter Animation Hook ──────────────────────────────────────────────────────
function useCounter(end: number, duration: number = 2000, inView: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [end, duration, inView])

  return count
}

// ── Animation Variants ─────────────────────────────────────────────────────────
const fadeUp: any = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
}

const fadeIn: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1, ease: 'easeOut' as const } }
}

const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}

const slideFromLeft: any = {
  hidden: { opacity: 0, x: -100, rotateY: -15 },
  show: { opacity: 1, x: 0, rotateY: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
}

const slideFromRight: any = {
  hidden: { opacity: 0, x: 100, rotateY: 15 },
  show: { opacity: 1, x: 0, rotateY: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
}

const slideFromBottom: any = {
  hidden: { opacity: 0, y: 100, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
}

const stagger: any = {
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

// @ts-ignore - intentionally unused, kept for future fast stagger animation
const _staggerFast: any = {
  show: { transition: { staggerChildren: 0.05 } },
}

const rotateIn: any = {
  hidden: { opacity: 0, rotate: -10, scale: 0.9 },
  show: { opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}

// ── Floating Element Component ─────────────────────────────────────────────────
interface FloatingElementProps {
  children: React.ReactNode
  className?: string
  amplitude?: number
  duration?: number
  delay?: number
}

function FloatingElement({ children, className = '', amplitude = 20, duration = 6, delay = 0 }: FloatingElementProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -amplitude, 0, amplitude * 0.5, 0],
        rotate: [0, 2, -1, 1, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Parallax Layer Component ────────────────────────────────────────────────────
interface ParallaxLayerProps {
  children: React.ReactNode
  className?: string
  speed?: number
  direction?: 'up' | 'down'
}

function ParallaxLayer({ children, className = '', speed = 0.5, direction = 'up' }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  })
  const distance = 100 * speed
  const y = useTransform(scrollYProgress, [0, 1], direction === 'up' ? [distance, -distance] : [-distance, distance])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3])

  return (
    <motion.div ref={ref} style={{ y, opacity }} className={className}>
      {children}
    </motion.div>
  )
}

// ── 3D Card Tilt Component ──────────────────────────────────────────────────────
interface TiltCardProps {
  children: React.ReactNode
  className?: string
  tiltIntensity?: number
}

function TiltCard({ children, className = '', tiltIntensity = 10 }: TiltCardProps) {
  const [transform, setTransform] = useState('')

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -tiltIntensity
    const rotateY = ((x - centerX) / centerX) * tiltIntensity
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`)
  }

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
  }

  return (
    <motion.div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transition: 'transform 0.1s ease-out' }}
    >
      {children}
    </motion.div>
  )
}

// ── Animated Section Wrapper ───────────────────────────────────────────────────
interface SectionWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
  variant?: 'fade' | 'fadeUp' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale'
}

function SectionWrapper({ children, className = '', id, variant = 'fade' }: SectionWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const getVariant = () => {
    switch (variant) {
      case 'fade': return fadeIn
      case 'fadeUp': return fadeUp
      case 'slideUp': return slideFromBottom
      case 'slideLeft': return slideFromLeft
      case 'slideRight': return slideFromRight
      case 'scale': return scaleIn
      default: return fadeIn
    }
  }

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'show' : 'hidden'}
      variants={getVariant()}
      className={`relative ${className}`}
    >
      {children}
    </motion.section>
  )
}

// ── Animated Background Shapes ─────────────────────────────────────────────────
function BackgroundShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Layer 1 - Large slow-moving shapes */}
      <ParallaxLayer speed={0.3} className="absolute top-20 left-10">
        <FloatingElement amplitude={30} duration={12}>
          <div className="w-96 h-96 rounded-full opacity-10"
            style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }} />
        </FloatingElement>
      </ParallaxLayer>

      <ParallaxLayer speed={0.4} direction="down" className="absolute top-40 right-20">
        <FloatingElement amplitude={25} duration={10} delay={2}>
          <div className="w-72 h-72 rounded-full opacity-8"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }} />
        </FloatingElement>
      </ParallaxLayer>

      {/* Layer 2 - Medium shapes */}
      <ParallaxLayer speed={0.5} className="absolute top-1/3 left-1/4">
        <FloatingElement amplitude={20} duration={8} delay={1}>
          <div className="w-48 h-48 rotate-45 opacity-15"
            style={{ background: 'linear-gradient(135deg, #a855f7, transparent)' }} />
        </FloatingElement>
      </ParallaxLayer>

      <ParallaxLayer speed={0.6} direction="down" className="absolute bottom-1/4 right-1/3">
        <FloatingElement amplitude={15} duration={7} delay={3}>
          <div className="w-32 h-32 rounded-full opacity-12"
            style={{ background: '#06b6d4' }} />
        </FloatingElement>
      </ParallaxLayer>

      {/* Layer 3 - Small accent shapes */}
      <ParallaxLayer speed={0.8} className="absolute top-1/2 right-10">
        <FloatingElement amplitude={12} duration={5} delay={0.5}>
          <div className="w-16 h-16 rounded-lg rotate-12 opacity-20"
            style={{ background: '#a855f7' }} />
        </FloatingElement>
      </ParallaxLayer>

      <ParallaxLayer speed={0.7} direction="down" className="absolute bottom-1/3 left-20">
        <FloatingElement amplitude={18} duration={6} delay={2.5}>
          <div className="w-24 h-24 rounded-full opacity-10"
            style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }} />
        </FloatingElement>
      </ParallaxLayer>

      {/* Geometric grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#09090b]/50" />
    </div>
  )
}

// ── Scroll Progress Bar ─────────────────────────────────────────────────────────
function ScrollProgressBar() {
  const scaleX = useScrollProgress()
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 z-[100] origin-left"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #a855f7, #06b6d4, #a855f7)'
      }}
    />
  )
}

// ── Navigation Component ───────────────────────────────────────────────────────
interface NavigationProps {
  name: string
  primaryColor: string
  accentColor: string
}

function Navigation({ name, primaryColor, accentColor }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Skills', href: '#skills' },
    { label: 'Projects', href: '#projects' },
    { label: 'Experience', href: '#experience' },
    { label: 'Education', href: '#education' },
    { label: 'Certifications', href: '#certifications' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div className={`mx-auto max-w-7xl px-6 transition-all duration-500 ${
          isScrolled
            ? 'bg-[rgba(9,9,11,0.8)] backdrop-blur-xl border border-white/10 rounded-2xl'
            : ''
        }`}>
          <div className="flex items-center justify-between px-6 py-3">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  boxShadow: `0 4px 20px ${primaryColor}40`,
                }}
              >
                {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="font-bold text-white text-lg">{name}</span>
            </motion.div>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  className="relative text-sm text-white/60 hover:text-white transition-colors py-2 group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                    style={{ background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})` }} />
                </motion.a>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="hidden lg:flex items-center gap-4"
            >
              <a
                href="#contact"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  boxShadow: `0 4px 20px ${primaryColor}30`,
                }}
              >
                Get in Touch
              </a>
            </motion.div>

            {/* Mobile Menu Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center bg-white/10"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-4 top-24 z-40 lg:hidden"
          >
            <div className="bg-[rgba(9,9,11,0.95)] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col gap-4">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white/70 hover:text-white transition-colors py-2 text-lg"
                  >
                    {link.label}
                  </motion.a>
                ))}
                <a
                  href="#contact"
                  className="mt-4 px-5 py-3 rounded-xl text-sm font-semibold text-white text-center"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  }}
                >
                  Get in Touch
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Animated Counter Component ─────────────────────────────────────────────────
interface AnimatedCounterProps {
  end: number
  suffix?: string
  label: string
  icon: React.ReactNode
  inView: boolean
  color: string
}

// @ts-ignore - intentionally unused, kept for future animated counter feature
function _AnimatedCounter({ end, suffix = '', label, icon, inView, color }: AnimatedCounterProps) {
  const count = useCounter(end, 2000, inView)

  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-2" style={{ color }}>
        {icon}
      </div>
      <motion.p
        initial={{ opacity: 0, scale: 0.5 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-4xl md:text-5xl font-bold text-white mb-1"
      >
        {count}{suffix}
      </motion.p>
      <p className="text-sm text-white/50">{label}</p>
    </div>
  )
}

// ── Hero Section ───────────────────────────────────────────────────────────────
interface HeroProps {
  name: string
  title: string
  headline: string
  profilePhoto?: string
  primaryColor: string
  accentColor: string
  email?: string
  linkedin?: string
  github?: string
  yearsExperience?: string
  skillsCount: number
  projectsCount: number
}

function HeroSection({
  name, title, headline, profilePhoto, primaryColor, accentColor,
  email, linkedin, github, yearsExperience, skillsCount, projectsCount
}: HeroProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  })

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95])

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const [gradientHue, setGradientHue] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setGradientHue((prev) => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden pt-32 pb-20">
      {/* Parallax Background Elements */}
      <ParallaxLayer speed={0.2} className="absolute top-1/4 left-10">
        <FloatingElement amplitude={40} duration={15}>
          <div className="w-[500px] h-[500px] rounded-full opacity-5"
            style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }} />
        </FloatingElement>
      </ParallaxLayer>

      <ParallaxLayer speed={0.3} direction="down" className="absolute bottom-1/4 right-10">
        <FloatingElement amplitude={35} duration={12} delay={3}>
          <div className="w-[400px] h-[400px] rounded-full opacity-5"
            style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }} />
        </FloatingElement>
      </ParallaxLayer>

      {/* Floating geometric shapes */}
      <ParallaxLayer speed={0.4} className="absolute top-1/3 right-1/4">
        <FloatingElement amplitude={25} duration={8} delay={1}>
          <div className="w-32 h-32 rotate-45 border border-white/10" />
        </FloatingElement>
      </ParallaxLayer>

      <ParallaxLayer speed={0.5} direction="down" className="absolute top-1/2 left-1/3">
        <FloatingElement amplitude={20} duration={10} delay={2}>
          <div className="w-20 h-20 rounded-full border border-white/10" />
        </FloatingElement>
      </ParallaxLayer>

      {/* Main Content */}
      <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto max-w-7xl px-6 w-full">
        <motion.div style={{ y: textY, scale }} variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="relative">
            {/* Animated badge */}
            <motion.div variants={fadeUp} className="mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: `${primaryColor}15`,
                  border: `1px solid ${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: primaryColor }}
                />
                Available for opportunities
              </motion.div>
            </motion.div>

            {/* Main heading with gradient animation */}
            <motion.div variants={fadeUp} className="mb-6">
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-4"
                style={{
                  background: `linear-gradient(${gradientHue}deg, #ffffff, ${primaryColor}, ${accentColor}, #ffffff)`,
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradientFlow 8s ease infinite',
                }}
              >
                {name}
              </h1>
            </motion.div>

            {/* Title with typing effect simulation */}
            <motion.p
              variants={fadeUp}
              className="text-2xl md:text-3xl font-semibold mb-4"
              style={{ color: primaryColor }}
            >
              {title}
            </motion.p>

            {/* Headline */}
            <motion.p variants={fadeUp} className="text-lg text-white/60 mb-10 max-w-lg leading-relaxed">
              {headline}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              {email && (
                <motion.a
                  href={`mailto:${email}`}
                  whileHover={{ scale: 1.05, boxShadow: `0 20px 40px ${primaryColor}40` }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  }}
                >
                  <Mail className="w-5 h-5" />
                  Contact Me
                </motion.a>
              )}
              {linkedin && (
                <motion.a
                  href={linkedin}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 transition-all border border-white/10"
                >
                  <Linkedin className="w-5 h-5" />
                  LinkedIn
                </motion.a>
              )}
              {github && (
                <motion.a
                  href={github}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 transition-all border border-white/10"
                >
                  <Github className="w-5 h-5" />
                  GitHub
                </motion.a>
              )}
            </motion.div>

            {/* Floating tech icons */}
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 hidden lg:block">
              <FloatingElement amplitude={15} duration={5}>
                <Code2 className="w-8 h-8 text-white/10" />
              </FloatingElement>
            </div>
            <div className="absolute -right-5 top-1/3 hidden lg:block">
              <FloatingElement amplitude={12} duration={6} delay={1}>
                <Server className="w-6 h-6 text-white/10" />
              </FloatingElement>
            </div>
          </div>

          {/* Right Content - Profile Card with 3D effect */}
          <motion.div variants={scaleIn} className="relative flex justify-center lg:justify-end">
            <TiltCard className="relative w-full max-w-md">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-8"
                style={{ boxShadow: `0 20px 60px ${primaryColor}20, 0 0 0 1px rgba(255,255,255,0.05)` }}>
                {/* Glowing background */}
                <div className="absolute -inset-px rounded-3xl opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}40, ${accentColor}40)`,
                    filter: 'blur(20px)',
                  }} />

                {/* Profile Image */}
                <div className="relative mb-8">
                  {profilePhoto ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="w-48 h-48 mx-auto rounded-2xl overflow-hidden"
                      style={{
                        boxShadow: `0 20px 60px ${primaryColor}30`,
                      }}
                    >
                      <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="w-48 h-48 mx-auto rounded-2xl flex items-center justify-center text-6xl font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        boxShadow: `0 20px 60px ${primaryColor}30`,
                      }}
                    >
                      {initials}
                    </motion.div>
                  )}

                  {/* Floating badges */}
                  <FloatingElement amplitude={8} duration={3}>
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="absolute -right-4 top-0 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: `${primaryColor}30`,
                        border: `1px solid ${primaryColor}50`,
                        color: primaryColor,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        Premium
                      </div>
                    </motion.div>
                  </FloatingElement>

                  <FloatingElement amplitude={6} duration={4} delay={1}>
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="absolute -left-4 bottom-10 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 border border-white/10 text-white/80"
                    >
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3" style={{ color: accentColor }} />
                        Active
                      </div>
                    </motion.div>
                  </FloatingElement>
                </div>

                {/* Stats Grid */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-3 gap-4"
                >
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-white mb-1">{yearsExperience || '5'}+</p>
                    <p className="text-xs text-white/50">Years</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-white mb-1">{skillsCount}+</p>
                    <p className="text-xs text-white/50">Skills</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-white mb-1">{projectsCount}+</p>
                    <p className="text-xs text-white/50">Projects</p>
                  </div>
                </motion.div>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
        >
          <motion.div
            animate={{ height: [8, 16, 8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 rounded-full"
            style={{ background: `linear-gradient(180deg, ${primaryColor}, ${accentColor})` }}
          />
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </section>
  )
}

// ── About Section ─────────────────────────────────────────────────────────────
interface AboutProps {
  bio: string
  primaryColor: string
  accentColor: string
}

function AboutSection({ bio, primaryColor, accentColor }: AboutProps) {
  const ref = useRef<HTMLDivElement>(null)
  useInView(ref, { once: true, margin: '-100px' })

  const strengths = [
    { icon: Code2, label: 'Full-Stack Development', desc: 'React, Node.js, Python, Go' },
    { icon: Cloud, label: 'Cloud & DevOps', desc: 'AWS, GCP, Kubernetes, Terraform' },
    { icon: Database, label: 'Database Systems', desc: 'PostgreSQL, MongoDB, Redis' },
    { icon: Shield, label: 'System Design', desc: 'Microservices, Event-driven' },
  ]

  return (
    <SectionWrapper id="about" className="py-32 px-6" variant="slideUp">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div variants={fadeUp} className="text-center mb-20">
          <motion.span
            variants={rotateIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}40`,
              color: accentColor,
            }}
          >
            <Layers className="w-4 h-4" />
            About Me
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Crafting Digital
            <span className="block" style={{ color: primaryColor }}>Excellence</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed text-lg">
            A passionate technologist dedicated to building scalable, performant, and user-centric solutions that make a real impact.
          </p>
        </motion.div>

        {/* Content Grid */}
        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left - Bio Card with Parallax Image */}
          <ParallaxLayer speed={0.1}>
            <motion.div
              variants={slideFromLeft}
              className="relative h-full"
            >
              <TiltCard className="h-full">
                <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-8"
                  style={{ boxShadow: `0 20px 60px ${primaryColor}15` }}>
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-20"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, transparent)` }} />

                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)` }}>
                        <Layers className="w-7 h-7" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-xl">Background</h3>
                        <p className="text-white/50 text-sm">Professional journey</p>
                      </div>
                    </div>

                    <p className="text-white/70 leading-relaxed mb-8 text-lg">
                      {bio}
                    </p>

                    {/* Key focus areas */}
                    <div className="flex flex-wrap gap-3">
                      {[
                        { icon: Code2, label: 'Clean Code' },
                        { icon: Server, label: 'Scalable Systems' },
                        { icon: Rocket, label: 'Performance' },
                      ].map(({ icon: Icon, label }) => (
                        <motion.div
                          key={label}
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm text-white/70 border border-white/10"
                        >
                          <Icon className="w-4 h-4" style={{ color: accentColor }} />
                          {label}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </ParallaxLayer>

          {/* Right - Key Strengths */}
          <ParallaxLayer speed={0.15} direction="down">
            <motion.div
              variants={slideFromRight}
              className="space-y-4"
            >
              {strengths.map((item, i) => (
                <motion.div
                  key={item.label}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ x: 10, transition: { duration: 0.2 } }}
                  className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${primaryColor}20` }}>
                      <item.icon className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{item.label}</h4>
                      <p className="text-white/50 text-sm">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </ParallaxLayer>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ── Skills Section ─────────────────────────────────────────────────────────────
interface SkillsProps {
  languages: string[]
  frameworks: string[]
  tools: string[]
  primaryColor: string
  accentColor: string
}

function SkillsSection({ languages, frameworks, tools, primaryColor, accentColor }: SkillsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const skillCategories = [
    { title: 'Languages', skills: languages, icon: Code2, color: primaryColor },
    { title: 'Frameworks', skills: frameworks, icon: Database, color: accentColor },
    { title: 'Tools', skills: tools, icon: Server, color: '#8b5cf6' },
  ]

  return (
    <SectionWrapper id="skills" className="py-32 px-6 relative" variant="slideUp">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }} />

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <motion.div variants={fadeUp} className="text-center mb-20">
          <motion.span
            variants={rotateIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: `${primaryColor}15`,
              border: `1px solid ${primaryColor}40`,
              color: primaryColor,
            }}
          >
            <Target className="w-4 h-4" />
            Technical Skills
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Technology
            <span className="block" style={{ color: accentColor }}>Stack</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed text-lg">
            A comprehensive toolkit spanning languages, frameworks, and infrastructure technologies.
          </p>
        </motion.div>

        {/* Skills Categories */}
        <div ref={ref} className="space-y-12">
          {skillCategories.map((category, catIndex) => (
            <motion.div
              key={category.title}
              variants={fadeUp}
              custom={catIndex}
              className="relative"
            >
              {/* Category Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${category.color}20` }}>
                  <category.icon className="w-6 h-6" style={{ color: category.color }} />
                </div>
                <h3 className="text-2xl font-bold text-white">{category.title}</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {category.skills.map((skill, i) => (
                  <motion.div
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                    transition={{
                      delay: i * 0.05 + catIndex * 0.1,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{
                      scale: 1.1,
                      boxShadow: `0 10px 30px ${category.color}30`,
                    }}
                    className="group relative p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer text-center"
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center, ${category.color}20, transparent)`,
                      }} />

                    <span className="relative text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      {skill}
                    </span>

                    {/* Skill level indicator */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${60 + Math.random() * 40}%` } : {}}
                        transition={{ delay: i * 0.1 + catIndex * 0.2, duration: 0.8 }}
                        className="h-full rounded-full"
                        style={{ background: category.color }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Skills Overview Stats */}
        <motion.div
          variants={fadeUp}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { label: 'Languages', value: languages.length, icon: Code2, color: primaryColor },
            { label: 'Frameworks', value: frameworks.length, icon: Database, color: accentColor },
            { label: 'Tools', value: tools.length, icon: Server, color: '#8b5cf6' },
            { label: 'Expertise', value: 95, suffix: '%', icon: Star, color: '#10b981' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={scaleIn}
              custom={i}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center"
            >
              <stat.icon className="w-8 h-8 mx-auto mb-3" style={{ color: stat.color }} />
              <p className="text-3xl font-bold text-white mb-1">
                {stat.value}{stat.suffix || '+'}
              </p>
              <p className="text-sm text-white/50">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}

// ── Projects Section ────────────────────────────────────────────────────────────
interface Project {
  name: string
  description: string
  technologies: string[]
  link?: string
}

interface ProjectsProps {
  projects: Project[]
  primaryColor: string
  accentColor: string
}

function ProjectsSection({ projects, primaryColor, accentColor }: ProjectsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <SectionWrapper id="projects" className="py-32 px-6 relative overflow-hidden" variant="slideUp">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }} />

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <motion.div variants={fadeUp} className="text-center mb-20">
          <motion.span
            variants={rotateIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}40`,
              color: accentColor,
            }}
          >
            <Rocket className="w-4 h-4" />
            Portfolio
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Featured
            <span className="block" style={{ color: primaryColor }}>Projects</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed text-lg">
            A selection of impactful projects showcasing technical expertise and problem-solving abilities.
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60, rotateX: -10 }}
              animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{
                delay: i * 0.1,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="group"
            >
              <TiltCard className="h-full">
                <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-6"
                  style={{
                    boxShadow: `0 20px 60px ${primaryColor}10`,
                  }}>
                  {/* Project number */}
                  <div className="flex items-center justify-between mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        boxShadow: `0 4px 20px ${primaryColor}40`,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </motion.div>
                    {project.link && (
                      <motion.a
                        href={project.link}
                        target="_blank"
                        rel="noreferrer"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
                      >
                        <ExternalLink className="w-5 h-5 text-white/70" />
                      </motion.a>
                    )}
                  </div>

                  {/* Project content */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-white/90 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-white/60 mb-6 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <motion.span
                        key={tech}
                        whileHover={{ scale: 1.05 }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/80 border border-white/10"
                      >
                        {tech}
                      </motion.span>
                    ))}
                    {project.technologies.length > 4 && (
                      <span className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50">
                        +{project.technologies.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${primaryColor}10, transparent 70%)`,
                    }} />
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}

// ── Experience Section ─────────────────────────────────────────────────────────
interface ExperienceItem {
  company: string
  role: string
  period: string
  description: string
}

interface ExperienceProps {
  experience: ExperienceItem[]
  primaryColor: string
  accentColor: string
}

function ExperienceSection({ experience, primaryColor, accentColor }: ExperienceProps) {
  return (
    <SectionWrapper id="experience" className="py-32 px-6 relative" variant="slideUp">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }} />

      <div className="mx-auto max-w-5xl relative z-10">
        {/* Section Header */}
        <motion.div variants={fadeUp} className="text-center mb-20">
          <motion.span
            variants={rotateIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: `${primaryColor}15`,
              border: `1px solid ${primaryColor}40`,
              color: primaryColor,
            }}
          >
            <Briefcase className="w-4 h-4" />
            Career
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Work
            <span className="block" style={{ color: accentColor }}>Experience</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed text-lg">
            A track record of delivering high-impact solutions across diverse industries and technologies.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Central timeline line with glow */}
          <div className="absolute left-[27px] top-0 bottom-0 w-px">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="h-full"
              style={{
                background: `linear-gradient(180deg, ${primaryColor}, ${accentColor}, ${primaryColor})`,
                boxShadow: `0 0 20px ${primaryColor}50`,
              }}
            />
          </div>

          {/* Timeline items */}
          <div className="space-y-8">
            {experience.map((exp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50, rotateY: i % 2 === 0 ? -15 : 15 }}
                whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex items-start gap-8 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
              >
                {/* Timeline dot */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 + 0.3, type: 'spring', stiffness: 200 }}
                  className="relative z-10 shrink-0"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                      boxShadow: `0 0 30px ${primaryColor}50`,
                    }}>
                    <BriefcaseBusiness className="w-6 h-6 text-white" />
                  </div>
                </motion.div>

                {/* Content card */}
                <TiltCard className="flex-1">
                  <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-6"
                    style={{ boxShadow: `0 15px 40px ${primaryColor}10` }}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-white font-bold text-xl mb-1">{exp.company}</h3>
                        <p className="text-white/70">{exp.role}</p>
                      </div>
                      <span
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: `${primaryColor}20`,
                          color: primaryColor,
                          border: `1px solid ${primaryColor}30`,
                        }}
                      >
                        {exp.period}
                      </span>
                    </div>
                    <p className="text-white/60 leading-relaxed">{exp.description}</p>

                    {/* Decorative gradient bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 opacity-50"
                      style={{
                        background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
                      }} />
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ── Education Section ──────────────────────────────────────────────────────────
interface EducationProps {
  schools: string[]
  primaryColor: string
  accentColor: string
}

function EducationSection({ schools, primaryColor, accentColor }: EducationProps) {
  return (
    <SectionWrapper id="education" className="py-32 px-6 relative" variant="slideUp">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }} />

      <div className="mx-auto max-w-5xl relative z-10">
        {/* Section Header */}
        <motion.div variants={fadeUp} className="text-center mb-20">
          <motion.span
            variants={rotateIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}40`,
              color: accentColor,
            }}
          >
            <GraduationCap className="w-4 h-4" />
            Formation
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Education
            <span className="block" style={{ color: primaryColor }}>& Training</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed text-lg">
            Academic foundation that laid the groundwork for technical excellence.
          </p>
        </motion.div>

        {/* Education Cards - Stacked with depth effect */}
        <div className="relative">
          {schools.map((school, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50, rotateX: -10 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-6 last:mb-0"
              style={{ zIndex: schools.length - i }}
            >
              {/* Depth shadow cards */}
              {Array.from({ length: 3 - i }).map((_, j) => (
                <div
                  key={j}
                  className="absolute inset-0 rounded-2xl bg-white/5 translate-y-2 translate-x-2"
                  style={{ zIndex: -1 }}
                />
              ))}

              <TiltCard className="overflow-hidden rounded-2xl">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-6"
                  style={{
                    boxShadow: `0 15px 40px ${primaryColor}10`,
                  }}>
                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)` }}
                    >
                      <GraduationCap className="w-8 h-8" style={{ color: primaryColor }} />
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xl mb-2">{school}</h3>
                      <p className="text-white/60 mb-3">Computer Science & Engineering</p>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>2015 - 2019</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>United States</span>
                        </div>
                      </div>
                    </div>

                    {/* Decorative element */}
                    <FloatingElement amplitude={5} duration={4}>
                      <div className="w-20 h-20 rounded-full opacity-10"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }} />
                    </FloatingElement>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}

// ── Certifications Section ──────────────────────────────────────────────────────
interface Certification {
  name: string
  issuer: string
  year: string
  color: string
}

interface CertificationsProps {
  certifications: Certification[]
}

function CertificationsSection({ certifications }: CertificationsProps) {
  return (
    <SectionWrapper id="certifications" className="py-32 px-6 relative overflow-hidden" variant="slideUp">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-5 pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${certifications[0]?.color || '#a855f7'}, transparent, ${certifications[1]?.color || '#06b6d4'})` }} />

      <div className="mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <motion.div variants={fadeUp} className="text-center mb-20">
          <motion.span
            variants={rotateIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: `${certifications[0]?.color || '#a855f7'}15`,
              border: `1px solid ${certifications[0]?.color || '#a855f7'}40`,
              color: certifications[0]?.color || '#a855f7',
            }}
          >
            <Award className="w-4 h-4" />
            Credentials
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Industry
            <span className="block" style={{ color: certifications[1]?.color || '#06b6d4' }}>Certifications</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed text-lg">
            Industry-recognized certifications validating technical expertise and commitment to excellence.
          </p>
        </motion.div>

        {/* Parallax Badge Row */}
        <div className="relative">
          <div className="flex flex-wrap justify-center gap-6">
            {certifications.map((cert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="group"
              >
                <TiltCard>
                  <div className="relative w-64 overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-6 text-center"
                    style={{
                      boxShadow: `0 15px 40px ${cert.color}15`,
                    }}>
                    {/* Glow effect */}
                    <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, ${cert.color}20, transparent)`,
                      }} />

                    {/* Badge icon */}
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.8 }}
                      className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${cert.color}30, ${cert.color}10)`,
                        border: `2px solid ${cert.color}50`,
                        boxShadow: `0 0 30px ${cert.color}30`,
                      }}
                    >
                      <Award className="w-10 h-10" style={{ color: cert.color }} />
                    </motion.div>

                    {/* Content */}
                    <h4 className="text-white font-bold text-lg mb-1">{cert.name}</h4>
                    <p className="text-white/60 text-sm mb-2">{cert.issuer}</p>
                    <span className="text-white/40 text-xs">{cert.year}</span>

                    {/* Hover shine effect */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)`,
                      }} />
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ── Contact Section ────────────────────────────────────────────────────────────
interface ContactProps {
  email?: string
  linkedin?: string
  github?: string
  portfolio?: string
  name: string
  primaryColor: string
  accentColor: string
}

function ContactSection({ email, linkedin, github, portfolio, primaryColor, accentColor }: ContactProps) {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setFormState({ name: '', email: '', message: '' })
    }, 1500)
  }

  return (
    <SectionWrapper id="contact" className="py-32 px-6 relative" variant="slideUp">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${primaryColor}, ${accentColor})` }} />

      <div className="mx-auto max-w-4xl relative z-10">
        {/* Section Header */}
        <motion.div variants={fadeUp} className="text-center mb-16">
          <motion.span
            variants={rotateIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}40`,
              color: accentColor,
            }}
          >
            <Send className="w-4 h-4" />
            Get In Touch
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Let&apos;s Work
            <span className="block" style={{ color: primaryColor }}>Together</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto leading-relaxed text-lg">
            Ready to bring your vision to life? Let&apos;s connect and discuss how I can contribute to your team&apos;s success.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <motion.div variants={slideFromLeft} className="relative">
            <TiltCard className="h-full">
              <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-8"
                style={{ boxShadow: `0 20px 60px ${primaryColor}15` }}>
                <AnimatePresence mode="wait">
                  {isSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center justify-center h-full py-12 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        }}
                      >
                        <CheckCircle className="w-10 h-10 text-white" />
                      </motion.div>
                      <h3 className="text-white font-bold text-2xl mb-2">Message Sent!</h3>
                      <p className="text-white/60">I&apos;ll get back to you soon.</p>
                    </motion.div>
                  ) : (
                    <motion.form
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-5"
                    >
                      {/* Name Field */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <label className="block text-white/70 text-sm mb-2">Your Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                            placeholder="John Smith"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                          />
                          <div className="absolute inset-0 rounded-xl opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none"
                            style={{
                              boxShadow: `inset 0 0 20px ${primaryColor}20`,
                            }} />
                        </div>
                      </motion.div>

                      {/* Email Field */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <label className="block text-white/70 text-sm mb-2">Email Address</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={formState.email}
                            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                            placeholder="john@company.com"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                          />
                        </div>
                      </motion.div>

                      {/* Message Field */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <label className="block text-white/70 text-sm mb-2">Message</label>
                        <div className="relative">
                          <textarea
                            value={formState.message}
                            onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                            placeholder="Tell me about your project..."
                            rows={4}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
                          />
                        </div>
                      </motion.div>

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02, boxShadow: `0 10px 30px ${primaryColor}40` }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                        }}
                      >
                        {isSubmitting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Message
                          </>
                        )}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </TiltCard>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={slideFromRight} className="space-y-4">
            {/* Direct Email */}
            {email && (
              <motion.a
                href={`mailto:${email}`}
                whileHover={{ x: 10 }}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${accentColor}30)` }}>
                  <Mail className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <div className="flex-1">
                  <p className="text-white/50 text-xs mb-0.5">Email</p>
                  <p className="text-white font-medium">{email}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
              </motion.a>
            )}

            {/* Social Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {linkedin && (
                <motion.a
                  href={linkedin}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <Linkedin className="w-6 h-6" style={{ color: '#0077b5' }} />
                  <span className="text-white/80 text-sm font-medium">LinkedIn</span>
                </motion.a>
              )}
              {github && (
                <motion.a
                  href={github}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <Github className="w-6 h-6" style={{ color: '#ffffff' }} />
                  <span className="text-white/80 text-sm font-medium">GitHub</span>
                </motion.a>
              )}
              {portfolio && (
                <motion.a
                  href={portfolio}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <Globe className="w-6 h-6" style={{ color: accentColor }} />
                  <span className="text-white/80 text-sm font-medium">Portfolio</span>
                </motion.a>
              )}
            </div>

            {/* Availability Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-5 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-3">
                <FloatingElement amplitude={3} duration={2}>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </FloatingElement>
                <span className="text-white font-medium">Available for opportunities</span>
              </div>
              <p className="text-white/50 text-sm">Typically responds within 24 hours</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  )
}

// ── Footer Component ──────────────────────────────────────────────────────────
interface FooterProps {
  name: string
  primaryColor: string
  accentColor: string
  linkedin?: string
  github?: string
}

function Footer({ name, primaryColor, accentColor, linkedin, github }: FooterProps) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <footer className="relative py-16 px-6 overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] rounded-full opacity-10"
          style={{ background: `radial-gradient(ellipse, ${primaryColor}, transparent)` }} />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Main Footer Content */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-12 border-b border-white/10">
          {/* Logo & Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                boxShadow: `0 4px 20px ${primaryColor}40`,
              }}>
              {initials}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{name}</h3>
              <p className="text-white/50 text-sm">Software Engineer</p>
            </div>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4"
          >
            {linkedin && (
              <motion.a
                href={linkedin}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.1, y: -3 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
              >
                <Linkedin className="w-5 h-5 text-white/70" />
              </motion.a>
            )}
            {github && (
              <motion.a
                href={github}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.1, y: -3 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
              >
                <Github className="w-5 h-5 text-white/70" />
              </motion.a>
            )}
            {linkedin && (
              <motion.a
                href={`mailto:${linkedin}`}
                whileHover={{ scale: 1.1, y: -3 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
              >
                <Mail className="w-5 h-5 text-white/70" />
              </motion.a>
            )}
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <span>Built with</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-red-500"
            >
              &#9829;
            </motion.span>
            <span>using JOBEZEE</span>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

// ── Main Template Component ───────────────────────────────────────────────────
export default function TechnicalAnimated({
  profile,
  primaryColor = '#a855f7',
  accentColor = '#06b6d4',
  showSections,
  profilePhoto,
}: PortfolioTemplateProps) {
  // Profile data
  const name = profile.full_name || profile.preferred_name || 'Professional'
  const title = profile.current_job_title || profile.target_role || 'Software Engineer'
  const headline = profile.headline || 'Building exceptional digital experiences with cutting-edge technology'
  const bio = `Passionate ${title} with ${profile.years_experience || '5'} years of experience delivering scalable, high-performance solutions. Specializing in modern web technologies, cloud architecture, and creating intuitive user experiences that drive business growth.`

  // Skills aggregation
  const languages = profile.skills_languages?.length
    ? profile.skills_languages
    : ['TypeScript', 'Python', 'Go', 'Rust', 'Java', 'SQL']

  const frameworks = profile.skills_frameworks?.length
    ? profile.skills_frameworks
    : ['React', 'Next.js', 'Node.js', 'FastAPI', 'GraphQL', 'Redis']

  const tools = profile.skills_tools?.length
    ? profile.skills_tools
    : ['Docker', 'Kubernetes', 'AWS', 'PostgreSQL', 'MongoDB', 'Terraform']

  const allSkillsCount = languages.length + frameworks.length + tools.length

  // Projects
  const projectItems: Project[] = (profile.resume_facts_projects || []).length > 0
    ? (profile.resume_facts_projects as unknown as Project[]).map(p => typeof p === 'string' ? { name: p, description: '', technologies: [] } : p)
    : [
        { name: 'Cloud-Native API Platform', description: 'Built a scalable microservices architecture serving 2M+ daily requests with 99.9% uptime and automated scaling.', technologies: ['Go', 'Kubernetes', 'AWS', 'gRPC'] },
        { name: 'Real-Time Analytics Dashboard', description: 'Developed interactive data visualization platform processing 50K events/second with sub-second latency.', technologies: ['React', 'D3.js', 'Kafka', 'Redis'] },
        { name: 'Distributed Cache System', description: 'Implemented high-performance caching layer with sub-millisecond latency and automatic failover.', technologies: ['Rust', 'Redis', 'PostgreSQL'] },
        { name: 'Developer CLI Toolkit', description: 'Created comprehensive command-line tools improving developer productivity by 40%.', technologies: ['Go', 'Cobra', 'Viper'] },
        { name: 'E-Commerce Platform', description: 'Built full-stack e-commerce solution handling 10K+ concurrent users with 99.95% uptime.', technologies: ['Next.js', 'Stripe', 'PostgreSQL'] },
        { name: 'AI Content Generator', description: 'Developed GPT-powered content generation tool with custom fine-tuning and moderation.', technologies: ['Python', 'OpenAI', 'FastAPI'] },
      ]

  // Experience
  const companies = profile.resume_facts_companies?.length
    ? profile.resume_facts_companies
    : ['TechCorp Inc.', 'StartupXYZ', 'Innovation Labs']

  const experience = companies.map((company, i) => ({
    company,
    role: i === 0 ? 'Senior Software Engineer' : i === 1 ? 'Software Engineer' : 'Junior Developer',
    period: i === 0 ? '2022 - Present' : i === 1 ? '2019 - 2022' : '2017 - 2019',
    description: profile.resume_facts_metrics?.[i] ||
      `Led development of key platform features, mentored junior engineers, and drove architectural decisions that improved system performance by 50%. Collaborated with cross-functional teams to deliver high-impact projects on time.`,
  }))

  // Education
  const schools = profile.resume_facts_schools?.length
    ? profile.resume_facts_schools
    : ['Stanford University', 'MIT']

  // Certifications
  const certifications = [
    { name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', year: '2024', color: '#FF9900' },
    { name: 'Kubernetes Administrator', issuer: 'CNCF', year: '2023', color: '#326CE5' },
    { name: 'Google Cloud Professional', issuer: 'Google', year: '2023', color: '#4285F4' },
    { name: 'Meta Frontend Developer', issuer: 'Meta', year: '2022', color: '#0668E1' },
  ]

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: '#09090b',
        color: '#ffffff',
        fontFamily: "'Inter', 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Animated Background Shapes */}
      <BackgroundShapes />

      {/* Navigation */}
      <Navigation name={name} primaryColor={primaryColor} accentColor={accentColor} />

      {/* Hero Section */}
      <HeroSection
        name={name}
        title={title}
        headline={headline}
        profilePhoto={profilePhoto}
        primaryColor={primaryColor}
        accentColor={accentColor}
        email={profile.email}
        linkedin={profile.linkedin}
        github={profile.github}
        yearsExperience={profile.years_experience}
        skillsCount={allSkillsCount}
        projectsCount={projectItems.length}
      />

      {/* About Section */}
      {showSections?.about && (
        <AboutSection bio={bio} primaryColor={primaryColor} accentColor={accentColor} />
      )}

      {/* Skills Section */}
      {showSections?.skills && allSkillsCount > 0 && (
        <SkillsSection
          languages={languages}
          frameworks={frameworks}
          tools={tools}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      )}

      {/* Projects Section */}
      {showSections?.projects && projectItems.length > 0 && (
        <ProjectsSection
          projects={projectItems}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      )}

      {/* Experience Section */}
      {showSections?.experience && experience.length > 0 && (
        <ExperienceSection
          experience={experience}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      )}

      {/* Education Section */}
      {showSections?.education && schools.length > 0 && (
        <EducationSection
          schools={schools}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      )}

      {/* Certifications Section */}
      {showSections?.certifications && (
        <CertificationsSection certifications={certifications} />
      )}

      {/* Contact Section */}
      {showSections?.contact && (
        <ContactSection
          email={profile.email}
          linkedin={profile.linkedin}
          github={profile.github}
          portfolio={profile.portfolio}
          name={name}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      )}

      {/* Footer */}
      <Footer
        name={name}
        primaryColor={primaryColor}
        accentColor={accentColor}
        linkedin={profile.linkedin}
        github={profile.github}
      />

      {/* Custom CSS */}
      <style>{`
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.5); }
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.3) transparent;
        }

        *::-webkit-scrollbar {
          width: 8px;
        }

        *::-webkit-scrollbar-track {
          background: transparent;
        }

        *::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 4px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }

        ::selection {
          background: rgba(168, 85, 247, 0.3);
          color: white;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  )
}
