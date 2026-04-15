import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import type { Activity, ActivitiesData } from '@/types/activity'
import type { DailyStats, DailyStatsData } from '@/types/stats'
import type { StrengthManualData, StrengthSession } from '@/types/strength'
import type { BodyEntry, NutritionEntry, UserProfile, BodyLogData, NutritionLogData } from '@/types/body'
import { DEFAULT_USER_PROFILE } from '@/types/body'

const BASE = import.meta.env.BASE_URL  // '/FitnessDashboard/'
const STRENGTH_LS_KEY = 'fitness_strength_log'
const BODY_LS_KEY = 'fitness_body_log'
const NUTRITION_LS_KEY = 'fitness_nutrition_log'
const PROFILE_LS_KEY = 'fitness_user_profile'
const GITHUB_PAT_KEY = 'github_pat'
const GITHUB_REPO = 'fath25/FitnessDashboard'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface FitnessContextValue {
  activities: Activity[]
  dailyStats: DailyStats[]
  strengthSessions: StrengthSession[]
  bodyEntries: BodyEntry[]
  nutritionEntries: NutritionEntry[]
  userProfile: UserProfile
  isLoading: boolean
  error: string | null
  syncStatus: SyncStatus
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
  syncToGitHub: (pat: string) => Promise<void>
  getSavedPat: () => string
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

/** Base64-encode a UTF-8 string for the GitHub Contents API */
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

/** Commit a single file to GitHub via the Contents API */
async function githubPut(pat: string, path: string, content: string, message: string) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`
  // Fetch current SHA (needed for updates; undefined for new files)
  const headRes = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } })
  const sha: string | undefined = headRes.ok ? (await headRes.json()).sha : undefined

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, content: toBase64(content), ...(sha ? { sha } : {}) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`GitHub API error ${res.status}: ${(err as { message?: string }).message ?? res.statusText}`)
  }
}

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [strengthSessions, setStrengthSessions] = useState<StrengthSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // Body/nutrition/profile initialised synchronously from localStorage;
  // will be merged with committed data once the fetch completes.
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
        const [actRes, statsRes, strengthRes, bodyRes, nutritionRes] = await Promise.allSettled([
          fetch(`${BASE}data/activities.json`).then((r) => r.json() as Promise<ActivitiesData>),
          fetch(`${BASE}data/daily_stats.json`).then((r) => r.json() as Promise<DailyStatsData>),
          fetch(`${BASE}data/strength_manual.json`).then((r) => r.json() as Promise<StrengthManualData>),
          fetch(`${BASE}data/body_log.json`).then((r) => r.json() as Promise<BodyLogData>),
          fetch(`${BASE}data/nutrition_log.json`).then((r) => r.json() as Promise<NutritionLogData>),
        ])

        if (actRes.status === 'fulfilled') setActivities(actRes.value.activities ?? [])
        if (statsRes.status === 'fulfilled') setDailyStats(statsRes.value.stats ?? [])

        // Merge helper: localStorage entries take precedence over committed ones by id
        function mergeById<T extends { id: string }>(committed: T[], local: T[]): T[] {
          const filtered = committed.filter((c) => !local.some((l) => l.id === c.id))
          return [...local, ...filtered].sort((a, b) => (a as { date?: string }).date?.localeCompare((b as { date?: string }).date ?? '') ?? 0)
        }

        // Strength
        const committedStrength = strengthRes.status === 'fulfilled' ? (strengthRes.value.sessions ?? []) : []
        const localStrength = loadJSON<StrengthSession[]>(STRENGTH_LS_KEY, [])
        setStrengthSessions(mergeById(committedStrength, localStrength).sort((a, b) => b.date.localeCompare(a.date)))

        // Body
        const committedBody = bodyRes.status === 'fulfilled' ? (bodyRes.value.entries ?? []) : []
        const localBody = loadJSON<BodyEntry[]>(BODY_LS_KEY, [])
        setBodyEntries(mergeById(committedBody, localBody).sort((a, b) => b.date.localeCompare(a.date)))

        // Nutrition
        const committedNutrition = nutritionRes.status === 'fulfilled' ? (nutritionRes.value.entries ?? []) : []
        const localNutrition = loadJSON<NutritionEntry[]>(NUTRITION_LS_KEY, [])
        setNutritionEntries(mergeById(committedNutrition, localNutrition).sort((a, b) => b.date.localeCompare(a.date)))

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

  function addStrengthSession(session: StrengthSession) { persistStrength([...strengthSessions, session]) }
  function updateStrengthSession(session: StrengthSession) { persistStrength(strengthSessions.map((s) => (s.id === session.id ? session : s))) }
  function deleteStrengthSession(id: string) { persistStrength(strengthSessions.filter((s) => s.id !== id)) }

  function exportStrengthJSON() {
    const data: StrengthManualData = { lastUpdated: new Date().toISOString(), sessions: strengthSessions }
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

  // ── GitHub sync ───────────────────────────────────────────────────────────────

  function getSavedPat(): string {
    return localStorage.getItem(GITHUB_PAT_KEY) ?? ''
  }

  async function syncToGitHub(pat: string) {
    setSyncStatus('syncing')
    try {
      // Save PAT for future use
      localStorage.setItem(GITHUB_PAT_KEY, pat)

      const today = new Date().toISOString().slice(0, 10)

      await githubPut(
        pat,
        'public/data/strength_manual.json',
        JSON.stringify({ lastUpdated: new Date().toISOString(), sessions: strengthSessions }, null, 2),
        `sync: strength log ${today}`,
      )
      await githubPut(
        pat,
        'public/data/body_log.json',
        JSON.stringify({ lastUpdated: new Date().toISOString(), entries: bodyEntries }, null, 2),
        `sync: body log ${today}`,
      )
      await githubPut(
        pat,
        'public/data/nutrition_log.json',
        JSON.stringify({ lastUpdated: new Date().toISOString(), entries: nutritionEntries }, null, 2),
        `sync: nutrition log ${today}`,
      )

      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 4000)
    } catch (e) {
      console.error('Sync failed:', e)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 6000)
      throw e
    }
  }

  const value = useMemo<FitnessContextValue>(
    () => ({
      activities, dailyStats, strengthSessions, bodyEntries, nutritionEntries, userProfile,
      isLoading, error, syncStatus,
      addStrengthSession, updateStrengthSession, deleteStrengthSession, exportStrengthJSON,
      addBodyEntry, updateBodyEntry, deleteBodyEntry,
      addNutritionEntry, updateNutritionEntry, deleteNutritionEntry,
      updateUserProfile, syncToGitHub, getSavedPat,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, dailyStats, strengthSessions, bodyEntries, nutritionEntries, userProfile, isLoading, error, syncStatus],
  )

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>
}

export function useFitness() {
  const ctx = useContext(FitnessContext)
  if (!ctx) throw new Error('useFitness must be used within FitnessProvider')
  return ctx
}
