import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Wand2, Send, User, Settings, Sparkles, LogOut, Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/useAuthStore'
import LogoBrand from '../common/LogoBrand'

const mainNav = [
  { to: '/app',              label: 'Dashboard', icon: Home,     end: true },
  { to: '/app/pulled-jobs',  label: 'Jobs',      icon: Sparkles, badge: 'Live' },
  { to: '/app/tailor',       label: 'Tailor',    icon: Wand2 },
  { to: '/app/apply',        label: 'Apply',     icon: Send },
  { to: '/app/portfolio',    label: 'Portfolio', icon: Globe },
]

const accountNav = [
  { to: '/app/profile',  label: 'Profile',  icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

const NavItem = ({ to, label, icon: Icon, badge, end, collapsed }: {
  to: string; label: string; icon: React.ElementType; badge?: string; end?: boolean; collapsed?: boolean
}) => (
  <NavLink
    to={to}
    end={end}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 rounded-md text-sm transition-colors',
        collapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'px-3 py-2',
        isActive
          ? 'bg-cyan-500/[0.08] text-cyan-400 font-medium'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
      )
    }
  >
    <Icon className={cn('flex-shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
    {!collapsed && (
      <>
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400">
            {badge}
          </span>
        )}
      </>
    )}
  </NavLink>
)

interface SideNavProps {
  open: boolean
  onToggle: () => void
}

const SideNav = ({ open, onToggle }: SideNavProps) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const _name = user?.preferred_name || (user?.full_name?.includes('@') ? '' : user?.full_name) || ''
  const initials = _name
    ? _name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  const displayName = _name || user?.email?.split('@')[0] || 'User'

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 bg-[#0d1117] border-r border-white/[0.06] flex flex-col z-40 hidden md:flex transition-all duration-300 ease-in-out',
        open ? 'w-60' : 'w-16'
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center h-16 border-b border-white/[0.06] flex-shrink-0', open ? 'px-4 justify-between' : 'flex-col justify-center gap-1')}>
        {open ? (
          <>
            <LogoBrand size="sm" />
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="text-base font-black leading-none text-white">J<span className="text-cyan-400">z</span></span>
            <button
              onClick={onToggle}
              className="rounded-md p-1 text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Nav scroll area */}
      <div className={cn('flex-1 overflow-y-auto py-4 space-y-4', open ? 'px-2' : 'px-1')}>
        {/* Main */}
        <div>
          {open && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Main</p>
          )}
          <div className="space-y-0.5">
            {mainNav.map((item) => (
              <NavItem key={item.to} {...item} collapsed={!open} />
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          {open && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Account</p>
          )}
          <div className="space-y-0.5">
            {accountNav.map((item) => (
              <NavItem key={item.to} {...item} collapsed={!open} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer — user + logout */}
      <div className="border-t border-white/[0.06] px-3 py-3 flex-shrink-0">
        <div className={cn('flex items-center gap-2', !open && 'flex-col gap-2')}>
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-400"
            title={!open ? displayName : undefined}
          >
            {initials}
          </div>
          {open && (
            <span className="flex-1 truncate text-sm text-slate-300">{displayName}</span>
          )}
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
