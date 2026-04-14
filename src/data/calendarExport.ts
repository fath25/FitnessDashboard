import type { TrainingDay } from '@/types/training'
import { addMinutes, format } from 'date-fns'

// Google Calendar colorId → sport label for reference
// Running: 3 (Tangerine), Cycling: 5 (Sage), Swimming: 7 (Peacock), Strength: 10 (Grape), Brick: 4 (Banana), Rest: 11 (Graphite)

interface CalendarEvent {
  summary: string
  description: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  colorId: string
  reminders: { useDefault: boolean }
}

function dayToEvent(day: TrainingDay): CalendarEvent[] {
  return day.workouts
    .filter((w) => w.workoutType !== 'rest')
    .map((w) => {
      const startHour = w.sport === 'running' ? 7 : w.sport === 'swimming' ? 6 : w.sport === 'cycling' ? 8 : 18
      const startDT = new Date(`${day.date}T${String(startHour).padStart(2, '0')}:00:00`)
      const endDT = addMinutes(startDT, w.targetDurationMinutes || 60)

      const sportEmoji: Record<string, string> = {
        running: '🏃', cycling: '🚴', swimming: '🏊', strength: '🏋️', brick: '🔥', rest: '😴',
      }

      return {
        summary: `${sportEmoji[w.sport] ?? ''} W${day.weekNumber} — ${w.description.split('—')[0].trim()}`,
        description: `Week ${day.weekNumber} (${day.phase.toUpperCase()})${day.isRecoveryWeek ? ' — Recovery Week' : ''}\n\n${w.description}\n\nTarget: ${w.targetDistanceMeters ? (w.targetDistanceMeters / 1000).toFixed(1) + 'km' : ''} ${w.targetDurationMinutes ? '/ ' + w.targetDurationMinutes + 'min' : ''}`.trim(),
        start: { dateTime: format(startDT, "yyyy-MM-dd'T'HH:mm:ss"), timeZone: 'local' },
        end: { dateTime: format(endDT, "yyyy-MM-dd'T'HH:mm:ss"), timeZone: 'local' },
        colorId: w.calColorId,
        reminders: { useDefault: false },
      }
    })
}

/** Export training plan to Google Calendar via API using an access token */
export async function exportPlanToGoogleCalendar(
  plan: TrainingDay[],
  accessToken: string,
  calendarId = 'primary',
  onProgress?: (done: number, total: number) => void,
): Promise<{ created: number; errors: string[] }> {
  const allEvents = plan.flatMap(dayToEvent)
  const errors: string[] = []
  let created = 0

  // Process in chunks of 5 to avoid rate limiting
  const chunkSize = 5
  for (let i = 0; i < allEvents.length; i += chunkSize) {
    const chunk = allEvents.slice(i, i + chunkSize)
    const results = await Promise.allSettled(
      chunk.map((event) =>
        fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }).then((r) => {
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
          return r.json()
        }),
      ),
    )

    for (const r of results) {
      if (r.status === 'fulfilled') created++
      else errors.push(r.reason?.message ?? 'Unknown error')
    }

    onProgress?.(Math.min(i + chunkSize, allEvents.length), allEvents.length)
    // Small delay between chunks
    if (i + chunkSize < allEvents.length) await new Promise((r) => setTimeout(r, 200))
  }

  return { created, errors }
}

/** Download plan as .ics file (fallback, no Google auth needed) */
export function downloadICS(plan: TrainingDay[]): void {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FitnessDashboard//Olympic Triathlon Plan//EN',
    'CALSCALE:GREGORIAN',
  ]

  plan.forEach((day) => {
    day.workouts
      .filter((w) => w.workoutType !== 'rest')
      .forEach((w) => {
        const dtstart = day.date.replace(/-/g, '')
        const uid = `fitnessdash-${day.date}-${w.sport}-${day.weekNumber}@fath25`
        lines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTART;VALUE=DATE:${dtstart}`,
          `DTEND;VALUE=DATE:${dtstart}`,
          `SUMMARY:W${day.weekNumber} ${w.sport.toUpperCase()} — ${w.description.split('—')[0].trim()}`,
          `DESCRIPTION:${w.description.replace(/,/g, '\\,')}`,
          'END:VEVENT',
        )
      })
  })

  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'triathlon-training-plan.ics'
  a.click()
  URL.revokeObjectURL(url)
}
