import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
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

const TONE_ICON: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  danger: 'bg-destructive/10 text-destructive',
  success: 'bg-success/10 text-success',
}

/** A metric on a shadcn Card: label, icon (CardAction), value and week-over-week change. */
export function StatTile({ label, value, tone = 'default', comparison, invertComparisonTone, icon: Icon }: Props) {
  const good = comparison && comparison.change_pct !== null && (comparison.change_pct >= 0) !== !!invertComparisonTone
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {Icon && (
          <CardAction>
            <span className={cn('flex size-7 items-center justify-center rounded-md', TONE_ICON[tone])}>
              <Icon className="size-4" aria-hidden />
            </span>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className={cn('text-2xl font-semibold tabular-nums', tone === 'danger' && 'text-destructive', tone === 'success' && 'text-success')}>
          {value}
        </p>
        {comparison && comparison.change_pct !== null && (
          <p className={cn('text-xs font-medium', good ? 'text-success' : 'text-destructive')}>
            {comparison.change_pct >= 0 ? '+' : ''}
            {comparison.change_pct}% vs last week
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatTileSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  )
}
