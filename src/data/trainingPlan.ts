import { addDays, format } from 'date-fns'
import type { TrainingDay, TrainingPhase, PlannedWorkout, DayOfWeek } from '@/types/training'
import { PLAN_START_DATE, RACE_DATE, TOTAL_PLAN_WEEKS } from '@/constants/race'

const DAY_NAMES: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function phase(week: number): TrainingPhase {
  if (week <= 4)  return 'base1'
  if (week <= 8)  return 'base2'
  if (week <= 12) return 'build1'
  if (week <= 16) return 'build2'
  if (week <= 20) return 'peak'
  return 'taper'  // weeks 21–25 (race week = week 25)
}

function isRecoveryWeek(week: number): boolean {
  // Every 4th week is recovery; week 25 is race week (not a recovery week)
  return week % 4 === 0 && week < TOTAL_PLAN_WEEKS
}

// Volume multiplier: recovery weeks at 0.65, normal weeks at 1.0
function volumeScale(week: number): number {
  if (isRecoveryWeek(week)) return 0.65
  const ph = phase(week)
  if (ph === 'taper') {
    const taperWeekIndex = week - 20  // 1–4
    return Math.max(0.3, 1.0 - taperWeekIndex * 0.2)
  }
  return 1.0
}

interface DayTemplate {
  workouts: PlannedWorkout[]
}

function buildDay(
  week: number,
  dayIndex: number, // 0=Mon … 6=Sun
): PlannedWorkout[] {
  const ph = phase(week)
  const recov = isRecoveryWeek(week)
  const scale = volumeScale(week)
  const isTaper = ph === 'taper'
  const raceWeek = week === TOTAL_PLAN_WEEKS

  if (raceWeek) {
    return buildRaceWeekDay(dayIndex)
  }

  switch (dayIndex) {
    case 0: // Monday — Strength
      if (ph === 'peak' || (isTaper && week >= 23)) return [rest()]
      return [strengthWorkout(week, recov)]

    case 1: // Tuesday — Run (quality)
      if (raceWeek) return [rest()]
      return [qualityRun(ph, scale)]

    case 2: // Wednesday — Swim
      return [swimWorkout(ph, scale)]

    case 3: // Thursday — Bike
      return [thBike(ph, scale)]

    case 4: // Friday — Rest / Recovery
      if (ph === 'peak' && !recov) return [strengthWorkout(week, true)] // extra strength in peak
      return [rest()]

    case 5: // Saturday — Long Ride
      return [longRide(ph, scale)]

    case 6: // Sunday — Long Run / Brick
      if (['build2', 'peak'].includes(ph) && !recov) return [brickWorkout(ph, scale)]
      return [longRun(ph, scale)]

    default:
      return [rest()]
  }
}

function buildRaceWeekDay(dayIndex: number): PlannedWorkout[] {
  switch (dayIndex) {
    case 0: return [{ sport: 'running', workoutType: 'easy_run', targetDurationMinutes: 20, targetDistanceMeters: 4000, description: 'Easy shakeout — legs, breathing only', calColorId: '6' }]
    case 1: return [{ sport: 'swimming', workoutType: 'easy_swim', targetDurationMinutes: 20, targetDistanceMeters: 800, description: 'Easy swim, include a few race-pace efforts', calColorId: '7' }]
    case 2: return [{ sport: 'cycling', workoutType: 'easy_ride', targetDurationMinutes: 30, targetDistanceMeters: 10_000, description: 'Short activation ride, 4×1min race pace', calColorId: '2' }]
    case 3: return [rest('Active recovery — walk, stretch, pack gear')]
    case 4: return [rest('Rest & prep — lay out gear, visualize race')]
    case 5: return [rest('REST — early bedtime')]
    case 6: return [{ sport: 'running', workoutType: 'race', targetDurationMinutes: 120, targetDistanceMeters: 51_500, description: '🏁 RACE DAY — Olympic Triathlon', calColorId: '6' }]
    default: return [rest()]
  }
}

function rest(description = 'Rest / active recovery'): PlannedWorkout {
  return { sport: 'rest', workoutType: 'rest', targetDurationMinutes: 0, targetDistanceMeters: null, description, calColorId: '8' }
}

