import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { PeriodComparison } from '@/types/api'

interface Props {
  label: string
  value: string
  tone?: 'default' | 'danger' | 'success'
  comparison?: PeriodComparison
  /** true when an increase is bad news (e.g. SLA breaches) — flips the color. */
  invertComparisonTone?: boolean
}

export function StatTile({ label, value, tone = 'default', comparison, invertComparisonTone }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
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
