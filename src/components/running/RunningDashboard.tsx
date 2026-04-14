import { useMemo } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { useInsights } from '@/hooks/useInsights'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/LoadingSpinner'
import { formatPace, formatDuration, formatDistance, formatDurationHM, formatShortDate } from '@/utils/formatters'
import { Footprints, TrendingUp, Timer, Mountain } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { subWeeks, parseISO, isAfter, startOfWeek, format } from 'date-fns'

const COLOR = '#f97316'

export function RunningDashboard() {
  const { activities, dailyStats, strengthSessions } = useFitness()
  const insights = useInsights(activities, strengthSessions, dailyStats)
  const runs = useMemo(() => activities.filter((a) => a.sport === 'running'), [activities])

  const stats12w = useMemo(() => {
    const cutoff = subWeeks(new Date(), 12)
    const recent = runs.filter((r) => isAfter(parseISO(r.startTime), cutoff))
    const totalDist = recent.reduce((s, r) => s + r.distanceMeters, 0)
    const totalTime = recent.reduce((s, r) => s + r.durationSeconds, 0)
    const avgPaces = recent.filter((r) => r.avgPaceSecPerKm).map((r) => r.avgPaceSecPerKm!)
    const avgPace = avgPaces.length > 0 ? avgPaces.reduce((a, b) => a + b, 0) / avgPaces.length : null
    const elev = recent.reduce((s, r) => s + (r.elevationGainMeters ?? 0), 0)
    return { totalDist, totalTime, avgPace, elev, count: recent.length }
  }, [runs])

  const weeklyData = useMemo(() => {
    const weeks: Record<string, { weekLabel: string; km: number; sessions: number }> = {}
    const cutoff = subWeeks(new Date(), 16)
    for (const r of runs) {
      if (!isAfter(parseISO(r.startTime), cutoff)) continue
      const wk = format(startOfWeek(parseISO(r.startTime), { weekStartsOn: 1 }), 'MMM d')
      if (!weeks[wk]) weeks[wk] = { weekLabel: wk, km: 0, sessions: 0 }
      weeks[wk].km += r.distanceMeters / 1000
      weeks[wk].sessions++
    }
    return Object.values(weeks).map((w) => ({ ...w, km: Math.round(w.km * 10) / 10 }))
  }, [runs])

  const paceData = useMemo(() =>
    runs
      .filter((r) => r.avgPaceSecPerKm)
      .slice(-20)
      .map((r) => ({
        date: formatShortDate(r.startTime.slice(0, 10)),
        paceMin: Math.round((r.avgPaceSecPerKm! / 60) * 100) / 100,
        dist: Math.round(r.distanceMeters / 100) / 10,
      })),
  [runs])

  if (runs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
          <Footprints className="text-orange-400" size={24} /> Running
        </h1>
        <EmptyState
          title="No running activities yet"
          sub="Once your Garmin data is synced, your running stats will appear here."
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Footprints className="text-orange-400" size={24} /> Running
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total distance (12w)" value={formatDistance(stats12w.totalDist)} icon={<TrendingUp size={16} />} color={COLOR} />
        <StatCard label="Total time (12w)" value={formatDurationHM(stats12w.totalTime)} icon={<Timer size={16} />} color={COLOR} />
        <StatCard label="Avg pace (12w)" value={formatPace(stats12w.avgPace)} color={COLOR} />
        <StatCard label="Elevation (12w)" value={`${Math.round(stats12w.elev)} m`} icon={<Mountain size={16} />} color={COLOR} />
      </div>

      {/* Weekly volume chart */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Weekly Distance (km)</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="weekLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              cursor={{ fill: 'rgba(249,115,22,0.08)' }}
            />
            <Bar dataKey="km" fill={COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pace trend */}
      {paceData.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Pace Trend (min/km) — last 20 runs</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={paceData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis reversed tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: number) => {
                  const min = Math.floor(v); const sec = Math.round((v - min) * 60)
                  return [`${min}:${sec.toString().padStart(2, '0')} /km`, 'Pace']
                }}
                cursor={{ stroke: COLOR, strokeWidth: 1 }}
              />
              <Line type="monotone" dataKey="paceMin" stroke={COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Race predictions */}
      {insights.racePredictions.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Race Predictions (Riegel formula)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {insights.racePredictions.map((p) => (
              <div key={p.label} className="bg-slate-900 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">{p.label}</div>
                <div className="text-lg font-bold font-mono text-white">{formatDuration(p.predictedSeconds)}</div>
                <div className="text-xs text-slate-500">{p.confidencePct}% confidence</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent runs */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Recent Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-700">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-right py-2 pr-4">Dist</th>
                <th className="text-right py-2 pr-4">Time</th>
                <th className="text-right py-2 pr-4">Pace</th>
                <th className="text-right py-2">HR</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{formatShortDate(r.startTime.slice(0, 10))}</td>
                  <td className="py-2 pr-4 text-slate-300 max-w-[180px] truncate">{r.name}</td>
                  <td className="py-2 pr-4 text-right font-mono text-white">{formatDistance(r.distanceMeters)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-slate-300">{formatDuration(r.durationSeconds)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-orange-400">{formatPace(r.avgPaceSecPerKm)}</td>
                  <td className="py-2 text-right text-slate-400">{r.avgHeartRate ? `${r.avgHeartRate} bpm` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
