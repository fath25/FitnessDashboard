export interface StrengthSet {
  exercise: string
  setNumber: number
  reps: number
  weightKg: number
  isBodyweight: boolean
  durationSeconds?: number  // for timed exercises like Plank
  rpe: number | null
}

export interface StrengthSession {
  id: string
  date: string              // "YYYY-MM-DD"
  durationMinutes: number
  sets: StrengthSet[]
  totalVolumeKg: number     // sum(reps * weightKg)
  notes: string
}

export interface StrengthManualData {
  lastUpdated: string
  sessions: StrengthSession[]
}