function strengthWorkout(week: number, _easy: boolean): PlannedWorkout {
  const ph = phase(week)
  const descriptions: Record<TrainingPhase, string> = {
    base1:  'Full body — Squat, Hip Thrust, Row, Core',
    base2:  'Full body — Deadlift, Bench, Pull-ups, Core',
    build1: 'Lower focus — Squat, SL Deadlift, Hip Thrust, Plank',
    build2: 'Upper focus — Bench, OHP, Pull-ups, Row, Core',
    peak:   'Maintenance — Squat, Hip Thrust, Pull-ups, Core (low volume)',
    taper:  'Maintenance — Squat, Hip Thrust, Pull-ups (reduced)',
  }
  return {
    sport: 'strength',
    workoutType: 'strength',
    targetDurationMinutes: ph === 'peak' || ph === 'taper' ? 40 : 55,
    targetDistanceMeters: null,
    description: descriptions[ph],
    calColorId: '3',
  }
}

function qualityRun(ph: TrainingPhase, scale: number): PlannedWorkout {
  const configs: Record<TrainingPhase, { type: 'tempo_run' | 'intervals_run' | 'easy_run'; dur: number; dist: number; desc: string }> = {
    base1:  { type: 'easy_run',      dur: 35,  dist: 5_000,  desc: 'Easy run — conversational pace, HR Z2' },
    base2:  { type: 'easy_run',      dur: 40,  dist: 6_000,  desc: 'Easy run with 4×30s strides at end' },
    build1: { type: 'tempo_run',     dur: 45,  dist: 7_000,  desc: 'Tempo run — 20min @ threshold effort (HR Z4)' },
    build2: { type: 'intervals_run', dur: 50,  dist: 8_000,  desc: '5×1km @ 5K effort, 90s recovery jog' },
    peak:   { type: 'intervals_run', dur: 55,  dist: 9_000,  desc: '6×1km @ 10K race pace, 90s jog' },
    taper:  { type: 'tempo_run',     dur: 40,  dist: 7_000,  desc: 'Tempo intervals — 3×8min @ 10K pace' },
  }
  const c = configs[ph]
  return {
    sport: 'running',
    workoutType: c.type,
    targetDurationMinutes: Math.round(c.dur * scale),
    targetDistanceMeters: Math.round(c.dist * scale),
    description: c.desc,
    calColorId: '6',   // Tangerine (orange)
  }
}

function swimWorkout(ph: TrainingPhase, scale: number): PlannedWorkout {
  const configs: Record<TrainingPhase, { type: 'technique_swim' | 'easy_swim' | 'threshold_swim'; dur: number; dist: number; desc: string }> = {
    base1:  { type: 'technique_swim',  dur: 40, dist: 1_200, desc: 'Drills: catch-up, fingertip drag, 6/3/6 kick' },
    base2:  { type: 'easy_swim',       dur: 45, dist: 1_800, desc: 'Aerobic swim — 6×200m @ easy, 20s rest' },
    build1: { type: 'easy_swim',       dur: 50, dist: 2_000, desc: 'Aerobic sets — 4×400m steady, 30s rest' },
    build2: { type: 'threshold_swim',  dur: 55, dist: 2_200, desc: 'Threshold — 8×100m @ race pace, 15s rest' },
    peak:   { type: 'threshold_swim',  dur: 60, dist: 2_500, desc: '1500m TT simulation + 10×50m sprint' },
    taper:  { type: 'easy_swim',       dur: 40, dist: 1_800, desc: 'Easy swim with race-pace bursts — 6×50m fast' },
  }
  const c = configs[ph]
  return {
    sport: 'swimming',
    workoutType: c.type,
    targetDurationMinutes: Math.round(c.dur * scale),
    targetDistanceMeters: Math.round(c.dist * scale),
    description: c.desc,
    calColorId: '7',
  }
}

function thBike(ph: TrainingPhase, scale: number): PlannedWorkout {
  const configs: Record<TrainingPhase, { dur: number; dist: number; desc: string }> = {
    base1:  { dur: 45,  dist: 20_000, desc: 'Easy endurance ride — flat roads, HR Z2' },
    base2:  { dur: 60,  dist: 25_000, desc: 'Endurance ride with 3×5min Z3 efforts' },
    build1: { dur: 70,  dist: 30_000, desc: 'Tempo ride — 3×10min @ threshold, 5min easy' },
    build2: { dur: 75,  dist: 32_000, desc: '4×8min threshold intervals, 4min recovery' },
    peak:   { dur: 80,  dist: 35_000, desc: '5×6min race-pace intervals + 15min TT effort' },
    taper:  { dur: 55,  dist: 22_000, desc: 'Easy ride — keep legs fresh, 3×2min Z4 openers' },
  }
  const c = configs[ph]
  return {
    sport: 'cycling',
    workoutType: 'tempo_ride',
    targetDurationMinutes: Math.round(c.dur * scale),
    targetDistanceMeters: Math.round(c.dist * scale),
    description: c.desc,
    calColorId: '2',   // Sage (green)
  }
}

