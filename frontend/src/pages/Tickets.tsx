import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { FilterBar } from '@/components/FilterBar'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { PriorityBadge, StatusBadge } from '@/components/StatusPriorityBadges'
import { useTickets } from '@/hooks/useApi'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

const COLUMNS: { key: string; label: string }[] = [
  { key: 'ticket_number', label: 'Ticket' },
  { key: 'title', label: 'Title' },
  { key: 'customer', label: 'Customer' },
  { key: 'business_id', label: 'Business ID' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'doctor_name', label: 'Doctor' },
  { key: 'category_name', label: 'Category' },
  { key: 'team_name', label: 'Team' },
  { key: 'owner_name', label: 'Owner' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'sla_breached', label: 'SLA' },
  { key: 'age_seconds', label: 'Age' },
  { key: 'updated_at', label: 'Updated' },
]

export function Tickets() {
  const [filters, setFilters] = useTicketFilters()
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const { data } = useTickets(filters, { sortBy, sortDir, pageSize: 100 })
  const navigate = useNavigate()

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} {data?.total === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        <CreateTicketDialog />
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium hover:text-foreground"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  {sortBy === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((t) => (
              <tr
                key={t.id}
                className={cn(
                  'cursor-pointer border-b border-border border-l-2 border-l-transparent last:border-0 hover:bg-muted/50',
                  t.sla_breached && 'border-l-danger bg-danger-bg/30 hover:bg-danger-bg/50',
                )}
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium">#{t.ticket_number}</td>
                <td className="max-w-64 truncate px-3 py-2">{t.title}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{t.customer}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{t.business_id ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{t.mobile_number ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{t.doctor_name ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{t.category_name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{t.team_name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{t.owner_name ?? 'Unassigned'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <StatusBadge status={t.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {t.sla_breached ? (
                    <span className="inline-flex items-center gap-1 font-medium text-danger">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Breached{t.sla_remaining_seconds != null ? ` by ${formatDuration(Math.abs(t.sla_remaining_seconds))}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> On track
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDuration(t.age_seconds)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDateTime(t.updated_at)}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No tickets match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
