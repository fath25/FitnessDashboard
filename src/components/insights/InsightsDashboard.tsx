import { useFitness } from '@/context/FitnessContext'
import { useInsights } from '@/hooks/useInsights'
import { StatCard } from '@/components/shared/StatCard'
import { formatDuration, formatShortDate } from '@/utils/formatters'
import { Lightbulb, Heart, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend, ComposedChart, Area,
} from 'recharts'

export function InsightsDashboard() {
  const { activities, dailyStats, strengthSessions } = useFitness()
  const insights = useInsights(activities, strengthSessions, dailyStats)

  const vo2Data = insights.vo2maxPoints.slice(-30).map((p, i) => ({ ...p, i }))
  const fatigueData = insights.fatigueMetrics.slice(-60)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Lightbulb className="text-blue-400" size={24} /> Insights
      </h1>

      {/* Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Resting heart rate" value={insights.avgRestingHR ? `${insights.avgRestingHR} bpm` : '—'} icon={<Heart size={16} />} color="#ef4444" />
        <StatCard label="Total activities" value={String(activities.length)} color="#3b82f6" />
        <StatCard label="Personal records" value={String(insights.personalRecords.length)} icon={<TrendingUp size={16} />} color="#f59e0b" />
      </div>

      {/* Race predictions */}
      {insights.racePredictions.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Race Time Predictions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {insights.racePredictions.map((p) => (
              <div key={p.label} className="bg-slate-900 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 mb-2">{p.label}</div>
                <div className="text-xl font-bold font-mono text-white">{formatDuration(p.predictedSeconds)}</div>
                <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${p.confidencePct}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">{p.confidencePct}% confidence</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Predictions use the Riegel formula based on your best recent effort. Confidence decreases the further the prediction extrapolates.</p>
        </div>
      )}

      {/* VO2 max trend */}
      {vo2Data.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">VO₂ Max Trend (Garmin estimate)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={vo2Data} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Line type="monotone" dataKey="vo2max" stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Raw" />
              <Line type="monotone" dataKey="rolling" stroke="#3b82f6" strokeWidth={2} dot={false} name="4-week avg" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ATL/CTL/TSB chart */}
      {fatigueData.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Training Load (CTL / ATL / Form)</h2>
          <p className="text-xs text-slate-500 mb-4">CTL = fitness (42d EMA), ATL = fatigue (7d EMA), TSB = form (CTL − ATL)</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={fatigueData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="ctl" stroke="#22c55e" strokeWidth={2} dot={false} name="CTL (Fitness)" />
              <Line type="monotone" dataKey="atl" stroke="#f97316" strokeWidth={2} dot={false} name="ATL (Fatigue)" />
              <Area type="monotone" dataKey="tsb" stroke="#a855f7" strokeWidth={1.5} fill="#a855f7" fillOpacity={0.1} dot={false} name="TSB (Form)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 1RM estimates */}
      {Object.keys(insights.estimated1RMs).length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Estimated 1-Rep Max</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(insights.estimated1RMs).map(([ex, rm]) => (
              <div key={ex} className="bg-slate-900 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">{ex}</div>
                <div className="text-lg font-bold font-mono text-purple-400">{rm} kg</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">1RM estimates are averaged from Epley, Brzycki, and Lander formulas using your best logged set per exercise.</p>
        </div>
      )}

      {/* Personal records */}
      {insights.personalRecords.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Personal Records</h2>
          <div className="divide-y divide-slate-700/50">
            {insights.personalRecords.map((pr, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <span className="text-sm text-slate-300">{pr.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-white text-sm">{pr.value}</span>
                  {pr.date && <span className="text-xs text-slate-500">{formatShortDate(pr.date)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 && Object.keys(insights.estimated1RMs).length === 0 && (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700/50 text-center">
          <Lightbulb size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Insights will appear once you have activity data.</p>
          <p className="text-slate-500 text-xs mt-1">Sync Garmin data or log a strength session to get started.</p>
        </div>
      )}
    </div>
  )
}
