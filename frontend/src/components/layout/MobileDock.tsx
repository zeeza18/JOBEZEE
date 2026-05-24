import { NavLink } from 'react-router-dom'
import { Globe, Home, Wand2, Sparkles, Mic2 } from 'lucide-react'
import { cn } from '../../lib/utils'

// ── LinkedIn sub-items (shown when LinkedIn is active) ──────────────────────
const LI_DOCK = [
  { to: '/app/linkedin',          label: 'Easy Apply'    },
  { to: '/app/linkedin/boost',    label: 'Profile Boost' },
  { to: '/app/linkedin/contacts',  label: 'Contacts'     },
]

const leftDock = [
  { to: '/jobs', label: 'Jobs',   icon: Sparkles, end: false },
  { to: '/app/tailor',      label: 'Resume',  icon: Wand2,    end: false },
]

const rightDock = [
  { to: '/app/interview', label: 'Interview', icon: Mic2,   end: false },
  { to: '/app/apply',     label: 'Apply',     icon: Globe,  end: false },
]

const DockItem = ({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ElementType; end: boolean }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        'flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold transition-all min-w-[56px]',
        isActive ? 'text-cyan-400' : 'text-slate-500 active:bg-white/5'
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
)

const MobileDock = () => (
  <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
    style={{ background: 'rgba(13,17,23,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
    <nav className="flex items-center justify-around px-1 py-1 pb-safe">
      {leftDock.map((item) => <DockItem key={item.to} {...item} />)}

      {/* Center Dashboard button */}
      <NavLink
        to="/dashboard"
        end
        className="flex flex-col items-center justify-center gap-0.5 -mt-4 min-w-[56px]"
      >
        {({ isActive }) => (
          <>
            <div className={cn(
              'flex items-center justify-center rounded-full w-12 h-12 shadow-lg transition-all',
              isActive
                ? 'bg-cyan-500 shadow-cyan-500/40'
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
            )}>
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className={cn('text-[10px] font-semibold mt-0.5', isActive ? 'text-cyan-400' : 'text-slate-500')}>
              Dashboard
            </span>
          </>
        )}
      </NavLink>

      {rightDock.map((item) => <DockItem key={item.to} {...item} />)}
    </nav>
  </div>
)

export default MobileDock
