import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Hourglass, Inbox, TimerReset, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Caption, PageHeader } from '@/components/ui/typography'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { ShareBar } from '@/components/ui/share-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterBar } from '@/components/FilterBar'
import { StatTile, StatTileSkeleton } from '@/components/StatTile'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { PriorityBadge } from '@/components/StatusPriorityBadges'
import { useBreakdown, useOwnerPending, useSummary, useTickets } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { formatDuration, formatHours, formatPct } from '@/lib/format'
import type { TicketListItem } from '@/types/api'

export function Dashboard() {
  const [filters, setFilters] = useTicketFilters()
  const summary = useSummary(filters)
  const teamBreakdown = useBreakdown('team', filters)
  const categoryBreakdown = useBreakdown('category', filters)
  const ownerPending = useOwnerPending(filters)
  const { data: overdue } = useTickets(
    { ...filters, sla_status: 'breached' },
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

      <AttentionNeeded tickets={overdue?.items} />

      {summary.isError ? (
        <ErrorState
          variant="bordered"
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard title="By team" query={teamBreakdown} />
        <BreakdownCard title="By category" query={categoryBreakdown} />
        <Card>
          <CardHeader>
            <CardTitle>
              <Users aria-hidden /> Pending by owner
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {ownerPending.isPending ? (
              <ListSkeleton />
            ) : ownerPending.isError ? (
              <ErrorState error={ownerPending.error} onRetry={() => ownerPending.refetch()} retrying={ownerPending.isFetching} />
            ) : ownerPending.data.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing pending" description="No open tickets are waiting on anyone." />
            ) : (
              ownerPending.data.map((o) => (
                <div key={o.owner_id ?? 'unassigned'} className="flex items-center justify-between text-sm">
                  <span>{o.owner_name}</span>
                  <span className="font-medium tabular-nums">{o.pending_count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
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

function AttentionNeeded({ tickets }: { tickets?: TicketListItem[] }) {
  if (!tickets || tickets.length === 0) return null
  return (
    <Card className="border-danger/30 bg-danger-bg/40">
      <CardHeader>
        <CardTitle tone="danger">
          <AlertTriangle aria-hidden /> Needs attention — SLA breached
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {tickets.map((t) => (
          <Link
            key={t.id}
            to={`/tickets/${t.id}`}
            className="focus-ring flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 ease-standard hover:bg-card"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-medium">#{t.ticket_number}</span>
              <span className="truncate text-foreground">{t.title}</span>
              <Caption>· {t.team_name}</Caption>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <PriorityBadge priority={t.priority} />
              <Caption>open {formatDuration(t.age_seconds)}</Caption>
            </span>
          </Link>
        ))}
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
        <CardTitle>{title}</CardTitle>
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
                  {item.sla_breached > 0 && <span className="font-medium text-danger">{item.sla_breached} breached</span>}
                </Caption>
              </div>
              <ShareBar percent={(item.total / maxTotal) * 100} tone={item.sla_breached > 0 ? 'danger' : 'default'} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