function longRide(ph: TrainingPhase, scale: number): PlannedWorkout {
  const configs: Record<TrainingPhase, { dur: number; dist: number; desc: string }> = {
    base1:  { dur: 75,  dist: 35_000, desc: 'Long easy ride — HR Z2, fuel every 45min' },
    base2:  { dur: 105, dist: 50_000, desc: 'Long endurance ride — progressive effort, last 15min Z3' },
    build1: { dur: 120, dist: 55_000, desc: 'Long ride — 40min Z3 in middle, practice nutrition' },
    build2: { dur: 135, dist: 60_000, desc: 'Race-simulation ride — race pace for 40km section' },
    peak:   { dur: 150, dist: 65_000, desc: 'Peak long ride — full race distance + 20km easy' },
    taper:  { dur: 90,  dist: 40_000, desc: 'Moderate ride — easy with 10km race pace in middle' },
  }
  const c = configs[ph]
  return {
    sport: 'cycling',
    workoutType: 'long_ride',
    targetDurationMinutes: Math.round(c.dur * scale),
    targetDistanceMeters: Math.round(c.dist * scale),
    description: c.desc,
    calColorId: '2',   // Sage (green)
  }
}

function longRun(ph: TrainingPhase, scale: number): PlannedWorkout {
  const configs: Record<TrainingPhase, { dur: number; dist: number; desc: string }> = {
    base1:  { dur: 45,  dist: 7_000,  desc: 'Long easy run — HR Z2, no pressure on pace' },
    base2:  { dur: 65,  dist: 10_000, desc: 'Long run — steady HR Z2, last km slightly faster' },
    build1: { dur: 75,  dist: 12_000, desc: 'Long run — progressive, last 3km @ HM pace' },
    build2: { dur: 85,  dist: 14_000, desc: 'Long run with 5km @ race pace in middle' },
    peak:   { dur: 90,  dist: 15_000, desc: 'Race-prep long run — 10km easy, 5km race effort' },
    taper:  { dur: 55,  dist: 9_000,  desc: 'Easy long run — keep it relaxed and fresh' },
  }
  const c = configs[ph]
  return {
    sport: 'running',
    workoutType: 'long_run',
    targetDurationMinutes: Math.round(c.dur * scale),
    targetDistanceMeters: Math.round(c.dist * scale),
    description: c.desc,
    calColorId: '6',   // Tangerine (orange)
  }
}

function brickWorkout(ph: TrainingPhase, scale: number): PlannedWorkout {
  const configs: Record<string, { dur: number; dist: number; desc: string }> = {
    build2: { dur: 105, dist: 50_000, desc: 'Brick: 40km ride @ race pace, immediately 5km run (jelly legs!)' },
    peak:   { dur: 120, dist: 55_000, desc: 'Brick: 45km race-pace ride + 8km run @ 10K effort' },
  }
  const c = configs[ph] ?? configs['build2']
  return {
    sport: 'brick',
    workoutType: 'brick',
    targetDurationMinutes: Math.round(c.dur * scale),
    targetDistanceMeters: Math.round(c.dist * scale),
    description: c.desc,
    calColorId: '5',   // Banana (yellow)
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

function generatePlan(): TrainingDay[] {
  const raceDateStr = format(RACE_DATE, 'yyyy-MM-dd')
  const days: TrainingDay[] = []

  for (let week = 1; week <= TOTAL_PLAN_WEEKS; week++) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = format(addDays(PLAN_START_DATE, (week - 1) * 7 + dayIndex), 'yyyy-MM-dd')
      const workouts = buildDay(week, dayIndex)
      days.push({
        weekNumber: week,
        phase: phase(week),
        date,
        dayOfWeek: DAY_NAMES[dayIndex],
        workouts,
        actualActivityIds: [],
        isRaceDay: date === raceDateStr,
        isRecoveryWeek: isRecoveryWeek(week),
      })
    }
  }

  return days
}

export const TRAINING_PLAN: TrainingDay[] = generatePlan()

/** Group plan days into weeks */
export function getPlanWeeks(): Array<{ weekNumber: number; phase: TrainingPhase; days: TrainingDay[]; isRecoveryWeek: boolean }> {
  const weeks: Array<{ weekNumber: number; phase: TrainingPhase; days: TrainingDay[]; isRecoveryWeek: boolean }> = []
  for (let w = 1; w <= TOTAL_PLAN_WEEKS; w++) {
    const days = TRAINING_PLAN.filter((d) => d.weekNumber === w)
    weeks.push({ weekNumber: w, phase: phase(w), days, isRecoveryWeek: isRecoveryWeek(w) })
  }
  return weeks
}
