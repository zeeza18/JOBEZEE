import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import AppRoutes from './routes'
import { ToastHost } from './components/ui/Toast'
import { useAuthStore } from './store/useAuthStore'
import { useTailorCards } from './store/useTailorCards'
import { searchApi } from './lib/api'

const App = () => {
  const { pathname } = useLocation()
  const { fetchMe } = useAuthStore()
  const { loadCards } = useTailorCards()
  const searchFired = useRef(false)

  useEffect(() => {
    fetchMe().then(() => {
      const user = useAuthStore.getState().user
      if (user) {
        // Restore any running/queued tailor jobs and reconnect their SSE streams
        loadCards()
        if (!searchFired.current) {
          searchFired.current = true
          const last = Number(localStorage.getItem('lastSearchTrigger') || 0)
          const ONE_HOUR = 1 * 60 * 60 * 1000
          if (Date.now() - last > ONE_HOUR) {
            localStorage.setItem('lastSearchTrigger', String(Date.now()))
            searchApi.trigger().catch(() => {})
          }
        }
      }
    })
  }, [fetchMe, loadCards])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <AppRoutes />
      <ToastHost />
    </div>
  )
}

export default App
