import type { Activity } from '@/types/activity'
import type { StrengthSet } from '@/types/strength'
import type { FatigueMetrics } from '@/types/stats'
import { USER_CONFIG } from '@/constants/race'
import { subWeeks, parseISO, isAfter } from 'date-fns'

// ─── Running predictions (Riegel formula) ────────────────────────────────────

export function riegelPredict(
  knownDistanceM: number,
  knownTimeSeconds: number,
  targetDistanceM: number,
): number {
  return knownTimeSeconds * Math.pow(targetDistanceM / knownDistanceM, 1.06)
}

/** Find the best effort (fastest avg pace) over a minimum distance in the last N weeks */
export function bestRunEffort(
  activities: Activity[],
  minDistanceM: number,
  weeksBack = 12,
): { distanceM: number; timeSeconds: number } | null {
  const cutoff = subWeeks(new Date(), weeksBack)
  const candidates = activities.filter(
    (a) =>
      a.sport === 'running' &&
      a.distanceMeters >= minDistanceM * 0.95 &&
      a.avgPaceSecPerKm != null &&
      isAfter(parseISO(a.startTime), cutoff),
  )
  if (candidates.length === 0) return null
  candidates.sort((a, b) => (a.avgPaceSecPerKm ?? 999) - (b.avgPaceSecPerKm ?? 999))
  const best = candidates[0]
  return {
    distanceM: best.distanceMeters,
    timeSeconds: (best.avgPaceSecPerKm! / 1000) * best.distanceMeters,
  }
}

export interface RacePrediction {
  label: string
  distanceM: number
  predictedSeconds: number
  confidencePct: number  // rough confidence based on extrapolation distance
}

export function runRacePredictions(activities: Activity[]): RacePrediction[] {
  const effort = bestRunEffort(activities, 3000) // use any run ≥ 3km
  if (!effort) return []

  const targets = [
    { label: '5K', distanceM: 5000 },
    { label: '10K (Tri run)', distanceM: 10_000 },
    { label: 'Half Marathon', distanceM: 21_097 },
    { label: 'Marathon', distanceM: 42_195 },
  ]

  return targets.map(({ label, distanceM }) => {
    const predicted = riegelPredict(effort.distanceM, effort.timeSeconds, distanceM)
    const ratio = distanceM / effort.distanceM
    const confidence = Math.max(20, Math.round(100 - (Math.log2(ratio) * 15)))
    return { label, distanceM, predictedSeconds: predicted, confidencePct: confidence }
  })
}

// ─── Strength 1RM estimates ───────────────────────────────────────────────────

export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function brzycki1RM(weight: number, reps: number): number {
  if (reps >= 37) return weight * 2  // formula breaks down at high reps
  return weight * (36 / (37 - reps))
}

export function lander1RM(weight: number, reps: number): number {
  return (100 * weight) / (101.3 - 2.67123 * reps)
}

export function estimated1RM(weight: number, reps: number): number {
  if (reps === 0 || weight === 0) return 0
  return (epley1RM(weight, reps) + brzycki1RM(weight, reps) + lander1RM(weight, reps)) / 3
}

/** Best estimated 1RM per exercise from a list of sets */
export function best1RMPerExercise(sets: StrengthSet[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const s of sets) {
    if (s.isBodyweight || s.reps === 0) continue
    const e1rm = estimated1RM(s.weightKg, s.reps)
    if (!result[s.exercise] || e1rm > result[s.exercise]) {
      result[s.exercise] = Math.round(e1rm * 10) / 10
    }
  }
  return result
}

// ─── VO2 max trend + projection ───────────────────────────────────────────────

export interface VO2Point {
  date: string
  vo2max: number
  rolling: number | null  // 4-week rolling average
}

export function vo2maxTrend(activities: Activity[]): VO2Point[] {
  const runs = activities
    .filter((a) => a.sport === 'running' && a.vo2maxEstimate != null)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return runs.map((a, i) => {
    const window = runs.slice(Math.max(0, i - 3), i + 1)
    const rolling = window.reduce((s, w) => s + (w.vo2maxEstimate ?? 0), 0) / window.length
    return { date: a.startTime.slice(0, 10), vo2max: a.vo2maxEstimate!, rolling: Math.round(rolling * 10) / 10 }
  })
}

export function linearForecast(
  points: { x: number; y: number }[],
  forecastSteps: number,
): { x: number; y: number }[] {
  if (points.length < 2) return []
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return []
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const lastX = points[points.length - 1].x
  return Array.from({ length: forecastSteps }, (_, i) => ({
    x: lastX + i + 1,
    y: Math.round((intercept + slope * (lastX + i + 1)) * 10) / 10,
  }))
}

// ─── Training Stress Score (HR-based proxy) ───────────────────────────────────

export function hrTSS(
  durationSeconds: number,
  avgHR: number,
  maxHR = USER_CONFIG.maxHeartRate,
  restHR = USER_CONFIG.restingHeartRate,
): number {
  if (avgHR <= restHR) return 0
  const IF = (avgHR - restHR) / (maxHR - restHR)
  const hours = durationSeconds / 3600
  return Math.round(hours * IF * IF * 100)
}

/** Exponential moving average */
function ema(prev: number, value: number, alpha: number): number {
  return alpha * value + (1 - alpha) * prev
}

export function computeFatigueMetrics(
  activities: Activity[],
  restHR = USER_CONFIG.restingHeartRate,
): FatigueMetrics[] {
  if (activities.length === 0) return []

  // Collect TSS per day
  const tssMap: Record<string, number> = {}
  for (const a of activities) {
    const day = a.startTime.slice(0, 10)
    const tss = a.avgHeartRate
      ? hrTSS(a.durationSeconds, a.avgHeartRate, USER_CONFIG.maxHeartRate, restHR)
      : a.durationSeconds / 36 // rough 10 TSS/hr if no HR
    tssMap[day] = (tssMap[day] ?? 0) + tss
  }

  const sortedDays = Object.keys(tssMap).sort()
  const alphaATL = 2 / (7 + 1)   // 7-day EMA
  const alphaCTL = 2 / (42 + 1)  // 42-day EMA

  let atl = 0
  let ctl = 0

  return sortedDays.map((date) => {
    const tss = tssMap[date]
    atl = ema(atl, tss, alphaATL)
    ctl = ema(ctl, tss, alphaCTL)
    return {
      date,
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    }
  })
}
