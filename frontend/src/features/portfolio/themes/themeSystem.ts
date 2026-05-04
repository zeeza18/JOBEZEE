// ── Portfolio Theme System ─────────────────────────────────────────────────────
// Each theme is a complete design system: colors, typography, layout, animation, rules

export type AnimationIntensity = 'none' | 'low' | 'medium' | 'high'

export interface ColorSystem {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textMuted: string
  card: string
  border: string
  shadow: string
  gradient: string[]
  overlay: string
}

export interface FontSystem {
  heading: string
  body: string
  button: string
  mono: string
  weights: { regular: number; medium: number; bold: number }
}

export interface AnimationConfig {
  pageLoad: string
  scrollReveal: string
  hover: string
  hero: string
  transitions: string
  intensity: AnimationIntensity
}

export interface LayoutSection {
  id: string
  label: string
  required: boolean
  order: number
}

export interface ImageRule {
  allowed: boolean
  positions: string[]
  style: 'cover' | 'contain' | 'fill' | 'none'
  overlay?: number
  borderRadius?: number
  filters?: string[]
}

export interface EditableField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'color' | 'image' | 'select' | 'list'
  required: boolean
  section: string
}

// ── Theme Definition ──────────────────────────────────────────────────────────
export interface ThemeConfig {
  id: string
  name: string
  category: string
  tagline: string
  description: string
  designMeaning: string

  colors: ColorSystem
  fonts: FontSystem
  spacing: 'tight' | 'normal' | 'airy'
  borderRadius: number
  shadowStyle: 'none' | 'subtle' | 'medium' | 'strong'
  layoutStyle: 'grid' | 'free' | 'magazine'

  sections: LayoutSection[]
  animations: AnimationConfig
  imageRules: ImageRule
  editableFields: EditableField[]

  tags: string[] // e.g. ['minimal', 'clean', 'professional']
}

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICAL CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

