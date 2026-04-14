export const RACE_DATE = new Date('2026-10-05T09:00:00')
export const PLAN_START_DATE = new Date('2026-04-14')
export const TOTAL_PLAN_WEEKS = 25   // Week 25 Mon=Sep 29 → Sun=Oct 5 (race day)

// ── Personal countdown ────────────────────────────────────────────────────
// Change this date to whenever you next see your girlfriend.
export const GF_DATE = new Date('2026-05-21T00:00:00')

export const OLYMPIC_DISTANCES = {
  swimMeters: 1500,
  bikeMeters: 40_000,
  runMeters: 10_000,
}

export const USER_CONFIG = {
  maxHeartRate: 185,
  restingHeartRate: 50, // overridden at runtime by daily_stats average
  weightKg: 75,
  weightUnit: 'kg' as 'kg' | 'lb',
}
