import { motion, useInView } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Mail, MapPin, Linkedin, Github, Globe, Award, Calendar, GraduationCap, Code2, Briefcase, Trophy, Target, TrendingUp, Clock, Star } from 'lucide-react'
import type { PortfolioTemplateProps } from '../types'

// ─── Animation Variants ──────────────────────────────────────────────────────
const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
}

const fadeIn: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } }
}

const stagger: any = {
  show: { transition: { staggerChildren: 0.1 } }
}

const slideInLeft: any = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
}

const slideInRight: any = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
}

const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
}

// ─── Count-Up Animation Hook ─────────────────────────────────────────────────
function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (startOnView && !isInView) return
    if (hasStarted) return

    setHasStarted(true)
    let startTime: number | null = null
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration, isInView, hasStarted, startOnView])

  return { count, ref }
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function _AnimatedProgressBar({
  label,
  percentage,
  color,
  delay = 0
}: {
  label: string
  percentage: number
  color: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setWidth(percentage)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [isInView, percentage, delay])

  return (
    <div ref={ref} className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{percentage}%</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}cc, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 }}
        />
      </div>
    </div>
  )
}

// ─── Metric Card Component ────────────────────────────────────────────────────
function _MetricCard({
  icon: Icon,
  value,
  label,
  color,
  delay = 0
}: {
  icon: typeof Target
  value: string | number
  label: string
  color: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      variants={scaleIn}
      custom={delay}
      className="relative overflow-hidden rounded-xl p-6 bg-white shadow-md border border-slate-100"
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-bl-full" style={{ background: color }} />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="text-3xl font-black font-mono mb-1" style={{ color }}>{value}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    </motion.div>
  )
}

// ─── Stat Counter Component ────────────────────────────────────────────────────
function StatCounter({
    value,
    suffix = "",
    label,
    color
}: {
    value: number
    suffix?: string
    label: string
    color: string
}) {
    const { count, ref } = useCountUp(value, 2000)

    return (
        <div ref={ref as unknown as React.Ref<HTMLDivElement>} className="text-center">
            <div className="text-4xl md:text-5xl font-black font-mono mb-2" style={{ color }}>
                {count}{suffix}
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
    )
}

