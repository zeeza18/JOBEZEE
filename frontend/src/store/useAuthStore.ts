/**
 * Auth state — persisted to localStorage (user object only).
 * The real auth token lives in the httpOnly cookie managed by the backend.
 * We only store enough to show the user's name and guard routes client-side.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { authApi, type AuthUser } from '../lib/api'

interface AuthState {
  user         : AuthUser | null
  loading      : boolean
  initializing : boolean   // true only while session check is in-flight with no cached user

  login    : (email: string, password: string)                      => Promise<void>
  register : (email: string, password: string, full_name: string)   => Promise<void>
  logout   : ()                                                      => Promise<void>
  fetchMe  : ()                                                      => Promise<void>
}

// Synchronously peek at localStorage so returning users skip the full-screen spinner.
// If a user object is already cached, we start with initializing:false and verify in background.
const _hasPersistedSession = (() => {
  try {
    const raw = localStorage.getItem('jobezee-auth')
    return !!(raw && JSON.parse(raw)?.state?.user)
  } catch { return false }
})()

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user         : null,
      loading      : false,
      initializing : !_hasPersistedSession,  // false for returning users — renders immediately

      login: async (email, password) => {
        set({ loading: true })
        try {
          const user = await authApi.login(email, password)
          set({ user, loading: false })
        } catch (e) {
          set({ loading: false })
          throw e
        }
      },

      register: async (email, password, full_name) => {
        set({ loading: true })
        try {
          const user = await authApi.register(email, password, full_name)
          set({ user, loading: false })
        } catch (e) {
          set({ loading: false })
          throw e
        }
      },

      logout: async () => {
        await authApi.logout().catch(() => {})
        set({ user: null })
      },

      // Called once on App mount.
      // If user is already cached, verifies the session silently in the background
      // (no spinner). If the session expired, user is cleared and AuthGuard redirects.
      fetchMe: async () => {
        if (!get().user) set({ initializing: true })
        try {
          const user = await authApi.me()
          set({ user, initializing: false })
        } catch {
          set({ user: null, initializing: false })
        }
      },
    }),
    {
      name      : 'jobezee-auth',
      storage   : createJSONStorage(() => localStorage),
      // Do NOT persist initializing — it must be derived fresh on each mount
      partialize: (s) => ({ user: s.user }),
    }
  )
)
