import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, SearchX } from 'lucide-react'
import { FilterBar } from '@/components/FilterBar'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/StatusPriorityBadges'
import { Button } from '@/components/ui/button'
import { DataTable, type PaginationState, type SortingState } from '@/components/patterns/data-table'
import { EmptyState } from '@/components/patterns/states'
import { PageHeader } from '@/components/patterns/typography'
import { useTickets } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { columnHelper } from '@/lib/data-table'
import { formatDateTime, formatDuration } from '@/lib/format'
import { EMPTY_FILTERS } from '@/lib/tickets'
import type { TicketListItem, TicketSortColumn } from '@/types/api'

const PAGE_SIZE = 50
const EMPTY_ROWS: TicketListItem[] = []
const DEFAULT_SORT: SortingState = [{ id: 'created_at', desc: true }]

const col = columnHelper<TicketListItem>()
const dash = (v: string | null) => v ?? '—'

// Every column sorts on the server. Column ids are the backend's sort keys
// (SORTABLE_COLUMNS in ticket_service.py); Tickets.test.ts checks every
// column id against the API schema, so a mismatch fails the tests.
export const COLUMNS = col.columns([
  col.accessor('ticket_number', {
    header: 'Ticket',
    meta: { className: 'font-medium' },
    cell: (info) => (
      // The real link: keyboard and screen-reader path into the ticket; the row click is a mouse shortcut.
      <Link
        to={`/tickets/${info.row.original.id}`}
        className="focus-ring rounded-sm hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        #{info.getValue()}
      </Link>
    ),
  }),
  col.accessor('title', { header: 'Title', meta: { className: 'max-w-64 truncate' } }),
  col.accessor('customer', { header: 'Customer', meta: { muted: true } }),
  col.accessor('business_id', { header: 'Business ID', meta: { muted: true }, cell: (i) => dash(i.getValue()) }),
  col.accessor('mobile_number', { header: 'Mobile', meta: { muted: true }, cell: (i) => dash(i.getValue()) }),
  col.accessor('doctor_name', { header: 'Doctor', meta: { muted: true }, cell: (i) => dash(i.getValue()) }),
  col.accessor('category_name', { header: 'Category', meta: { muted: true } }),
  col.accessor('team_name', { header: 'Team', meta: { muted: true } }),
  col.accessor('owner_name', { header: 'Pending on', meta: { muted: true }, cell: (i) => i.getValue() ?? 'Unassigned' }),
  col.accessor('priority', { header: 'Priority', cell: (i) => <PriorityBadge priority={i.getValue()} /> }),
  col.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  col.accessor('sla_breached', {
    id: 'sla_due_at',
    header: 'SLA',
    cell: (i) => <SlaBadge breached={i.getValue()} remainingSeconds={i.row.original.sla_remaining_seconds} />,
  }),
  col.accessor('age_seconds', {
    id: 'created_at',
    header: 'Age',
    // Sorted by created_at: newest first (desc) means youngest age first.
    meta: { muted: true, className: 'tabular-nums', invertSortIndicator: true },
    cell: (i) => formatDuration(i.getValue()),
  }),
  col.accessor('updated_at', { header: 'Updated', meta: { muted: true }, cell: (i) => formatDateTime(i.getValue()) }),
])

export function Tickets() {
  const [filters, setFilters] = useTicketFilters()
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORT)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

  // Back to page 1 whenever the result set changes shape.
  const resultKey = JSON.stringify([filters, sorting])
  const [lastResultKey, setLastResultKey] = useState(resultKey)
  if (resultKey !== lastResultKey) {
    setLastResultKey(resultKey)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const tickets = useTickets(filters, {
    sortBy: sorting[0]?.id as TicketSortColumn | undefined,
    sortDir: sorting[0]?.desc ? 'desc' : 'asc',
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  })
  const navigate = useNavigate()
  const hasFilters = Object.values(filters).some((v) => v !== undefined)
  const total = tickets.data?.total

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tickets"
        description={total !== undefined ? `${total} ${total === 1 ? 'ticket' : 'tickets'}` : ' '}
        actions={<CreateTicketDialog />}
      />

      <FilterBar filters={filters} onChange={setFilters} />

      <DataTable
        columns={COLUMNS}
        data={tickets.data?.items ?? EMPTY_ROWS}
        getRowId={(t) => String(t.id)}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        rowCount={total}
        isLoading={tickets.isPending}
        error={tickets.isError ? tickets.error : undefined}
        onRetry={() => tickets.refetch()}
        retrying={tickets.isFetching}
        errorTitle="Couldn't load tickets"
        onRowClick={(t) => navigate(`/tickets/${t.id}`)}
        rowTone={(t) => (t.sla_breached ? 'danger' : undefined)}
        empty={
          hasFilters ? (
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
          )
        }
      />
    </div>
  )
}
