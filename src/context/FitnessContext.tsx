import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import type { Activity, ActivitiesData } from '@/types/activity'
import type { DailyStats, DailyStatsData } from '@/types/stats'
import type { StrengthManualData, StrengthSession } from '@/types/strength'

const BASE = import.meta.env.BASE_URL  // '/FitnessDashboard/'
const STRENGTH_LS_KEY = 'fitness_strength_log'

interface FitnessContextValue {
  activities: Activity[]
  dailyStats: DailyStats[]
  strengthSessions: StrengthSession[]
  isLoading: boolean
  error: string | null
  addStrengthSession: (session: StrengthSession) => void
  updateStrengthSession: (session: StrengthSession) => void
  deleteStrengthSession: (id: string) => void
  exportStrengthJSON: () => void
}

const FitnessContext = createContext<FitnessContextValue | null>(null)

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [strengthSessions, setStrengthSessions] = useState<StrengthSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const localRaw = localStorage.getItem(STRENGTH_LS_KEY)
        const localSessions: StrengthSession[] = localRaw ? JSON.parse(localRaw) : []
        // Local takes precedence over committed by id
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

  function persist(sessions: StrengthSession[]) {
    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
    setStrengthSessions(sorted)
    localStorage.setItem(STRENGTH_LS_KEY, JSON.stringify(sorted))
  }

  function addStrengthSession(session: StrengthSession) {
    persist([...strengthSessions, session])
  }

  function updateStrengthSession(session: StrengthSession) {
    persist(strengthSessions.map((s) => (s.id === session.id ? session : s)))
  }

  function deleteStrengthSession(id: string) {
    persist(strengthSessions.filter((s) => s.id !== id))
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

  const value = useMemo<FitnessContextValue>(
    () => ({ activities, dailyStats, strengthSessions, isLoading, error, addStrengthSession, updateStrengthSession, deleteStrengthSession, exportStrengthJSON }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, dailyStats, strengthSessions, isLoading, error],
  )

  return <FitnessContext.Provider value={value}>{children}</FitnessContext.Provider>
}

export function useFitness() {
  const ctx = useContext(FitnessContext)
  if (!ctx) throw new Error('useFitness must be used within FitnessProvider')
  return ctx
}
