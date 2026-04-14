import type { SportType } from '@/types/activity'

export const SPORT_CONFIG: Record<SportType, {
  label: string
  color: string
  bgClass: string
  textClass: string
  borderClass: string
  calColorId: string
}> = {
  running: {
    label: 'Running',
    color: '#f97316',
    bgClass: 'bg-orange-500/20',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    calColorId: '6',   // Tangerine (orange)
  },
  cycling: {
    label: 'Cycling',
    color: '#22c55e',
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    calColorId: '2',   // Sage (green)
  },
  swimming: {
    label: 'Swimming',
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/20',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    calColorId: '7',   // Peacock (teal)
  },
  strength: {
    label: 'Strength',
    color: '#a855f7',
    bgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    calColorId: '3',   // Grape (purple)
  },
  brick: {
    label: 'Brick',
    color: '#facc15',
    bgClass: 'bg-yellow-400/20',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-400/30',
    calColorId: '5',   // Banana (yellow)
  },
}

export const TRIATHLON_SPORTS: SportType[] = ['swimming', 'cycling', 'running']

export const COMMON_EXERCISES = [
  'Back Squat',
  'Front Squat',
  'Romanian Deadlift',
  'Conventional Deadlift',
  'Hip Thrust',
  'Leg Press',
  'Bulgarian Split Squat',
  'Single-Leg Deadlift',
  'Bench Press',
  'Incline Bench Press',
  'Overhead Press',
  'Pull-ups',
  'Lat Pulldown',
  'Seated Row',
  'Bent-over Row',
  'Dumbbell Row',
  'Dips',
  'Push-ups',
  'Face Pull',
  'Lateral Raise',
  'Bicep Curl',
  'Tricep Pushdown',
  'Plank',
  'Side Plank',
  'Dead Bug',
  'Copenhagen Plank',
  'Cable Woodchop',
  'Pallof Press',
  'Calf Raise',
  'Nordic Hamstring Curl',
]
