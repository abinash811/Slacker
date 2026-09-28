import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ToneBadge, type BadgeTone } from '@/components/patterns/tone-badge'
import { formatDuration } from '@/lib/format'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/tickets'
import type { TicketPriority, TicketStatus } from '@/types/api'

const STATUS_VARIANT: Record<TicketStatus, BadgeTone> = {
  open: 'info',
  in_progress: 'info',
  pending: 'warning',
  resolved: 'success',
  closed: 'neutral',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <ToneBadge tone={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</ToneBadge>
}

const PRIORITY_VARIANT: Record<TicketPriority, BadgeTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <ToneBadge tone={PRIORITY_VARIANT[priority]}>{PRIORITY_LABEL[priority]}</ToneBadge>
}

/** SLA state: always icon + text + color, never color alone. */
export function SlaBadge({ breached, remainingSeconds }: { breached: boolean; remainingSeconds?: number | null }) {
  if (!breached) {
    return (
      <ToneBadge tone="success">
        <CheckCircle2 data-icon="inline-start" aria-hidden /> On track
      </ToneBadge>
    )
  }
  const suffix = remainingSeconds != null ? ` by ${formatDuration(Math.abs(remainingSeconds))}` : ''
  return (
    <ToneBadge tone="danger">
      <AlertTriangle data-icon="inline-start" aria-hidden /> Breached{suffix}
    </ToneBadge>
  )
}
