import { X } from 'lucide-react'
import type { Activity } from '@/types/activity'
import {
  formatDistance, formatDuration, formatPace, formatSpeed, formatShortDate,
} from '@/utils/formatters'

interface Props {
  activity: Activity
  onClose: () => void
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-slate-700/40 last:border-0">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="text-white text-sm font-mono">{String(value)}</span>
    </div>
  )
}

export function ActivityDetailModal({ activity: a, onClose }: Props) {
  const isCycling = a.sport === 'cycling' || a.sport === 'brick'
  const isRunning = a.sport === 'running' || a.sport === 'brick'
  const date = a.startTime.slice(0, 10)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-700">
          <div>
            <div className="text-white font-semibold text-base leading-tight">{a.name}</div>
            <div className="text-slate-400 text-xs mt-0.5">{formatShortDate(date)}</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors ml-2 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Core metrics */}
        <div className="p-4 space-y-0">
          <Row label="Distance" value={formatDistance(a.distanceMeters)} />
          <Row label="Duration" value={formatDuration(a.durationSeconds)} />
          {isRunning && !isCycling && (
            <Row label="Avg pace" value={formatPace(a.avgPaceSecPerKm)} />
          )}
          {isCycling && (
            <>
              <Row label="Avg speed" value={a.avgSpeedKmh != null ? `${a.avgSpeedKmh.toFixed(1)} km/h` : null} />
              <Row label="Avg power" value={a.avgPowerWatts != null ? `${a.avgPowerWatts} W` : null} />
            </>
          )}
          <Row label="Avg heart rate" value={a.avgHeartRate != null ? `${a.avgHeartRate} bpm` : null} />
          <Row label="Max heart rate" value={a.maxHeartRate != null ? `${a.maxHeartRate} bpm` : null} />
          <Row label="Avg cadence" value={a.avgCadence != null ? `${a.avgCadence} rpm` : null} />
          <Row label="Elevation gain" value={a.elevationGainMeters != null ? `${Math.round(a.elevationGainMeters)} m` : null} />
          <Row label="Calories" value={a.calories != null ? `${a.calories} kcal` : null} />
          <Row label="VO2max estimate" value={a.vo2maxEstimate != null ? a.vo2maxEstimate.toFixed(1) : null} />
          <Row
            label="Training effect"
            value={a.trainingEffect != null ? `${a.trainingEffect.toFixed(1)} / 5.0` : null}
          />
        </div>

        {/* Laps table */}
        {a.laps && a.laps.length > 0 && (
          <div className="px-4 pb-4">
            <div className="text-xs font-semibold text-slate-400 mb-2">Laps</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left py-1.5 pr-3">Lap</th>
                    <th className="text-right py-1.5 pr-3">Dist</th>
                    <th className="text-right py-1.5 pr-3">Time</th>
                    {a.laps.some((l) => l.avgPaceSecPerKm) && (
                      <th className="text-right py-1.5 pr-3">Pace</th>
                    )}
                    {a.laps.some((l) => l.avgPowerWatts) && (
                      <th className="text-right py-1.5 pr-3">Power</th>
                    )}
                    {a.laps.some((l) => l.avgHeartRate) && (
                      <th className="text-right py-1.5">HR</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {a.laps.map((lap) => (
                    <tr key={lap.lapNumber} className="border-b border-slate-700/40 last:border-0">
                      <td className="py-1.5 pr-3 text-slate-400">{lap.lapNumber}</td>
                      <td className="py-1.5 pr-3 text-right font-mono text-white">
                        {formatDistance(lap.distanceMeters)}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono text-slate-300">
                        {formatDuration(lap.durationSeconds)}
                      </td>
                      {a.laps.some((l) => l.avgPaceSecPerKm) && (
                        <td className="py-1.5 pr-3 text-right font-mono text-orange-400">
                          {formatPace(lap.avgPaceSecPerKm)}
                        </td>
                      )}
                      {a.laps.some((l) => l.avgPowerWatts) && (
                        <td className="py-1.5 pr-3 text-right font-mono text-amber-400">
                          {lap.avgPowerWatts != null ? `${lap.avgPowerWatts}W` : '—'}
                        </td>
                      )}
                      {a.laps.some((l) => l.avgHeartRate) && (
                        <td className="py-1.5 text-right text-slate-400">
                          {lap.avgHeartRate != null ? `${lap.avgHeartRate}` : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
