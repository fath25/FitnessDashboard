import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { useFitness } from '@/context/FitnessContext'
import type { BodyEntry } from '@/types/body'

interface Props { onClose: () => void }

export function BodyLogger({ onClose }: Props) {
  const { addBodyEntry } = useFitness()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [notes, setNotes] = useState('')

  function handleSave() {
    const weightKg = parseFloat(weight)
    if (isNaN(weightKg) || weightKg <= 0) return
    const entry: BodyEntry = {
      id: `body-${Date.now()}`,
      date,
      weightKg,
      bodyFatPct: bodyFat ? parseFloat(bodyFat) : null,
      notes,
    }
    addBodyEntry(entry)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Log Weight & Body Composition</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Weight (kg) *</label>
            <input
              type="number" step="0.1" min="30" max="300" value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 81.5"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Body Fat % (optional)</label>
            <input
              type="number" step="0.1" min="3" max="60" value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="e.g. 18.5"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
            <input
              type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. morning, fasted"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 placeholder-slate-600"
            />
          </div>
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!weight}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
