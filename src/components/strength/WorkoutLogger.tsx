import { useState, useRef } from 'react'
import { X, Plus, Trash2, Save } from 'lucide-react'
import type { StrengthSession, StrengthSet } from '@/types/strength'
import { COMMON_EXERCISES } from '@/constants/sports'
import { useFitness } from '@/context/FitnessContext'

interface WorkoutLoggerProps {
  onClose: () => void
  editSession?: StrengthSession
}

interface SetInput {
  reps: number
  weightKg: number
  isBodyweight: boolean
  rpe: number | null
}

interface ExerciseRow {
  exercise: string
  setInputs: SetInput[]
  durationSeconds: number | null  // for timed exercises like Plank (shared across sets)
}

const DEFAULT_SET: SetInput = { reps: 8, weightKg: 0, isBodyweight: false, rpe: null }

export function WorkoutLogger({ onClose, editSession }: WorkoutLoggerProps) {
  const { addStrengthSession, updateStrengthSession } = useFitness()
  const [date, setDate] = useState(editSession?.date ?? new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState(editSession?.durationMinutes?.toString() ?? '60')
  const [notes, setNotes] = useState(editSession?.notes ?? '')

  const [rows, setRows] = useState<ExerciseRow[]>(() => {
    if (editSession?.sets.length) {
      const byExercise = new Map<string, SetInput[]>()
      const durationMap = new Map<string, number | null>()
      const sortedSets = [...editSession.sets].sort((a, b) => a.setNumber - b.setNumber)
      for (const s of sortedSets) {
        if (!byExercise.has(s.exercise)) {
          byExercise.set(s.exercise, [])
          durationMap.set(s.exercise, s.durationSeconds ?? null)
        }
        byExercise.get(s.exercise)!.push({
          reps: s.reps,
          weightKg: s.weightKg,
          isBodyweight: s.isBodyweight,
          rpe: s.rpe,
        })
      }
      return Array.from(byExercise.entries()).map(([exercise, setInputs]) => ({
        exercise,
        setInputs,
        durationSeconds: durationMap.get(exercise) ?? null,
      }))
    }
    return [{ exercise: '', setInputs: [{ ...DEFAULT_SET }], durationSeconds: null }]
  })

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeRow, setActiveRow] = useState<number | null>(null)
  const suggRef = useRef<HTMLDivElement>(null)

  function handleExerciseInput(i: number, val: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, exercise: val } : r)))
    if (val.length >= 2) {
      setSuggestions(COMMON_EXERCISES.filter((e) => e.toLowerCase().includes(val.toLowerCase())).slice(0, 6))
      setActiveRow(i)
    } else {
      setSuggestions([])
      setActiveRow(null)
    }
  }

  function selectSuggestion(i: number, name: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, exercise: name } : r)))
    setSuggestions([])
    setActiveRow(null)
  }

  function updateSet(exIdx: number, setIdx: number, updates: Partial<SetInput>) {
    setRows((prev) => prev.map((r, i) => {
      if (i !== exIdx) return r
      return { ...r, setInputs: r.setInputs.map((s, j) => (j === setIdx ? { ...s, ...updates } : s)) }
    }))
  }

  function addSet(exIdx: number) {
    setRows((prev) => prev.map((r, i) => {
      if (i !== exIdx) return r
      const last = r.setInputs[r.setInputs.length - 1]
      return { ...r, setInputs: [...r.setInputs, last ? { ...last } : { ...DEFAULT_SET }] }
    }))
  }

  function removeSet(exIdx: number, setIdx: number) {
    setRows((prev) => prev.map((r, i) => {
      if (i !== exIdx || r.setInputs.length <= 1) return r
      return { ...r, setInputs: r.setInputs.filter((_, j) => j !== setIdx) }
    }))
  }

  function addExercise() {
    setRows((prev) => [...prev, { exercise: '', setInputs: [{ ...DEFAULT_SET }], durationSeconds: null }])
  }

  function removeExercise(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSave() {
    const validRows = rows.filter((r) => r.exercise.trim())
    if (validRows.length === 0) return

    const sets: StrengthSet[] = validRows.flatMap((r) =>
      r.setInputs.map((s, idx) => ({
        exercise: r.exercise.trim(),
        setNumber: idx + 1,
        reps: s.reps,
        weightKg: s.weightKg,
        isBodyweight: s.isBodyweight,
        durationSeconds: r.durationSeconds ?? undefined,
        rpe: s.rpe,
      })),
    )

    const totalVolume = sets.reduce((sum, s) => sum + (s.isBodyweight ? 0 : s.reps * s.weightKg), 0)

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
        <div className="overflow-y-auto p-4 space-y-5 flex-1">
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

          {/* Exercise blocks */}
          <div className="space-y-4">
            {rows.map((row, exIdx) => (
              <div key={exIdx} className="bg-slate-900 rounded-xl p-3 border border-slate-700/50">
                {/* Exercise name */}
                <div className="flex items-center gap-2 mb-3 relative">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={row.exercise}
                      onChange={(e) => handleExerciseInput(exIdx, e.target.value)}
                      placeholder="Exercise name…"
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-slate-600"
                    />
                    {activeRow === exIdx && suggestions.length > 0 && (
                      <div ref={suggRef} className="absolute top-full left-0 z-10 mt-1 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onMouseDown={() => selectSuggestion(exIdx, s)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {rows.length > 1 && (
                    <button onClick={() => removeExercise(exIdx)} className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Set table */}
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-1 text-xs text-slate-500 px-1 mb-1">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3 text-center">Reps</div>
                    <div className="col-span-4 text-center">Weight (kg)</div>
                    <div className="col-span-2 text-center">BW</div>
                    <div className="col-span-1 text-center">RPE</div>
                    <div className="col-span-1" />
                  </div>

                  {row.setInputs.map((s, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-1 text-xs text-slate-500 text-center">{setIdx + 1}</div>
                      <div className="col-span-3">
                        <input
                          type="number" min={1} max={100} value={s.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, { reps: Number(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 text-center text-white text-sm rounded px-1 py-1.5 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number" min={0} step={0.5} value={s.weightKg}
                          disabled={s.isBodyweight}
                          onChange={(e) => updateSet(exIdx, setIdx, { weightKg: Number(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 text-center text-white text-sm rounded px-1 py-1.5 focus:outline-none focus:border-purple-500 disabled:text-slate-600 disabled:opacity-50"
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <input
                          type="checkbox" checked={s.isBodyweight}
                          onChange={(e) => updateSet(exIdx, setIdx, { isBodyweight: e.target.checked, ...(e.target.checked ? { weightKg: 0 } : {}) })}
                          className="accent-purple-500"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number" min={1} max={10} step={0.5}
                          value={s.rpe ?? ''}
                          placeholder="—"
                          onChange={(e) => updateSet(exIdx, setIdx, { rpe: e.target.value ? Number(e.target.value) : null })}
                          className="w-full bg-slate-800 border border-slate-700 text-center text-white text-xs rounded px-1 py-1.5 focus:outline-none focus:border-purple-500 placeholder-slate-600"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeSet(exIdx, setIdx)}
                          disabled={row.setInputs.length <= 1}
                          className="text-slate-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addSet(exIdx)}
                    className="flex items-center gap-1 text-xs text-purple-400/70 hover:text-purple-400 transition-colors mt-2 px-1"
                  >
                    <Plus size={11} /> Add set
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addExercise} className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors px-1">
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