const TECHNICAL: ThemeConfig[] = [

  // ── MODERN ───────────────────────────────────────────────────────────────
  {
    id: 'technical-modern',
    name: 'Modern',
    category: 'Technical',
    tagline: 'Clean. Sharp. Professional.',
    description: 'A crisp, grid-based layout with sharp typography and subtle gradients. Perfect for engineers who value clarity and precision.',
    designMeaning: 'Represents discipline and clarity — the modern developer who ships clean code and clean interfaces.',
    colors: {
      primary: '#0a0a0a',
      secondary: '#6366f1',
      accent: '#22d3ee',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      card: '#ffffff',
      border: '#e2e8f0',
      shadow: '0 1px 3px rgba(0,0,0,0.08)',
      gradient: ['#6366f1', '#22d3ee'],
      overlay: 'rgba(99,102,241,0.08)',
    },
    fonts: {
      heading: "'Inter', 'SF Pro', sans-serif",
      body: "'Inter', 'SF Pro', sans-serif",
      button: "'Inter', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
      weights: { regular: 400, medium: 500, bold: 700 },
    },
    spacing: 'normal',
    borderRadius: 8,
    shadowStyle: 'subtle',
    layoutStyle: 'grid',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'education', label: 'Education', required: false, order: 6 },
      { id: 'certifications', label: 'Certifications', required: false, order: 7 },
      { id: 'contact', label: 'Contact', required: true, order: 8 },
      { id: 'footer', label: 'Footer', required: false, order: 9 },
    ],
    animations: {
      pageLoad: 'fadeUp 0.6s ease-out, stagger 0.08s between children',
      scrollReveal: 'opacity 0→1 + translateY 20→0px, 0.5s ease-out',
      hover: 'scale(1.02) + shadow lift, 0.2s',
      hero: 'textSplit reveal, 0.8s, blur(0) from blur(10px)',
      transitions: 'fade 0.3s ease',
      intensity: 'medium',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-bg', 'project-card', 'about-section'],
      style: 'cover',
      overlay: 0.6,
      borderRadius: 12,
      filters: ['brightness(0.95)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title / Role', type: 'text', required: true, section: 'hero' },
      { key: 'headline', label: 'Short Headline', type: 'text', required: false, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'education', label: 'Education', type: 'list', required: false, section: 'education' },
      { key: 'certifications', label: 'Certifications', type: 'list', required: false, section: 'certifications' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn URL', type: 'text', required: false, section: 'contact' },
      { key: 'github', label: 'GitHub URL', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
      { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['minimal', 'clean', 'professional', 'grid'],
  },

  // ── BOLD ─────────────────────────────────────────────────────────────────
  {
    id: 'technical-bold',
    name: 'Bold',
    category: 'Technical',
    tagline: 'Big. Loud. Unmissable.',
    description: 'High-contrast, massive typography with punchy animations. For devs who aren\'t afraid to stand out.',
    designMeaning: 'Confidence and impact — every element is oversized, every statement is intentional. This is your highlight reel.',
    colors: {
      primary: '#000000',
      secondary: '#facc15',
      accent: '#ef4444',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#000000',
      textMuted: '#525252',
      card: '#ffffff',
      border: '#000000',
      shadow: '4px 4px 0px #000000',
      gradient: ['#facc15', '#ef4444'],
      overlay: 'rgba(0,0,0,0.7)',
    },
    fonts: {
      heading: "'Space Grotesk', 'Archivo Black', sans-serif",
      body: "'Inter', sans-serif",
      button: "'Space Grotesk', sans-serif",
      mono: "'Space Mono', monospace",
      weights: { regular: 400, medium: 600, bold: 900 },
    },
    spacing: 'tight',
    borderRadius: 0,
    shadowStyle: 'strong',
    layoutStyle: 'free',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'contact', label: 'Contact', required: true, order: 6 },
    ],
    animations: {
      pageLoad: 'slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      scrollReveal: 'scale(0.9)→scale(1) + opacity, 0.4s',
      hover: 'translateY(-4px) + shadow punch, 0.15s',
      hero: 'letterSplit stagger, 1s, bold impact',
      transitions: 'clip-path wipe, 0.4s',
      intensity: 'high',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-full', 'project-card'],
      style: 'cover',
      overlay: 0.85,
      borderRadius: 0,
      filters: ['contrast(1.1)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['impact', 'loud', 'oversized', 'high-contrast'],
  },

  // ── SLEEK ────────────────────────────────────────────────────────────────
  {
    id: 'technical-sleek',
    name: 'Sleek',
    category: 'Technical',
    tagline: 'Dark. Minimal. Elite.',
    description: 'Dark-mode-first with glass morphism, smooth transitions, and refined typography. Premium feel without the fluff.',
    designMeaning: 'Refinement and depth — the developer who obsesses over the 1% details that separate good from great.',
    colors: {
      primary: '#f1f5f9',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
      background: '#0f0f0f',
      surface: '#1a1a1a',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      card: 'rgba(255,255,255,0.05)',
      border: 'rgba(255,255,255,0.1)',
      shadow: '0 4px 24px rgba(0,0,0,0.5)',
      gradient: ['#8b5cf6', '#06b6d4'],
      overlay: 'rgba(0,0,0,0.6)',
    },
    fonts: {
      heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
      body: "'Plus Jakarta Sans', sans-serif",
      button: "'Plus Jakarta Sans', sans-serif",
      mono: "'Fira Code', monospace",
      weights: { regular: 300, medium: 500, bold: 700 },
    },
    spacing: 'airy',
    borderRadius: 16,
    shadowStyle: 'medium',
    layoutStyle: 'free',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'education', label: 'Education', required: false, order: 6 },
      { id: 'certifications', label: 'Certifications', required: false, order: 7 },
      { id: 'contact', label: 'Contact', required: true, order: 8 },
      { id: 'footer', label: 'Footer', required: false, order: 9 },
    ],
    animations: {
      pageLoad: 'fadeIn 1s ease-out + blur(0) from blur(20px)',
      scrollReveal: 'translateY(30px)→0 + opacity, 0.6s ease-out',
      hover: 'translateY(-2px) + glow border, 0.3s',
      hero: 'typewriter + cursor blink, 2s',
      transitions: 'smooth ease-in-out, 0.4s',
      intensity: 'low',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-bg', 'project-card', 'about-section'],
      style: 'cover',
      overlay: 0.75,
      borderRadius: 16,
      filters: ['brightness(0.8)', 'saturate(0.9)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'headline', label: 'Tagline', type: 'text', required: false, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'education', label: 'Education', type: 'list', required: false, section: 'education' },
      { key: 'certifications', label: 'Certifications', type: 'list', required: false, section: 'certifications' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'github', label: 'GitHub', type: 'text', required: false, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['dark', 'glass', 'elite', 'premium', 'minimal'],
  },

  // ── WARM ─────────────────────────────────────────────────────────────────
  {
    id: 'technical-warm',
    name: 'Warm',
    category: 'Technical',
    tagline: 'Human. Approachable. Real.',
    description: 'Soft colors, rounded shapes, and friendly typography. Technical skills presented with a human touch.',
    designMeaning: 'Authenticity and approachability — proves you can be both technically excellent and genuinely personable.',
    colors: {
      primary: '#1c1917',
      secondary: '#f97316',
      accent: '#eab308',
      background: '#fffbeb',
      surface: '#fef9c3',
      text: '#1c1917',
      textMuted: '#78716c',
      card: '#ffffff',
      border: '#fde68a',
      shadow: '0 2px 12px rgba(249,115,22,0.15)',
      gradient: ['#f97316', '#eab308'],
      overlay: 'rgba(253,230,138,0.5)',
    },
    fonts: {
      heading: "'Nunito', 'Quicksand', sans-serif",
      body: "'Nunito', sans-serif",
      button: "'Nunito', sans-serif",
      mono: "'Fira Code', monospace",
      weights: { regular: 400, medium: 600, bold: 800 },
    },
    spacing: 'airy',
    borderRadius: 20,
    shadowStyle: 'subtle',
    layoutStyle: 'grid',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'education', label: 'Education', required: false, order: 6 },
      { id: 'contact', label: 'Contact', required: true, order: 7 },
      { id: 'footer', label: 'Footer', required: false, order: 8 },
    ],
    animations: {
      pageLoad: 'bounceIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
      scrollReveal: 'slideUp + soft bounce, 0.5s',
      hover: 'scale(1.03) + warm glow, 0.25s',
      hero: 'wordByWord reveal, 0.6s',
      transitions: 'ease-out, 0.35s',
      intensity: 'medium',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-split', 'project-card', 'about-section'],
      style: 'cover',
      overlay: 0.3,
      borderRadius: 20,
      filters: ['sepia(0.1)', 'brightness(1.02)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'education', label: 'Education', type: 'list', required: false, section: 'education' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['friendly', 'rounded', 'human', 'approachable'],
  },

  // ── CREATIVE TECHIE ──────────────────────────────────────────────────────
  {
    id: 'technical-creative',
    name: 'Creative Techie',
    category: 'Technical',
    tagline: 'Weird. Wired. Wonderful.',
    description: 'For developers who also have an eye for design — experimental layouts, neon accents, and unexpected grid breaks.',
    designMeaning: 'Dual identity — you write code AND care about aesthetics. This theme proves technical skill and creative vision coexist.',
    colors: {
      primary: '#0f0f23',
      secondary: '#00ff88',
      accent: '#ff00ff',
      background: '#0a0a1a',
      surface: '#12122a',
      text: '#e0e0ff',
      textMuted: '#8888aa',
      card: 'rgba(0,255,136,0.05)',
      border: 'rgba(0,255,136,0.2)',
      shadow: '0 0 20px rgba(0,255,136,0.15)',
      gradient: ['#00ff88', '#ff00ff', '#00ffff'],
      overlay: 'rgba(15,15,35,0.8)',
    },
    fonts: {
      heading: "'Syne', 'Archivo Black', sans-serif",
      body: "'Space Grotesk', sans-serif",
      button: "'Space Grotesk', sans-serif",
      mono: "'JetBrains Mono', monospace",
      weights: { regular: 400, medium: 600, bold: 800 },
    },
    spacing: 'tight',
    borderRadius: 4,
    shadowStyle: 'medium',
    layoutStyle: 'free',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'contact', label: 'Contact', required: true, order: 6 },
    ],
    animations: {
      pageLoad: 'glitchIn 0.6s + scanline effect',
      scrollReveal: 'horizontalSlide + neon flash, 0.4s',
      hover: 'glow + glitch micro, 0.15s',
      hero: 'matrix rain + typeFlicker, 2s loop',
      transitions: 'warp/distort, 0.3s',
      intensity: 'high',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-bg', 'project-card', 'bg-decoration'],
      style: 'cover',
      overlay: 0.85,
      borderRadius: 4,
      filters: ['hue-rotate(20deg)', 'contrast(1.2)', 'saturate(1.3)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'github', label: 'GitHub', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
      { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['experimental', 'neon', 'grid-break', 'creative', 'cyber'],
  },

  // ── CLASSIC PROFESSIONAL ─────────────────────────────────────────────────
  {
    id: 'technical-classic',
    name: 'Classic Professional',
    category: 'Technical',
    tagline: 'Timeless. Trusted. Tried.',
    description: 'Structured like a well-formatted resume. Conservative palette, traditional hierarchy. Gets you past ATS and hiring managers.',
    designMeaning: 'Traditional competence — proven methods, no-nonsense presentation. Shows you respect the craft through fundamentals.',
    colors: {
      primary: '#1e3a5f',
      secondary: '#2563eb',
      accent: '#d97706',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      card: '#ffffff',
      border: '#cbd5e1',
      shadow: '0 1px 4px rgba(0,0,0,0.06)',
      gradient: ['#1e3a5f', '#2563eb'],
      overlay: 'rgba(30,58,95,0.07)',
    },
    fonts: {
      heading: "'Merriweather', 'Georgia', serif",
      body: "'Source Sans Pro', 'Helvetica Neue', sans-serif",
      button: "'Source Sans Pro', sans-serif",
      mono: "'Courier Prime', monospace",
      weights: { regular: 400, medium: 600, bold: 700 },
    },
    spacing: 'normal',
    borderRadius: 4,
    shadowStyle: 'subtle',
    layoutStyle: 'grid',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: true, order: 5 },
      { id: 'education', label: 'Education', required: true, order: 6 },
      { id: 'certifications', label: 'Certifications', required: false, order: 7 },
      { id: 'contact', label: 'Contact', required: true, order: 8 },
      { id: 'footer', label: 'Footer', required: false, order: 9 },
    ],
    animations: {
      pageLoad: 'fadeIn 0.5s ease',
      scrollReveal: 'opacity 0→1, 0.4s',
      hover: 'subtle shadow lift, 0.2s',
      hero: 'underline draw, 0.6s',
      transitions: 'ease, 0.3s',
      intensity: 'low',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-split', 'project-card'],
      style: 'cover',
      overlay: 0.5,
      borderRadius: 4,
      filters: ['grayscale(0.1)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: true, section: 'experience' },
      { key: 'education', label: 'Education', type: 'list', required: true, section: 'education' },
      { key: 'certifications', label: 'Certifications', type: 'list', required: false, section: 'certifications' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['traditional', 'professional', 'structured', 'ATS-safe'],
  },

  // ── VIBRANT ───────────────────────────────────────────────────────────────
  {
    id: 'technical-vibrant',
    name: 'Vibrant',
    category: 'Technical',
    tagline: 'Colorful. Energetic. Alive.',
    description: 'Full-spectrum color palette with punchy gradients and playful motion. For frontend devs and creative technologists.',
    designMeaning: 'Energy and enthusiasm — shows you bring not just skills but passion and color to everything you build.',
    colors: {
      primary: '#7c3aed',
      secondary: '#f472b6',
      accent: '#fbbf24',
      background: '#fdf4ff',
      surface: '#faf5ff',
      text: '#1e1b4b',
      textMuted: '#7c3aed',
      card: '#ffffff',
      border: '#e9d5ff',
      shadow: '0 4px 16px rgba(124,58,237,0.2)',
      gradient: ['#7c3aed', '#f472b6', '#fbbf24'],
      overlay: 'rgba(253,244,255,0.7)',
    },
    fonts: {
      heading: "'Clash Display', 'Poppins', sans-serif",
      body: "'Poppins', sans-serif",
      button: "'Poppins', sans-serif",
      mono: "'Fira Code', monospace",
      weights: { regular: 400, medium: 600, bold: 700 },
    },
    spacing: 'normal',
    borderRadius: 16,
    shadowStyle: 'medium',
    layoutStyle: 'free',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'contact', label: 'Contact', required: true, order: 6 },
    ],
    animations: {
      pageLoad: 'rainbowSlide 0.7s + bounce children',
      scrollReveal: 'springBounce + colorShift, 0.5s',
      hover: 'gradientShift + scale(1.05), 0.2s',
      hero: 'colorPulse loop, 3s ease-in-out infinite',
      transitions: 'bounce, 0.4s',
      intensity: 'high',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-bg', 'project-card', 'about-section'],
      style: 'cover',
      overlay: 0.4,
      borderRadius: 16,
      filters: ['saturate(1.2)', 'contrast(1.05)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
      { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['colorful', 'energetic', 'playful', 'gradients'],
  },

  // ── GLOSSY ────────────────────────────────────────────────────────────────
  {
    id: 'technical-glossy',
    name: 'Glossy',
    category: 'Technical',
    tagline: 'Sleek. Shiny. Premium.',
    description: 'Apple-inspired glossy cards, glass morphism panels, and deep blacks. The premium portfolio for senior engineers.',
    designMeaning: 'Excellence and polish — every surface is intentional, every shadow is calculated. You ship products people love to use.',
    colors: {
      primary: '#ffffff',
      secondary: '#3b82f6',
      accent: '#0ea5e9',
      background: '#000000',
      surface: '#0a0a0a',
      text: '#ffffff',
      textMuted: '#a1a1aa',
      card: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.12)',
      shadow: '0 8px 32px rgba(59,130,246,0.2)',
      gradient: ['#3b82f6', '#0ea5e9'],
      overlay: 'rgba(0,0,0,0.5)',
    },
    fonts: {
      heading: "'SF Pro Display', 'Inter', sans-serif",
      body: "'SF Pro Text', 'Inter', sans-serif",
      button: "'SF Pro Text', sans-serif",
      mono: "'SF Mono', 'Fira Code', monospace",
      weights: { regular: 400, medium: 500, bold: 600 },
    },
    spacing: 'airy',
    borderRadius: 20,
    shadowStyle: 'medium',
    layoutStyle: 'grid',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'education', label: 'Education', required: false, order: 6 },
      { id: 'certifications', label: 'Certifications', required: false, order: 7 },
      { id: 'contact', label: 'Contact', required: true, order: 8 },
      { id: 'footer', label: 'Footer', required: false, order: 9 },
    ],
    animations: {
      pageLoad: 'glassShine 0.8s + fadeIn',
      scrollReveal: 'blur(8px)→blur(0) + translateY(20→0), 0.6s',
      hover: 'shine sweep + glass glow, 0.3s',
      hero: 'gradient drift, 4s infinite',
      transitions: 'smooth ease, 0.4s',
      intensity: 'medium',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-bg', 'project-card', 'about-section'],
      style: 'cover',
      overlay: 0.6,
      borderRadius: 20,
      filters: ['brightness(0.85)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'headline', label: 'Headline', type: 'text', required: false, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'education', label: 'Education', type: 'list', required: false, section: 'education' },
      { key: 'certifications', label: 'Certifications', type: 'list', required: false, section: 'certifications' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'github', label: 'GitHub', type: 'text', required: false, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
      { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['glossy', 'glass', 'premium', 'apple-style', 'dark'],
  },

  // ── NATURE ───────────────────────────────────────────────────────────────
  {
    id: 'technical-nature',
    name: 'Nature',
    category: 'Technical',
    tagline: 'Grounded. Organic. Calm.',
    description: 'Earth tones, organic shapes, and breathing whitespace. For devs who bring mindfulness to their craft.',
    designMeaning: 'Balance and sustainability — shows you think long-term, care about the environment of your work, and build things that last.',
    colors: {
      primary: '#1a2e1a',
      secondary: '#4ade80',
      accent: '#a3e635',
      background: '#f0fdf4',
      surface: '#dcfce7',
      text: '#1a2e1a',
      textMuted: '#4b5563',
      card: '#ffffff',
      border: '#bbf7d0',
      shadow: '0 2px 12px rgba(74,222,128,0.12)',
      gradient: ['#4ade80', '#a3e635'],
      overlay: 'rgba(220,252,231,0.6)',
    },
    fonts: {
      heading: "'Fraunces', 'Lora', serif",
      body: "'DM Sans', sans-serif",
      button: "'DM Sans', sans-serif",
      mono: "'Fira Code', monospace",
      weights: { regular: 400, medium: 500, bold: 600 },
    },
    spacing: 'airy',
    borderRadius: 24,
    shadowStyle: 'subtle',
    layoutStyle: 'free',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'education', label: 'Education', required: false, order: 6 },
      { id: 'contact', label: 'Contact', required: true, order: 7 },
      { id: 'footer', label: 'Footer', required: false, order: 8 },
    ],
    animations: {
      pageLoad: 'growUp 0.8s ease-out + leaf float',
      scrollReveal: 'scale(0.95)→scale(1) + opacity, 0.6s',
      hover: 'lift + green glow, 0.25s',
      hero: 'plantGrow metaphor, 2s ease-out',
      transitions: 'natural ease, 0.5s',
      intensity: 'low',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-split', 'project-card', 'about-section'],
      style: 'cover',
      overlay: 0.25,
      borderRadius: 24,
      filters: ['sepia(0.05)', 'saturate(0.95)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'education', label: 'Education', type: 'list', required: false, section: 'education' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['organic', 'earthy', 'calm', 'mindful', 'green'],
  },

  // ── RETRO VINTAGE ─────────────────────────────────────────────────────────
  {
    id: 'technical-retro',
    name: 'Retro Vintage',
    category: 'Technical',
    tagline: 'Nostalgic. Crafted. Classic.',
    description: 'Vintage printing aesthetic with textured backgrounds, serif headlines, and muted earth palette. For the full-stack historian.',
    designMeaning: 'Heritage and craftsmanship — proves you respect where technology came from while building what comes next.',
    colors: {
      primary: '#2d1b00',
      secondary: '#92400e',
      accent: '#b45309',
      background: '#fef3c7',
      surface: '#fff7ed',
      text: '#2d1b00',
      textMuted: '#92400e',
      card: '#fffbf0',
      border: '#d97706',
      shadow: '2px 2px 0px #b45309',
      gradient: ['#92400e', '#b45309'],
      overlay: 'rgba(254,243,199,0.7)',
    },
    fonts: {
      heading: "'Playfair Display', 'Georgia', serif",
      body: "'Lora', 'Times New Roman', serif",
      button: "'Playfair Display', serif",
      mono: "'Courier Prime', monospace",
      weights: { regular: 400, medium: 600, bold: 700 },
    },
    spacing: 'normal',
    borderRadius: 0,
    shadowStyle: 'strong',
    layoutStyle: 'grid',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'education', label: 'Education', required: false, order: 6 },
      { id: 'contact', label: 'Contact', required: true, order: 7 },
      { id: 'footer', label: 'Footer', required: false, order: 8 },
    ],
    animations: {
      pageLoad: 'typewriter 0.8s + fadeIn',
      scrollReveal: 'slideIn from left, 0.5s',
      hover: 'underline grow + shadow shift, 0.2s',
      hero: 'flicker candle, 1.5s',
      transitions: 'fade, 0.4s',
      intensity: 'low',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-split', 'project-card'],
      style: 'cover',
      overlay: 0.4,
      borderRadius: 0,
      filters: ['sepia(0.4)', 'contrast(0.95)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'education', label: 'Education', type: 'list', required: false, section: 'education' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['vintage', 'print', 'serif', 'nostalgic', 'classic'],
  },

  // ── ANIMATED ──────────────────────────────────────────────────────────────
  {
    id: 'technical-animated',
    name: 'Animated',
    category: 'Technical',
    tagline: 'Living. Moving. Breathing.',
    description: 'Rich motion design with parallax layers, scroll-driven animations, and micro-interactions throughout. For motion-minded devs.',
    designMeaning: 'Life and dynamism — shows your work isn\'t static, it responds, reacts, and evolves. Motion is the message.',
    colors: {
      primary: '#0c0c0c',
      secondary: '#a855f7',
      accent: '#06b6d4',
      background: '#09090b',
      surface: '#18181b',
      text: '#fafafa',
      textMuted: '#a1a1aa',
      card: 'rgba(168,85,247,0.08)',
      border: 'rgba(168,85,247,0.2)',
      shadow: '0 8px 40px rgba(168,85,247,0.15)',
      gradient: ['#a855f7', '#06b6d4'],
      overlay: 'rgba(9,9,11,0.7)',
    },
    fonts: {
      heading: "'Clash Display', 'Poppins', sans-serif",
      body: "'Space Grotesk', sans-serif",
      button: "'Space Grotesk', sans-serif",
      mono: "'JetBrains Mono', monospace",
      weights: { regular: 400, medium: 500, bold: 700 },
    },
    spacing: 'normal',
    borderRadius: 12,
    shadowStyle: 'medium',
    layoutStyle: 'free',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'contact', label: 'Contact', required: true, order: 6 },
    ],
    animations: {
      pageLoad: 'parallaxLayers 1s + floating elements',
      scrollReveal: 'parallax + opacity + translateZ, 0.5s',
      hover: 'scale(1.04) + shadow pulse + border glow, 0.2s',
      hero: 'floating layers + depth blur + text morph, continuous',
      transitions: 'smooth transform + opacity, 0.4s',
      intensity: 'high',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-bg', 'project-card', 'about-section'],
      style: 'cover',
      overlay: 0.7,
      borderRadius: 12,
      filters: ['brightness(0.85)', 'contrast(1.1)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'github', label: 'GitHub', type: 'text', required: false, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
      { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, section: 'theme' },
      { key: 'animationIntensity', label: 'Animation Intensity', type: 'select', required: false, section: 'theme' },
    ],
    tags: ['motion', 'parallax', 'dynamic', 'interactive', 'rich'],
  },

  // ── GRAPHICY ──────────────────────────────────────────────────────────────
  {
    id: 'technical-graphicy',
    name: 'Graphicy',
    category: 'Technical',
    tagline: 'Data-Driven. Design-Heavy. Bold.',
    description: 'Infographic-style layout with charts, grids, bold shapes, and visual storytelling. For data engineers and designers.',
    designMeaning: 'Data as design — proves you can transform complex information into compelling visual narratives.',
    colors: {
      primary: '#0f172a',
      secondary: '#3b82f6',
      accent: '#f97316',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      card: '#ffffff',
      border: '#e2e8f0',
      shadow: '0 4px 20px rgba(15,23,42,0.1)',
      gradient: ['#3b82f6', '#f97316'],
      overlay: 'rgba(248,250,252,0.8)',
    },
    fonts: {
      heading: "'DM Sans', 'Inter', sans-serif",
      body: "'DM Sans', sans-serif",
      button: "'DM Sans', sans-serif",
      mono: "'JetBrains Mono', monospace",
      weights: { regular: 400, medium: 600, bold: 800 },
    },
    spacing: 'tight',
    borderRadius: 8,
    shadowStyle: 'medium',
    layoutStyle: 'free',
    sections: [
      { id: 'hero', label: 'Hero', required: true, order: 1 },
      { id: 'about', label: 'About', required: true, order: 2 },
      { id: 'skills', label: 'Skills', required: true, order: 3 },
      { id: 'projects', label: 'Projects', required: true, order: 4 },
      { id: 'experience', label: 'Experience', required: false, order: 5 },
      { id: 'contact', label: 'Contact', required: true, order: 6 },
    ],
    animations: {
      pageLoad: 'dataReveal 0.8s — bars fill, numbers count up',
      scrollReveal: 'chartDraw + gridFade, 0.5s',
      hover: 'highlight + tooltip, 0.2s',
      hero: 'numberCountUp + barFill, 1.5s',
      transitions: 'slide, 0.3s',
      intensity: 'medium',
    },
    imageRules: {
      allowed: true,
      positions: ['hero-bg', 'project-card', 'stats-bg'],
      style: 'cover',
      overlay: 0.6,
      borderRadius: 8,
      filters: ['contrast(1.1)', 'brightness(0.95)'],
    },
    editableFields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'hero' },
      { key: 'title', label: 'Job Title', type: 'text', required: true, section: 'hero' },
      { key: 'bio', label: 'About Me', type: 'textarea', required: true, section: 'about' },
      { key: 'photo', label: 'Profile Photo', type: 'image', required: false, section: 'hero' },
      { key: 'skills', label: 'Skills', type: 'list', required: true, section: 'skills' },
      { key: 'projects', label: 'Projects', type: 'list', required: true, section: 'projects' },
      { key: 'experience', label: 'Experience', type: 'list', required: false, section: 'experience' },
      { key: 'metrics', label: 'Key Metrics', type: 'list', required: false, section: 'hero' },
      { key: 'email', label: 'Email', type: 'text', required: true, section: 'contact' },
      { key: 'github', label: 'GitHub', type: 'text', required: false, section: 'contact' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text', required: false, section: 'contact' },
      { key: 'primaryColor', label: 'Primary Color', type: 'color', required: false, section: 'theme' },
      { key: 'accentColor', label: 'Accent Color', type: 'color', required: false, section: 'theme' },
    ],
    tags: ['infographic', 'charts', 'data', 'visual-story', 'design-heavy'],
  },

]

// ── Category Registry ────────────────────────────────────────────────────────
export interface CategoryConfig {
  id: string
  name: string
  folder: string
  coverImage: string
  themes: ThemeConfig[]
  tags: string[]
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'technical',
    name: 'Technical',
    folder: 'technical',
    coverImage: '/portfolio-thumbnails/technical/dev-workspace.png',
    themes: TECHNICAL,
    tags: ['engineer', 'developer', 'data', 'cloud', 'AI', 'backend', 'frontend', 'fullstack'],
  },
]

// ── All Themes Flat List ────────────────────────────────────────────────────
export const ALL_THEMES: ThemeConfig[] = CATEGORIES.flatMap(cat => cat.themes)

// ── Helper Functions ─────────────────────────────────────────────────────────
export function getThemeById(id: string): ThemeConfig | undefined {
  return ALL_THEMES.find(t => t.id === id)
}

export function getThemesByCategory(categoryId: string): ThemeConfig[] {
  return ALL_THEMES.filter(t => t.category.toLowerCase() === categoryId.toLowerCase())
}

export function getCategoryById(id: string): CategoryConfig | undefined {
  return CATEGORIES.find(c => c.id === id)
}