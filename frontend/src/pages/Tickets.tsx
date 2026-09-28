import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, SearchX } from 'lucide-react'
import { FilterBar } from '@/components/FilterBar'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/StatusPriorityBadges'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableMessage,
  TableRow,
  TableSkeleton,
  type SortDirection,
} from '@/components/ui/table'
import { PageHeader } from '@/components/ui/typography'
import { useTickets } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { formatDateTime, formatDuration } from '@/lib/format'
import { EMPTY_FILTERS } from '@/lib/tickets'

// `sortable` must match the backend's _SORTABLE_COLUMNS (ticket_service.py);
// other columns render a plain header instead of a sort control that silently does nothing.
// `inverted`: Age sorts by created_at, so newest-first (created_at desc) is age ascending.
const COLUMNS: { key: string; label: string; sortable?: boolean; inverted?: boolean }[] = [
  { key: 'ticket_number', label: 'Ticket', sortable: true },
  { key: 'title', label: 'Title' },
  { key: 'customer', label: 'Customer' },
  { key: 'business_id', label: 'Business ID' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'doctor_name', label: 'Doctor' },
  { key: 'category_name', label: 'Category' },
  { key: 'team_name', label: 'Team' },
  { key: 'owner_name', label: 'Pending on' },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'sla_due_at', label: 'SLA', sortable: true },
  { key: 'created_at', label: 'Age', sortable: true, inverted: true },
  { key: 'updated_at', label: 'Updated', sortable: true },
]

const flip = (d: SortDirection): SortDirection => (d === 'asc' ? 'desc' : 'asc')

export function Tickets() {
  const [filters, setFilters] = useTicketFilters()
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const tickets = useTickets(filters, { sortBy, sortDir, pageSize: 100 })
  const navigate = useNavigate()
  const items = tickets.data?.items ?? []
  const hasFilters = Object.values(filters).some((v) => v !== undefined)

  function toggleSort(key: string) {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tickets"
        description={tickets.data ? `${tickets.data.total} ${tickets.data.total === 1 ? 'ticket' : 'tickets'}` : ' '}
        actions={<CreateTicketDialog />}
      />

      <FilterBar filters={filters} onChange={setFilters} />

      <Table>
        <TableHeader>
          <tr>
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                sort={col.sortable ? (sortBy === col.key ? (col.inverted ? flip(sortDir) : sortDir) : false) : undefined}
                onSort={col.sortable ? () => toggleSort(col.key) : undefined}
              >
                {col.label}
              </TableHead>
            ))}
          </tr>
        </TableHeader>
        <TableBody>
          {tickets.isPending ? (
            <TableSkeleton columns={COLUMNS.length} rows={8} />
          ) : tickets.isError ? (
            <TableMessage colSpan={COLUMNS.length}>
              <ErrorState
                title="Couldn't load tickets"
                error={tickets.error}
                onRetry={() => tickets.refetch()}
                retrying={tickets.isFetching}
              />
            </TableMessage>
          ) : items.length === 0 ? (
            <TableMessage colSpan={COLUMNS.length}>
              {hasFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="No tickets match these filters"
                  description="Try removing a filter or searching for something else."
                  action={
                    <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState icon={Inbox} title="No tickets yet" description="Tickets created here or from Slack show up in this list." />
              )}
            </TableMessage>
          ) : (
            items.map((t) => (
              <TableRow
                key={t.id}
                interactive
                tone={t.sla_breached ? 'danger' : undefined}
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <TableCell className="font-medium">
                  {/* The real link — keyboard and screen-reader path into the ticket; the row click is a mouse shortcut. */}
                  <Link to={`/tickets/${t.id}`} className="focus-ring rounded-sm hover:underline" onClick={(e) => e.stopPropagation()}>
                    #{t.ticket_number}
                  </Link>
                </TableCell>
                <TableCell className="max-w-64 truncate">{t.title}</TableCell>
                <TableCell muted>{t.customer}</TableCell>
                <TableCell muted>{t.business_id ?? '—'}</TableCell>
                <TableCell muted>{t.mobile_number ?? '—'}</TableCell>
                <TableCell muted>{t.doctor_name ?? '—'}</TableCell>
                <TableCell muted>{t.category_name}</TableCell>
                <TableCell muted>{t.team_name}</TableCell>
                <TableCell muted>{t.owner_name ?? 'Unassigned'}</TableCell>
                <TableCell>
                  <PriorityBadge priority={t.priority} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  <SlaBadge breached={t.sla_breached} remainingSeconds={t.sla_remaining_seconds} />
                </TableCell>
                <TableCell muted className="tabular-nums">{formatDuration(t.age_seconds)}</TableCell>
                <TableCell muted>{formatDateTime(t.updated_at)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
