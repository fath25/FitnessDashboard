import { useState } from 'react'
import { X, Save, User } from 'lucide-react'
import { useFitness } from '@/context/FitnessContext'
import type { UserProfile } from '@/types/body'

interface Props { onClose: () => void }

export function UserProfileModal({ onClose }: Props) {
  const { userProfile, updateUserProfile } = useFitness()
  const [height, setHeight] = useState(String(userProfile.heightCm))
  const [weight, setWeight] = useState(String(userProfile.weightKg))
  const [age, setAge] = useState(String(userProfile.ageYears))
  const [sex, setSex] = useState<UserProfile['sex']>(userProfile.sex)
  const [bodyFat, setBodyFat] = useState(userProfile.bodyFatPct != null ? String(userProfile.bodyFatPct) : '')
  const [surplus, setSurplus] = useState(String(userProfile.goalCalorieSurplus))

  const surplusNum = Number(surplus) || 0
  const surplusLabel =
    surplusNum >= 400 ? 'Bulk'
    : surplusNum >= 100 ? 'Lean Bulk'
    : surplusNum >= -100 ? 'Maintenance'
    : surplusNum >= -400 ? 'Mild Cut'
    : 'Cut'

  function handleSave() {
    updateUserProfile({
      heightCm: Number(height) || userProfile.heightCm,
      weightKg: Number(weight) || userProfile.weightKg,
      ageYears: Number(age) || userProfile.ageYears,
      sex,
      bodyFatPct: bodyFat ? parseFloat(bodyFat) : null,
      goalCalorieSurplus: surplusNum,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <User size={18} className="text-slate-400" /> Edit Profile
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Used to calculate your daily calorie target (Mifflin-St Jeor). Changes apply instantly.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Height (cm)</label>
              <input
                type="number" min="100" max="250" value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
              <input
                type="number" min="30" max="300" step="0.1" value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Age</label>
              <input
                type="number" min="10" max="100" value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as UserProfile['sex'])}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Body Fat % (optional)</label>
            <input
              type="number" min="3" max="60" step="0.1" value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="e.g. 18.5"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Calorie Surplus (kcal/day)
              <span className="ml-2 text-purple-300 font-medium">{surplusLabel}</span>
            </label>
            <input
              type="number" min="-800" max="800" step="50" value={surplus}
              onChange={(e) => setSurplus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-slate-600 mt-1">
              Positive = bulk, 0 = maintenance, negative = cut
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={14} /> Save Profile
          </button>
        </div>
      </div>
    </div>
  )
}
