import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import LogoBrand from '../common/LogoBrand'

const TopNav = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="md:hidden sticky top-0 z-30 border-b border-white/[0.06] bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate('/')} aria-label="Home">
          <LogoBrand size="sm" />
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={() => navigate('/app/profile')}
                className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-400"
              >
                <User className="h-3.5 w-3.5" />
                <span>{user.full_name || user.email.split('@')[0]}</span>
              </button>
              <button
                onClick={handleLogout}
                className="rounded-md border border-white/10 p-1.5 text-slate-500 transition hover:border-red-500/40 hover:text-red-400"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-600"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopNav
