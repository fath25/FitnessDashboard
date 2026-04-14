/** Format seconds-per-km as "M:SS /km" */
export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || secPerKm <= 0) return '—'
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')} /km`
}

/** Format seconds-per-100m as "M:SS /100m" */
export function formatSwimPace(secPerKm: number | null): string {
  if (secPerKm == null || secPerKm <= 0) return '—'
  const secPer100m = secPerKm / 10
  const min = Math.floor(secPer100m / 60)
  const sec = Math.round(secPer100m % 60)
  return `${min}:${sec.toString().padStart(2, '0')} /100m`
}

/** Format total seconds as "H:MM:SS" or "MM:SS" */
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Format total seconds as "Xh Ym" */
export function formatDurationHM(seconds: number | null): string {
  if (seconds == null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Format meters as "X.X km" */
export function formatDistance(meters: number | null): string {
  if (meters == null) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/** Format meters as bare km number for charts */
export function metersToKm(meters: number): number {
  return Math.round((meters / 1000) * 10) / 10
}

/** Format speed km/h */
export function formatSpeed(kmh: number | null): string {
  if (kmh == null) return '—'
  return `${kmh.toFixed(1)} km/h`
}

/** Format weight */
export function formatWeight(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
  if (unit === 'lb') return `${(kg * 2.20462).toFixed(1)} lb`
  return `${kg} kg`
}

/** Short date "Apr 14" */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Full date "14 Apr 2026" */
export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Countdown from now */
export function daysUntil(targetDate: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 86_400_000))
}
