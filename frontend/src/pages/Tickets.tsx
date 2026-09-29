import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, SearchX } from 'lucide-react'
import { FilterBar } from '@/components/FilterBar'
import { ViewsBar } from '@/components/ViewsBar'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { Button } from '@/components/ui/button'
import { DataTable, type PaginationState, type SortingState } from '@/components/patterns/data-table'
import { EmptyState } from '@/components/patterns/states'
import { PageHeader } from '@/components/patterns/typography'
import { useTickets } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { EMPTY_FILTERS } from '@/lib/tickets'
import { TICKET_COLUMNS } from '@/lib/ticket-columns'
import type { TicketListItem, TicketSortColumn } from '@/types/api'

const PAGE_SIZE = 50
const EMPTY_ROWS: TicketListItem[] = []
const DEFAULT_SORT: SortingState = [{ id: 'created_at', desc: true }]

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

      <ViewsBar filters={filters} onChange={setFilters} />
      <FilterBar filters={filters} onChange={setFilters} />

      <DataTable
        columns={TICKET_COLUMNS}
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
