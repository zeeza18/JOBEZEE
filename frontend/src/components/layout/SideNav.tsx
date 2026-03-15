import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Wand2, Send, Mic2, Kanban, User, Settings, Sparkles, LogOut, Globe, Plug } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/useAuthStore'

const mainNav = [
  { to: '/app',              label: 'Dashboard',  icon: Home,     end: true },
  { to: '/app/pulled-jobs',  label: 'Jobs',       icon: Sparkles, badge: 'Live' },
  { to: '/app/tailor',       label: 'Tailor',     icon: Wand2 },
  { to: '/app/apply',        label: 'Apply',      icon: Send },
  { to: '/app/interview',    label: 'Interview',  icon: Mic2 },
  { to: '/app/portfolio',    label: 'Portfolio',  icon: Globe },
  { to: '/app/connectors',   label: 'Connectors', icon: Plug, badge: 'Soon' },
  { to: '/app/applications', label: 'Applications', icon: Kanban },
]

const accountNav = [
  { to: '/app/profile',  label: 'Profile',  icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

const NavItem = ({ to, label, icon: Icon, badge, end }: {
  to: string; label: string; icon: React.ElementType; badge?: string; end?: boolean
}) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-cyan-500/[0.08] text-cyan-400 font-medium'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
      )
    }
  >
    <Icon className="h-4 w-4 flex-shrink-0" />
    <span className="flex-1">{label}</span>
    {badge && (
      <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400">
        {badge}
      </span>
    )}
  </NavLink>
)

const SideNav = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#0d1117] border-r border-white/[0.06] flex flex-col z-40 hidden md:flex">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500 text-sm font-black text-white">
          J
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">JOBEZEE</span>
      </div>

      {/* Nav scroll area */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {/* Main */}
        <div>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Main</p>
          <div className="space-y-0.5">
            {mainNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Account</p>
          <div className="space-y-0.5">
            {accountNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer — user + logout */}
      <div className="border-t border-white/[0.06] px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-400">
            {initials}
          </div>
          <span className="flex-1 truncate text-sm text-slate-300">{displayName}</span>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:text-red-400 hover:bg-red-500/10"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default SideNav
