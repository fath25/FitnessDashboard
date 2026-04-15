import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { useFitness } from '@/context/FitnessContext'
import type { NutritionEntry } from '@/types/body'

interface Props { onClose: () => void }

export function NutritionLogger({ onClose }: Props) {
  const { addNutritionEntry } = useFitness()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [notes, setNotes] = useState('')

  function handleSave() {
    const cal = parseInt(calories)
    if (isNaN(cal) || cal <= 0) return
    const entry: NutritionEntry = {
      id: `nutr-${Date.now()}`,
      date,
      calories: cal,
      proteinG: protein ? parseFloat(protein) : null,
      carbsG: carbs ? parseFloat(carbs) : null,
      fatG: fat ? parseFloat(fat) : null,
      notes,
    }
    addNutritionEntry(entry)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Log Daily Nutrition</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Calories (kcal) *</label>
            <input
              type="number" min="0" max="10000" value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="e.g. 2800"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Protein (g)</label>
              <input
                type="number" min="0" step="1" value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="—"
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Carbs (g)</label>
              <input
                type="number" min="0" step="1" value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="—"
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fat (g)</label>
              <input
                type="number" min="0" step="1" value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="—"
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
            <input
              type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. cheat day, post-race"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
            />
          </div>
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!calories}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
