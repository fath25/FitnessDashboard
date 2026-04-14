import { useMemo, useState } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { useInsights } from '@/hooks/useInsights'
import { StatCard } from '@/components/shared/StatCard'
import { WorkoutLogger } from './WorkoutLogger'
import { Dumbbell, Plus, Download, Edit2, Trash2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import type { StrengthSession } from '@/types/strength'
import { estimated1RM } from '@/utils/predictions'

const COLOR = '#a855f7'
const TOP_EXERCISES = ['Back Squat', 'Romanian Deadlift', 'Hip Thrust', 'Bench Press', 'Pull-ups', 'Overhead Press']

export function StrengthDashboard() {
  const { activities, dailyStats, strengthSessions, deleteStrengthSession, exportStrengthJSON } = useFitness()
  const insights = useInsights(activities, strengthSessions, dailyStats)
  const [showLogger, setShowLogger] = useState(false)
  const [editSession, setEditSession] = useState<StrengthSession | undefined>()

  const totalVolume = useMemo(() => strengthSessions.reduce((s, ss) => s + ss.totalVolumeKg, 0), [strengthSessions])

  // 1RM trend per top exercise for chart
  const oneRMTrend = useMemo(() => {
    if (strengthSessions.length === 0) return []
    const exerciseInData = TOP_EXERCISES.filter((ex) =>
      strengthSessions.some((s) => s.sets.some((set) => set.exercise === ex)),
    ).slice(0, 4)

    return strengthSessions.map((session) => {
      const point: Record<string, number | string> = { date: session.date }
      for (const ex of exerciseInData) {
        const sets = session.sets.filter((s) => s.exercise === ex && !s.isBodyweight && s.reps > 0 && s.weightKg > 0)
        if (sets.length > 0) {
          const best = Math.max(...sets.map((s) => estimated1RM(s.weightKg, s.reps)))
          point[ex] = Math.round(best * 10) / 10
        }
      }
      return point
    })
  }, [strengthSessions])

  const exerciseColors = ['#a855f7', '#f97316', '#22c55e', '#06b6d4']
  const chartExercises = TOP_EXERCISES.filter((ex) =>
    strengthSessions.some((s) => s.sets.some((set) => set.exercise === ex)),
  ).slice(0, 4)

  function openEdit(session: StrengthSession) {
    setEditSession(session)
    setShowLogger(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell className="text-purple-400" size={24} /> Strength
        </h1>
        <div className="flex gap-2">
          {strengthSessions.length > 0 && (
            <button
              onClick={exportStrengthJSON}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              <Download size={14} /> Export JSON
            </button>
          )}
          <button
            onClick={() => { setEditSession(undefined); setShowLogger(true) }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          >
            <Plus size={14} /> Log Workout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total sessions" value={String(strengthSessions.length)} color={COLOR} />
        <StatCard label="Total volume" value={`${totalVolume.toLocaleString()} kg`} color={COLOR} sub="all time" />
        {Object.entries(insights.estimated1RMs).slice(0, 2).map(([ex, rm]) => (
          <StatCard key={ex} label={`${ex} est. 1RM`} value={`${rm} kg`} color={COLOR} />
        ))}
      </div>

      {/* 1RM trend chart */}
      {chartExercises.length > 0 && oneRMTrend.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Estimated 1RM Progression (kg)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={oneRMTrend} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [`${v} kg`]} cursor={{ stroke: '#475569', strokeWidth: 1 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              {chartExercises.map((ex, i) => (
                <Line key={ex} type="monotone" dataKey={ex} stroke={exerciseColors[i]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Session log */}
      {strengthSessions.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700/50 flex flex-col items-center gap-3">
          <Dumbbell size={32} className="text-slate-600" />
          <p className="text-slate-400 text-sm text-center">No strength sessions logged yet.</p>
          <p className="text-slate-500 text-xs text-center max-w-xs">
            Click "Log Workout" to add your first session. Data is saved locally and can be exported as JSON.
          </p>
          <button onClick={() => setShowLogger(true)} className="flex items-center gap-2 mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors">
            <Plus size={14} /> Log your first workout
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300">Session History</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {strengthSessions.map((session) => {
              const exerciseNames = [...new Set(session.sets.map((s) => s.exercise))].slice(0, 4)
              return (
                <div key={session.id} className="px-4 py-3 hover:bg-slate-700/20 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white text-sm font-medium">{session.date}</span>
                      <span className="text-slate-500 text-xs">{session.durationMinutes}min</span>
                      <span className="text-purple-400 text-xs">{session.totalVolumeKg.toLocaleString()} kg volume</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {exerciseNames.map((name) => (
                        <span key={name} className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">{name}</span>
                      ))}
                      {session.sets.length > exerciseNames.length * 3 && (
                        <span className="text-xs text-slate-500">+more</span>
                      )}
                    </div>
                    {session.notes && <p className="text-slate-500 text-xs mt-1 truncate">{session.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(session)} className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-slate-700 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteStrengthSession(session.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showLogger && (
        <WorkoutLogger
          onClose={() => { setShowLogger(false); setEditSession(undefined) }}
          editSession={editSession}
        />
      )}
    </div>
  )
}
