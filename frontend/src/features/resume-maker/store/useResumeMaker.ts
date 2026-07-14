/**
 * Resume Maker store — a user can have multiple resumes (documents). Cloud-backed
 * (resume_documents table) with a per-document localStorage cache for instant
 * reload, and a debounced autosave so typing doesn't hammer the API.
 */
import { create } from 'zustand'
import { resumeBuilderApi } from '../../../lib/api'
import type { ResumeDocumentContent, ResumeDocumentSettings, ResumeDocumentSummary } from '../../../lib/api'
import { useApiCache } from '../../../store/useApiCache'

const LS_ACTIVE_ID_KEY = 'jz_resume_maker_active_id'
const LS_CACHE_KEY = 'jz_resume_maker_cache_v2'
const AUTOSAVE_MS = 1200

type CachedDoc = { title: string; content: ResumeDocumentContent; settings: ResumeDocumentSettings }

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

function readCacheMap(): Record<string, CachedDoc> {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function writeCacheEntry(id: string, entry: CachedDoc) {
  try {
    const map = readCacheMap()
    map[id] = entry
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(map))
  } catch { /* ignore quota */ }
}

function summaryFromDoc(doc: { id: string; title: string; settings: ResumeDocumentSettings; created_at: string; updated_at: string }): ResumeDocumentSummary {
  return { id: doc.id, title: doc.title, template: doc.settings.template, created_at: doc.created_at, updated_at: doc.updated_at }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

interface ResumeMakerState {
  documents: ResumeDocumentSummary[]
  activeId: string | null
  loaded: boolean
  loadingList: boolean
  loadingDoc: boolean
  saving: boolean
  importing: boolean
  creating: boolean
  title: string
  content: ResumeDocumentContent
  settings: ResumeDocumentSettings
  jobDescription: string

  loadAll: () => Promise<void>
  selectDocument: (id: string) => Promise<void>
  createDocument: (seedFromProfile?: boolean) => Promise<void>
  duplicateDocument: (id: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  setTitle: (title: string) => void
  setJobDescription: (jd: string) => void
  updateContent: (updater: (c: ResumeDocumentContent) => ResumeDocumentContent) => void
  updateSettings: (updater: (s: ResumeDocumentSettings) => ResumeDocumentSettings) => void
  importFromProfile: () => Promise<void>
  flattenForTailor: () => string
  sendToTailor: () => void
}

function scheduleSave(get: () => ResumeMakerState, set: (partial: Partial<ResumeMakerState>) => void) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const { activeId, title, content, settings } = get()
    if (!activeId) return
    set({ saving: true })
    try {
      const doc = await resumeBuilderApi.updateDocument(activeId, { title, content, settings })
      set({ documents: get().documents.map((d) => (d.id === activeId ? summaryFromDoc(doc) : d)) })
    } catch { /* keep local cache; retry on next edit */ }
    finally { set({ saving: false }) }
  }, AUTOSAVE_MS)
}

export const useResumeMaker = create<ResumeMakerState>((set, get) => {
  const cachedActiveId = (() => { try { return localStorage.getItem(LS_ACTIVE_ID_KEY) } catch { return null } })()
  const cachedDoc = cachedActiveId ? readCacheMap()[cachedActiveId] : undefined

  return {
    documents: [],
    activeId: cachedActiveId,
    loaded: false,
    loadingList: false,
    loadingDoc: false,
    saving: false,
    importing: false,
    creating: false,
    title: cachedDoc?.title ?? 'My Resume',
    content: cachedDoc?.content ?? DEFAULT_CONTENT,
    settings: cachedDoc?.settings ?? DEFAULT_SETTINGS,
    jobDescription: '',

    loadAll: async () => {
      if (get().loadingList || get().loaded) return
      set({ loadingList: true })
      try {
        const docs = await resumeBuilderApi.listDocuments()
        set({ documents: docs })
        if (docs.length === 0) {
          await get().createDocument(true)
        } else {
          const savedId = get().activeId
          const targetId = savedId && docs.some((d) => d.id === savedId) ? savedId : docs[0].id
          await get().selectDocument(targetId)
        }
      } catch {
        // backend unreachable/unauthenticated — keep whatever's cached locally
      } finally {
        set({ loadingList: false, loaded: true })
      }
    },

    selectDocument: async (id) => {
      set({ loadingDoc: true, activeId: id })
      try { localStorage.setItem(LS_ACTIVE_ID_KEY, id) } catch { /* ignore */ }
      const cached = readCacheMap()[id]
      if (cached) set({ title: cached.title, content: cached.content, settings: cached.settings })
      try {
        const doc = await resumeBuilderApi.getDocument(id)
        set({ title: doc.title, content: doc.content, settings: doc.settings })
        writeCacheEntry(id, { title: doc.title, content: doc.content, settings: doc.settings })
      } catch {
        // keep cached/local version if the fetch fails
      } finally {
        set({ loadingDoc: false })
      }
    },

    createDocument: async (seedFromProfile = false) => {
      set({ creating: true })
      try {
        const doc = await resumeBuilderApi.createDocument('My Resume', seedFromProfile)
        set((s) => ({ documents: [summaryFromDoc(doc), ...s.documents] }))
        set({ activeId: doc.id, title: doc.title, content: doc.content, settings: doc.settings })
        try { localStorage.setItem(LS_ACTIVE_ID_KEY, doc.id) } catch { /* ignore */ }
        writeCacheEntry(doc.id, { title: doc.title, content: doc.content, settings: doc.settings })
      } finally {
        set({ creating: false })
      }
    },

    duplicateDocument: async (id) => {
      const doc = await resumeBuilderApi.duplicateDocument(id)
      set((s) => ({ documents: [summaryFromDoc(doc), ...s.documents] }))
      await get().selectDocument(doc.id)
    },

    deleteDocument: async (id) => {
      await resumeBuilderApi.deleteDocument(id)
      const remaining = get().documents.filter((d) => d.id !== id)
      set({ documents: remaining })
      if (get().activeId === id) {
        if (remaining.length > 0) await get().selectDocument(remaining[0].id)
        else await get().createDocument(false)
      }
    },

    setTitle: (title) => {
      set({ title })
      scheduleSave(get, set)
    },

    setJobDescription: (jd) => set({ jobDescription: jd }),

    updateContent: (updater) => {
      const next = updater(get().content)
      set({ content: next })
      const { activeId, title, settings } = get()
      if (activeId) writeCacheEntry(activeId, { title, content: next, settings })
      scheduleSave(get, set)
    },

    updateSettings: (updater) => {
      const next = updater(get().settings)
      set({ settings: next })
      const { activeId, title, content } = get()
      if (activeId) writeCacheEntry(activeId, { title, content, settings: next })
      scheduleSave(get, set)
    },

    importFromProfile: async () => {
      set({ importing: true })
      try {
        const { content } = await resumeBuilderApi.importFromProfile()
        set({ content })
        const { activeId, title, settings } = get()
        if (activeId) writeCacheEntry(activeId, { title, content, settings })
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
