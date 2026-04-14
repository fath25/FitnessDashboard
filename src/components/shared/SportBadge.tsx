import { SPORT_CONFIG } from '@/constants/sports'
import type { SportType } from '@/types/activity'

interface SportBadgeProps {
  sport: SportType
  size?: 'sm' | 'md'
}

export function SportBadge({ sport, size = 'md' }: SportBadgeProps) {
  const cfg = SPORT_CONFIG[sport]
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${cfg.bgClass} ${cfg.textClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {cfg.label}
    </span>
  )
}
