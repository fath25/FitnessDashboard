import { useState, useRef } from 'react'
import { X, Plus, Trash2, Save, ChevronDown } from 'lucide-react'
import type { StrengthSession, StrengthSet } from '@/types/strength'
import { COMMON_EXERCISES } from '@/constants/sports'
import { useFitness } from '@/context/FitnessContext'

interface WorkoutLoggerProps {
  onClose: () => void
  editSession?: StrengthSession
}

interface SetRow {
  exercise: string
  sets: number
  reps: number
  weightKg: number
  isBodyweight: boolean
  durationSeconds: number | null
  rpe: number | null
}

const EMPTY_ROW: SetRow = { exercise: '', sets: 3, reps: 8, weightKg: 0, isBodyweight: false, durationSeconds: null, rpe: null }

export function WorkoutLogger({ onClose, editSession }: WorkoutLoggerProps) {
  const { addStrengthSession, updateStrengthSession } = useFitness()
  const [date, setDate] = useState(editSession?.date ?? new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState(editSession?.durationMinutes?.toString() ?? '60')
  const [notes, setNotes] = useState(editSession?.notes ?? '')
  const [rows, setRows] = useState<SetRow[]>(() => {
    if (editSession?.sets.length) {
      // Group by exercise, take first occurrence's reps/weight per exercise
      const byExercise: Record<string, SetRow> = {}
      for (const s of editSession.sets) {
        if (!byExercise[s.exercise]) {
          byExercise[s.exercise] = {
            exercise: s.exercise,
            sets: 1,
            reps: s.reps,
            weightKg: s.weightKg,
            isBodyweight: s.isBodyweight,
            durationSeconds: s.durationSeconds ?? null,
            rpe: s.rpe,
          }
        } else {
          byExercise[s.exercise].sets++
        }
      }
      return Object.values(byExercise)
    }
    return [{ ...EMPTY_ROW }]
  })

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeRow, setActiveRow] = useState<number | null>(null)
  const suggRef = useRef<HTMLDivElement>(null)

  function handleExerciseInput(i: number, val: string) {
    updateRow(i, 'exercise', val)
    if (val.length >= 2) {
      setSuggestions(COMMON_EXERCISES.filter((e) => e.toLowerCase().includes(val.toLowerCase())).slice(0, 6))
      setActiveRow(i)
    } else {
      setSuggestions([])
      setActiveRow(null)
    }
  }

  function selectSuggestion(i: number, name: string) {
    updateRow(i, 'exercise', name)
    setSuggestions([])
    setActiveRow(null)
  }

  function updateRow<K extends keyof SetRow>(i: number, key: K, value: SetRow[K]) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }])
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSave() {
    const validRows = rows.filter((r) => r.exercise.trim())
    if (validRows.length === 0) return

    const sets: StrengthSet[] = validRows.flatMap((r) =>
      Array.from({ length: r.sets }, (_, setIdx) => ({
        exercise: r.exercise.trim(),
        setNumber: setIdx + 1,
        reps: r.reps,
        weightKg: r.weightKg,
        isBodyweight: r.isBodyweight,
        durationSeconds: r.durationSeconds ?? undefined,
        rpe: r.rpe,
      })),
    )

    const totalVolume = sets.reduce((s, set) => s + (set.isBodyweight ? 0 : set.reps * set.weightKg), 0)

    const session: StrengthSession = {
      id: editSession?.id ?? `str-${Date.now()}`,
      date,
      durationMinutes: parseInt(duration) || 60,
      sets,
      totalVolumeKg: Math.round(totalVolume),
      notes,
    }

    if (editSession) {
      updateStrengthSession(session)
    } else {
      addStrengthSession(session)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {editSession ? 'Edit Workout' : 'Log Strength Workout'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Exercise rows */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 px-1">
              <div className="col-span-4">Exercise</div>
              <div className="col-span-2 text-center">Sets</div>
              <div className="col-span-2 text-center">Reps</div>
              <div className="col-span-2 text-center">Weight (kg)</div>
              <div className="col-span-1 text-center">BW</div>
              <div className="col-span-1" />
            </div>

            {rows.map((row, i) => (
              <div key={i} className="relative">
                <div className="grid grid-cols-12 gap-2 items-center bg-slate-900 rounded-lg px-2 py-2">
                  <div className="col-span-4 relative">
                    <input
                      type="text"
                      value={row.exercise}
                      onChange={(e) => handleExerciseInput(i, e.target.value)}
                      placeholder="Exercise…"
                      className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-slate-600"
                    />
                    {activeRow === i && suggestions.length > 0 && (
                      <div ref={suggRef} className="absolute top-full left-0 z-10 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onMouseDown={() => selectSuggestion(i, s)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={1} max={20} value={row.sets} onChange={(e) => updateRow(i, 'sets', Number(e.target.value))} className="w-full bg-transparent text-center text-white text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={1} max={100} value={row.reps} onChange={(e) => updateRow(i, 'reps', Number(e.target.value))} className="w-full bg-transparent text-center text-white text-sm focus:outline-none" disabled={row.isBodyweight && row.durationSeconds != null} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={0} step={0.5} value={row.weightKg} onChange={(e) => updateRow(i, 'weightKg', Number(e.target.value))} disabled={row.isBodyweight} className="w-full bg-transparent text-center text-white text-sm focus:outline-none disabled:text-slate-600" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input type="checkbox" checked={row.isBodyweight} onChange={(e) => { updateRow(i, 'isBodyweight', e.target.checked); if (e.target.checked) updateRow(i, 'weightKg', 0) }} className="accent-purple-500" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeRow(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addRow} className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors mt-1 px-1">
              <Plus size={14} /> Add exercise
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="How did it feel? Any PRs?"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Save size={14} /> Save workout
          </button>
        </div>
      </div>
    </div>
  )
}
