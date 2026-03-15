import { NavLink } from 'react-router-dom'
import { Globe, Home, Kanban, Wand2, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

const dock = [
  { to: '/app',             label: 'Home',      icon: Home,     end: true  },
  { to: '/app/pulled-jobs', label: 'Jobs',      icon: Sparkles, end: false },
  { to: '/app/tailor',      label: 'Tailor',    icon: Wand2,    end: false },
  { to: '/app/applications',label: 'Track',     icon: Kanban,   end: false },
  { to: '/app/portfolio',   label: 'Portfolio', icon: Globe,    end: false },
]

const MobileDock = () => (
  <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
    style={{ background: 'rgba(13,17,23,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
    <nav className="flex items-center justify-around px-1 py-1 pb-safe">
      {dock.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold transition-all min-w-[56px]',
              isActive
                ? 'text-cyan-400'
                : 'text-slate-500 active:bg-white/5'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                'flex items-center justify-center rounded-xl w-8 h-8 transition-all',
                isActive ? 'bg-cyan-500/15' : ''
              )}>
                <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-cyan-400' : 'text-slate-500')} />
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  </div>
)

export default MobileDock
