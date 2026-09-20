import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Hourglass, Inbox, TimerReset, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShareBar } from '@/components/ui/share-bar'
import { FilterBar } from '@/components/FilterBar'
import { StatTile } from '@/components/StatTile'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { PriorityBadge } from '@/components/StatusPriorityBadges'
import { useBreakdown, useOwnerPending, useSummary, useTickets } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { formatDuration, formatHours, formatPct } from '@/lib/format'
import type { TicketListItem } from '@/types/api'

export function Dashboard() {
  const [filters, setFilters] = useTicketFilters()
  const { data: summary } = useSummary(filters)
  const { data: teamBreakdown } = useBreakdown('team', filters)
  const { data: categoryBreakdown } = useBreakdown('category', filters)
  const { data: ownerPending } = useOwnerPending(filters)
  const { data: overdue } = useTickets(
    { ...filters, sla_status: 'breached' },
    { sortBy: 'sla_due_at', sortDir: 'asc', pageSize: 5 },
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">What's happening, what's overdue, who's overloaded.</p>
        </div>
        <CreateTicketDialog />
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      <AttentionNeeded tickets={overdue?.items} />

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Open tickets" value={String(summary.total_open_tickets)} icon={Inbox} />
            <StatTile label="Pending" value={String(summary.tickets_pending)} icon={Clock} />
            <StatTile
              label="SLA breached"
              value={String(summary.sla_breached_tickets)}
              tone={summary.sla_breached_tickets > 0 ? 'danger' : 'default'}
              icon={AlertTriangle}
            />
            <StatTile label="SLA compliance" value={formatPct(summary.sla_compliance_pct)} icon={CheckCircle2} tone="success" />
            <StatTile label="Avg first response" value={formatHours(summary.avg_first_response_hours)} icon={Hourglass} />
            <StatTile label="Avg resolution time" value={formatHours(summary.avg_resolution_hours)} icon={TimerReset} />
            <StatTile label="Resolved (total)" value={String(summary.total_resolved_tickets)} icon={CheckCircle2} tone="success" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatTile
              label="Created this week"
              value={String(summary.tickets_created_this_week)}
              comparison={summary.created_comparison}
            />
            <StatTile
              label="Resolved this week"
              value={String(summary.tickets_resolved_this_week)}
              comparison={summary.resolved_comparison}
            />
            <StatTile
              label="SLA breaches this week"
              value={String(summary.sla_breached_this_week)}
              comparison={summary.sla_breach_comparison}
              invertComparisonTone
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard title="By team" items={teamBreakdown} />
        <BreakdownCard title="By category" items={categoryBreakdown} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> Pending by owner
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(ownerPending ?? []).length === 0 && <EmptyState text="Nothing pending." />}
            {(ownerPending ?? []).map((o) => (
              <div key={o.owner_id ?? 'unassigned'} className="flex items-center justify-between text-sm">
                <span>{o.owner_name}</span>
                <span className="font-medium">{o.pending_count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AttentionNeeded({ tickets }: { tickets?: TicketListItem[] }) {
  if (!tickets || tickets.length === 0) return null
  return (
    <Card className="border-danger/30 bg-danger-bg/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" /> Needs attention — SLA breached
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {tickets.map((t) => (
          <Link
            key={t.id}
            to={`/tickets/${t.id}`}
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-card"
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">#{t.ticket_number}</span>
              <span className="text-foreground">{t.title}</span>
              <span className="text-xs text-muted-foreground">· {t.team_name}</span>
            </span>
            <span className="flex items-center gap-2">
              <PriorityBadge priority={t.priority} />
              <span className="text-xs text-muted-foreground">open {formatDuration(t.age_seconds)}</span>
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

function BreakdownCard({ title, items }: { title: string; items?: BreakdownItemData[] }) {
  const maxTotal = Math.max(1, ...(items ?? []).map((i) => i.total))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(items ?? []).length === 0 && <EmptyState text="No tickets yet." />}
        {(items ?? []).map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{item.total} total</span>
                <span>{item.pending} pending</span>
                {item.sla_breached > 0 && <span className="font-medium text-danger">{item.sla_breached} breached</span>}
              </span>
            </div>
            <ShareBar percent={(item.total / maxTotal) * 100} tone={item.sla_breached > 0 ? 'danger' : 'default'} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md bg-muted px-3 py-4 text-center text-sm text-muted-foreground">{text}</p>
}
