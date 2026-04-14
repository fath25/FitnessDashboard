import { addDays, format, startOfWeek, differenceInDays, parseISO } from 'date-fns'
import { PLAN_START_DATE, TOTAL_PLAN_WEEKS } from '@/constants/race'

/** Returns the ISO date string "YYYY-MM-DD" for a given Date */
export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Returns week number (1-based) for a given ISO date relative to plan start */
export function weekNumberForDate(dateStr: string): number {
  const d = parseISO(dateStr)
  const diff = differenceInDays(d, PLAN_START_DATE)
  return Math.floor(diff / 7) + 1
}

/** Returns the Monday of the week containing the given date */
export function weekStart(dateStr: string): string {
  return toISODate(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }))
}

/** Generates array of ISO date strings for all days in a plan week */
export function datesForWeek(weekNumber: number): string[] {
  const start = addDays(PLAN_START_DATE, (weekNumber - 1) * 7)
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)))
}

/** Returns all Mondays (ISO strings) across the plan */
export function allPlanWeekStarts(): string[] {
  return Array.from({ length: TOTAL_PLAN_WEEKS }, (_, i) =>
    toISODate(addDays(PLAN_START_DATE, i * 7))
  )
}

/** "Week X of 24" */
export function currentPlanWeek(): number {
  const today = toISODate(new Date())
  return Math.min(TOTAL_PLAN_WEEKS, Math.max(1, weekNumberForDate(today)))
}
