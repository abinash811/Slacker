import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{label}</CardTitle>
        {Icon && (
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', TONE_ICON_CLASSES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-semibold',
            tone === 'danger' && 'text-danger',
            tone === 'success' && 'text-success',
          )}
        >
          {value}
        </div>
        {comparison && comparison.change_pct !== null && (
          <div
            className={cn(
              'mt-1 text-xs font-medium',
              (comparison.change_pct >= 0) !== !!invertComparisonTone ? 'text-success' : 'text-danger',
            )}
          >
            {comparison.change_pct >= 0 ? '+' : ''}
            {comparison.change_pct}% vs last week
          </div>
        )}
      </CardContent>
    </Card>
  )
}
