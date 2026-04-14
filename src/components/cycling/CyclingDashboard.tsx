import { useMemo } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/LoadingSpinner'
import { formatDistance, formatDurationHM, formatSpeed, formatShortDate } from '@/utils/formatters'
import { Bike, TrendingUp, Zap, Mountain } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { subWeeks, parseISO, isAfter, startOfWeek, format } from 'date-fns'

const COLOR = '#22c55e'

export function CyclingDashboard() {
  const { activities } = useFitness()
  const rides = useMemo(() => activities.filter((a) => a.sport === 'cycling' || a.sport === 'brick'), [activities])

  const stats12w = useMemo(() => {
    const cutoff = subWeeks(new Date(), 12)
    const recent = rides.filter((r) => isAfter(parseISO(r.startTime), cutoff))
    return {
      totalDist: recent.reduce((s, r) => s + r.distanceMeters, 0),
      totalTime: recent.reduce((s, r) => s + r.durationSeconds, 0),
      avgSpeed: recent.filter((r) => r.avgSpeedKmh).length > 0
        ? recent.filter((r) => r.avgSpeedKmh).reduce((s, r) => s + r.avgSpeedKmh!, 0) / recent.filter((r) => r.avgSpeedKmh).length
        : null,
      elev: recent.reduce((s, r) => s + (r.elevationGainMeters ?? 0), 0),
    }
  }, [rides])

  const weeklyData = useMemo(() => {
    const weeks: Record<string, { weekLabel: string; km: number }> = {}
    const cutoff = subWeeks(new Date(), 16)
    for (const r of rides) {
      if (!isAfter(parseISO(r.startTime), cutoff)) continue
      const wk = format(startOfWeek(parseISO(r.startTime), { weekStartsOn: 1 }), 'MMM d')
      if (!weeks[wk]) weeks[wk] = { weekLabel: wk, km: 0 }
      weeks[wk].km += r.distanceMeters / 1000
    }
    return Object.values(weeks).map((w) => ({ ...w, km: Math.round(w.km * 10) / 10 }))
  }, [rides])

  const speedData = useMemo(() =>
    rides.filter((r) => r.avgSpeedKmh).slice(-20).map((r) => ({
      date: formatShortDate(r.startTime.slice(0, 10)),
      speed: Math.round(r.avgSpeedKmh! * 10) / 10,
      dist: Math.round(r.distanceMeters / 100) / 10,
    })),
  [rides])

  if (rides.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
          <Bike className="text-green-400" size={24} /> Cycling
        </h1>
        <EmptyState title="No cycling activities yet" sub="Once your Garmin data is synced, your cycling stats will appear here." />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bike className="text-green-400" size={24} /> Cycling
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total distance (12w)" value={formatDistance(stats12w.totalDist)} icon={<TrendingUp size={16} />} color={COLOR} />
        <StatCard label="Total time (12w)" value={formatDurationHM(stats12w.totalTime)} color={COLOR} />
        <StatCard label="Avg speed (12w)" value={formatSpeed(stats12w.avgSpeed)} icon={<Zap size={16} />} color={COLOR} />
        <StatCard label="Elevation (12w)" value={`${Math.round(stats12w.elev)} m`} icon={<Mountain size={16} />} color={COLOR} />
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Weekly Distance (km)</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="weekLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} cursor={{ fill: 'rgba(34,197,94,0.08)' }} />
            <Bar dataKey="km" fill={COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {speedData.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Speed Trend (km/h) — last 20 rides</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={speedData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [`${v} km/h`, 'Speed']} cursor={{ stroke: COLOR, strokeWidth: 1 }} />
              <Line type="monotone" dataKey="speed" stroke={COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Recent Rides</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-700">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-right py-2 pr-4">Dist</th>
                <th className="text-right py-2 pr-4">Time</th>
                <th className="text-right py-2 pr-4">Speed</th>
                <th className="text-right py-2">Elev</th>
              </tr>
            </thead>
            <tbody>
              {rides.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{formatShortDate(r.startTime.slice(0, 10))}</td>
                  <td className="py-2 pr-4 text-slate-300 max-w-[180px] truncate">{r.name}</td>
                  <td className="py-2 pr-4 text-right font-mono text-white">{formatDistance(r.distanceMeters)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-slate-300">{formatDurationHM(r.durationSeconds)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-green-400">{formatSpeed(r.avgSpeedKmh)}</td>
                  <td className="py-2 text-right text-slate-400">{r.elevationGainMeters ? `${Math.round(r.elevationGainMeters)}m` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
