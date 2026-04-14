import { useMemo } from 'react'
import type { Activity } from '@/types/activity'
import type { TrainingWeek } from '@/types/training'
import { TRAINING_PLAN, getPlanWeeks } from '@/data/trainingPlan'

export function useTrainingPlan(activities: Activity[]): TrainingWeek[] {
  return useMemo(() => {
    // Build a map of date → activities for fast lookup
    const activityByDate: Record<string, Activity[]> = {}
    for (const a of activities) {
      const day = a.startTime.slice(0, 10)
      if (!activityByDate[day]) activityByDate[day] = []
      activityByDate[day].push(a)
    }

    // Match actual activities to plan days
    const matchedPlan = TRAINING_PLAN.map((day) => {
      const dayActs = activityByDate[day.date] ?? []
      const plannedSports = new Set(day.workouts.map((w) => w.sport))
      const matchedIds = dayActs
        .filter((a) => plannedSports.has(a.sport))
        .map((a) => a.id)
      return { ...day, actualActivityIds: matchedIds }
    })

    // Group into TrainingWeek objects
    const rawWeeks = getPlanWeeks()
    return rawWeeks.map(({ weekNumber, phase, days: _days, isRecoveryWeek }) => {
      const days = matchedPlan.filter((d) => d.weekNumber === weekNumber)
      const startDate = days[0]?.date ?? ''
      const endDate = days[6]?.date ?? ''

      // Volume targets (sum of planned distances)
      let plannedSwim = 0, plannedBike = 0, plannedRun = 0
      let actualSwim = 0, actualBike = 0, actualRun = 0

      for (const day of days) {
        for (const w of day.workouts) {
          if (w.sport === 'swimming') plannedSwim += w.targetDistanceMeters ?? 0
          if (w.sport === 'cycling') plannedBike += w.targetDistanceMeters ?? 0
          if (w.sport === 'running') plannedRun += w.targetDistanceMeters ?? 0
        }
        for (const id of day.actualActivityIds) {
          const act = activities.find((a) => a.id === id)
          if (!act) continue
          if (act.sport === 'swimming') actualSwim += act.distanceMeters
          if (act.sport === 'cycling') actualBike += act.distanceMeters
          if (act.sport === 'running') actualRun += act.distanceMeters
        }
      }

      // Compliance: days where at least one planned sport was completed / total planned days
      const plannedDays = days.filter((d) => d.workouts.some((w) => w.sport !== 'rest'))
      const completedDays = plannedDays.filter((d) => d.actualActivityIds.length > 0)
      const compliancePct = plannedDays.length > 0 ? Math.round((completedDays.length / plannedDays.length) * 100) : 0

      return {
        weekNumber, phase, startDate, endDate, days, isRecoveryWeek,
        plannedSwimMeters: plannedSwim,
        plannedBikeMeters: plannedBike,
        plannedRunMeters: plannedRun,
        actualSwimMeters: actualSwim,
        actualBikeMeters: actualBike,
        actualRunMeters: actualRun,
        compliancePct,
      }
    })
  }, [activities])
}
