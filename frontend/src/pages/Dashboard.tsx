import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClock, AlertTriangle, CheckCircle2, Clock, Hourglass, Inbox, TimerReset } from 'lucide-react'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ButtonLink } from '@/components/patterns/buttons'
import { Caption, PageHeader } from '@/components/patterns/typography'
import { EmptyState } from '@/components/patterns/states'
import { ErrorState } from '@/components/patterns/states'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterBar } from '@/components/FilterBar'
import { StatTile, StatTileSkeleton } from '@/components/StatTile'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { PriorityBadge } from '@/components/StatusPriorityBadges'
import { useAging, useBreakdown, useSummary, useTickets } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { formatDuration, formatHours, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AgingBucket, TicketFiltersState, TicketListItem } from '@/types/api'

// Charts pull in recharts (large), so they load after the rest of the dashboard.
const TrendCharts = lazy(() => import('@/components/TrendCharts').then((m) => ({ default: m.TrendCharts })))
// The scorecard brings the data-table code; it sits low on the page, so it loads after.
const PeopleScorecard = lazy(() => import('@/components/PeopleScorecard').then((m) => ({ default: m.PeopleScorecard })))

export function Dashboard() {
  const [filters, setFilters] = useTicketFilters()
  const summary = useSummary(filters)
  const teamBreakdown = useBreakdown('team', filters)
  const categoryBreakdown = useBreakdown('category', filters)
  const aging = useAging(filters)
  const { data: overdue } = useTickets(
    { ...filters, sla_status: 'breached', state: 'active' },
    { sortBy: 'sla_due_at', sortDir: 'asc', pageSize: 5 },
  )
  const { data: dueSoon } = useTickets(
    { ...filters, sla_status: 'at_risk' },
    { sortBy: 'sla_due_at', sortDir: 'asc', pageSize: 5 },
  )
  const s = summary.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="What's happening, what's overdue, who's overloaded."
        actions={<CreateTicketDialog />}
      />

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 empty:hidden">
        <TicketAlert
          tone="danger"
          title="SLA breached"
          result={overdue}
          viewAll={{ ...filters, sla_status: 'breached', state: 'active' }}
          detail={(t) => `open ${formatDuration(t.age_seconds)}`}
        />
        <TicketAlert
          tone="warning"
          title="Due in the next 24 hours"
          result={dueSoon}
          viewAll={{ ...filters, sla_status: 'at_risk' }}
          detail={(t) => `due in ${formatDuration(t.sla_remaining_seconds ?? 0)}`}
        />
      </div>

      {summary.isError ? (
        <ErrorState
          bordered
          title="Couldn't load dashboard numbers"
          error={summary.error}
          onRetry={() => summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {!s ? (
              Array.from({ length: 7 }, (_, i) => <StatTileSkeleton key={i} />)
            ) : (
              <>
                <StatTile label="Open tickets" value={String(s.total_open_tickets)} icon={Inbox} />
                <StatTile label="Pending" value={String(s.tickets_pending)} icon={Clock} />
                <StatTile
                  label="SLA breached"
                  value={String(s.sla_breached_tickets)}
                  tone={s.sla_breached_tickets > 0 ? 'danger' : 'default'}
                  icon={AlertTriangle}
                />
                <StatTile label="SLA compliance" value={formatPct(s.sla_compliance_pct)} icon={CheckCircle2} tone="success" />
                <StatTile label="Avg first response" value={formatHours(s.avg_first_response_hours)} icon={Hourglass} />
                <StatTile label="Avg resolution time" value={formatHours(s.avg_resolution_hours)} icon={TimerReset} />
                <StatTile label="Resolved (total)" value={String(s.total_resolved_tickets)} icon={CheckCircle2} tone="success" />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {!s ? (
              Array.from({ length: 3 }, (_, i) => <StatTileSkeleton key={i} />)
            ) : (
              <>
                <StatTile label="Created this week" value={String(s.tickets_created_this_week)} comparison={s.created_comparison} />
                <StatTile label="Resolved this week" value={String(s.tickets_resolved_this_week)} comparison={s.resolved_comparison} />
                <StatTile
                  label="SLA breaches this week"
                  value={String(s.sla_breached_this_week)}
                  comparison={s.sla_breach_comparison}
                  invertComparisonTone
                />
              </>
            )}
          </div>
        </>
      )}

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <TrendCharts filters={filters} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard title="By team" query={teamBreakdown} />
        <BreakdownCard title="By category" query={categoryBreakdown} />
        <AgingCard query={aging} />
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <PeopleScorecard filters={filters} />
      </Suspense>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

const ALERT_TONES = {
  danger: { card: 'bg-destructive/5 ring-destructive/20', title: 'text-destructive', icon: AlertTriangle },
  warning: { card: 'bg-warning/5 ring-warning/20', title: 'text-warning', icon: AlarmClock },
}

/** Tickets that need someone now, most urgent first; hidden when there are none. */
function TicketAlert({
  tone,
  title,
  result,
  viewAll,
  detail,
}: {
  tone: keyof typeof ALERT_TONES
  title: string
  result?: { items: TicketListItem[]; total: number }
  viewAll: TicketFiltersState
  detail: (ticket: TicketListItem) => string
}) {
  if (!result || result.total === 0) return null
  const { card, title: titleClass, icon: Icon } = ALERT_TONES[tone]
  return (
    <Card className={card}>
      <CardHeader>
        <CardTitle className={cn('flex items-center gap-2', titleClass)}>
          <Icon className="size-4" aria-hidden /> {title} · {result.total}
        </CardTitle>
        {result.total > result.items.length && (
          <CardAction>
            <ButtonLink variant="link" size="sm" to={`/tickets${toSearch(viewAll)}`}>
              View all {result.total}
            </ButtonLink>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {result.items.map((t) => (
          <Link
            key={t.id}
            to={`/tickets/${t.id}`}
            className="focus-ring flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-background"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-medium">#{t.ticket_number}</span>
              <span className="truncate text-foreground">{t.title}</span>
              <Caption className="shrink-0">· {t.owner_name ?? 'Unassigned'}</Caption>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <PriorityBadge priority={t.priority} />
              <Caption className="tabular-nums">{detail(t)}</Caption>
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function toSearch(filters: TicketFiltersState) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return `?${params}`
}

/** Ongoing tickets by how long they've been open: what's stuck. */
function AgingCard({
  query,
}: {
  query: { data?: AgingBucket[]; isPending: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => unknown }
}) {
  const buckets = query.data ?? []
  const total = buckets.reduce((sum, b) => sum + b.count, 0)
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <Hourglass className="size-4" aria-hidden /> Age of open tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isPending ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
        ) : total === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing open" description="No ongoing tickets match these filters." />
        ) : (
          buckets.map((b) => (
            <div key={b.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{b.label}</span>
                <Caption className="flex items-center gap-3 tabular-nums">
                  <span>{b.count} open</span>
                  {b.sla_breached > 0 && <span className="font-medium text-destructive">{b.sla_breached} breached</span>}
                </Caption>
              </div>
              <Progress
                value={(b.count / max) * 100}
                aria-label={`${b.label}: ${b.count} open tickets`}
                className={b.sla_breached > 0 ? '**:data-[slot=progress-indicator]:bg-destructive' : undefined}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

interface BreakdownItemData {
  label: string
  total: number
  pending: number
  sla_breached: number
  avg_resolution_hours: number | null
}

function BreakdownCard({
  title,
  query,
}: {
  title: string
  query: { data?: BreakdownItemData[]; isPending: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => unknown }
}) {
  const items = query.data ?? []
  const maxTotal = Math.max(1, ...items.map((i) => i.total))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isPending ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
        ) : items.length === 0 ? (
          <EmptyState icon={Inbox} title="No tickets yet" description="Numbers appear once tickets match these filters." />
        ) : (
          items.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <Caption className="flex items-center gap-3 tabular-nums">
                  <span>{item.total} total</span>
                  <span>{item.pending} pending</span>
                  {item.sla_breached > 0 && <span className="font-medium text-destructive">{item.sla_breached} breached</span>}
                </Caption>
              </div>
              <Progress
                value={(item.total / maxTotal) * 100}
                aria-label={`${item.label}: ${item.total} tickets`}
                className={item.sla_breached > 0 ? '**:data-[slot=progress-indicator]:bg-destructive' : undefined}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
