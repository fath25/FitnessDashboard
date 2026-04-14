import { useMemo } from 'react'
import type { Activity } from '@/types/activity'
import type { StrengthSession } from '@/types/strength'
import type { DailyStats } from '@/types/stats'
import {
  runRacePredictions,
  best1RMPerExercise,
  vo2maxTrend,
  computeFatigueMetrics,
  type RacePrediction,
  type VO2Point,
} from '@/utils/predictions'
import type { FatigueMetrics } from '@/types/stats'

export interface InsightsData {
  racePredictions: RacePrediction[]
  estimated1RMs: Record<string, number>
  vo2maxPoints: VO2Point[]
  fatigueMetrics: FatigueMetrics[]
  avgRestingHR: number | null
  personalRecords: { label: string; value: string; date: string }[]
}

export function useInsights(
  activities: Activity[],
  strengthSessions: StrengthSession[],
  dailyStats: DailyStats[],
): InsightsData {
  return useMemo(() => {
    const racePredictions = runRacePredictions(activities)

    const allSets = strengthSessions.flatMap((s) => s.sets)
    const estimated1RMs = best1RMPerExercise(allSets)

    const vo2maxPoints = vo2maxTrend(activities)

    const restingHRs = dailyStats.map((d) => d.restingHeartRate).filter((x): x is number => x != null)
    const avgRestingHR = restingHRs.length > 0 ? Math.round(restingHRs.reduce((a, b) => a + b, 0) / restingHRs.length) : null
    const restHR = avgRestingHR ?? 50

    const fatigueMetrics = computeFatigueMetrics(activities, restHR)

    // Personal records
    const prs: { label: string; value: string; date: string }[] = []

    const runs = activities.filter((a) => a.sport === 'running' && a.avgPaceSecPerKm)
    if (runs.length > 0) {
      const fastest = runs.reduce((best, a) => (a.avgPaceSecPerKm! < best.avgPaceSecPerKm! ? a : best))
      const min = Math.floor(fastest.avgPaceSecPerKm! / 60)
      const sec = Math.round(fastest.avgPaceSecPerKm! % 60)
      prs.push({ label: 'Fastest run pace', value: `${min}:${sec.toString().padStart(2, '0')} /km`, date: fastest.startTime.slice(0, 10) })
    }

    const longestRun = runs.reduce((best, a) => (a.distanceMeters > (best?.distanceMeters ?? 0) ? a : best), runs[0])
    if (longestRun) {
      prs.push({ label: 'Longest run', value: `${(longestRun.distanceMeters / 1000).toFixed(1)} km`, date: longestRun.startTime.slice(0, 10) })
    }

    const rides = activities.filter((a) => a.sport === 'cycling')
    const longestRide = rides.reduce((best, a) => (!best || a.distanceMeters > best.distanceMeters ? a : best), rides[0])
    if (longestRide) {
      prs.push({ label: 'Longest ride', value: `${(longestRide.distanceMeters / 1000).toFixed(1)} km`, date: longestRide.startTime.slice(0, 10) })
    }

    const swims = activities.filter((a) => a.sport === 'swimming')
    const longestSwim = swims.reduce((best, a) => (!best || a.distanceMeters > best.distanceMeters ? a : best), swims[0])
    if (longestSwim) {
      prs.push({ label: 'Longest swim', value: `${longestSwim.distanceMeters} m`, date: longestSwim.startTime.slice(0, 10) })
    }

    // 1RM records
    for (const [exercise, rm] of Object.entries(estimated1RMs).slice(0, 3)) {
      prs.push({ label: `${exercise} est. 1RM`, value: `${rm} kg`, date: strengthSessions[0]?.date ?? '' })
    }

    return { racePredictions, estimated1RMs, vo2maxPoints, fatigueMetrics, avgRestingHR, personalRecords: prs }
  }, [activities, strengthSessions, dailyStats])
}
