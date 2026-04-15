import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import type { Activity, ActivitiesData } from '@/types/activity'
import type { DailyStats, DailyStatsData } from '@/types/stats'
import type { StrengthSession } from '@/types/strength'
import type { BodyEntry, NutritionEntry, UserProfile } from '@/types/body'
import { DEFAULT_USER_PROFILE } from '@/types/body'
import { getClient } from '@/lib/supabase'

const BASE = import.meta.env.BASE_URL  // '/FitnessDashboard/'

// ── DB row → TS type helpers ──────────────────────────────────────────────────

type DbRow = Record<string, unknown>

function toStrengthSession(r: DbRow): StrengthSession {
  return {
    id: r.id as string,
    date: r.date as string,
    durationMinutes: r.duration_minutes as number,
    totalVolumeKg: r.total_volume_kg as number,
    notes: (r.notes as string) ?? '',
    sets: r.sets as StrengthSession['sets'],
  }
}

function toBodyEntry(r: DbRow): BodyEntry {
  return {
    id: r.id as string,
    date: r.date as string,
    weightKg: r.weight_kg as number,
    bodyFatPct: (r.body_fat_pct as number) ?? null,
    notes: (r.notes as string) ?? '',
  }
}

function toNutritionEntry(r: DbRow): NutritionEntry {
  return {
    id: r.id as string,
    date: r.date as string,
    calories: r.calories as number,
    proteinG: (r.protein_g as number) ?? null,
    carbsG: (r.carbs_g as number) ?? null,
    fatG: (r.fat_g as number) ?? null,
    notes: (r.notes as string) ?? '',
  }
}

function toUserProfile(r: DbRow): UserProfile {
  return {
    heightCm: r.height_cm as number,
    weightKg: r.weight_kg as number,
    ageYears: r.age_years as number,
    sex: (r.sex as UserProfile['sex']),
    bodyFatPct: (r.body_fat_pct as number) ?? null,
    goalCalorieSurplus: r.goal_calorie_surplus as number,
  }
}

// ── Context interface ─────────────────────────────────────────────────────────

interface FitnessContextValue {
  activities: Activity[]
  dailyStats: DailyStats[]
  strengthSessions: StrengthSession[]
  bodyEntries: BodyEntry[]
  nutritionEntries: NutritionEntry[]
  userProfile: UserProfile
  isLoading: boolean
  error: string | null
  addStrengthSession: (session: StrengthSession) => Promise<void>
  updateStrengthSession: (session: StrengthSession) => Promise<void>
  deleteStrengthSession: (id: string) => Promise<void>
  addBodyEntry: (entry: BodyEntry) => Promise<void>
  updateBodyEntry: (entry: BodyEntry) => Promise<void>
  deleteBodyEntry: (id: string) => Promise<void>
  addNutritionEntry: (entry: NutritionEntry) => Promise<void>
  updateNutritionEntry: (entry: NutritionEntry) => Promise<void>
  deleteNutritionEntry: (id: string) => Promise<void>
  updateUserProfile: (profile: UserProfile) => Promise<void>
}

