import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { formatDuration } from '@/lib/format'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/tickets'
import type { TicketPriority, TicketStatus } from '@/types/api'

const STATUS_VARIANT: Record<TicketStatus, BadgeVariant> = {
  open: 'accent',
  in_progress: 'accent',
  pending: 'warning',
  resolved: 'success',
  closed: 'neutral',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}

const PRIORITY_VARIANT: Record<TicketPriority, BadgeVariant> = {
  low: 'neutral',
  medium: 'accent',
  high: 'warning',
  urgent: 'danger',
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{PRIORITY_LABEL[priority]}</Badge>
}

/** SLA state: always icon + text + color, never color alone. */
export function SlaBadge({ breached, remainingSeconds }: { breached: boolean; remainingSeconds?: number | null }) {
  if (!breached) {
    return (
      <Badge variant="success">
        <CheckCircle2 aria-hidden /> On track
      </Badge>
    )
  }
  const suffix = remainingSeconds != null ? ` by ${formatDuration(Math.abs(remainingSeconds))}` : ''
  return (
    <Badge variant="danger">
      <AlertTriangle aria-hidden /> Breached{suffix}
    </Badge>
  )
}
