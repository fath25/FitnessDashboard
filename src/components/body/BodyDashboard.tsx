import { useMemo, useState } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { computeDailyCalorieTarget } from '@/utils/predictions'
import { StatCard } from '@/components/shared/StatCard'
import { BodyLogger } from './BodyLogger'
import { NutritionLogger } from './NutritionLogger'
import { UserProfileModal } from './UserProfileModal'
import { Scale, Plus, Trash2, User, Flame } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, ReferenceLine,
} from 'recharts'
import { parseISO, isAfter, subDays, format } from 'date-fns'

type TimeRange = '30d' | '90d' | 'all'

export function BodyDashboard() {
  const {
    activities, bodyEntries, nutritionEntries, userProfile,
    deleteBodyEntry, deleteNutritionEntry,
  } = useFitness()

  const [showBodyLogger, setShowBodyLogger] = useState(false)
  const [showNutritionLogger, setShowNutritionLogger] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('90d')

  // Recent 7-day activity count → TDEE multiplier
  const recentActivityCount = useMemo(() => {
    const cutoff = subDays(new Date(), 7)
    return activities.filter((a) => isAfter(parseISO(a.startTime), cutoff)).length
  }, [activities])

  const { bmr, tdee, target } = computeDailyCalorieTarget(userProfile, recentActivityCount)

  // Latest logged body entry (sorted desc by date)
  const latestBody = bodyEntries[0]
  const currentWeight = latestBody?.weightKg ?? userProfile.weightKg
  const currentBodyFat = latestBody?.bodyFatPct ?? userProfile.bodyFatPct
  const bmi = userProfile.heightCm > 0
    ? currentWeight / Math.pow(userProfile.heightCm / 100, 2)
    : null

  // Days since last body log
  const daysSinceLog = latestBody
    ? Math.floor((Date.now() - parseISO(latestBody.date).getTime()) / 86_400_000)
    : null

  // Today's calories
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCalories = useMemo(
    () => nutritionEntries.filter((e) => e.date === todayStr).reduce((s, e) => s + e.calories, 0),
    [nutritionEntries, todayStr],
  )
  const calorieDiff = todayCalories - target

  // Body composition chart data
  const bodyChartData = useMemo(() => {
    let entries = [...bodyEntries]
    if (timeRange !== 'all') {
      const days = timeRange === '30d' ? 30 : 90
      const cutoff = subDays(new Date(), days)
      entries = entries.filter((e) => isAfter(parseISO(e.date), cutoff))
    }
    return entries
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date.slice(5), weight: e.weightKg, bodyFat: e.bodyFatPct }))
  }, [bodyEntries, timeRange])

  // Nutrition chart: last 14 days (filled even for days with no entry)
  const nutritionChartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const entry = nutritionEntries.find((e) => e.date === dateStr)
      return { date: format(d, 'MM/dd'), calories: entry?.calories ?? null }
    })
  }, [nutritionEntries])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Scale className="text-pink-400" size={24} /> Body & Nutrition
        </h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowBodyLogger(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-pink-600 hover:bg-pink-500 rounded-lg transition-colors"
          >
            <Plus size={14} /> Log Weight
          </button>
          <button
            onClick={() => setShowNutritionLogger(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <Plus size={14} /> Log Calories
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <User size={14} /> Edit Profile
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Weight"
          value={`${currentWeight} kg`}
          color="#ec4899"
          sub={latestBody ? latestBody.date : 'from profile'}
        />
        <StatCard
          label="Body Fat"
          value={currentBodyFat != null ? `${currentBodyFat}%` : '—'}
          color="#f97316"
        />
        <StatCard
          label="BMI"
          value={bmi ? bmi.toFixed(1) : '—'}
          color="#a855f7"
          sub={bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : undefined}
        />
        <StatCard
          label="Last Logged"
          value={daysSinceLog === null ? 'Never' : daysSinceLog === 0 ? 'Today' : `${daysSinceLog}d ago`}
          color="#06b6d4"
        />
      </div>

      {/* Calorie target card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-2xl p-5 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-500/5" />
        <div className="relative">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Flame size={12} className="text-orange-400" /> Daily Calories
            <span className="ml-1 text-slate-600">·</span>
            <span className="text-slate-600 normal-case">Mifflin-St Jeor, {recentActivityCount} activities last 7d</span>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex gap-6">
              <div>
                <div className="text-xs text-slate-500 mb-0.5">BMR</div>
                <div className="text-base font-mono font-semibold text-slate-400">{bmr.toLocaleString()} kcal</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">TDEE</div>
                <div className="text-base font-mono font-semibold text-slate-400">{tdee.toLocaleString()} kcal</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">
                  Target
                  <span className="ml-1 text-slate-600">
                    ({userProfile.goalCalorieSurplus >= 0 ? '+' : ''}{userProfile.goalCalorieSurplus})
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-orange-300">{target.toLocaleString()} kcal</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-0.5">Logged today</div>
              <div className="text-2xl font-black font-mono text-white">{todayCalories.toLocaleString()}</div>
              {todayCalories > 0 && (
                <div className={`text-xs font-medium mt-0.5 ${calorieDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calorieDiff >= 0 ? '+' : ''}{calorieDiff.toLocaleString()} vs target
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body composition chart */}
      {bodyChartData.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Body Composition</h2>
            <div className="flex gap-1">
              {(['30d', '90d', 'all'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${timeRange === r ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={bodyChartData} margin={{ top: 0, right: 24, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis yAxisId="w" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v) => `${v}kg`} width={48} />
              <YAxis yAxisId="f" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} width={36} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: number, name: string) => [name === 'weight' ? `${v} kg` : `${v}%`, name === 'weight' ? 'Weight' : 'Body Fat']}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Line yAxisId="w" type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2} dot={{ r: 3, fill: '#ec4899' }} name="Weight (kg)" connectNulls />
              <Line yAxisId="f" type="monotone" dataKey="bodyFat" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} name="Body Fat %" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Nutrition chart */}
      {nutritionEntries.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Calories — Last 14 Days</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={nutritionChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: number) => [`${v.toLocaleString()} kcal`, 'Calories']}
              />
              <ReferenceLine y={target} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Target', fill: '#f97316', fontSize: 10, position: 'insideTopRight' }} />
              <Bar dataKey="calories" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Calories" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {bodyEntries.length === 0 && nutritionEntries.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700/50 text-center">
          <Scale size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium mb-1">No data logged yet</p>
          <p className="text-slate-500 text-sm mb-4">Track your body composition and daily nutrition to see your progress here</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowBodyLogger(true)} className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm rounded-lg transition-colors">
              <Plus size={14} /> Log Weight
            </button>
            <button onClick={() => setShowNutritionLogger(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
              <Plus size={14} /> Log Calories
            </button>
          </div>
        </div>
      )}

      {/* Body history table */}
      {bodyEntries.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300">Body Log History</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {bodyEntries.slice(0, 15).map((entry) => (
              <div key={entry.id} className="px-4 py-2.5 flex items-center gap-4">
                <div className="text-xs text-slate-500 w-24 shrink-0">{entry.date}</div>
                <div className="flex-1 flex items-center gap-4">
                  <span className="text-white font-mono text-sm">{entry.weightKg} kg</span>
                  {entry.bodyFatPct != null && (
                    <span className="text-orange-300 font-mono text-sm">{entry.bodyFatPct}% fat</span>
                  )}
                  {entry.notes && <span className="text-slate-500 text-xs truncate">{entry.notes}</span>}
                </div>
                <button
                  onClick={() => deleteBodyEntry(entry.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition history table */}
      {nutritionEntries.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300">Nutrition Log History</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {nutritionEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="px-4 py-2.5 flex items-center gap-4">
                <div className="text-xs text-slate-500 w-24 shrink-0">{entry.date}</div>
                <div className="flex-1 flex items-center gap-4 flex-wrap">
                  <span className="text-white font-mono text-sm">{entry.calories.toLocaleString()} kcal</span>
                  {entry.proteinG != null && <span className="text-green-300 text-xs">{entry.proteinG}g P</span>}
                  {entry.carbsG != null && <span className="text-yellow-300 text-xs">{entry.carbsG}g C</span>}
                  {entry.fatG != null && <span className="text-orange-300 text-xs">{entry.fatG}g F</span>}
                  {entry.notes && <span className="text-slate-500 text-xs truncate">{entry.notes}</span>}
                </div>
                <span className={`text-xs font-medium shrink-0 ${entry.calories >= target ? 'text-green-400' : 'text-slate-500'}`}>
                  {entry.calories >= target ? '+' : ''}{(entry.calories - target).toLocaleString()}
                </span>
                <button
                  onClick={() => deleteNutritionEntry(entry.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBodyLogger && <BodyLogger onClose={() => setShowBodyLogger(false)} />}
      {showNutritionLogger && <NutritionLogger onClose={() => setShowNutritionLogger(false)} />}
      {showProfileModal && <UserProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  )
}
