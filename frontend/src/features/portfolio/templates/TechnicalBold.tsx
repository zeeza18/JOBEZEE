import { motion } from 'framer-motion'
import type { PortfolioTemplateProps } from '../types'
import { getThemeById } from '../themes/themeSystem'

// ── Animation Variants ────────────────────────────────────────────────────────
const fadeUp: any = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
}

const _fadeIn: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8 } }
}

const slideInLeft: any = {
  hidden: { opacity: 0, x: -80 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}

const slideInRight: any = {
  hidden: { opacity: 0, x: 80 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}

const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
}

const _stagger: any = {
  show: { transition: { staggerChildren: 0.1 } },
}

const container: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 }
  }
}

// ── Decorative Components ──────────────────────────────────────────────────────

function FloatingShape({
  size = 200,
  color = '#facc15',
  top = '10%',
  left = '5%',
  delay = 0,
  duration = 8
}: {
  size?: number
  color?: string
  top?: string
  left?: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: color,
        opacity: 0.15,
        transform: 'rotate(45deg)'
      }}
      animate={{
        y: [0, -30, 0],
        rotate: [45, 55, 45],
        opacity: [0.15, 0.25, 0.15]
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: 'easeInOut'
      }}
    />
  )
}

function DiagonalStrip({
  width = 300,
  height = 20,
  color = '#ef4444',
  top = '30%',
  right = '10%',
  delay = 0
}: {
  width?: number
  height?: number
  color?: string
  top?: string
  right?: string
  delay?: number
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width,
        height,
        top,
        right,
        background: color
      }}
      initial={{ scaleX: 0, originX: 1 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

function _PunchShadow({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{
        x: 4,
        y: 4,
        transition: { duration: 0.15 }
      }}
      className={`relative ${className}`}
    >
      <div className="absolute inset-0 translate-x-4 translate-y-4 bg-black" />
      <div className="relative bg-white">
        {children}
      </div>
    </motion.div>
  )
}

function BigNumberBadge({
  number,
  label,
  color = '#000000'
}: {
  number: string | number
  label: string
  color?: string
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="inline-flex flex-col items-center justify-center p-6 border-4 border-black bg-white"
      style={{ boxShadow: '4px 4px 0px #000000' }}
    >
      <span className="text-5xl md:text-6xl font-black leading-none" style={{ color }}>{number}</span>
      <span className="text-xs font-bold uppercase tracking-widest mt-2 text-gray-600">{label}</span>
    </motion.div>
  )
}

function BoldCard({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{
        x: 6,
        y: 6,
        transition: { duration: 0.15 }
      }}
      className={`border-4 border-black bg-white ${className}`}
      style={{ boxShadow: '6px 6px 0px #000000' }}
    >
      {children}
    </motion.div>
  )
}

