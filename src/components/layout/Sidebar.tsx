import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  CalendarDays,
  Lightbulb,
} from 'lucide-react'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Overview',      color: 'text-slate-300' },
  { to: '/running',  icon: Footprints,       label: 'Running',       color: 'text-orange-400' },
  { to: '/cycling',  icon: Bike,             label: 'Cycling',       color: 'text-green-400' },
  { to: '/swimming', icon: Waves,            label: 'Swimming',      color: 'text-cyan-400' },
  { to: '/strength', icon: Dumbbell,         label: 'Strength',      color: 'text-purple-400' },
  { to: '/training', icon: CalendarDays,     label: 'Training Plan', color: 'text-yellow-300' },
  { to: '/insights', icon: Lightbulb,        label: 'Insights',      color: 'text-blue-400' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-slate-900 border-r border-slate-800 py-6 px-3 gap-1 shrink-0">
      <div className="px-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <span className="text-orange-400 text-sm font-bold">FD</span>
          </div>
          <span className="text-white font-semibold text-sm">Fitness Dashboard</span>
        </div>
      </div>

      {NAV.map(({ to, icon: Icon, label, color }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={16} className={isActive ? color : 'text-slate-500'} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </aside>
  )
}

/** Mobile bottom tab bar */
export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around py-2 z-50">
      {NAV.slice(0, 5).map(({ to, icon: Icon, label, color }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
              isActive ? 'text-white' : 'text-slate-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} className={isActive ? color : ''} />
              <span>{label.split(' ')[0]}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
