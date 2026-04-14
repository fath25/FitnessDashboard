export interface DailyStats {
  date: string              // "YYYY-MM-DD"
  stepCount: number | null
  restingHeartRate: number | null
  avgStress: number | null
  bodyBatteryLow: number | null
  bodyBatteryHigh: number | null
  sleepScoreOverall: number | null
  sleepDurationSeconds: number | null
}

export interface DailyStatsData {
  fetchedAt: string
  stats: DailyStats[]
}

export interface WeeklyAggregate {
  weekStart: string
  totalRunKm: number
  totalBikeKm: number
  totalSwimMeters: number
  totalStrengthSessions: number
  avgRestingHR: number | null
  avgSleepScore: number | null
  avgBodyBatteryLow: number | null
  trainingLoad: number
}

export interface FatigueMetrics {
  date: string
  atl: number   // Acute Training Load (7-day EMA)
  ctl: number   // Chronic Training Load (42-day EMA)
  tsb: number   // Training Stress Balance = CTL - ATL
}
