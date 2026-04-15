import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import type { Activity, ActivitiesData } from '@/types/activity'
import type { DailyStats, DailyStatsData } from '@/types/stats'
import type { StrengthManualData, StrengthSession } from '@/types/strength'
import type { BodyEntry, NutritionEntry, UserProfile } from '@/types/body'
import { DEFAULT_USER_PROFILE } from '@/types/body'

const BASE = import.meta.env.BASE_URL  // '/FitnessDashboard/'
const STRENGTH_LS_KEY = 'fitness_strength_log'
const BODY_LS_KEY = 'fitness_body_log'
const NUTRITION_LS_KEY = 'fitness_nutrition_log'
const PROFILE_LS_KEY = 'fitness_user_profile'

interface FitnessContextValue {
  activities: Activity[]
  dailyStats: DailyStats[]
  strengthSessions: StrengthSession[]
  bodyEntries: BodyEntry[]
  nutritionEntries: NutritionEntry[]
  userProfile: UserProfile
  isLoading: boolean
  error: string | null
  addStrengthSession: (session: StrengthSession) => void
  updateStrengthSession: (session: StrengthSession) => void
  deleteStrengthSession: (id: string) => void
  exportStrengthJSON: () => void
  addBodyEntry: (entry: BodyEntry) => void
  updateBodyEntry: (entry: BodyEntry) => void
  deleteBodyEntry: (id: string) => void
  addNutritionEntry: (entry: NutritionEntry) => void
  updateNutritionEntry: (entry: NutritionEntry) => void
  deleteNutritionEntry: (id: string) => void
  updateUserProfile: (profile: UserProfile) => void
}

const FitnessContext = createContext<FitnessContextValue | null>(null)

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [strengthSessions, setStrengthSessions] = useState<StrengthSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Body/nutrition state initialised synchronously from localStorage
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    ({ ...DEFAULT_USER_PROFILE, ...loadJSON<Partial<UserProfile>>(PROFILE_LS_KEY, {}) }),
  )
  const [bodyEntries, setBodyEntries] = useState<BodyEntry[]>(() =>
    loadJSON<BodyEntry[]>(BODY_LS_KEY, []),
  )
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>(() =>
    loadJSON<NutritionEntry[]>(NUTRITION_LS_KEY, []),
  )

  useEffect(() => {
    async function load() {
      try {
        const [actRes, statsRes, strengthRes] = await Promise.allSettled([
          fetch(`${BASE}data/activities.json`).then((r) => r.json() as Promise<ActivitiesData>),
          fetch(`${BASE}data/daily_stats.json`).then((r) => r.json() as Promise<DailyStatsData>),
          fetch(`${BASE}data/strength_manual.json`).then((r) => r.json() as Promise<StrengthManualData>),
        ])

        if (actRes.status === 'fulfilled') setActivities(actRes.value.activities ?? [])
        if (statsRes.status === 'fulfilled') setDailyStats(statsRes.value.stats ?? [])

        // Merge committed strength data with localStorage overrides
        const committedSessions: StrengthSession[] = strengthRes.status === 'fulfilled'
          ? (strengthRes.value.sessions ?? [])
          : []
        const localSessions: StrengthSession[] = loadJSON<StrengthSession[]>(STRENGTH_LS_KEY, [])
        const committedFiltered = committedSessions.filter(
          (cs) => !localSessions.some((ls) => ls.id === cs.id),
        )
        setStrengthSessions([...localSessions, ...committedFiltered].sort((a, b) => b.date.localeCompare(a.date)))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // ── Strength ────────────────────────────────────────────────────────────────

  function persistStrength(sessions: StrengthSession[]) {
    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
    setStrengthSessions(sorted)
    localStorage.setItem(STRENGTH_LS_KEY, JSON.stringify(sorted))
  }

  function addStrengthSession(session: StrengthSession) {
    persistStrength([...strengthSessions, session])
  }

  function updateStrengthSession(session: StrengthSession) {
    persistStrength(strengthSessions.map((s) => (s.id === session.id ? session : s)))
  }

  function deleteStrengthSession(id: string) {
    persistStrength(strengthSessions.filter((s) => s.id !== id))
  }

  function exportStrengthJSON() {
    const data: StrengthManualData = {
      lastUpdated: new Date().toISOString(),
      sessions: strengthSessions,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'strength_manual.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Body composition ─────────────────────────────────────────────────────────

  function persistBody(entries: BodyEntry[]) {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    setBodyEntries(sorted)
    localStorage.setItem(BODY_LS_KEY, JSON.stringify(sorted))
  }

  function addBodyEntry(entry: BodyEntry) { persistBody([...bodyEntries, entry]) }
  function updateBodyEntry(entry: BodyEntry) { persistBody(bodyEntries.map((e) => (e.id === entry.id ? entry : e))) }
  function deleteBodyEntry(id: string) { persistBody(bodyEntries.filter((e) => e.id !== id)) }

  // ── Nutrition ────────────────────────────────────────────────────────────────

  function persistNutrition(entries: NutritionEntry[]) {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    setNutritionEntries(sorted)
    localStorage.setItem(NUTRITION_LS_KEY, JSON.stringify(sorted))
  }

  function addNutritionEntry(entry: NutritionEntry) { persistNutrition([...nutritionEntries, entry]) }
  function updateNutritionEntry(entry: NutritionEntry) { persistNutrition(nutritionEntries.map((e) => (e.id === entry.id ? entry : e))) }
  function deleteNutritionEntry(id: string) { persistNutrition(nutritionEntries.filter((e) => e.id !== id)) }

  // ── User profile ─────────────────────────────────────────────────────────────

  function updateUserProfile(profile: UserProfile) {
    setUserProfile(profile)
    localStorage.setItem(PROFILE_LS_KEY, JSON.stringify(profile))
  }

  const value = useMemo<FitnessContextValue>(
    () => ({
      activities, dailyStats, strengthSessions, bodyEntries, nutritionEntries, userProfile,
      isLoading, error,
      addStrengthSession, updateStrengthSession, deleteStrengthSession, exportStrengthJSON,
      addBodyEntry, updateBodyEntry, deleteBodyEntry,
      addNutritionEntry, updateNutritionEntry, deleteNutritionEntry,
      updateUserProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, dailyStats, strengthSessions, bodyEntries, nutritionEntries, userProfile, isLoading, error],
  )

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>
}

export function useFitness() {
  const ctx = useContext(FitnessContext)
  if (!ctx) throw new Error('useFitness must be used within FitnessProvider')
  return ctx
}
