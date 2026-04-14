import { useMemo, useState } from 'react'
import { useFitness } from '@/context/FitnessContext'
import { useTrainingPlan } from '@/hooks/useTrainingPlan'
import { PHASE_LABELS } from '@/types/training'
import { SPORT_CONFIG } from '@/constants/sports'
import { RACE_DATE } from '@/constants/race'
import { daysUntil } from '@/utils/formatters'
import { CalendarDays, Download, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { currentPlanWeek } from '@/utils/dateUtils'
import { downloadICS } from '@/data/calendarExport'
import { TRAINING_PLAN } from '@/data/trainingPlan'

const PHASE_COLORS: Record<string, string> = {
  base1:  'bg-blue-500/20 text-blue-300',
  base2:  'bg-cyan-500/20 text-cyan-300',
  build1: 'bg-yellow-500/20 text-yellow-300',
  build2: 'bg-orange-500/20 text-orange-300',
  peak:   'bg-red-500/20 text-red-300',
  taper:  'bg-green-500/20 text-green-300',
}

export function TrainingPlanView() {
  const { activities } = useFitness()
  const plan = useTrainingPlan(activities)
  const curWeek = useMemo(() => currentPlanWeek(), [])
  const [viewWeek, setViewWeek] = useState(curWeek)

  const week = plan[viewWeek - 1]
  const daysLeft = daysUntil(RACE_DATE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="text-yellow-300" size={24} /> Training Plan
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => downloadICS(TRAINING_PLAN)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <Download size={14} /> Download .ics
          </button>
        </div>
      </div>

      {/* Race countdown */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20 flex items-center justify-between">
        <div>
          <div className="text-xs text-yellow-300/70 uppercase tracking-wider mb-1">Olympic Triathlon — Race Day</div>
          <div className="text-white font-semibold">Oct 5, 2026 — {daysLeft} days to go</div>
          <div className="text-slate-400 text-xs mt-0.5">1.5km swim · 40km bike · 10km run</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold font-mono text-yellow-300">{daysLeft}</div>
          <div className="text-xs text-slate-400">days</div>
        </div>
      </div>

      {/* Phase overview strip */}
      <div className="flex gap-1 flex-wrap">
        {[...new Set(plan.map((w) => w.phase))].map((ph) => (
          <span key={ph} className={`text-xs px-2 py-1 rounded-full ${PHASE_COLORS[ph]}`}>
            {PHASE_LABELS[ph]}
          </span>
        ))}
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setViewWeek((w) => Math.max(1, w - 1))}
          disabled={viewWeek === 1}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 border border-slate-700 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <span className="text-white font-medium">Week {viewWeek} of 24</span>
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${PHASE_COLORS[week?.phase ?? 'base1']}`}>
            {PHASE_LABELS[week?.phase ?? 'base1']}
          </span>
          {week?.isRecoveryWeek && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">Recovery</span>
          )}
          {viewWeek === curWeek && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white">← Current</span>
          )}
        </div>
        <button
          onClick={() => setViewWeek((w) => Math.min(24, w + 1))}
          disabled={viewWeek === 24}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 border border-slate-700 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week detail */}
      {week && (
        <div className="space-y-2">
          {week.days.map((day) => {
            const hasWorkout = day.workouts.some((w) => w.workoutType !== 'rest')
            const isCompleted = day.actualActivityIds.length > 0
            const today = new Date().toISOString().slice(0, 10)
            const isPast = day.date < today
            const isToday = day.date === today

            return (
              <div
                key={day.date}
                className={`rounded-xl p-3 border transition-all ${
                  day.isRaceDay
                    ? 'border-yellow-400/50 bg-yellow-400/5'
                    : isToday
                    ? 'border-white/20 bg-white/5'
                    : isCompleted
                    ? 'border-green-500/20 bg-green-500/5'
                    : isPast && hasWorkout
                    ? 'border-red-500/10 bg-red-500/3'
                    : 'border-slate-700/50 bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 shrink-0">
                    <div className="text-xs font-semibold text-slate-400">{day.dayOfWeek}</div>
                    <div className="text-xs text-slate-600">{day.date.slice(5)}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {day.isRaceDay ? (
                      <div className="text-yellow-300 font-semibold text-sm">🏁 RACE DAY — Olympic Triathlon</div>
                    ) : !hasWorkout ? (
                      <div className="text-slate-600 text-sm">Rest day</div>
                    ) : (
                      <div className="space-y-1.5">
                        {day.workouts
                          .filter((w) => w.workoutType !== 'rest')
                          .map((workout, i) => {
                            const sport = workout.sport as string
                            const cfg = sport in SPORT_CONFIG ? SPORT_CONFIG[sport as keyof typeof SPORT_CONFIG] : null
                            return (
                              <div key={i} className="flex items-start gap-2">
                                {cfg && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cfg.bgClass} ${cfg.textClass}`}>
                                    {cfg.label}
                                  </span>
                                )}
                                <span className="text-sm text-slate-300">{workout.description}</span>
                                {workout.targetDurationMinutes > 0 && (
                                  <span className="text-xs text-slate-500 shrink-0">{workout.targetDurationMinutes}min</span>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>

                  {hasWorkout && !day.isRaceDay && (
                    <div className="shrink-0">
                      {isCompleted ? (
                        <span className="text-xs text-green-400 font-medium">✓ Done</span>
                      ) : isPast ? (
                        <span className="text-xs text-red-400/60">Missed</span>
                      ) : isToday ? (
                        <span className="text-xs text-white/60">Today</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Volume summary for the week */}
      {week && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Week {viewWeek} Volume</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Swim', planned: week.plannedSwimMeters, actual: week.actualSwimMeters, unit: 'm', color: '#06b6d4' },
              { label: 'Bike', planned: week.plannedBikeMeters / 1000, actual: week.actualBikeMeters / 1000, unit: 'km', color: '#22c55e' },
              { label: 'Run', planned: week.plannedRunMeters / 1000, actual: week.actualRunMeters / 1000, unit: 'km', color: '#f97316' },
            ].map(({ label, planned, actual, unit, color }) => (
              <div key={label}>
                <div className="text-xs text-slate-400 mb-1">{label}</div>
                <div className="text-sm font-mono text-white">{actual.toFixed(1)} <span className="text-slate-500">/ {planned.toFixed(1)} {unit}</span></div>
                <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, planned > 0 ? (actual / planned) * 100 : 0)}%`, background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
