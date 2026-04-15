export interface UserProfile {
  heightCm: number
  weightKg: number
  ageYears: number
  sex: 'male' | 'female'
  bodyFatPct: number | null
  goalCalorieSurplus: number  // positive = bulk, negative = cut, 0 = maintenance
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  heightCm: 173,
  weightKg: 81,
  ageYears: 34,
  sex: 'male',
  bodyFatPct: null,
  goalCalorieSurplus: 300,
}

export interface BodyEntry {
  id: string
  date: string       // "YYYY-MM-DD"
  weightKg: number
  bodyFatPct: number | null
  notes: string
}

export interface NutritionEntry {
  id: string
  date: string       // "YYYY-MM-DD"
  calories: number
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  notes: string
}
