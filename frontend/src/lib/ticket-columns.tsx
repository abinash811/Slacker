import { Link } from 'react-router-dom'
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/StatusPriorityBadges'
import { Caption } from '@/components/patterns/typography'
import { columnHelper } from '@/lib/data-table'
import { formatDateTime, formatDuration } from '@/lib/format'
import type { TicketListItem } from '@/types/api'

// The Tickets table's columns. Kept out of pages/Tickets.tsx so that file
// only exports components (React Fast Refresh needs that).
const col = columnHelper<TicketListItem>()
const dash = (v: string | null) => v ?? '—'

// Every column sorts on the server. Column ids are the backend's sort keys
// (SORTABLE_COLUMNS in ticket_service.py); ticket-columns.test.ts checks every
// column id against the API schema, so a mismatch fails the tests.
export const TICKET_COLUMNS = col.columns([
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
  col.accessor('title', {
    header: 'Title',
    meta: { className: 'max-w-64 truncate' },
    cell: (i) => {
      const parent = i.row.original.parent_ticket_number
      return parent ? (
        <div className="flex flex-col">
          <span className="truncate">{i.getValue()}</span>
          <Caption>Sub-issue of #{parent}</Caption>
        </div>
      ) : (
        i.getValue()
      )
    },
  }),
  col.accessor('customer', { header: 'Business name', meta: { muted: true } }),
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
  col.accessor('created_at', {
    header: 'Created',
    meta: { muted: true },
    // Date it was raised, with how long it has been open underneath.
    cell: (i) => (
      <div className="flex flex-col">
        <span>{formatDateTime(i.getValue())}</span>
        <Caption className="tabular-nums">{formatDuration(i.row.original.age_seconds)} ago</Caption>
      </div>
    ),
  }),
  col.accessor('updated_at', { header: 'Updated', meta: { muted: true }, cell: (i) => formatDateTime(i.getValue()) }),
])
