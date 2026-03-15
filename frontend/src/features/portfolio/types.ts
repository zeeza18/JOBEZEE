import type { LucideIcon } from 'lucide-react'
import { Code2, Palette, Briefcase, TrendingUp, Heart, Megaphone } from 'lucide-react'
import type { UserProfile } from '../../lib/api'

export interface PortfolioTemplateProps {
  profile     : UserProfile
  primaryColor: string
  accentColor : string
  showSections: Record<string, boolean>
}

export interface TemplateInfo {
  id             : string
  name           : string
  category       : string
  description    : string
  defaultPrimary : string
  defaultAccent  : string
  thumbnail      : string   // tailwind bg color class for swatch
}

export interface CategoryInfo {
  id    : string
  label : string
  icon  : LucideIcon
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'tech',       label: 'Tech',       icon: Code2      },
  { id: 'creative',   label: 'Creative',   icon: Palette    },
  { id: 'business',   label: 'Business',   icon: Briefcase  },
  { id: 'finance',    label: 'Finance',    icon: TrendingUp },
  { id: 'healthcare', label: 'Healthcare', icon: Heart      },
  { id: 'marketing',  label: 'Marketing',  icon: Megaphone  },
]

export const TEMPLATES: TemplateInfo[] = [
  // Tech
  { id: 'ModernDev',      category: 'tech',       name: 'Modern Dev',       description: 'Dark terminal-inspired, monospace aesthetic',    defaultPrimary: '#06b6d4', defaultAccent: '#a78bfa', thumbnail: 'bg-cyan-500'    },
  { id: 'NeonGrid',       category: 'tech',       name: 'Neon Grid',        description: 'Glassmorphism cards on dark grid background',   defaultPrimary: '#8b5cf6', defaultAccent: '#06b6d4', thumbnail: 'bg-violet-500'  },
  // Creative
  { id: 'ArtCanvas',      category: 'creative',   name: 'Art Canvas',       description: 'Minimal white, oversized typography, editorial', defaultPrimary: '#111827', defaultAccent: '#f59e0b', thumbnail: 'bg-amber-500'   },
  { id: 'InkStudio',      category: 'creative',   name: 'Ink Studio',       description: 'Bold editorial, newspaper grid, ink animations', defaultPrimary: '#1a1a1a', defaultAccent: '#ef4444', thumbnail: 'bg-red-500'     },
  // Business
  { id: 'ExecutiveSuite', category: 'business',   name: 'Executive Suite',  description: 'Navy & gold, professional serif, timeline',      defaultPrimary: '#0f2044', defaultAccent: '#c9a84c', thumbnail: 'bg-yellow-700'  },
  { id: 'CorporatePro',   category: 'business',   name: 'Corporate Pro',    description: 'Clean white, slate blue, structured grid',       defaultPrimary: '#1e40af', defaultAccent: '#64748b', thumbnail: 'bg-blue-800'    },
  // Finance
  { id: 'WallStreet',     category: 'finance',    name: 'Wall Street',      description: 'Dark green & gold, metrics-forward terminal',    defaultPrimary: '#0d2818', defaultAccent: '#c9a84c', thumbnail: 'bg-green-900'   },
  { id: 'QuantEdge',      category: 'finance',    name: 'Quant Edge',       description: 'Clean navy/white, data-visualization style',     defaultPrimary: '#0f172a', defaultAccent: '#10b981', thumbnail: 'bg-emerald-600' },
  // Healthcare
  { id: 'CareFlow',       category: 'healthcare', name: 'Care Flow',        description: 'Clean teal/white, clinical, credential-forward', defaultPrimary: '#0891b2', defaultAccent: '#14b8a6', thumbnail: 'bg-teal-500'    },
  { id: 'MedProfile',     category: 'healthcare', name: 'Med Profile',      description: 'Soft blue/white, certifications-focused',        defaultPrimary: '#1d4ed8', defaultAccent: '#60a5fa', thumbnail: 'bg-blue-500'    },
  // Marketing
  { id: 'BrandStudio',    category: 'marketing',  name: 'Brand Studio',     description: 'Bold gradient hero, results & metrics focus',    defaultPrimary: '#7c3aed', defaultAccent: '#ec4899', thumbnail: 'bg-pink-500'    },
  { id: 'GrowthHacker',   category: 'marketing',  name: 'Growth Hacker',    description: 'Dark + orange, analytics-dashboard aesthetic',   defaultPrimary: '#1c1917', defaultAccent: '#f97316', thumbnail: 'bg-orange-500'  },
]
