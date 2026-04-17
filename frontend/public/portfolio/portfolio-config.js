;(function () {
  const DEFAULT_PORTFOLIO = {
    user: {
      name: 'Alex Johnson',
      title: 'Product Designer & Developer',
      tagline: 'I craft digital experiences that people love.',
      email: 'alex@example.com',
      phone: '+1 (555) 000-0000',
      location: 'New York, USA',
      linkedin: 'https://linkedin.com/in/alexjohnson',
      github: 'https://github.com/alexjohnson',
      website: 'https://alexjohnson.dev',
      avatar: 'https://i.pravatar.cc/300?img=12',
      bio: "I'm a multidisciplinary designer and developer with 5+ years of experience building products at the intersection of design, technology, and business. I believe great work comes from deep collaboration and relentless curiosity.",
      resumeUrl: '#'
    },
    skills: [
      { name: 'UI/UX Design', level: 92 },
      { name: 'React / Next.js', level: 88 },
      { name: 'Python', level: 75 },
      { name: 'Figma', level: 95 },
      { name: 'Node.js', level: 70 },
      { name: 'Data Analysis', level: 65 }
    ],
    experience: [
      {
        company: 'Stripe',
        role: 'Senior Product Designer',
        period: '2022 - Present',
        description: 'Led redesign of the merchant dashboard, improving task completion rate by 34%. Collaborated with 3 engineering teams across 2 product areas.'
      },
      {
        company: 'Shopify',
        role: 'UX Engineer',
        period: '2020 - 2022',
        description: 'Built accessible component library used by 60+ internal teams. Reduced design-dev handoff time by 40%.'
      },
      {
        company: 'Freelance',
        role: 'Designer & Developer',
        period: '2018 - 2020',
        description: 'Delivered 25+ projects for clients across fintech, healthcare, and e-commerce.'
      }
    ],
    projects: [
      {
        title: 'DashKit',
        description: 'An open-source analytics dashboard template built with React and Recharts. 1,200+ GitHub stars.',
        tags: ['React', 'TypeScript', 'Recharts'],
        image: 'https://picsum.photos/seed/dashkit/800/560',
        liveUrl: '#',
        githubUrl: '#',
        featured: true
      },
      {
        title: 'Flowboard',
        description: 'A Kanban-style project management tool with real-time collaboration powered by WebSockets.',
        tags: ['Next.js', 'Supabase', 'Tailwind'],
        image: 'https://picsum.photos/seed/flowboard/800/560',
        liveUrl: '#',
        githubUrl: '#',
        featured: true
      },
      {
        title: 'Palette Studio',
        description: 'AI-powered color palette generator for designers. Generates accessible palettes from a seed color.',
        tags: ['Python', 'FastAPI', 'Vue.js'],
        image: 'https://picsum.photos/seed/palette/800/560',
        liveUrl: '#',
        githubUrl: '#',
        featured: false
      },
      {
        title: 'NutriTrack',
        description: 'Mobile-first nutrition tracking app with barcode scanning and macro breakdowns.',
        tags: ['React Native', 'Firebase'],
        image: 'https://picsum.photos/seed/nutri/800/560',
        liveUrl: '#',
        githubUrl: '#',
        featured: false
      }
    ],
    education: [
      {
        school: 'Carnegie Mellon University',
        degree: 'B.S. in Human-Computer Interaction',
        period: '2014 - 2018',
        note: 'Minor in Computer Science'
      }
    ],
    themes: {
      'modern-minimal': {
        '--color-bg': '#FAFAFA',
        '--color-surface': '#FFFFFF',
        '--color-primary': '#18181B',
        '--color-accent': '#2563EB',
        '--color-text': '#09090B',
        '--color-muted': '#71717A',
        '--color-border': '#E4E4E7',
        '--font-heading': "'Archivo', sans-serif",
        '--font-body': "'Space Grotesk', sans-serif"
      },
      'bold-impactful': {
        '--color-bg': '#0A0A0A',
        '--color-surface': '#141414',
        '--color-primary': '#FFFFFF',
        '--color-accent': '#FF3B00',
        '--color-text': '#F5F5F5',
        '--color-muted': '#888888',
        '--color-border': '#2A2A2A',
        '--font-heading': "'Bebas Neue', sans-serif",
        '--font-body': "'Inter', sans-serif"
      },
      'dark-sleek': {
        '--color-bg': '#0D0D0D',
        '--color-surface': '#161616',
        '--color-primary': '#E8E8E8',
        '--color-accent': '#C9A96E',
        '--color-text': '#EFEFEF',
        '--color-muted': '#666666',
        '--color-border': '#262626',
        '--font-heading': "'Syne', sans-serif",
        '--font-body': "'DM Sans', sans-serif"
      },
      'warm-human': {
        '--color-bg': '#FAF7F2',
        '--color-surface': '#FFFFFF',
        '--color-primary': '#2C2416',
        '--color-accent': '#C0622B',
        '--color-text': '#2C2416',
        '--color-muted': '#8C7B6B',
        '--color-border': '#E8DDD2',
        '--font-heading': "'Lora', serif",
        '--font-body': "'Inter', sans-serif"
      },
      'creative-studio': {
        '--color-bg': '#F0EDEB',
        '--color-surface': '#FFFFFF',
        '--color-primary': '#1A1A1A',
        '--color-accent': '#7B5EA7',
        '--color-text': '#1A1A1A',
        '--color-muted': '#888888',
        '--color-border': '#DDDAD6',
        '--font-heading': "'Raleway', sans-serif",
        '--font-body': "'Inter', sans-serif"
      },
      'tech-cyber': {
        '--color-bg': '#040A10',
        '--color-surface': '#071018',
        '--color-primary': '#00FF88',
        '--color-accent': '#00BFFF',
        '--color-text': '#C8D6DF',
        '--color-muted': '#4A6070',
        '--color-border': '#0F2030',
        '--font-heading': "'JetBrains Mono', monospace",
        '--font-body': "'Fira Code', monospace"
      },
      'classic-professional': {
        '--color-bg': '#F8F8F6',
        '--color-surface': '#FFFFFF',
        '--color-primary': '#1B2A4A',
        '--color-accent': '#2A5298',
        '--color-text': '#1B2A4A',
        '--color-muted': '#6B7B8D',
        '--color-border': '#DDE2E8',
        '--font-heading': "'Playfair Display', serif",
        '--font-body': "'Source Sans 3', sans-serif"
      },
      'vibrant-playful': {
        '--color-bg': '#FFFBF0',
        '--color-surface': '#FFFFFF',
        '--color-primary': '#1A1A2E',
        '--color-accent': '#FF6B6B',
        '--color-text': '#1A1A2E',
        '--color-muted': '#888888',
        '--color-border': '#FFE0D6',
        '--font-heading': "'Plus Jakarta Sans', sans-serif",
        '--font-body': "'Nunito', sans-serif"
      },
      editorial: {
        '--color-bg': '#FDFCFA',
        '--color-surface': '#FFFFFF',
        '--color-primary': '#111111',
        '--color-accent': '#E63946',
        '--color-text': '#111111',
        '--color-muted': '#777777',
        '--color-border': '#E8E4DF',
        '--font-heading': "'Playfair Display', serif",
        '--font-body': "'IBM Plex Serif', serif"
      },
      'glass-depth': {
        '--color-bg': '#0F0C29',
        '--color-surface': 'rgba(255,255,255,0.08)',
        '--color-primary': '#FFFFFF',
        '--color-accent': '#A78BFA',
        '--color-text': '#F0F0FF',
        '--color-muted': '#8888BB',
        '--color-border': 'rgba(255,255,255,0.12)',
        '--font-heading': "'Outfit', sans-serif",
        '--font-body': "'DM Sans', sans-serif"
      },
      'nature-organic': {
        '--color-bg': '#F4F1EC',
        '--color-surface': '#FEFCF8',
        '--color-primary': '#2C3E2D',
        '--color-accent': '#5C7A3E',
        '--color-text': '#2C3E2D',
        '--color-muted': '#7A8C6E',
        '--color-border': '#D8D0C4',
        '--font-heading': "'Cormorant Garamond', serif",
        '--font-body': "'Jost', sans-serif"
      },
      'retro-vintage': {
        '--color-bg': '#F5F0E8',
        '--color-surface': '#FDF8EF',
        '--color-primary': '#2E1A0E',
        '--color-accent': '#B5451B',
        '--color-text': '#2E1A0E',
        '--color-muted': '#8C7060',
        '--color-border': '#DDD0BC',
        '--font-heading': "'Arvo', serif",
        '--font-body': "'Karla', sans-serif"
      }
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function mergeThemeMaps(base, override) {
    const next = clone(base)
    Object.keys(override || {}).forEach(function (themeKey) {
      next.themes[themeKey] = Object.assign({}, next.themes[themeKey] || {}, override[themeKey] || {})
    })
    return next.themes
  }

  function readOverride() {
    try {
      const raw = window.localStorage.getItem('portfolio-editor-state')
      return raw ? JSON.parse(raw) : null
    } catch (error) {
      return null
    }
  }

  const override = readOverride()
  const merged = clone(DEFAULT_PORTFOLIO)
  if (override) {
    Object.assign(merged.user, override.user || {})
    merged.skills = Array.isArray(override.skills) ? override.skills : merged.skills
    merged.experience = Array.isArray(override.experience) ? override.experience : merged.experience
    merged.projects = Array.isArray(override.projects) ? override.projects : merged.projects
    merged.education = Array.isArray(override.education) ? override.education : merged.education
    merged.themes = mergeThemeMaps(merged, override.themes || {})
  }

  window.__PORTFOLIO_DEFAULT__ = clone(DEFAULT_PORTFOLIO)
  window.PORTFOLIO = merged
})()
