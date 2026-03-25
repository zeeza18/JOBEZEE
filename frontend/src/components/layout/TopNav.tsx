import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, User, Settings, Menu, X, Home, Sparkles, Wand2, Zap, Globe } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import LogoBrand from '../common/LogoBrand'
import { cn } from '../../lib/utils'

const menuItems = [
  { to: '/app',             label: 'Home',      icon: Home,     end: true  },
  { to: '/app/pulled-jobs', label: 'Jobs',      icon: Sparkles, end: false },
  { to: '/app/tailor',      label: 'Tailor',    icon: Wand2,    end: false },
  { to: '/app/apply',       label: 'Auto',      icon: Zap,      end: false },
  { to: '/app/portfolio',   label: 'Portfolio', icon: Globe,    end: false },
]

const TopNav = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 border-b border-white/[0.06] bg-[#0d1117]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/app')} aria-label="Home">
            <LogoBrand size="sm" />
          </button>

          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-slate-400 transition hover:text-white hover:bg-white/[0.06]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer from right */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-64 z-50 flex flex-col bg-[#0d1117] border-l border-white/[0.06] transition-transform duration-300 md:hidden',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] flex-shrink-0">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-slate-500 transition hover:text-white hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {menuItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-cyan-500/[0.08] text-cyan-400 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-cyan-400' : '')} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <div className="my-2 border-t border-white/[0.06]" />

          <NavLink
            to="/app/profile"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-cyan-500/[0.08] text-cyan-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              )
            }
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <span>Profile</span>
          </NavLink>

          <NavLink
            to="/app/settings"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-cyan-500/[0.08] text-cyan-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              )
            }
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>

        {/* Footer — user + logout */}
        {user && (
          <div className="border-t border-white/[0.06] px-3 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-400">
                {initials}
              </div>
              <span className="flex-1 truncate text-sm text-slate-300">{displayName}</span>
              <button
                onClick={handleLogout}
                className="rounded-md p-1.5 text-slate-500 transition hover:text-red-400 hover:bg-red-500/10"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default TopNav
