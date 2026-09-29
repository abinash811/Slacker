import { Link, useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/patterns/data-table'
import { EmptyState } from '@/components/patterns/states'
import { ToneBadge } from '@/components/patterns/tone-badge'
import { usePeopleScorecard } from '@/hooks/useApi'
import { columnHelper } from '@/lib/data-table'
import { formatHours, formatPct } from '@/lib/format'
import type { PersonScore, TicketFiltersState } from '@/types/api'

const col = columnHelper<PersonScore>()
const openTicketsOf = (ownerId: number) => `/tickets?owner_id=${ownerId}&state=active`

const COLUMNS = col.columns([
  col.accessor('owner_name', {
    header: 'Person',
    meta: { className: 'font-medium' },
    cell: (i) => {
      const id = i.row.original.owner_id
      if (id === null) return i.getValue()
      // The real link: keyboard and screen-reader path; the row click is a mouse shortcut.
      return (
        <Link to={openTicketsOf(id)} className="focus-ring rounded-sm hover:underline" onClick={(e) => e.stopPropagation()}>
          {i.getValue()}
        </Link>
      )
    },
  }),
  col.accessor('open', { header: 'Open', meta: { align: 'right' } }),
  col.accessor('overdue', {
    header: 'Overdue',
    meta: { align: 'right' },
    cell: (i) => (i.getValue() > 0 ? <ToneBadge tone="danger">{i.getValue()} overdue</ToneBadge> : '0'),
  }),
  col.accessor('resolved', { header: 'Resolved', meta: { align: 'right' } }),
  col.accessor('median_first_response_hours', {
    header: 'First response',
    meta: { align: 'right', muted: true },
    cell: (i) => formatHours(i.getValue()),
  }),
  col.accessor('median_resolution_hours', {
    header: 'Resolution time',
    meta: { align: 'right', muted: true },
    cell: (i) => formatHours(i.getValue()),
  }),
  col.accessor('sla_met_pct', {
    header: 'SLA met',
    meta: { align: 'right' },
    cell: (i) => formatPct(i.getValue()),
  }),
])

/**
 * Per-person accountability: what each owner holds now and how their
 * resolved tickets went. Times are medians, so one outlier doesn't skew them.
 * Loaded on demand (it brings the data-table code).
 */
export function PeopleScorecard({ filters }: { filters: TicketFiltersState }) {
  const people = usePeopleScorecard(filters)
  const navigate = useNavigate()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4" aria-hidden /> Team scorecard
        </CardTitle>
        <CardDescription>
          By current owner. Times are medians. SLA met is the share of resolved tickets closed on time. Click a person to
          see their open tickets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={COLUMNS}
          data={people.data ?? []}
          getRowId={(row) => String(row.owner_id ?? 'unassigned')}
          isLoading={people.isPending}
          loadingRows={4}
          error={people.error}
          onRetry={() => people.refetch()}
          retrying={people.isFetching}
          errorTitle="Couldn't load the scorecard"
          empty={<EmptyState icon={Users} title="No tickets yet" description="People appear here once tickets match these filters." />}
          rowTone={(row) => (row.overdue > 0 ? 'danger' : undefined)}
          onRowClick={(row) => row.owner_id !== null && navigate(openTicketsOf(row.owner_id))}
        />
      </CardContent>
    </Card>
  )
}
