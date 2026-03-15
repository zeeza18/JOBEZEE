import { NavLink } from 'react-router-dom'
import { Home, Sparkles, Wand2, Kanban } from 'lucide-react'
import { cn } from '../../lib/utils'

const dock = [
  { to: '/app',              label: 'Home',   icon: Home },
  { to: '/app/pulled-jobs',  label: 'Jobs',   icon: Sparkles },
  { to: '/app/tailor',       label: 'Tailor', icon: Wand2 },
  { to: '/app/applications', label: 'Track',  icon: Kanban },
]

const MobileDock = () => (
  <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#0d1117]/95 backdrop-blur md:hidden">
    <nav className="flex items-center justify-around px-2 py-2">
      {dock.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center rounded-md px-3 py-1 text-xs font-medium transition-colors',
              isActive ? 'text-cyan-400' : 'text-slate-400'
            )
          }
        >
          <Icon className="h-5 w-5 mb-0.5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  </div>
)

export default MobileDock
