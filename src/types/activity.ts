export type SportType = 'running' | 'cycling' | 'swimming' | 'strength' | 'brick'

export interface Lap {
  lapNumber: number
  distanceMeters: number
  durationSeconds: number
  avgHeartRate: number | null
  avgPaceSecPerKm: number | null
  avgPowerWatts: number | null
  avgCadence: number | null
}

export interface Activity {
  id: string
  sport: SportType
  startTime: string          // ISO 8601
  durationSeconds: number
  distanceMeters: number
  avgHeartRate: number | null
  maxHeartRate: number | null
  avgPaceSecPerKm: number | null   // running + swimming (sec/km)
  avgSpeedKmh: number | null       // cycling
  avgPowerWatts: number | null     // cycling
  avgCadence: number | null
  elevationGainMeters: number | null
  vo2maxEstimate: number | null
  trainingEffect: number | null    // 1.0–5.0
  calories: number | null
  laps: Lap[]
  name: string
  notes: string | null
  brickGroupId: string | null      // links paired brick activities
}

export interface ActivitiesData {
  fetchedAt: string
  activities: Activity[]
}
