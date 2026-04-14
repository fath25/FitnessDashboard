import { useMemo } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/LoadingSpinner'
import { formatSwimPace, formatDurationHM, formatShortDate } from '@/utils/formatters'
import { Waves, TrendingUp } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { subWeeks, parseISO, isAfter, startOfWeek, format } from 'date-fns'

const COLOR = '#06b6d4'

export function SwimmingDashboard() {
  const { activities } = useFitness()
  const swims = useMemo(() => activities.filter((a) => a.sport === 'swimming'), [activities])

  const stats12w = useMemo(() => {
    const cutoff = subWeeks(new Date(), 12)
    const recent = swims.filter((s) => isAfter(parseISO(s.startTime), cutoff))
    const paces = recent.filter((s) => s.avgPaceSecPerKm).map((s) => s.avgPaceSecPerKm!)
    return {
      totalDist: recent.reduce((s, r) => s + r.distanceMeters, 0),
      totalTime: recent.reduce((s, r) => s + r.durationSeconds, 0),
      avgPace: paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null,
      sessions: recent.length,
    }
  }, [swims])

  const weeklyData = useMemo(() => {
    const weeks: Record<string, { weekLabel: string; meters: number }> = {}
    const cutoff = subWeeks(new Date(), 16)
    for (const s of swims) {
      if (!isAfter(parseISO(s.startTime), cutoff)) continue
      const wk = format(startOfWeek(parseISO(s.startTime), { weekStartsOn: 1 }), 'MMM d')
      if (!weeks[wk]) weeks[wk] = { weekLabel: wk, meters: 0 }
      weeks[wk].meters += s.distanceMeters
    }
    return Object.values(weeks)
  }, [swims])

  const paceData = useMemo(() =>
    swims.filter((s) => s.avgPaceSecPerKm).slice(-15).map((s) => ({
      date: formatShortDate(s.startTime.slice(0, 10)),
      paceSec: Math.round(s.avgPaceSecPerKm! / 10), // sec per 100m
    })),
  [swims])

  if (swims.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
          <Waves className="text-cyan-400" size={24} /> Swimming
        </h1>
        <EmptyState title="No swimming activities yet" sub="Once your Garmin data is synced, your swim stats will appear here." />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Waves className="text-cyan-400" size={24} /> Swimming
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total distance (12w)" value={`${stats12w.totalDist.toLocaleString()} m`} icon={<TrendingUp size={16} />} color={COLOR} />
        <StatCard label="Total time (12w)" value={formatDurationHM(stats12w.totalTime)} color={COLOR} />
        <StatCard label="Avg pace (12w)" value={formatSwimPace(stats12w.avgPace)} color={COLOR} sub="per 100m" />
        <StatCard label="Sessions (12w)" value={String(stats12w.sessions)} color={COLOR} />
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Weekly Volume (meters)</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="weekLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} cursor={{ fill: 'rgba(6,182,212,0.08)' }} formatter={(v: number) => [`${v} m`, 'Distance']} />
            <Bar dataKey="meters" fill={COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {paceData.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Pace Trend (sec/100m) — last 15 sessions</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={paceData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis reversed tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => { const m = Math.floor(v / 60); const s = v % 60; return [`${m}:${s.toString().padStart(2, '0')} /100m`, 'Pace'] }} cursor={{ stroke: COLOR, strokeWidth: 1 }} />
              <Line type="monotone" dataKey="paceSec" stroke={COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Recent Sessions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-700">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-right py-2 pr-4">Dist</th>
                <th className="text-right py-2 pr-4">Time</th>
                <th className="text-right py-2">Pace /100m</th>
              </tr>
            </thead>
            <tbody>
              {swims.slice(0, 10).map((s) => (
                <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{formatShortDate(s.startTime.slice(0, 10))}</td>
                  <td className="py-2 pr-4 text-slate-300 max-w-[160px] truncate">{s.name}</td>
                  <td className="py-2 pr-4 text-right font-mono text-white">{s.distanceMeters} m</td>
                  <td className="py-2 pr-4 text-right font-mono text-slate-300">{formatDurationHM(s.durationSeconds)}</td>
                  <td className="py-2 text-right font-mono text-cyan-400">{formatSwimPace(s.avgPaceSecPerKm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
