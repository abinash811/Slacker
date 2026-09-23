import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/format'
import type { TicketPriority, TicketStatus } from '@/types/api'

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}

const STATUS_VARIANT: Record<TicketStatus, 'neutral' | 'accent' | 'warning' | 'success'> = {
  open: 'accent',
  in_progress: 'accent',
  pending: 'warning',
  resolved: 'success',
  closed: 'neutral',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}

const PRIORITY_VARIANT: Record<TicketPriority, 'neutral' | 'accent' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'accent',
  high: 'warning',
  urgent: 'danger',
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority[0].toUpperCase() + priority.slice(1)}</Badge>
}

export function SlaBadge({ breached, remainingSeconds }: { breached: boolean; remainingSeconds?: number | null }) {
  if (!breached) return <Badge variant="success">On track</Badge>
  const suffix = remainingSeconds != null ? ` by ${formatDuration(Math.abs(remainingSeconds))}` : ''
  return <Badge variant="danger">Breached{suffix}</Badge>
}
