/**
 * Mirrors backend/services/resume_builder_service.py's _ACCENT_COLORS / _FONT_STACKS
 * and heading logic exactly, so the on-screen preview and the exported PDF never drift.
 */
import type { ResumeDocumentSettings } from '../../../lib/api'

export const ACCENT_COLORS: Record<ResumeDocumentSettings['accent_color'], string> = {
  blue: '#2563eb',
  green: '#059669',
  orange: '#ea580c',
  red: '#dc2626',
}

export const FONT_STACKS: Record<ResumeDocumentSettings['header_font'], string> = {
  serif: "'Georgia', 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
  mono: "'Courier New', monospace",
}

export const TEMPLATES: { id: ResumeDocumentSettings['template']; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Traditional single-column layout, black rule under headings' },
  { id: 'modern', name: 'Modern', description: 'Colorful accent headings you can recolor' },
  { id: 'clean', name: 'Clean', description: 'Minimal, understated gray uppercase headings' },
]

export function headingColor(settings: ResumeDocumentSettings): string {
  return settings.template === 'modern' ? ACCENT_COLORS[settings.accent_color] : '#111827'
}

export function headingBorder(settings: ResumeDocumentSettings): string {
  if (settings.template === 'modern') return `2px solid ${ACCENT_COLORS[settings.accent_color]}`
  if (settings.template === 'clean') return '1px solid #9ca3af'
  return '1px solid #111827'
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
