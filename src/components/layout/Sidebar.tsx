import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Scale,
  CalendarDays,
  Lightbulb,
  RefreshCw,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useFitness } from '@/context/FitnessContext'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Overview',      color: 'text-slate-300' },
  { to: '/running',  icon: Footprints,       label: 'Running',       color: 'text-orange-400' },
  { to: '/cycling',  icon: Bike,             label: 'Cycling',       color: 'text-green-400' },
  { to: '/swimming', icon: Waves,            label: 'Swimming',      color: 'text-cyan-400' },
  { to: '/strength', icon: Dumbbell,         label: 'Strength',      color: 'text-purple-400' },
  { to: '/body',     icon: Scale,            label: 'Body',          color: 'text-pink-400' },
  { to: '/training', icon: CalendarDays,     label: 'Training Plan', color: 'text-yellow-300' },
  { to: '/insights', icon: Lightbulb,        label: 'Insights',      color: 'text-blue-400' },
]

function SyncModal({ onClose }: { onClose: () => void }) {
  const { syncToGitHub, getSavedPat, syncStatus } = useFitness()
  const [pat, setPat] = useState(getSavedPat())
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSync() {
    if (!pat.trim()) return
    setErrorMsg('')
    try {
      await syncToGitHub(pat.trim())
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Sync failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <RefreshCw size={16} className="text-slate-400" /> Sync to GitHub
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Commits your strength, body, and nutrition logs to the repo so all devices stay in sync.
            GitHub Actions will redeploy (~2 min) and every device will see the latest data.
          </p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              GitHub Personal Access Token
              <span className="ml-1 text-slate-600">(needs <code className="text-slate-500">contents: write</code>)</span>
            </label>
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="github_pat_…"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 placeholder-slate-600"
            />
            <p className="text-xs text-slate-600 mt-1">Saved in your browser only — never committed to the repo.</p>
          </div>

          {syncStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 rounded-lg px-3 py-2">
              <Check size={14} /> Synced! Deploy in progress (~2 min)
            </div>
          )}
          {(syncStatus === 'error' || errorMsg) && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} /> {errorMsg || 'Sync failed — check your PAT and try again'}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Close
          </button>
          <button
            onClick={handleSync}
            disabled={!pat.trim() || syncStatus === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            {syncStatus === 'syncing' ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [showSync, setShowSync] = useState(false)
  const { syncStatus } = useFitness()

  return (
    <>
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

        {/* Sync button at bottom of sidebar */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={() => setShowSync(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors text-slate-500 hover:text-white hover:bg-slate-800/50"
          >
            <RefreshCw
              size={16}
              className={syncStatus === 'syncing' ? 'text-blue-400 animate-spin' : syncStatus === 'success' ? 'text-green-400' : 'text-slate-600'}
            />
            <span>{syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'success' ? 'Synced!' : 'Sync to GitHub'}</span>
          </button>
        </div>
      </aside>

      {showSync && <SyncModal onClose={() => setShowSync(false)} />}
    </>
  )
}

/** Mobile bottom tab bar */
export function BottomNav() {
  const [showSync, setShowSync] = useState(false)

  return (
    <>
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
        <button
          onClick={() => setShowSync(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-slate-500"
        >
          <RefreshCw size={20} />
          <span>Sync</span>
        </button>
      </nav>

      {showSync && <SyncModal onClose={() => setShowSync(false)} />}
    </>
  )
}
