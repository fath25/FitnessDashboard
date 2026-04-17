import { useMemo, useState } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/LoadingSpinner'
import { ActivityDetailModal } from '@/components/shared/ActivityDetailModal'
import { formatDistance, formatDurationHM, formatSpeed, formatShortDate } from '@/utils/formatters'
import { Bike, TrendingUp, Zap, Mountain } from 'lucide-react'
import type { Activity } from '@/types/activity'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { subWeeks, parseISO, isAfter, startOfWeek, format } from 'date-fns'

const COLOR = '#22c55e'
const POWER_COLOR = '#f59e0b'

export function CyclingDashboard() {
  const { activities } = useFitness()
  const rides = useMemo(() => activities.filter((a) => a.sport === 'cycling' || a.sport === 'brick'), [activities])
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const stats12w = useMemo(() => {
    const cutoff = subWeeks(new Date(), 12)
    const recent = rides.filter((r) => isAfter(parseISO(r.startTime), cutoff))
    const withPower = recent.filter((r) => r.avgPowerWatts)
    return {
      totalDist: recent.reduce((s, r) => s + r.distanceMeters, 0),
      totalTime: recent.reduce((s, r) => s + r.durationSeconds, 0),
      avgSpeed: recent.filter((r) => r.avgSpeedKmh).length > 0
        ? recent.filter((r) => r.avgSpeedKmh).reduce((s, r) => s + r.avgSpeedKmh!, 0) / recent.filter((r) => r.avgSpeedKmh).length
        : null,
      elev: recent.reduce((s, r) => s + (r.elevationGainMeters ?? 0), 0),
      avgPower: withPower.length > 0
        ? Math.round(withPower.reduce((s, r) => s + r.avgPowerWatts!, 0) / withPower.length)
        : null,
      maxPower: withPower.length > 0
        ? Math.max(...withPower.map((r) => r.avgPowerWatts!))
        : null,
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

  // Combined speed + power trend (last 20 rides with at least one of the two)
  const trendData = useMemo(() =>
    rides
      .filter((r) => r.avgSpeedKmh || r.avgPowerWatts)
      .slice(-20)
      .map((r) => ({
        date: formatShortDate(r.startTime.slice(0, 10)),
        speed: r.avgSpeedKmh ? Math.round(r.avgSpeedKmh * 10) / 10 : null,
        power: r.avgPowerWatts ?? null,
      })),
  [rides])

  const hasPower = rides.some((r) => r.avgPowerWatts)

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

      {hasPower && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Avg power (12w)"
            value={stats12w.avgPower ? `${stats12w.avgPower} W` : '—'}
            color={POWER_COLOR}
            sub="from rides with power meter"
          />
          <StatCard
            label="Best avg power"
            value={stats12w.maxPower ? `${stats12w.maxPower} W` : '—'}
            color={POWER_COLOR}
            sub="single ride, 12 weeks"
          />
        </div>
      )}

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

      {trendData.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Speed & Power Trend — last 20 rides
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 0, right: hasPower ? 20 : 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                yAxisId="speed"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${v}`}
                width={36}
              />
              {hasPower && (
                <YAxis
                  yAxisId="power"
                  orientation="right"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v}W`}
                  width={44}
                />
              )}
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: number, name: string) =>
                  name === 'power' ? [`${v} W`, 'Avg Power'] : [`${v} km/h`, 'Avg Speed']
                }
                cursor={{ stroke: '#475569', strokeWidth: 1 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Line
                yAxisId="speed"
                type="monotone"
                dataKey="speed"
                stroke={COLOR}
                strokeWidth={2}
                dot={false}
                connectNulls
                name="speed"
              />
              {hasPower && (
                <Line
                  yAxisId="power"
                  type="monotone"
                  dataKey="power"
                  stroke={POWER_COLOR}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  name="power"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedActivity && (
        <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Recent Rides — click for details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-700">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-right py-2 pr-4">Dist</th>
                <th className="text-right py-2 pr-4">Time</th>
                <th className="text-right py-2 pr-4">Speed</th>
                {hasPower && <th className="text-right py-2 pr-4">Power</th>}
                <th className="text-right py-2">Elev</th>
              </tr>
            </thead>
            <tbody>
              {rides.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer" onClick={() => setSelectedActivity(r)}>
                  <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{formatShortDate(r.startTime.slice(0, 10))}</td>
                  <td className="py-2 pr-4 text-slate-300 max-w-[180px] truncate">{r.name}</td>
                  <td className="py-2 pr-4 text-right font-mono text-white">{formatDistance(r.distanceMeters)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-slate-300">{formatDurationHM(r.durationSeconds)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-green-400">{formatSpeed(r.avgSpeedKmh)}</td>
                  {hasPower && (
                    <td className="py-2 pr-4 text-right font-mono text-amber-400">
                      {r.avgPowerWatts ? `${r.avgPowerWatts} W` : '—'}
                    </td>
                  )}
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
