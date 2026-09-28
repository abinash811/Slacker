import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { PeriodComparison } from '@/types/api'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string
  tone?: 'default' | 'danger' | 'success'
  comparison?: PeriodComparison
  /** true when an increase is bad news (e.g. SLA breaches) — flips the color. */
  invertComparisonTone?: boolean
  icon?: LucideIcon
}

const TONE_ICON_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-accent text-accent-foreground',
  danger: 'bg-danger-bg text-danger',
  success: 'bg-success-bg text-success',
}

export function StatTile({ label, value, tone = 'default', comparison, invertComparisonTone, icon: Icon }: Props) {
  const good = comparison && comparison.change_pct !== null && (comparison.change_pct >= 0) !== !!invertComparisonTone
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle>{label}</CardTitle>
        {Icon && (
          <span className={cn('flex size-7 items-center justify-center rounded-md', TONE_ICON_CLASSES[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-semibold tabular-nums', tone === 'danger' && 'text-danger', tone === 'success' && 'text-success')}>
          {value}
        </div>
        {comparison && comparison.change_pct !== null && (
          <div className={cn('mt-1 text-xs font-medium', good ? 'text-success' : 'text-danger')}>
            {comparison.change_pct >= 0 ? '+' : ''}
            {comparison.change_pct}% vs last week
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StatTileSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-7" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  )
}