const FitnessContext = createContext<FitnessContextValue | null>(null)

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [strengthSessions, setStrengthSessions] = useState<StrengthSession[]>([])
  const [bodyEntries, setBodyEntries] = useState<BodyEntry[]>([])
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const db = getClient()

        const [actRes, statsRes, strengthRes, bodyRes, nutritionRes, profileRes] =
          await Promise.allSettled([
            fetch(`${BASE}data/activities.json`).then((r) => r.json() as Promise<ActivitiesData>),
            fetch(`${BASE}data/daily_stats.json`).then((r) => r.json() as Promise<DailyStatsData>),
            db.from('strength_sessions').select('*').order('date', { ascending: false }),
            db.from('body_entries').select('*').order('date', { ascending: false }),
            db.from('nutrition_entries').select('*').order('date', { ascending: false }),
            db.from('user_profiles').select('*').maybeSingle(),
          ])

        if (actRes.status === 'fulfilled') setActivities(actRes.value.activities ?? [])
        if (statsRes.status === 'fulfilled') setDailyStats(statsRes.value.stats ?? [])

        if (strengthRes.status === 'fulfilled' && !strengthRes.value.error)
          setStrengthSessions((strengthRes.value.data ?? []).map(toStrengthSession))

        if (bodyRes.status === 'fulfilled' && !bodyRes.value.error)
          setBodyEntries((bodyRes.value.data ?? []).map(toBodyEntry))

        if (nutritionRes.status === 'fulfilled' && !nutritionRes.value.error)
          setNutritionEntries((nutritionRes.value.data ?? []).map(toNutritionEntry))

        if (profileRes.status === 'fulfilled' && !profileRes.value.error && profileRes.value.data)
          setUserProfile(toUserProfile(profileRes.value.data as DbRow))

      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // ── Strength ────────────────────────────────────────────────────────────────

  async function addStrengthSession(session: StrengthSession) {
    setStrengthSessions((prev) => [session, ...prev])
    const { error } = await getClient().from('strength_sessions').insert({
      id: session.id,
      date: session.date,
      duration_minutes: session.durationMinutes,
      total_volume_kg: session.totalVolumeKg,
      notes: session.notes,
      sets: session.sets,
    })
    if (error) throw error
  }

  async function updateStrengthSession(session: StrengthSession) {
    setStrengthSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)))
    const { error } = await getClient().from('strength_sessions').update({
      date: session.date,
      duration_minutes: session.durationMinutes,
      total_volume_kg: session.totalVolumeKg,
      notes: session.notes,
      sets: session.sets,
    }).eq('id', session.id)
    if (error) throw error
  }

  async function deleteStrengthSession(id: string) {
    setStrengthSessions((prev) => prev.filter((s) => s.id !== id))
    const { error } = await getClient().from('strength_sessions').delete().eq('id', id)
    if (error) throw error
  }

  // ── Body composition ─────────────────────────────────────────────────────────

  async function addBodyEntry(entry: BodyEntry) {
    setBodyEntries((prev) => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    const { error } = await getClient().from('body_entries').insert({
      id: entry.id,
      date: entry.date,
      weight_kg: entry.weightKg,
      body_fat_pct: entry.bodyFatPct,
      notes: entry.notes,
    })
    if (error) throw error
  }

  async function updateBodyEntry(entry: BodyEntry) {
    setBodyEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)))
    const { error } = await getClient().from('body_entries').update({
      date: entry.date,
      weight_kg: entry.weightKg,
      body_fat_pct: entry.bodyFatPct,
      notes: entry.notes,
    }).eq('id', entry.id)
    if (error) throw error
  }

  async function deleteBodyEntry(id: string) {
    setBodyEntries((prev) => prev.filter((e) => e.id !== id))
    const { error } = await getClient().from('body_entries').delete().eq('id', id)
    if (error) throw error
  }

  // ── Nutrition ────────────────────────────────────────────────────────────────

  async function addNutritionEntry(entry: NutritionEntry) {
    setNutritionEntries((prev) => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    const { error } = await getClient().from('nutrition_entries').insert({
      id: entry.id,
      date: entry.date,
      calories: entry.calories,
      protein_g: entry.proteinG,
      carbs_g: entry.carbsG,
      fat_g: entry.fatG,
      notes: entry.notes,
    })
    if (error) throw error
  }

  async function updateNutritionEntry(entry: NutritionEntry) {
    setNutritionEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)))
    const { error } = await getClient().from('nutrition_entries').update({
      date: entry.date,
      calories: entry.calories,
      protein_g: entry.proteinG,
      carbs_g: entry.carbsG,
      fat_g: entry.fatG,
      notes: entry.notes,
    }).eq('id', entry.id)
    if (error) throw error
  }

  async function deleteNutritionEntry(id: string) {
    setNutritionEntries((prev) => prev.filter((e) => e.id !== id))
    const { error } = await getClient().from('nutrition_entries').delete().eq('id', id)
    if (error) throw error
  }

  // ── User profile ─────────────────────────────────────────────────────────────

  async function updateUserProfile(profile: UserProfile) {
    setUserProfile(profile)
    const { error } = await getClient().from('user_profiles').upsert({
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      age_years: profile.ageYears,
      sex: profile.sex,
      body_fat_pct: profile.bodyFatPct,
      goal_calorie_surplus: profile.goalCalorieSurplus,
    })
    if (error) throw error
  }

  const value = useMemo<FitnessContextValue>(
    () => ({
      activities, dailyStats, strengthSessions, bodyEntries, nutritionEntries, userProfile,
      isLoading, error,
      addStrengthSession, updateStrengthSession, deleteStrengthSession,
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
