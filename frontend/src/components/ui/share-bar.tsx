import { cn } from '@/lib/utils'

interface Props {
  /** 0-100 */
  percent: number
  className?: string
  tone?: 'default' | 'danger'
}

/** A single-value part-to-whole bar: a lighter track (same neutral ramp)
 * with a rounded, capped fill — the "meter" pattern, not a full chart. */
export function ShareBar({ percent, className, tone = 'default' }: Props) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full', tone === 'danger' ? 'bg-danger' : 'bg-primary')}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