// ─── Geometric Shape Components ───────────────────────────────────────────────
function GeometricShape({
    type,
    className = ""
}: {
    type: 'circle' | 'triangle' | 'hexagon' | 'diamond' | 'cross'
    className?: string
}) {
    const shapes: Record<string, React.ReactElement> = {
        circle: <div className={`rounded-full ${className}`} />,
        triangle: <div className={`${className}`} style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />,
        hexagon: <div className={`${className}`} style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />,
        diamond: <div className={`${className}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />,
        cross: <div className={`${className}`} style={{ clipPath: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)' }} />
    }
    return shapes[type]
}

// ─── Grid Pattern Background ──────────────────────────────────────────────────
function GridPattern() {
    return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f172a" strokeWidth="1" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
    )
}

// ─── Timeline Item Component ───────────────────────────────────────────────────
function TimelineItem({
    title,
    company,
    period,
    description,
    metrics,
    color,
    index
}: {
    title: string
    company: string
    period: string
    description: string
    metrics: string[]
    color: string
    index: number
}) {
    return (
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={slideInLeft}
            className="relative pl-8 pb-10 last:pb-0"
        >
            <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-white border-4 z-10" style={{ borderColor: color }} />
            {index !== 0 && <div className="absolute left-[6px] top-4 bottom-0 w-0.5 bg-slate-200" />}

            <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100 ml-4 hover:shadow-lg transition-shadow duration-300">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-1 rounded" style={{ background: `${color}15`, color }}>0{index + 1}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {period}
                    </span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
                <p className="text-sm text-slate-500 mb-3">{company}</p>
                <p className="text-sm text-slate-600 mb-3">{description}</p>

                {metrics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {metrics.map((metric, i) => (
                            <span key={i} className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${color}10`, color: `${color}cc` }}>
                                {metric}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// ─── Skill Bar Component ────────────────────────────────────────────────────────
function SkillBar({
    skill,
    level,
    category,
    color,
    index
}: {
    skill: string
    level: number
    category: string
    color: string
    index: number
}) {
    return (
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={index * 0.1}
            className="mb-4"
        >
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider" style={{ background: `${color}15`, color }}>{category}</span>
                    <span className="text-sm font-semibold text-slate-800">{skill}</span>
                </div>
                <span className="text-sm font-bold font-mono" style={{ color }}>{level}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full relative"
                    style={{ background: `linear-gradient(90deg, ${color}cc, ${color})` }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${level}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-50" />
                </motion.div>
            </div>
        </motion.div>
    )
}

// ─── Project Card Component ────────────────────────────────────────────────────
function ProjectCard({
    title,
    description,
    technologies,
    metrics,
    color,
    index
}: {
    title: string
    description: string
    technologies: string[]
    metrics: string[]
    color: string
    index: number
}) {
    return (
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={index}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300 overflow-hidden relative"
        >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold font-mono" style={{ color }}>#{String(index + 1).padStart(2, '0')}</span>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <div className="w-2 h-2 rounded-full opacity-50" style={{ background: color }} />
                        <div className="w-2 h-2 rounded-full opacity-25" style={{ background: color }} />
                    </div>
                </div>

                <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{description}</p>

                {metrics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {metrics.slice(0, 4).map((metric, i) => (
                            <div key={i} className="text-xs p-2 rounded-lg" style={{ background: `${color}08` }}>
                                <span className="font-bold font-mono" style={{ color }}>{metric.split(' ')[0]}</span>
                                <span className="text-slate-500 ml-1">{metric.split(' ').slice(1).join(' ')}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                    {technologies.slice(0, 4).map((tech, i) => (
                        <span key={i} className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                            {tech}
                        </span>
                    ))}
                    {technologies.length > 4 && (
                        <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-500">
                            +{technologies.length - 4}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

// ─── Education Card Component ─────────────────────────────────────────────────
function EducationCard({
    institution,
    degree,
    period,
    grade,
    color
}: {
    institution: string
    degree: string
    period: string
    grade: string
    color: string
}) {
    return (
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-100 relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }} />

            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                    <GraduationCap className="w-6 h-6" style={{ color }} />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-slate-900 mb-1">{degree}</h4>
                    <p className="text-sm text-slate-600 mb-2">{institution}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {period}
                        </span>
                        <span className="font-semibold px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>GPA: {grade}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// ─── Certification Badge Component ────────────────────────────────────────────
function CertificationBadge({
    name,
    issuer,
    date,
    color
}: {
    name: string
    issuer: string
    date: string
    color: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-md border border-slate-100"
        >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                <Award className="w-6 h-6" style={{ color }} />
            </div>
            <div>
                <h5 className="font-bold text-slate-900 text-sm">{name}</h5>
                <p className="text-xs text-slate-500">{issuer}</p>
                <p className="text-xs text-slate-400 mt-1">{date}</p>
            </div>
        </motion.div>
    )
}

// ─── Contact Form Component ───────────────────────────────────────────────────
function ContactForm({ email, color }: { email: string; color: string }) {
    const [formState, setFormState] = useState({ name: '', email: '', message: '' })
    const [focused, setFocused] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 3000)
    }

    const inputProgress = (field: string) => {
        if (focused === field || formState[field as keyof typeof formState]) return 100
        return 0
    }

    return (
        <motion.form
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            {[
                { id: 'name', label: 'Your Name', type: 'text', value: formState.name },
                { id: 'email', label: 'Your Email', type: 'email', value: formState.email },
            ].map((field) => (
                <div key={field.id} className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{field.label}</label>
                    <div className="relative">
                        <input
                            type={field.type}
                            value={field.value}
                            onChange={(e) => setFormState({ ...formState, [field.id]: e.target.value })}
                            onFocus={() => setFocused(field.id)}
                            onBlur={() => setFocused(null)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors bg-white"
                            placeholder={`Enter your ${field.label.toLowerCase()}`}
                        />
                        <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-300" style={{ width: `${inputProgress(field.id)}%`, background: color }} />
                    </div>
                </div>
            ))}

            <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                <div className="relative">
                    <textarea
                        value={formState.message}
                        onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                        onFocus={() => setFocused('message')}
                        onBlur={() => setFocused(null)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors resize-none bg-white"
                        placeholder="How can I help you?"
                    />
                    <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-300" style={{ width: `${inputProgress('message')}%`, background: color }} />
                </div>
            </div>

            <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-lg text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: submitted ? '#10b981' : color }}
            >
                {submitted ? (
                    <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Message Sent!
                    </>
                ) : (
                    <>
                        <Mail className="w-4 h-4" />
                        Send Message
                    </>
                )}
            </motion.button>

            {email && (
                <p className="text-center text-sm text-slate-500">
                    or email directly at{' '}
                    <a href={`mailto:${email}`} className="font-semibold underline" style={{ color }}>
                        {email}
                    </a>
                </p>
            )}
        </motion.form>
    )
}

// ─── Main Template Component ──────────────────────────────────────────────────
export default function TechnicalGraphicy({
    profile,
    primaryColor = '#0f172a',
    accentColor = '#3b82f6'
}: PortfolioTemplateProps) {
    const themeColor = primaryColor
    const highlightColor = accentColor || '#f97316'

    const name = profile.full_name || profile.preferred_name || 'Professional'
    const title = profile.current_job_title || profile.target_role || 'Software Engineer'
    const location = [profile.city, profile.country].filter(Boolean).join(', ') || 'Remote'
    const bio = profile.headline || `Dedicated ${title} with ${profile.years_experience || '5'} years of experience building scalable solutions. Passionate about data-driven development and creating impactful products.`

    const allSkills = [
        ...(profile.skills_languages || []),
        ...(profile.skills_frameworks || []),
        ...(profile.skills_tools || [])
    ]

    const skillLevels = allSkills.map((skill, i) => ({
        name: skill,
        level: Math.max(60, 100 - (i % 4) * 10),
        category: (profile.skills_languages || []).includes(skill) ? 'Lang' :
                  (profile.skills_frameworks || []).includes(skill) ? 'Framework' : 'Tool'
    }))

    const yearsExp = parseInt(profile.years_experience || '5') || 5
    const companiesCount = (profile.resume_facts_companies || []).length || 2
    const projectsCount = (profile.resume_facts_projects || []).length || 3
    const skillsCount = allSkills.length || 8

    const heroStats = [
        { icon: Clock, value: `${yearsExp}+`, label: 'Years Experience', color: themeColor },
        { icon: Briefcase, value: `${companiesCount}`, label: 'Companies', color: highlightColor },
        { icon: Code2, value: `${skillsCount}+`, label: 'Technologies', color: '#10b981' },
        { icon: Trophy, value: `${projectsCount}+`, label: 'Projects', color: '#8b5cf6' }
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    }

    return (
        <div className="min-h-screen" style={{ background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

                .font-mono {
                    font-family: 'JetBrains Mono', monospace;
                }

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                ::-webkit-scrollbar {
                    width: 8px;
                }

                ::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }

                ::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>

            {/* Hero Section */}
            <section id="hero" className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)` }}>
                <GridPattern />

                {/* Geometric Decorations */}
                <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="absolute top-20 right-20 w-64 h-64 opacity-10"
                >
                    <GeometricShape type="hexagon" className="w-full h-full bg-white" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                    className="absolute -bottom-20 -left-20 w-80 h-80 opacity-5"
                >
                    <GeometricShape type="circle" className="w-full h-full border-4 border-white" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="absolute top-1/4 left-10 w-4 h-4 rounded-full bg-white opacity-20"
                />

                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="absolute bottom-1/3 right-1/4 w-6 h-6"
                    style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', background: highlightColor, opacity: 0.3 }}
                />

                <div className="container mx-auto px-6 py-20 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Content */}
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={containerVariants}
                        >
                            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6">
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: highlightColor }} />
                                <span className="text-sm font-medium text-white/90">Available for opportunities</span>
                            </motion.div>

                            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight">
                                {name.split(' ')[0]}<br />
                                <span style={{ color: highlightColor }}>{name.split(' ').slice(1).join(' ')}</span>
                            </motion.h1>

                            <motion.p variants={fadeUp} className="text-xl md:text-2xl font-medium text-white/80 mb-4">
                                {title}
                            </motion.p>

                            <motion.div variants={fadeUp} className="flex items-center gap-2 text-white/60 mb-8">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">{location}</span>
                            </motion.div>

                            <motion.p variants={fadeUp} className="text-white/70 max-w-xl leading-relaxed mb-8">
                                {bio}
                            </motion.p>

                            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                                <a
                                    href={`mailto:${profile.email}`}
                                    className="px-8 py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90 hover:-translate-y-0.5 flex items-center gap-2"
                                    style={{ background: highlightColor, color: 'white' }}
                                >
                                    <Mail className="w-4 h-4" />
                                    Contact Me
                                </a>
                                <a
                                    href="#projects"
                                    className="px-8 py-4 rounded-xl font-bold text-sm bg-white/10 backdrop-blur-sm text-white transition-all hover:bg-white/20 flex items-center gap-2"
                                >
                                    View Portfolio
                                </a>
                            </motion.div>
                        </motion.div>

                        {/* Right Stats Grid */}
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={containerVariants}
                            className="grid grid-cols-2 gap-4"
                        >
                            {heroStats.map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    variants={scaleIn}
                                    custom={index * 0.1}
                                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"
                                >
                                    <StatCounter
                                        value={parseInt(stat.value) || 0}
                                        suffix={stat.value.includes('+') ? '+' : ''}
                                        label={stat.label}
                                        color={stat.color}
                                    />
                                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                                        <stat.icon className="w-4 h-4 text-white/60" />
                                        <span className="text-xs text-white/60">{stat.label}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2"
                >
                    <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-3 rounded-full bg-white/50"
                        />
                    </div>
                </motion.div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 relative bg-white">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={fadeUp} className="text-center mb-16">
                            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: `${themeColor}10`, color: themeColor }}>
                                About Me
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Data-Driven Professional</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">
                                Combining technical expertise with creative problem-solving to deliver exceptional results
                            </p>
                        </motion.div>

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Bio Card */}
                            <motion.div
                                variants={fadeUp}
                                className="lg:col-span-2 bg-slate-50 rounded-2xl p-8 border border-slate-100 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-40 h-40 opacity-5" style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)` }} />

                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4">My Story</h3>
                                    <p className="text-slate-600 leading-relaxed mb-4">
                                        {profile.headline || `Passionate ${title} with expertise in building scalable applications and driving technical innovation. Known for translating complex requirements into elegant, user-friendly solutions.`}
                                    </p>
                                    <p className="text-slate-600 leading-relaxed">
                                        {profile.education ? `With a background from ${profile.education}, I've developed a strong foundation in software engineering principles and best practices. My journey includes working with diverse teams to deliver products that make a real impact.` : 'Throughout my career, I have consistently delivered high-quality solutions while maintaining a focus on code quality, testing, and documentation. I believe in continuous learning and staying updated with the latest technologies.'}
                                    </p>

                                    {/* Visual Stats Row */}
                                    <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-200">
                                        <div className="text-center">
                                            <div className="text-3xl font-black font-mono mb-1" style={{ color: themeColor }}>{yearsExp}+</div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider">Years</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{companiesCount}</div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider">Companies</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-black font-mono mb-1" style={{ color: '#10b981' }}>{projectsCount}+</div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider">Projects</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Quick Facts */}
                            <motion.div variants={fadeUp} className="space-y-4">
                                <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${themeColor}15` }}>
                                            <Target className="w-5 h-5" style={{ color: themeColor }} />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Focus Areas</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {['Full-Stack Development', 'System Design', 'Performance Optimization', 'Technical Leadership'].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: highlightColor }} />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${highlightColor}15` }}>
                                            <TrendingUp className="w-5 h-5" style={{ color: highlightColor }} />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Key Strengths</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {['Problem Solving', 'Communication', 'Team Leadership', 'Agile'].map((item, i) => (
                                            <span key={i} className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: `${highlightColor}10`, color: highlightColor }}>
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Skills Section */}
            <section id="skills" className="py-20 relative" style={{ background: '#f8fafc' }}>
                <GridPattern />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={fadeUp} className="text-center mb-16">
                            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: `${highlightColor}15`, color: highlightColor }}>
                                Expertise
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Technical Skills</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">
                                A comprehensive overview of my technical capabilities and proficiency levels
                            </p>
                        </motion.div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Skills Chart */}
                            <motion.div variants={slideInLeft} className="bg-white rounded-2xl p-8 shadow-md border border-slate-100">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-slate-900">Skill Proficiency</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 rounded" style={{ background: themeColor }} /> Languages
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 rounded" style={{ background: highlightColor }} /> Frameworks
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-3 h-3 rounded" style={{ background: '#10b981' }} /> Tools
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {skillLevels.slice(0, 8).map((skill, index) => {
                                        const color = skill.category === 'Lang' ? themeColor :
                                                     skill.category === 'Framework' ? highlightColor : '#10b981'
                                        return (
                                            <SkillBar
                                                key={skill.name}
                                                skill={skill.name}
                                                level={skill.level}
                                                category={skill.category}
                                                color={color}
                                                index={index}
                                            />
                                        )
                                    })}
                                </div>
                            </motion.div>

                            {/* Skills Overview Cards */}
                            <motion.div variants={slideInRight} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${themeColor}15` }}>
                                                <Code2 className="w-5 h-5" style={{ color: themeColor }} />
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black font-mono" style={{ color: themeColor }}>
                                                    {profile.skills_languages?.length || 0}
                                                </div>
                                                <div className="text-xs text-slate-500">Languages</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile.skills_languages?.slice(0, 3).map((lang, i) => (
                                                <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{lang}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${highlightColor}15` }}>
                                                <Star className="w-5 h-5" style={{ color: highlightColor }} />
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black font-mono" style={{ color: highlightColor }}>
                                                    {profile.skills_frameworks?.length || 0}
                                                </div>
                                                <div className="text-xs text-slate-500">Frameworks</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile.skills_frameworks?.slice(0, 3).map((fw, i) => (
                                                <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{fw}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
                                    <h4 className="font-bold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" style={{ color: highlightColor }} />
                                        Career Progression
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Starting Point</span>
                                            <span className="text-sm font-semibold">Junior Developer</span>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ background: highlightColor }}
                                                initial={{ width: 0 }}
                                                whileInView={{ width: '100%' }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1.5, delay: 0.5 }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Current Level</span>
                                            <span className="text-sm font-semibold">{title}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Next Milestone</span>
                                            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: `${highlightColor}20`, color: highlightColor }}>
                                                Senior / Lead
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10b98115' }}>
                                            <Briefcase className="w-5 h-5" style={{ color: '#10b981' }} />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black font-mono" style={{ color: '#10b981' }}>
                                                {profile.skills_tools?.length || 0}
                                            </div>
                                            <div className="text-xs text-slate-500">Tools & Platforms</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {profile.skills_tools?.slice(0, 6).map((tool, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{tool}</span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={fadeUp} className="text-center mb-16">
                            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: `${themeColor}10`, color: themeColor }}>
                                Portfolio
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Featured Projects</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">
                                A selection of projects that showcase my skills and impact
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {profile.resume_facts_projects && profile.resume_facts_projects.length > 0 ? (
                                profile.resume_facts_projects.map((project, index) => (
                                    <ProjectCard
                                        key={index}
                                        title={project}
                                        description="Led end-to-end development of this project, from requirements gathering to deployment and maintenance."
                                        technologies={allSkills.slice(0, 4)}
                                        metrics={['100+ Users', '99.9% Uptime', '50% Faster', '5K+ Tests']}
                                        color={index % 3 === 0 ? themeColor : index % 3 === 1 ? highlightColor : '#10b981'}
                                        index={index}
                                    />
                                ))
                            ) : (
                                <>
                                    <ProjectCard
                                        title="E-Commerce Platform"
                                        description="Built a full-featured e-commerce solution with real-time inventory management and payment processing."
                                        technologies={['React', 'Node.js', 'PostgreSQL', 'Stripe']}
                                        metrics={['10K+ Orders', '99.9% Uptime', '2s Load Time', '4.8 Rating']}
                                        color={themeColor}
                                        index={0}
                                    />
                                    <ProjectCard
                                        title="Data Analytics Dashboard"
                                        description="Designed and implemented a real-time analytics platform for monitoring business metrics."
                                        technologies={['TypeScript', 'D3.js', 'Python', 'AWS']}
                                        metrics={['1M+ Data Points', 'Real-time', '50+ Charts', 'Auto Reports']}
                                        color={highlightColor}
                                        index={1}
                                    />
                                    <ProjectCard
                                        title="Mobile App Integration"
                                        description="Created a cross-platform mobile application with seamless API integration and offline support."
                                        technologies={['React Native', 'GraphQL', 'Firebase', 'Redux']}
                                        metrics={['100K+ Downloads', '4.7 Stars', '50K+ Daily', '30% Retention']}
                                        color="#10b981"
                                        index={2}
                                    />
                                </>
                            )}
                        </div>

                        {/* Project Stats */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
                        >
                            {[
                                { label: 'Total Projects', value: projectsCount.toString(), icon: Briefcase, color: themeColor },
                                { label: 'Technologies', value: skillsCount.toString(), icon: Code2, color: highlightColor },
                                { label: 'Code Commits', value: '2.5K+', icon: Trophy, color: '#10b981' },
                                { label: 'Open Source', value: '15+', icon: Globe, color: '#8b5cf6' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100">
                                    <stat.icon className="w-6 h-6 mx-auto mb-3" style={{ color: stat.color }} />
                                    <div className="text-2xl font-black font-mono" style={{ color: stat.color }}>{stat.value}</div>
                                    <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Experience Section */}
            <section id="experience" className="py-20 relative" style={{ background: '#f8fafc' }}>
                <GridPattern />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={fadeUp} className="text-center mb-16">
                            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: `${highlightColor}15`, color: highlightColor }}>
                                Career
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Work Experience</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">
                                My professional journey and key achievements
                            </p>
                        </motion.div>

                        <div className="max-w-3xl mx-auto">
                            {(profile.resume_facts_companies || []).length > 0 ? (
                                profile.resume_facts_companies.map((company, index) => (
                                    <TimelineItem
                                        key={index}
                                        title={title}
                                        company={company}
                                        period={`${2024 - index * 2} - Present`}
                                        description="Led development initiatives, mentored junior developers, and delivered high-impact projects that improved system performance and user experience."
                                        metrics={(profile.resume_facts_metrics || []).slice(index * 3, index * 3 + 3)}
                                        color={index % 2 === 0 ? themeColor : highlightColor}
                                        index={index}
                                    />
                                ))
                            ) : (
                                <>
                                    <TimelineItem
                                        title={title}
                                        company="Tech Innovation Corp"
                                        period="2022 - Present"
                                        description="Leading development of enterprise-scale applications, managing cross-functional teams, and driving technical strategy."
                                        metrics={['40% Performance Boost', '5 Team Members', '99.9% Uptime']}
                                        color={themeColor}
                                        index={0}
                                    />
                                    <TimelineItem
                                        title="Senior Software Engineer"
                                        company="Digital Solutions Inc"
                                        period="2020 - 2022"
                                        description="Architected and implemented microservices platform that reduced deployment time by 60% and improved system reliability."
                                        metrics={['60% Faster Deploys', '3x Scale', '50+ Integrations']}
                                        color={highlightColor}
                                        index={1}
                             />
                                    <TimelineItem
                                        title="Software Developer"
                                        company="StartUp Ventures"
                                        period="2018 - 2020"
                                        description="Built core product features from scratch, contributed to design system, and established testing practices."
                                        metrics={['20+ Features', '95% Coverage', '5 Major Releases']}
                                        color="#10b981"
                                        index={2}
                                    />
                                </>
                            )}
                        </div>

                        {/* Experience Summary */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white"
                        >
                            <h3 className="text-xl font-bold mb-6 text-center">Career Snapshot</h3>
                            <div className="grid md:grid-cols-4 gap-6 text-center">
                                <div>
                                    <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{yearsExp}+</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Years in Tech</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{companiesCount}</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Companies</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{projectsCount}+</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Projects Shipped</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{skillsCount}+</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Technologies</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Education Section */}
            <section id="education" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={fadeUp} className="text-center mb-16">
                            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: `${themeColor}10`, color: themeColor }}>
                                Education
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Academic Background</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">
                                Foundation of knowledge that powers my technical expertise
                            </p>
                        </motion.div>

                        <div className="max-w-3xl mx-auto">
                            {(profile.resume_facts_schools || []).length > 0 ? (
                                profile.resume_facts_schools.map((school, index) => (
                                    <motion.div key={index} variants={fadeUp} className="mb-6">
                                        <EducationCard
                                            institution={school}
                                            degree={profile.education || "Bachelor's Degree in Computer Science"}
                                            period="2014 - 2018"
                                            grade="3.8"
                                            color={index % 2 === 0 ? themeColor : highlightColor}
                                        />
                                    </motion.div>
                                ))
                            ) : (
                                <>
                                    <EducationCard
                                        institution="University of Technology"
                                        degree="Bachelor of Science in Computer Science"
                                        period="2014 - 2018"
                                        grade="3.8"
                                        color={themeColor}
                                    />
                                    <EducationCard
                                        institution="Online Certifications Platform"
                                        degree="Multiple Technical Certifications"
                                        period="2018 - Present"
                                        grade="Verified"
                                        color={highlightColor}
                                    />
                                </>
                            )}
                        </div>

                        {/* Education Stats */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-12 grid md:grid-cols-3 gap-6 max-w-2xl mx-auto"
                        >
                            {[
                                { label: 'Degree', value: "Bachelor's", color: themeColor },
                                { label: 'GPA', value: '3.8/4.0', color: highlightColor },
                                { label: 'Certifications', value: `${(profile.resume_facts_metrics || []).length || 5}+`, color: '#10b981' }
                            ].map((stat, i) => (
                                <div key={i} className="text-center p-6 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="text-2xl font-black font-mono mb-1" style={{ color: stat.color }}>{stat.value}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Certifications Section */}
            <section id="certifications" className="py-20 relative" style={{ background: '#f8fafc' }}>
                <GridPattern />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={fadeUp} className="text-center mb-16">
                            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: `${highlightColor}15`, color: highlightColor }}>
                                Credentials
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Certifications</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">
                                Professional certifications and achievements
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {[
                                { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', date: '2024', color: '#ff9900' },
                                { name: 'Google Cloud Professional', issuer: 'Google Cloud', date: '2023', color: '#4285f4' },
                                { name: 'Certified Kubernetes Administrator', issuer: 'CNCF', date: '2023', color: '#326ce5' },
                                { name: 'Meta Frontend Developer', issuer: 'Meta', date: '2023', color: '#0668e1' },
                                { name: 'MongoDB Developer', issuer: 'MongoDB University', date: '2022', color: '#00684a' },
                                { name: 'Scrum Master Certified', issuer: 'Scrum Alliance', date: '2022', color: '#0094cf' }
                            ].map((cert, index) => (
                                <CertificationBadge
                                    key={index}
                                    name={cert.name}
                                    issuer={cert.issuer}
                                    date={cert.date}
                                    color={cert.color}
                                />
                            ))}
                        </div>

                        {/* Certification Stats */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-12 flex justify-center gap-8 flex-wrap"
                        >
                            {[
                                { label: 'Total Certifications', value: '12+' },
                                { label: 'Cloud Platforms', value: '3' },
                                { label: 'Years Validated', value: '4+' }
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-2xl font-black font-mono" style={{ color: highlightColor }}>{stat.value}</div>
                                    <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={fadeUp} className="text-center mb-16">
                            <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: `${themeColor}10`, color: themeColor }}>
                                Contact
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Get In Touch</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">
                                Ready to discuss opportunities? Let's connect.
                            </p>
                        </motion.div>

                        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                            {/* Contact Info */}
                            <motion.div variants={slideInLeft}>
                                <h3 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h3>

                                <div className="space-y-6 mb-8">
                                    {profile.email && (
                                        <a href={`mailto:${profile.email}`} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${themeColor}15` }}>
                                                <Mail className="w-5 h-5" style={{ color: themeColor }} />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">Email</div>
                                                <div className="font-semibold text-slate-900 group-hover:underline">{profile.email}</div>
                                            </div>
                                        </a>
                                    )}

                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${highlightColor}15` }}>
                                            <MapPin className="w-5 h-5" style={{ color: highlightColor }} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider">Location</div>
                                            <div className="font-semibold text-slate-900">{location}</div>
                                        </div>
                                    </div>

                                    {profile.linkedin && (
                                        <a href={profile.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#0077b515' }}>
                                                <Linkedin className="w-5 h-5 text-[#0077b5]" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">LinkedIn</div>
                                                <div className="font-semibold text-slate-900 group-hover:underline">Connect with me</div>
                                            </div>
                                        </a>
                                    )}

                                    {profile.github && (
                                        <a href={profile.github} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#33333315' }}>
                                                <Github className="w-5 h-5 text-[#333]" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">GitHub</div>
                                                <div className="font-semibold text-slate-900 group-hover:underline">View my work</div>
                                            </div>
                                        </a>
                                    )}
                                </div>

                                {/* Availability Status */}
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                        <span className="font-bold">Available for Opportunities</span>
                                    </div>
                                    <p className="text-sm text-slate-300">
                                        Currently exploring new opportunities. Open to remote work and hybrid arrangements.
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-slate-400">Experience Level</div>
                                            <div className="font-semibold">{title}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400">Work Mode</div>
                                            <div className="font-semibold">Remote / Hybrid</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Contact Form */}
                            <motion.div variants={slideInRight}>
                                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                                    <h3 className="text-xl font-bold text-slate-900 mb-6">Send a Message</h3>
                                    <ContactForm email={profile.email || ''} color={themeColor} />
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 relative" style={{ background: themeColor, color: 'white' }}>
                <GridPattern />

                <div className="container mx-auto px-6 relative z-10">
                    {/* Data Summary Row */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 pb-12 border-b border-white/10"
                    >
                        <div className="text-center">
                            <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{yearsExp}+</div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">Years Exp</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{skillsCount}+</div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">Technologies</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>{projectsCount}+</div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">Projects</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black font-mono mb-1" style={{ color: highlightColor }}>12+</div>
                            <div className="text-xs text-white/60 uppercase tracking-wider">Certifications</div>
                        </div>
                    </motion.div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left">
                            <h3 className="text-xl font-bold mb-1">{name}</h3>
                            <p className="text-sm text-white/60">{title}</p>
                        </div>

                        <div className="flex items-center gap-4">
                            {profile.linkedin && (
                                <a href={profile.linkedin} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            )}
                            {profile.github && (
                                <a href={profile.github} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                    <Github className="w-5 h-5" />
                                </a>
                            )}
                            {profile.email && (
                                <a href={`mailto:${profile.email}`} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </a>
                            )}
                        </div>

                        <div className="text-center md:text-right">
                            <p className="text-xs text-white/40">
                                Built with data and passion
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                                &copy; {new Date().getFullYear()} {name}
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}