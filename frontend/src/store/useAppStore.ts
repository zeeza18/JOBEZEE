import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  generateMockData,
  type Application,
  type ApplicationStatus,
  type InterviewPrep,
  type Job,
  type Resume,
  type TailorResult,
  type UserProfile,
} from '../lib/mock'

export type Toast = {
  id: string
  title: string
  description?: string
  type?: 'info' | 'success' | 'error'
}

const seed = generateMockData()

export type AppState = {
  profile: UserProfile
  jobs: Job[]
  resumes: Resume[]
  applications: Application[]
  tailorResults: TailorResult[]
  interviewPreps: InterviewPrep[]
  activeJobId?: string
  activeResumeId?: string
  toasts: Toast[]
  modalJobId?: string
  setActiveJob: (id?: string) => void
  setActiveResume: (id?: string) => void
  saveProfile: (profile: Partial<UserProfile>) => void
  saveResume: (resume: Resume) => void
  updateResumeContent: (id: string, content: string) => void
  saveTailorResult: (result: TailorResult) => void
  saveApplication: (jobId: string, status?: ApplicationStatus) => void
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void
  updateApplicationNotes: (id: string, notes: string, nextStepDate?: string) => void
  addInterviewPrep: (prep: InterviewPrep) => void
  setModalJobId: (id?: string) => void
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  resetAll: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...seed,
      toasts: [],
      modalJobId: undefined,
      setActiveJob: (id) => set({ activeJobId: id }),
      setActiveResume: (id) => set({ activeResumeId: id }),
      saveProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      saveResume: (resume) =>
        set((state) => {
          const existing = state.resumes.find((r) => r.id === resume.id)
          if (existing) {
            return {
              resumes: state.resumes.map((r) => (r.id === resume.id ? { ...r, ...resume } : r)),
              activeResumeId: resume.id,
            }
          }
          return { resumes: [...state.resumes, resume], activeResumeId: resume.id }
        }),
      updateResumeContent: (id, content) =>
        set((state) => ({
          resumes: state.resumes.map((r) => (r.id === id ? { ...r, content, lastUpdated: new Date().toISOString() } : r)),
          activeResumeId: id,
        })),
      saveTailorResult: (result) =>
        set((state) => {
          const exists = state.tailorResults.find((r) => r.jobId === result.jobId && r.resumeId === result.resumeId)
          const updated = exists
            ? state.tailorResults.map((r) => (r.jobId === result.jobId ? result : r))
            : [...state.tailorResults, result]
          return { tailorResults: updated, activeJobId: result.jobId, activeResumeId: result.resumeId }
        }),
      saveApplication: (jobId, status = 'Saved') =>
        set((state) => {
          if (!jobId) return state
          const exists = state.applications.find((a) => a.jobId === jobId)
          if (exists) return state
          const newApp: Application = {
            id: crypto.randomUUID(),
            jobId,
            status,
            appliedAt: new Date().toISOString(),
            notes: '',
            nextStepDate: '',
          }
          return { applications: [newApp, ...state.applications] }
        }),
      updateApplicationStatus: (id, status) =>
        set((state) => ({
          applications: state.applications.map((a) => (a.id === id ? { ...a, status } : a)),
        })),
      updateApplicationNotes: (id, notes, nextStepDate) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id ? { ...a, notes, nextStepDate: nextStepDate ?? a.nextStepDate } : a
          ),
        })),
      addInterviewPrep: (prep) => set((state) => ({ interviewPreps: [prep, ...state.interviewPreps] })),
      setModalJobId: (id) => set({ modalJobId: id }),
      pushToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, { id: crypto.randomUUID(), ...toast }],
        })),
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      resetAll: () => set({ ...generateMockData(), toasts: [], activeJobId: undefined, activeResumeId: undefined }),
    }),
    {
      name: 'jobezee-app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        jobs: state.jobs,
        resumes: state.resumes,
        applications: state.applications,
        tailorResults: state.tailorResults,
        interviewPreps: state.interviewPreps,
        activeJobId: state.activeJobId,
        activeResumeId: state.activeResumeId,
      }),
    }
  )
)