function GradientText({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={className}
      style={{
        background: 'linear-gradient(135deg, #facc15, #ef4444)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}
    >
      {children}
    </span>
  )
}

function SkillBar({
  skill,
  level = 85,
  delay = 0
}: {
  skill: string
  level?: number
  delay?: number
}) {
  return (
    <motion.div
      className="mb-6"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, x: -40 },
        show: { opacity: 1, x: 0, transition: { duration: 0.5, delay } }
      }}
    >
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-lg font-black uppercase tracking-wide">{skill}</span>
        <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{level}%</span>
      </div>
      <div className="h-4 bg-gray-200 border-2 border-black relative overflow-hidden">
        <motion.div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, #facc15, #ef4444)'
          }}
          initial={{ width: 0 }}
          whileInView={{ width: `${level}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  )
}

function TimelineItem({
  title,
  company,
  period,
  description,
  index = 0
}: {
  title: string
  company: string
  period: string
  description: string
  index?: number
}) {
  return (
    <motion.div
      className="relative pl-12 pb-12"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, x: -50 },
        show: { opacity: 1, x: 0, transition: { duration: 0.6, delay: index * 0.15 } }
      }}
    >
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-4 bg-black" />

      {/* Dot */}
      <motion.div
        className="absolute left-0 top-0 w-8 h-8 bg-white border-4 border-black flex items-center justify-center"
        style={{ boxShadow: '2px 2px 0px #000000' }}
        whileHover={{ scale: 1.2 }}
      >
        <div className="w-3 h-3 bg-black" />
      </motion.div>

      {/* Content */}
      <BoldCard className="p-6 ml-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h4 className="text-xl font-black uppercase">{title}</h4>
          <span className="text-sm font-bold px-3 py-1 bg-black text-white">{period}</span>
        </div>
        <p className="text-lg font-bold mb-2" style={{ color: '#facc15' }}>{company}</p>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </BoldCard>
    </motion.div>
  )
}

function ProjectCard({
  title,
  description,
  tech,
  index = 0
}: {
  title: string
  description: string
  tech: string[]
  index?: number
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 60, rotate: -2 },
        show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.6, delay: index * 0.1 } }
      }}
    >
      <motion.div
        whileHover={{
          x: 8,
          y: 8,
          rotate: 1,
          transition: { duration: 0.2 }
        }}
        className="border-4 border-black bg-white h-full"
        style={{ boxShadow: '8px 8px 0px #000000' }}
      >
        {/* Project number */}
        <div className="bg-black text-white px-6 py-3">
          <span className="text-3xl font-black">0{index + 1}</span>
        </div>

        {/* Content */}
        <div className="p-8">
          <h4 className="text-2xl md:text-3xl font-black uppercase mb-4 leading-tight">{title}</h4>
          <div className="h-2 w-20 mb-4" style={{ background: 'linear-gradient(90deg, #facc15, #ef4444)' }} />
          <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-2">
            {tech.map((t, i) => (
              <motion.span
                key={i}
                whileHover={{ scale: 1.05, y: -2 }}
                className="text-xs font-bold uppercase tracking-wider px-3 py-2 bg-black text-white"
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-2" style={{ background: 'linear-gradient(90deg, #facc15, #ef4444)' }} />
      </motion.div>
    </motion.div>
  )
}

// ── Main Template Component ────────────────────────────────────────────────────

export default function TechnicalBold({
  profile,
  primaryColor: _primaryColor,
  accentColor: _accentColor,
  showSections,
  heroGradient: _heroGradient,
  profilePhoto
}: PortfolioTemplateProps) {
  // Get theme config from themeSystem
  const themeConfig = getThemeById('technical-bold')

  // Profile data extraction
  const name = profile.full_name || profile.preferred_name || 'Developer'
  const title = profile.current_job_title || profile.target_role || 'Software Engineer'
  const headline = profile.headline || `Building exceptional digital experiences with ${profile.years_experience ? profile.years_experience + ' years' : ''} of expertise in modern technologies.`
  const bio = headline

  // Combine all skills
  const allSkills = [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || [])
  ]

  // Get unique skills for display (first 12)
  const displaySkills = [...new Set(allSkills)].slice(0, 12)

  // Parse projects from resume_facts_projects (format: "Title | Description | Tech1,Tech2,Tech3")
  const projects = (profile.resume_facts_projects || []).map((p: string) => {
    const parts = p.split('|').map(s => s.trim())
    return {
      title: parts[0] || p,
      description: parts[1] || 'Innovative project showcasing technical excellence and creative problem-solving.',
      tech: parts[2] ? parts[2].split(',').map(s => s.trim()) : displaySkills.slice(0, 3)
    }
  })

  // Get experience/companies
  const companies = profile.resume_facts_companies || []
  const metrics = profile.resume_facts_metrics || []

  // Education
  const schools = profile.resume_facts_schools || []

  // Calculate metrics
  const yearsExp = profile.years_experience || '5'
  const totalProjects = profile.resume_facts_projects?.length || projects.length || 8
  const totalCompanies = companies.length || 3

  // Color system from theme
  const _colors = themeConfig?.colors || {
    primary: '#000000',
    secondary: '#facc15',
    accent: '#ef4444',
    background: '#ffffff',
    gradient: ['#facc15', '#ef4444']
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: '#ffffff',
        color: '#000000',
        fontFamily: "'Inter', sans-serif",
        borderRadius: 0
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');

        .font-heading {
          font-family: 'Space Grotesk', 'Archivo Black', sans-serif;
        }

        .font-body {
          font-family: 'Inter', sans-serif;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(45deg); }
          50% { transform: translateY(-20px) rotate(55deg); }
        }

        @keyframes pulse-accent {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes slide-right {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }

        @keyframes width-expand {
          0% { width: 0; }
          100% { width: 100%; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-pulse-accent {
          animation: pulse-accent 2s ease-in-out infinite;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION - FULL SCREEN */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background: _heroGradient || 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
        }}
      >
        {/* Background decorative shapes */}
        <FloatingShape size={400} color="#facc15" top="5%" left="-5%" delay={0} duration={10} />
        <FloatingShape size={300} color="#ef4444" top="60%" left="80%" delay={2} duration={8} />
        <FloatingShape size={200} color="#000000" top="20%" left="75%" delay={1} duration={12} />
        <FloatingShape size={150} color="#facc15" top="75%" left="15%" delay={3} duration={9} />

        {/* Diagonal stripes */}
        <DiagonalStrip width={400} height={15} color="#facc15" top="15%" right="-5%" delay={0.5} />
        <DiagonalStrip width={300} height={10} color="#ef4444" top="25%" right="0%" delay={1} />
        <DiagonalStrip width={500} height={8} color="#000000" top="80%" right="-10%" delay={1.5} />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="text-center"
          >
            {/* Top label */}
            <motion.div variants={fadeUp} className="mb-8">
              <span
                className="inline-block px-6 py-3 bg-black text-white text-sm font-black uppercase tracking-widest"
                style={{ boxShadow: '4px 4px 0px #facc15' }}
              >
                Portfolio
              </span>
            </motion.div>

            {/* Main title - MASSIVE */}
            <motion.h1
              variants={fadeUp}
              className="font-heading text-[80px] md:text-[120px] lg:text-[150px] xl:text-[180px] leading-[0.85] tracking-tighter mb-8"
            >
              <span className="block">{name.split(' ')[0]}</span>
              <span
                className="block"
                style={{
                  WebkitTextStroke: '3px #000',
                  color: 'transparent',
                  background: 'linear-gradient(135deg, #facc15, #ef4444)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {name.split(' ').slice(1).join(' ') || 'BOLD'}
              </span>
            </motion.h1>

            {/* Title */}
            <motion.div variants={fadeUp} className="mb-8">
              <p className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-widest">
                {title}
              </p>
            </motion.div>

            {/* Divider */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 mb-10">
              <div className="h-1 w-20 bg-black" />
              <div className="h-3 w-3 bg-black rotate-45" />
              <div className="h-1 w-20 bg-black" />
            </motion.div>

            {/* Tagline */}
            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl max-w-2xl mx-auto mb-12 text-gray-700 font-medium"
            >
              {headline}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
              <motion.a
                href="#contact"
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-5 bg-black text-white text-lg font-black uppercase tracking-wider border-4 border-black"
                style={{ boxShadow: '6px 6px 0px #facc15' }}
              >
                Get In Touch
              </motion.a>
              <motion.a
                href="#projects"
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-5 bg-white text-black text-lg font-black uppercase tracking-wider border-4 border-black"
                style={{ boxShadow: '6px 6px 0px #000000' }}
              >
                View Work
              </motion.a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap justify-center gap-6 md:gap-12 mt-16"
            >
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-black">{yearsExp}+</p>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mt-2">Years Exp</p>
              </div>
              <div className="w-px bg-black opacity-20 hidden md:block" />
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-black">{totalProjects}</p>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mt-2">Projects</p>
              </div>
              <div className="w-px bg-black opacity-20 hidden md:block" />
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-black">{totalCompanies}</p>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mt-2">Companies</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-8 h-12 border-4 border-black flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-black" />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABOUT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section
        id="about"
        className="py-24 md:py-32 border-t-4 border-black"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={container}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
          >
            {/* Left - Profile image / decorative */}
            <motion.div variants={slideInLeft}>
              <div className="relative">
                {/* Main image container */}
                <div
                  className="relative border-4 border-black"
                  style={{ boxShadow: '8px 8px 0px #000000' }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                      <div className="text-center">
                        <div
                          className="w-40 h-40 md:w-56 md:h-56 mx-auto bg-black text-white flex items-center justify-center text-6xl md:text-8xl font-black"
                        >
                          {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Floating accent */}
                <motion.div
                  className="absolute -bottom-6 -right-6 w-32 h-32 md:w-48 md:h-48 border-4 border-black bg-white"
                  style={{ boxShadow: '6px 6px 0px #facc15' }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="h-full w-full flex flex-col items-center justify-center">
                    <span className="text-3xl md:text-4xl font-black">{yearsExp}</span>
                    <span className="text-xs font-bold uppercase">Years</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Right - Text content */}
            <motion.div variants={slideInRight}>
              {/* Section label */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-1 w-12 bg-black" />
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#ef4444' }}>
                  About Me
                </span>
              </div>

              {/* Heading */}
              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight">
                Building the
                <br />
                <GradientText>Future</GradientText> of
                <br />
                Digital.
              </h2>

              {/* Bio */}
              <div className="space-y-6 mb-10">
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-medium">
                  {bio}
                </p>
                <p className="text-base text-gray-600 leading-relaxed">
                  Passionate about crafting clean, efficient, and scalable solutions. I bring a relentless drive for excellence and a keen eye for detail to every project I undertake.
                </p>
              </div>

              {/* Quick facts */}
              <div className="grid grid-cols-2 gap-4">
                <BigNumberBadge number={yearsExp} label="Years Exp" color="#000000" />
                <BigNumberBadge number={totalProjects} label="Projects" color="#facc15" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SKILLS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.skills && displaySkills.length > 0 && (
        <section
          id="skills"
          className="py-24 md:py-32 bg-black text-white"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            {/* Section header */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={container}
              className="mb-16"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-6">
                <div className="h-1 w-12 bg-white" />
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#facc15' }}>
                  Expertise
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-heading text-5xl md:text-7xl lg:text-8xl font-black">
                Skills &
                <br />
                <span style={{ color: '#facc15' }}>Abilities</span>
              </motion.h2>
            </motion.div>

            {/* Skills grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-8">
              {displaySkills.map((skill, index) => (
                <SkillBar
                  key={skill}
                  skill={skill}
                  level={Math.min(95, 50 + Math.random() * 45)}
                  delay={index * 0.08}
                />
              ))}
            </div>

            {/* Additional skill tags */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 pt-12 border-t-2 border-gray-800"
            >
              <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">Technologies I Work With</p>
              <div className="flex flex-wrap gap-3">
                {displaySkills.map((skill, index) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + index * 0.03 }}
                    whileHover={{ scale: 1.1, y: -3 }}
                    className="px-4 py-2 border-2 border-white text-sm font-bold uppercase tracking-wide"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PROJECTS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.projects && projects.length > 0 && (
        <section
          id="projects"
          className="py-24 md:py-32 border-t-4 border-black"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            {/* Section header */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={container}
              className="mb-16"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-6">
                <div className="h-1 w-12 bg-black" />
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#ef4444' }}>
                  Selected Work
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-heading text-5xl md:text-7xl lg:text-8xl font-black">
                Featured
                <br />
                <GradientText>Projects</GradientText>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-lg text-gray-600 mt-6 max-w-xl">
                A showcase of my most impactful work and technical achievements.
              </motion.p>
            </motion.div>

            {/* Projects grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.slice(0, 6).map((project, index) => (
                <ProjectCard
                  key={index}
                  title={project.title}
                  description={project.description}
                  tech={project.tech}
                  index={index}
                />
              ))}
            </div>

            {/* View more CTA */}
            {projects.length > 6 && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-16 text-center"
              >
                <a
                  href="#contact"
                  className="inline-block px-12 py-5 bg-black text-white text-lg font-black uppercase tracking-wider border-4 border-black"
                  style={{ boxShadow: '6px 6px 0px #facc15' }}
                >
                  View All Projects ({projects.length}+)
                </a>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* EXPERIENCE SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.experience && companies.length > 0 && (
        <section
          id="experience"
          className="py-24 md:py-32 bg-gray-50 border-t-4 border-black"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            {/* Section header */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={container}
              className="mb-16"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-6">
                <div className="h-1 w-12 bg-black" />
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#ef4444' }}>
                  Career Path
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-heading text-5xl md:text-7xl lg:text-8xl font-black">
                Work
                <br />
                <span style={{ color: '#facc15' }}>Experience</span>
              </motion.h2>
            </motion.div>

            {/* Timeline */}
            <div className="relative max-w-4xl">
              {/* Main vertical line */}
              <div className="absolute left-8 top-0 bottom-0 w-4 bg-black hidden md:block" />

              {companies.map((company, index) => (
                <TimelineItem
                  key={index}
                  title={title}
                  company={company}
                  period={profile.earliest_start || '2020 - Present'}
                  description={
                    metrics[index * 2] ||
                    `Led development of key platform features, driving technical excellence and team growth. ${index + 1} year${index > 0 ? 's' : ''} at this company.`
                  }
                  index={index}
                />
              ))}

              {/* End marker */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute left-0 md:left-4 bottom-0 w-16 h-16 bg-black text-white flex items-center justify-center"
              >
                <span className="text-xs font-black uppercase">End</span>
              </motion.div>
            </div>

            {/* Metrics highlights */}
            {metrics.length > 0 && (
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={container}
                className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                {metrics.slice(0, 4).map((metric, index) => (
                  <motion.div
                    key={index}
                    variants={scaleIn}
                    className="p-6 bg-white border-4 border-black"
                    style={{ boxShadow: '4px 4px 0px #000000' }}
                  >
                    <div className="h-2 w-12 mb-4" style={{ background: 'linear-gradient(90deg, #facc15, #ef4444)' }} />
                    <p className="text-sm font-medium text-gray-600 leading-relaxed">{metric}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* EDUCATION SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.education && (schools.length > 0 || profile.education) && (
        <section
          id="education"
          className="py-24 md:py-32 border-t-4 border-black"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            {/* Section header */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={container}
              className="mb-16"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-6">
                <div className="h-1 w-12 bg-black" />
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#ef4444' }}>
                  Academic Background
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-heading text-5xl md:text-7xl lg:text-8xl font-black">
                Education &
                <br />
                <GradientText>Training</GradientText>
              </motion.h2>
            </motion.div>

            {/* Education cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {schools.length > 0 ? schools.map((school, index) => (
                <motion.div
                  key={index}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0, y: 50 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.1 } }
                  }}
                >
                  <BoldCard className="p-8 h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 bg-black flex items-center justify-center">
                        <span className="text-white text-2xl font-black">ED</span>
                      </div>
                      <span className="text-sm font-bold px-3 py-1 bg-gray-100">Degree</span>
                    </div>
                    <h4 className="text-2xl font-black uppercase mb-2">{school}</h4>
                    {profile.education && (
                      <p className="text-gray-600 font-medium">{profile.education}</p>
                    )}
                  </BoldCard>
                </motion.div>
              )) : profile.education && (
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <BoldCard className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 bg-black flex items-center justify-center">
                        <span className="text-white text-2xl font-black">ED</span>
                      </div>
                      <span className="text-sm font-bold px-3 py-1 bg-gray-100">Education</span>
                    </div>
                    <h4 className="text-2xl font-black uppercase mb-2">{profile.education}</h4>
                    <p className="text-gray-600 font-medium">Academic Background</p>
                  </BoldCard>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CONTACT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showSections.contact && (
        <section
          id="contact"
          className="py-24 md:py-32 bg-black text-white relative overflow-hidden"
        >
          {/* Background accents */}
          <FloatingShape size={500} color="#facc15" top="-10%" left="-15%" delay={0} duration={15} />
          <FloatingShape size={400} color="#ef4444" top="50%" left="75%" delay={2} duration={12} />

          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
            {/* Section header */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={container}
              className="mb-16 text-center"
            >
              <motion.h2 variants={fadeUp} className="font-heading text-5xl md:text-7xl lg:text-9xl font-black">
                Let&apos;s
                <br />
                <span style={{ color: '#facc15' }}>Talk.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-xl text-gray-400 mt-8 max-w-2xl mx-auto">
                Ready to bring your vision to life? Let&apos;s discuss how I can help with your next project.
              </motion.p>
            </motion.div>

            {/* Contact cards */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={container}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
            >
              {/* Email */}
              {profile.email && (
                <motion.a
                  variants={scaleIn}
                  href={`mailto:${profile.email}`}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-8 bg-white text-black border-4 border-white"
                  style={{ boxShadow: '6px 6px 0px #facc15' }}
                >
                  <div className="h-16 w-16 bg-black text-white flex items-center justify-center mb-6 text-2xl font-black">@</div>
                  <h4 className="text-lg font-black uppercase mb-2">Email</h4>
                  <p className="text-gray-600 text-sm break-all">{profile.email}</p>
                </motion.a>
              )}

              {/* LinkedIn */}
              {profile.linkedin && (
                <motion.a
                  variants={scaleIn}
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-8 bg-white text-black border-4 border-white"
                  style={{ boxShadow: '6px 6px 0px #ef4444' }}
                >
                  <div className="h-16 w-16 bg-black text-white flex items-center justify-center mb-6 text-2xl font-black">IN</div>
                  <h4 className="text-lg font-black uppercase mb-2">LinkedIn</h4>
                  <p className="text-gray-600 text-sm">Connect with me</p>
                </motion.a>
              )}

              {/* GitHub */}
              {profile.github && (
                <motion.a
                  variants={scaleIn}
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-8 bg-white text-black border-4 border-white"
                  style={{ boxShadow: '6px 6px 0px #000000' }}
                >
                  <div className="h-16 w-16 bg-black text-white flex items-center justify-center mb-6 text-2xl font-black">GH</div>
                  <h4 className="text-lg font-black uppercase mb-2">GitHub</h4>
                  <p className="text-gray-600 text-sm">View my code</p>
                </motion.a>
              )}
            </motion.div>

            {/* Big CTA Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center"
            >
              <motion.a
                href={profile.email ? `mailto:${profile.email}` : '#'}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block px-16 py-8 text-2xl md:text-3xl font-black uppercase tracking-wider text-black bg-white border-4 border-white"
                style={{ boxShadow: '8px 8px 0px #facc15' }}
              >
                Start a Conversation
              </motion.a>
            </motion.div>

            {/* Location if available */}
            {(profile.city || profile.country) && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-16 text-center"
              >
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500">
                  Based in {[profile.city, profile.country].filter(Boolean).join(', ')}
                </p>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="py-8 border-t-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 bg-black text-white flex items-center justify-center text-lg font-black"
              >
                {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-lg">{name}</p>
                <p className="text-sm text-gray-500">{title}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  LinkedIn
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  GitHub
                </a>
              )}
              <span className="text-sm font-bold uppercase tracking-wider text-gray-400">
                &copy; {new Date().getFullYear()}
              </span>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-400 font-medium">
              Built with JobEzee Portfolio Builder
            </p>
            <div className="flex gap-4">
              <div className="h-2 w-20 bg-black" />
              <div className="h-2 w-12" style={{ background: 'linear-gradient(90deg, #facc15, #ef4444)' }} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
