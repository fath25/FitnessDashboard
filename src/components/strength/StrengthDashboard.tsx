import { useMemo, useState } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { useInsights } from '@/hooks/useInsights'
import { StatCard } from '@/components/shared/StatCard'
import { WorkoutLogger } from './WorkoutLogger'
import { Dumbbell, Plus, Edit2, Trash2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, ComposedChart, Area,
} from 'recharts'
import { parseISO, startOfISOWeek, format } from 'date-fns'
import type { StrengthSession } from '@/types/strength'
import { estimated1RM } from '@/utils/predictions'

const COLOR = '#a855f7'
const TOP_EXERCISES = ['Back Squat', 'Romanian Deadlift', 'Hip Thrust', 'Bench Press', 'Pull-ups', 'Overhead Press']
const EXERCISE_COLORS = ['#a855f7', '#f97316', '#22c55e', '#06b6d4']

export function StrengthDashboard() {
  const { activities, dailyStats, strengthSessions, deleteStrengthSession } = useFitness()
  const insights = useInsights(activities, strengthSessions, dailyStats)
  const [showLogger, setShowLogger] = useState(false)
  const [editSession, setEditSession] = useState<StrengthSession | undefined>()

  const totalVolume = useMemo(() => strengthSessions.reduce((s, ss) => s + ss.totalVolumeKg, 0), [strengthSessions])

  // Exercises present in the data (limited to top 4)
  const chartExercises = useMemo(() =>
    TOP_EXERCISES.filter((ex) =>
      strengthSessions.some((s) => s.sets.some((set) => set.exercise === ex)),
    ).slice(0, 4),
  [strengthSessions])

  // 1RM trend per top exercise
  const oneRMTrend = useMemo(() => {
    if (strengthSessions.length === 0) return []
    return strengthSessions.map((session) => {
      const point: Record<string, number | string> = { date: session.date }
      for (const ex of chartExercises) {
        const sets = session.sets.filter((s) => s.exercise === ex && !s.isBodyweight && s.reps > 0 && s.weightKg > 0)
        if (sets.length > 0) {
          const best = Math.max(...sets.map((s) => estimated1RM(s.weightKg, s.reps)))
          point[ex] = Math.round(best * 10) / 10
        }
      }
      return point
    })
  }, [strengthSessions, chartExercises])

  // Weekly total volume (last 10 weeks)
  const weeklyVolume = useMemo(() => {
    const map: Record<string, number> = {}
    for (const session of strengthSessions) {
      const key = format(startOfISOWeek(parseISO(session.date)), 'yyyy-MM-dd')
      map[key] = (map[key] ?? 0) + session.totalVolumeKg
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, volume]) => ({ week: date.slice(5), volume }))
  }, [strengthSessions])

  // Training load: weekly sessions + 4-week rolling average volume
  const trainingLoadData = useMemo(() => {
    const map: Record<string, { sessions: number; volume: number }> = {}
    for (const session of strengthSessions) {
      const key = format(startOfISOWeek(parseISO(session.date)), 'yyyy-MM-dd')
      if (!map[key]) map[key] = { sessions: 0, volume: 0 }
      map[key].sessions++
      map[key].volume += session.totalVolumeKg
    }
    const sorted = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-16)
    // 4-week rolling average volume
    return sorted.map(([date, { sessions, volume }], idx) => {
      const window = sorted.slice(Math.max(0, idx - 3), idx + 1)
      const avgVol = Math.round(window.reduce((s, [, d]) => s + d.volume, 0) / window.length)
      return { week: date.slice(5), sessions, volume: Math.round(volume), avgVol }
    })
  }, [strengthSessions])

  // Max weight per top exercise (personal bests)
  const maxWeights = useMemo(() => {
    const result: Record<string, number> = {}
    for (const session of strengthSessions) {
      for (const set of session.sets) {
        if (!set.isBodyweight && set.weightKg > 0) {
          if (!result[set.exercise] || set.weightKg > result[set.exercise]) {
            result[set.exercise] = set.weightKg
          }
        }
      }
    }
    return result
  }, [strengthSessions])

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

      {/* Max weight personal bests */}
      {chartExercises.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {chartExercises.map((ex, i) => (
            <div key={ex} className="bg-slate-800 rounded-xl p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1 truncate">{ex} — max weight</div>
              <div className="text-xl font-bold font-mono" style={{ color: EXERCISE_COLORS[i] }}>
                {maxWeights[ex] != null ? `${maxWeights[ex]} kg` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

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
                <Line key={ex} type="monotone" dataKey={ex} stroke={EXERCISE_COLORS[i]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly volume chart */}
      {weeklyVolume.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Weekly Volume (kg)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyVolume} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [`${v.toLocaleString()} kg`, 'Volume']} />
              <Bar dataKey="volume" fill={COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Training load chart */}
      {trainingLoadData.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Training Load</h2>
          <p className="text-xs text-slate-500 mb-4">Weekly sessions (bars) with 4-week rolling avg volume (line)</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={trainingLoadData} margin={{ top: 0, right: 44, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis yAxisId="sessions" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} domain={[0, 'auto']} />
              <YAxis
                yAxisId="volume"
                orientation="right"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`}
                width={40}
              />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: number, name: string) => {
                  if (name === 'sessions') return [v, 'Sessions']
                  if (name === 'avgVol') return [`${v.toLocaleString()} kg`, '4-wk avg vol']
                  return [v]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar yAxisId="sessions" dataKey="sessions" fill={COLOR} opacity={0.7} radius={[3, 3, 0, 0]} name="sessions" />
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="avgVol"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="avgVol"
              />
            </ComposedChart>
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
                      <span className="text-purple-400 text-xs">{session.totalVolumeKg.toLocaleString()} kg</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {exerciseNames.map((name) => (
                        <span key={name} className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">{name}</span>
                      ))}
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
