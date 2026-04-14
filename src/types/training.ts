import type { SportType } from './activity'

export type TrainingPhase =
  | 'base1'    // Weeks  1–4:  aerobic foundation
  | 'base2'    // Weeks  5–8:  volume build
  | 'build1'   // Weeks  9–12: intensity introduction
  | 'build2'   // Weeks 13–16: race-specific, bricks
  | 'peak'     // Weeks 17–20: peak load
  | 'taper'    // Weeks 21–24: taper → race

export type WorkoutType =
  | 'easy_run'
  | 'long_run'
  | 'tempo_run'
  | 'intervals_run'
  | 'easy_ride'
  | 'long_ride'
  | 'tempo_ride'
  | 'intervals_ride'
  | 'easy_swim'
  | 'technique_swim'
  | 'threshold_swim'
  | 'strength'
  | 'brick'
  | 'rest'
  | 'recovery'
  | 'race'

export interface PlannedWorkout {
  sport: SportType | 'rest'
  workoutType: WorkoutType
  targetDurationMinutes: number
  targetDistanceMeters: number | null
  description: string
  calColorId: string
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface TrainingDay {
  weekNumber: number
  phase: TrainingPhase
  date: string              // "YYYY-MM-DD"
  dayOfWeek: DayOfWeek
  workouts: PlannedWorkout[]
  actualActivityIds: string[]
  isRaceDay: boolean
  isRecoveryWeek: boolean
}

export interface TrainingWeek {
  weekNumber: number
  phase: TrainingPhase
  startDate: string
  endDate: string
  days: TrainingDay[]
  isRecoveryWeek: boolean
  plannedSwimMeters: number
  plannedBikeMeters: number
  plannedRunMeters: number
  actualSwimMeters: number
  actualBikeMeters: number
  actualRunMeters: number
  compliancePct: number
}

export const PHASE_LABELS: Record<TrainingPhase, string> = {
  base1:  'Base 1',
  base2:  'Base 2',
  build1: 'Build 1',
  build2: 'Build 2',
  peak:   'Peak',
  taper:  'Taper',
}
