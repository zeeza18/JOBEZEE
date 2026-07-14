/**
 * Resume Maker store — structured resume content + template settings.
 * Cloud-backed (resume_documents table) with a localStorage cache for instant
 * reload, and a debounced autosave so typing doesn't hammer the API.
 */
import { create } from 'zustand'
import { resumeBuilderApi } from '../../../lib/api'
import type { ResumeDocumentContent, ResumeDocumentSettings } from '../../../lib/api'
import { useApiCache } from '../../../store/useApiCache'

const LS_KEY = 'jz_resume_maker_cache'
const AUTOSAVE_MS = 1200

export const DEFAULT_CONTENT: ResumeDocumentContent = {
  contact: {
    full_name: '', headline: '', email: '', phone: '', location: '',
    linkedin: '', github: '', portfolio: '', website: '',
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  custom: [],
  section_order: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
}

export const DEFAULT_SETTINGS: ResumeDocumentSettings = {
  template: 'classic',
  page_size: 'letter',
  margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15,
  spacing_level: 3,
  font_size_level: 3,
  header_font: 'sans',
  body_font: 'sans',
  accent_color: 'blue',
  compact: false,
  show_contact_icons: true,
}

function readCache(): { content: ResumeDocumentContent; settings: ResumeDocumentSettings } | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function writeCache(content: ResumeDocumentContent, settings: ResumeDocumentSettings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ content, settings })) } catch { /* ignore quota */ }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

interface ResumeMakerState {
  loaded: boolean
  loading: boolean
  saving: boolean
  importing: boolean
  title: string
  content: ResumeDocumentContent
  settings: ResumeDocumentSettings

  load: () => Promise<void>
  setTitle: (title: string) => void
  updateContent: (updater: (c: ResumeDocumentContent) => ResumeDocumentContent) => void
  updateSettings: (updater: (s: ResumeDocumentSettings) => ResumeDocumentSettings) => void
  importFromProfile: () => Promise<void>
  flattenForTailor: () => string
  sendToTailor: () => void
}

function scheduleSave(get: () => ResumeMakerState, set: (partial: Partial<ResumeMakerState>) => void) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const { title, content, settings } = get()
    set({ saving: true })
    try {
      await resumeBuilderApi.updateDocument({ title, content, settings })
    } catch { /* keep local cache; retry on next edit */ }
    finally { set({ saving: false }) }
  }, AUTOSAVE_MS)
}

export const useResumeMaker = create<ResumeMakerState>((set, get) => {
  const cached = readCache()

  return {
    loaded: false,
    loading: false,
    saving: false,
    importing: false,
    title: 'My Resume',
    content: cached?.content ?? DEFAULT_CONTENT,
    settings: cached?.settings ?? DEFAULT_SETTINGS,

    load: async () => {
      if (get().loading) return
      set({ loading: true })
      try {
        const doc = await resumeBuilderApi.getDocument()
        set({ title: doc.title, content: doc.content, settings: doc.settings, loaded: true })
        writeCache(doc.content, doc.settings)
      } catch {
        // Backend unreachable/unauthenticated yet — keep whatever's cached locally
        set({ loaded: true })
      } finally {
        set({ loading: false })
      }
    },

    setTitle: (title) => {
      set({ title })
      scheduleSave(get, set)
    },

    updateContent: (updater) => {
      const next = updater(get().content)
      set({ content: next })
      writeCache(next, get().settings)
      scheduleSave(get, set)
    },

    updateSettings: (updater) => {
      const next = updater(get().settings)
      set({ settings: next })
      writeCache(get().content, next)
      scheduleSave(get, set)
    },

    importFromProfile: async () => {
      set({ importing: true })
      try {
        const { content } = await resumeBuilderApi.importFromProfile()
        set({ content })
        writeCache(content, get().settings)
        scheduleSave(get, set)
      } finally {
        set({ importing: false })
      }
    },

    flattenForTailor: () => {
      const { contact, summary, experience, education, skills, projects, certifications } = get().content
      const lines: string[] = []
      if (contact.full_name) lines.push(contact.full_name)
      const contactLine = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github, contact.portfolio]
        .filter(Boolean).join(' | ')
      if (contactLine) lines.push(contactLine)
      if (summary) { lines.push('', 'SUMMARY', summary) }
      if (experience.length) {
        lines.push('', 'EXPERIENCE')
        for (const exp of experience) {
          lines.push(`${exp.title} — ${exp.company} (${exp.start_date} – ${exp.current ? 'Present' : exp.end_date})`)
          for (const b of exp.bullets) lines.push(`- ${b}`)
        }
      }
      if (education.length) {
        lines.push('', 'EDUCATION')
        for (const edu of education) lines.push(`${edu.degree} ${edu.field} — ${edu.school} (${edu.start_date} – ${edu.end_date})`)
      }
      if (skills.length) {
        lines.push('', 'SKILLS')
        for (const sk of skills) lines.push(`${sk.label}: ${sk.items.join(', ')}`)
      }
      if (projects.length) {
        lines.push('', 'PROJECTS')
        for (const proj of projects) {
          lines.push(`${proj.name} — ${proj.description}`)
          for (const b of proj.bullets) lines.push(`- ${b}`)
        }
      }
      if (certifications.length) {
        lines.push('', 'CERTIFICATIONS')
        for (const cert of certifications) lines.push(`${cert.name} — ${cert.issuer} (${cert.date})`)
      }
      return lines.join('\n')
    },

    sendToTailor: () => {
      const text = get().flattenForTailor()
      useApiCache.getState().setTailorResume({ text, filename: get().title || 'My Resume' })
    },
  }
})
