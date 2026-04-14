import { useMemo } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { useTrainingPlan } from '@/hooks/useTrainingPlan'
import { StatCard } from '@/components/shared/StatCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { SportBadge } from '@/components/shared/SportBadge'
import { SPORT_CONFIG } from '@/constants/sports'
import { RACE_DATE, GF_DATE } from '@/constants/race'
import { PHASE_LABELS } from '@/types/training'
import {
  formatDistance, formatDurationHM, formatPace, formatShortDate, daysUntil,
} from '@/utils/formatters'
import { currentPlanWeek } from '@/utils/dateUtils'
import { LayoutDashboard, Footprints, Bike, Waves, Dumbbell, Flame, Heart } from 'lucide-react'
import { subDays, parseISO, isAfter } from 'date-fns'
import { Link } from 'react-router-dom'
import type { SportType } from '@/types/activity'

export function OverviewDashboard() {
  const { activities, strengthSessions, isLoading } = useFitness()
  const plan = useTrainingPlan(activities)
  const daysLeft = daysUntil(RACE_DATE)
  const daysToGf = daysUntil(GF_DATE)
  const curWeek = currentPlanWeek()
  const currentWeekPlan = plan[curWeek - 1]

  const recent7d = useMemo(() => {
    const cutoff = subDays(new Date(), 7)
    return activities.filter((a) => isAfter(parseISO(a.startTime), cutoff))
  }, [activities])

  const sportTotals = useMemo(() => {
    const cutoff = subDays(new Date(), 28)
    const month = activities.filter((a) => isAfter(parseISO(a.startTime), cutoff))
    return {
      running: month.filter((a) => a.sport === 'running').reduce((s, a) => s + a.distanceMeters, 0),
      cycling: month.filter((a) => a.sport === 'cycling').reduce((s, a) => s + a.distanceMeters, 0),
      swimming: month.filter((a) => a.sport === 'swimming').reduce((s, a) => s + a.distanceMeters, 0),
      strength: strengthSessions.filter((s) => {
        const cutoffStr = cutoff.toISOString().slice(0, 10)
        return s.date >= cutoffStr
      }).length,
    }
  }, [activities, strengthSessions])

  const totalActivities7d = recent7d.length
  const totalTime7d = recent7d.reduce((s, a) => s + a.durationSeconds, 0)

  if (isLoading) return <LoadingSpinner message="Loading your fitness data…" />

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <LayoutDashboard className="text-slate-400" size={22} /> Overview
        </h1>
        <div className="text-xs text-slate-500">Week {curWeek} of 24</div>
      </div>

      {/* Race countdown hero */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-2xl p-5 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Olympic Triathlon — Oct 5, 2026</div>
            <div className="text-white text-lg font-semibold mb-1">1.5km swim · 40km bike · 10km run</div>
            {currentWeekPlan && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">
                  {PHASE_LABELS[currentWeekPlan.phase]} phase
                  {currentWeekPlan.isRecoveryWeek ? ' — recovery week' : ''}
                </span>
              </div>
            )}
          </div>
          <div className="text-center shrink-0">
            <div className="text-5xl font-black font-mono text-yellow-300">{daysLeft}</div>
            <div className="text-xs text-slate-400 mt-1">days to race</div>
          </div>
        </div>
      </div>

      {/* GF countdown */}
      {daysToGf >= 0 && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-2xl p-4 border border-slate-700/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">
            <div>Next time together Schatzi</div>
            <div className="inline-flex items-center gap-1">
              <Heart className="text-rose-400" size={12} />
              <span>BARA</span>
              <Heart className="text-rose-400" size={12} />
            </div>
          </div>
              <div className="text-white font-semibold">
                {GF_DATE.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="text-center shrink-0">
              <div className="text-4xl font-black font-mono text-pink-300">{daysToGf}</div>
              <div className="text-xs text-slate-400 mt-0.5">days to go</div>
            </div>
          </div>
        </div>
      )}

      {/* 7-day stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Activities (7 days)" value={String(totalActivities7d)} color="#f97316" />
        <StatCard label="Training time (7 days)" value={formatDurationHM(totalTime7d)} color="#f97316" />
        <StatCard label="Plan compliance" value={currentWeekPlan ? `${currentWeekPlan.compliancePct}%` : '—'} color="#22c55e" sub="this week" />
        <StatCard label="Weeks remaining" value={String(24 - curWeek + 1)} color="#06b6d4" />
      </div>

      {/* Sport summary (last 28 days) */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Last 28 days</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(
            [
              { sport: 'running' as SportType, icon: Footprints, value: formatDistance(sportTotals.running), to: '/running' },
              { sport: 'cycling' as SportType, icon: Bike, value: formatDistance(sportTotals.cycling), to: '/cycling' },
              { sport: 'swimming' as SportType, icon: Waves, value: `${sportTotals.swimming.toLocaleString()} m`, to: '/swimming' },
              { sport: 'strength' as SportType, icon: Dumbbell, value: `${sportTotals.strength} sessions`, to: '/strength' },
            ] as const
          ).map(({ sport, icon: Icon, value, to }) => {
            const cfg = SPORT_CONFIG[sport]
            return (
              <Link key={sport} to={to} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <SportBadge sport={sport} size="sm" />
                  <Icon size={16} className={`${cfg.textClass} opacity-60 group-hover:opacity-100 transition-opacity`} />
                </div>
                <div className="text-xl font-bold font-mono text-white">{value}</div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Current week plan */}
      {currentWeekPlan && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">This week's plan</h2>
            <Link to="/training" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">View full plan →</Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {currentWeekPlan.days.map((day) => {
              const hasWorkout = day.workouts.some((w) => w.workoutType !== 'rest')
              if (!hasWorkout) return null
              const today = new Date().toISOString().slice(0, 10)
              const isToday = day.date === today
              const isCompleted = day.actualActivityIds.length > 0
              const isPast = day.date < today

              return (
                <div key={day.date} className={`px-4 py-2.5 flex items-center gap-3 ${isToday ? 'bg-white/5' : ''}`}>
                  <div className="w-10 shrink-0">
                    <div className="text-xs font-semibold text-slate-400">{day.dayOfWeek}</div>
                    <div className="text-xs text-slate-600">{day.date.slice(5)}</div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {day.workouts.filter((w) => w.workoutType !== 'rest').map((w, i) => {
                      const sport = w.sport as string
                      if (!(sport in SPORT_CONFIG)) return null
                      const cfg = SPORT_CONFIG[sport as SportType]
                      return (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${cfg.bgClass} ${cfg.textClass}`}>
                          {cfg.label}
                        </span>
                      )
                    })}
                    <span className="text-xs text-slate-400 self-center truncate">
                      {day.workouts.filter((w) => w.workoutType !== 'rest')[0]?.description}
                    </span>
                  </div>
                  <div className="shrink-0 text-xs">
                    {isCompleted ? <span className="text-green-400">✓</span>
                      : isPast ? <span className="text-red-400/50">✗</span>
                      : isToday ? <span className="text-yellow-300">Today</span>
                      : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent activities feed */}
      {activities.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300">Recent activities</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {activities.slice(0, 8).map((a) => {
              const cfg = SPORT_CONFIG[a.sport]
              return (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bgClass}`}>
                    <Flame size={14} className={cfg.textClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{a.name}</div>
                    <div className="text-xs text-slate-500">{formatShortDate(a.startTime.slice(0, 10))}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono text-slate-300">{formatDistance(a.distanceMeters)}</div>
                    <div className="text-xs text-slate-500">{formatDurationHM(a.durationSeconds)}</div>
                  </div>
                  {a.sport === 'running' && a.avgPaceSecPerKm && (
                    <div className="text-sm font-mono text-orange-400 w-16 text-right shrink-0">
                      {formatPace(a.avgPaceSecPerKm)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activities.length === 0 && strengthSessions.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700/50 text-center">
          <div className="text-slate-600 text-4xl mb-3">📊</div>
          <p className="text-slate-300 font-medium mb-1">No activities yet</p>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Add your Garmin credentials as GitHub Secrets and run the fetch workflow, or log a strength workout to get started.
          </p>
        </div>
      )}
    </div>
  )
}
