/**
 * Auth state — persisted to sessionStorage (cleared on tab close).
 * The real auth token lives in the httpOnly cookie managed by the backend.
 * We only store enough to show the user's name and guard routes client-side.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { authApi, type AuthUser } from '../lib/api'

interface AuthState {
  user         : AuthUser | null
  loading      : boolean
  initializing : boolean   // true during the first fetchMe; used by AuthGuard

  login    : (email: string, password: string)                      => Promise<void>
  register : (email: string, password: string, full_name: string)   => Promise<void>
  logout   : ()                                                      => Promise<void>
  fetchMe  : ()                                                      => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user         : null,
      loading      : false,
      initializing : true,   // starts true; cleared after first fetchMe

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
      // The api.ts request() function auto-refreshes on 401, so by the time
      // this resolves the cookie is either fresh or truly expired.
      fetchMe: async () => {
        set({ initializing: true })
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
      // Do NOT persist initializing — it must always start as true on mount
      partialize: (s) => ({ user: s.user }),
    }
  )
)
