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

// Read the persisted user synchronously at module load time.
// zustand persist rehydrates asynchronously — without this the AuthGuard would
// briefly see user:null and redirect to /auth on every page refresh.
const _getPersistedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('jobezee-auth')
    return raw ? (JSON.parse(raw)?.state?.user ?? null) : null
  } catch { return null }
}

const _persistedUser = _getPersistedUser()

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user         : _persistedUser,           // pre-populated so refresh never flashes /auth
      loading      : false,
      initializing : !_persistedUser,          // false for returning users — renders immediately

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
      // (no spinner). Only clears the session on a definitive 401 — network errors /
      // server blips keep the cached user so a bad request doesn't log you out.
      fetchMe: async () => {
        if (!get().user) set({ initializing: true })
        try {
          const user = await authApi.me()
          set({ user, initializing: false })
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status
          if (status === 401 || status === 403) {
            set({ user: null, initializing: false })
          } else {
            // Network / server error — keep user from localStorage, don't redirect
            set({ initializing: false })
          }
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
