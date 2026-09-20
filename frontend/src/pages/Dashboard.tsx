import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterBar } from '@/components/FilterBar'
import { StatTile } from '@/components/StatTile'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { useBreakdown, useOwnerPending, useSummary } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { formatHours, formatPct } from '@/lib/format'

export function Dashboard() {
  const [filters, setFilters] = useTicketFilters()
  const { data: summary } = useSummary(filters)
  const { data: teamBreakdown } = useBreakdown('team', filters)
  const { data: categoryBreakdown } = useBreakdown('category', filters)
  const { data: ownerPending } = useOwnerPending(filters)

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

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Open tickets" value={String(summary.total_open_tickets)} />
            <StatTile label="Pending" value={String(summary.tickets_pending)} />
            <StatTile
              label="SLA breached"
              value={String(summary.sla_breached_tickets)}
              tone={summary.sla_breached_tickets > 0 ? 'danger' : 'default'}
            />
            <StatTile label="SLA compliance" value={formatPct(summary.sla_compliance_pct)} />
            <StatTile label="Avg first response" value={formatHours(summary.avg_first_response_hours)} />
            <StatTile label="Avg resolution time" value={formatHours(summary.avg_resolution_hours)} />
            <StatTile label="Resolved (total)" value={String(summary.total_resolved_tickets)} />
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
            <CardTitle>Pending by owner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(ownerPending ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
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

function BreakdownCard({ title, items }: { title: string; items?: { label: string; total: number; pending: number; sla_breached: number; avg_resolution_hours: number | null }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(items ?? []).length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
        {(items ?? []).map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span>{item.label}</span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{item.total} total</span>
              <span>{item.pending} pending</span>
              {item.sla_breached > 0 && <span className="font-medium text-danger">{item.sla_breached} breached</span>}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
