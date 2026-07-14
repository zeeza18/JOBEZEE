/**
 * Mirrors backend/services/resume_builder_service.py's _ACCENT_COLORS / _FONT_STACKS
 * and heading logic exactly, so the on-screen preview and the exported PDF never drift.
 */
import type { ResumeDocumentSettings } from '../../../lib/api'

export const ACCENT_COLORS: Record<ResumeDocumentSettings['accent_color'], string> = {
  blue: '#2563eb',
  navy: '#1e3a5f',
  teal: '#0d9488',
  green: '#059669',
  emerald: '#10b981',
  purple: '#7c3aed',
  orange: '#ea580c',
  amber: '#d97706',
  red: '#dc2626',
  slate: '#475569',
}

// Actual font rendering happens server-side (PDF export + the live preview HTML
// both come from the backend), so the frontend only needs id+label for the picker.
export const FONT_OPTIONS: { id: ResumeDocumentSettings['header_font']; label: string }[] = [
  { id: 'sans', label: 'Helvetica (System)' },
  { id: 'inter', label: 'Inter' },
  { id: 'roboto', label: 'Roboto' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans' },
  { id: 'serif', label: 'Georgia (System)' },
  { id: 'lora', label: 'Lora' },
  { id: 'merriweather', label: 'Merriweather' },
  { id: 'source-serif', label: 'Source Serif 4' },
  { id: 'times-new-roman', label: 'Times New Roman' },
  { id: 'mono', label: 'Courier (System)' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono' },
]

export const TEMPLATES: { id: ResumeDocumentSettings['template']; name: string; description: string; twoColumn: boolean }[] = [
  { id: 'classic', name: 'Classic', description: 'Traditional single-column layout, black rule under headings', twoColumn: false },
  { id: 'modern', name: 'Modern', description: 'Colorful accent headings you can recolor', twoColumn: false },
  { id: 'clean', name: 'Clean', description: 'Minimal, understated gray uppercase headings', twoColumn: false },
  { id: 'latex', name: 'LaTeX', description: 'Classic serif academic layout, ruled section headers', twoColumn: false },
  { id: 'two-column', name: 'Two Column', description: 'Experience-focused main column with a sidebar for skills', twoColumn: true },
  { id: 'modern-two-column', name: 'Modern Two Column', description: 'Two-column layout with colorful accent headings', twoColumn: true },
  { id: 'vivid', name: 'Vivid', description: 'Colorful two-column layout with arrow bullets', twoColumn: true },
]

// Templates whose header/body font auto-switches when first selected (like Resume-Matcher's presets)
export const TEMPLATE_FONT_PRESETS: Partial<Record<ResumeDocumentSettings['template'], { header: ResumeDocumentSettings['header_font']; body: ResumeDocumentSettings['body_font'] }>> = {
  latex: { header: 'serif', body: 'serif' },
  clean: { header: 'sans', body: 'sans' },
}

export function isTwoColumn(settings: ResumeDocumentSettings): boolean {
  return TEMPLATES.find((t) => t.id === settings.template)?.twoColumn ?? false
}

export function usesAccentColor(settings: ResumeDocumentSettings): boolean {
  return settings.template === 'modern' || settings.template === 'modern-two-column' || settings.template === 'vivid'
}

export function useArrowBullets(settings: ResumeDocumentSettings): boolean {
  return settings.template === 'vivid'
}

export function headingColor(settings: ResumeDocumentSettings): string {
  return usesAccentColor(settings) ? ACCENT_COLORS[settings.accent_color] : '#111827'
}

export function headingBorder(settings: ResumeDocumentSettings): string {
  if (usesAccentColor(settings)) return `2px solid ${ACCENT_COLORS[settings.accent_color]}`
  if (settings.template === 'clean') return '1px solid #9ca3af'
  if (settings.template === 'latex') return '1px solid #111827'
  return '1px solid #111827'
}

export function headingTransform(settings: ResumeDocumentSettings): 'uppercase' | 'none' {
  return settings.template === 'latex' ? 'none' : 'uppercase'
}

export function basePt(settings: ResumeDocumentSettings): number {
  return 8 + settings.font_size_level
}

export function gapPx(settings: ResumeDocumentSettings): number {
  return 4 + settings.spacing_level * 2
}

export function pagePx(settings: ResumeDocumentSettings): { width: number; height: number } {
  // CSS px at 96dpi, scaled down from mm for on-screen preview
  const mmToPx = (mm: number) => (mm / 25.4) * 96
  return settings.page_size === 'a4'
    ? { width: mmToPx(210), height: mmToPx(297) }
    : { width: mmToPx(215.9), height: mmToPx(279.4) }
}

// Two-column templates: which sections go in the narrow sidebar vs the wide main column.
export const SIDEBAR_SECTIONS = new Set(['education', 'skills', 'certifications'])
export const MAIN_SECTIONS = new Set(['experience', 'projects'])
