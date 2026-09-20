import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/StatusPriorityBadges'
import {
  useAssignTicket,
  useChangePriority,
  useChangeStatus,
  useResolveTicket,
  useTicket,
  useTicketTimeline,
  useUsers,
} from '@/hooks/useApi'
import { formatDateTime, formatDuration } from '@/lib/format'
import type { TicketPriority, TicketStatus } from '@/types/api'

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

export function TicketDetail() {
  const { id } = useParams()
  const ticketId = Number(id)
  const { data: ticket } = useTicket(ticketId)
  const { data: timeline } = useTicketTimeline(ticketId)
  const { data: users } = useUsers()

  const assign = useAssignTicket(ticketId)
  const changeStatus = useChangeStatus(ticketId)
  const changePriority = useChangePriority(ticketId)
  const resolve = useResolveTicket(ticketId)

  if (!ticket) return null

  return (
    <div className="flex flex-col gap-4">
      <Link to="/tickets" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to tickets
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">
                  #{ticket.ticket_number} — {ticket.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                  <SlaBadge breached={ticket.sla_breached} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="whitespace-pre-wrap text-foreground">{ticket.description}</p>
              <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                <Info label="Customer" value={ticket.customer} />
                <Info label="Category" value={ticket.category.name} />
                <Info label="Team" value={ticket.team.name} />
                <Info label="Owner" value={ticket.owner?.name ?? 'Unassigned'} />
                <Info label="SLA" value={`${ticket.sla_policy.duration_hours}h — due ${formatDateTime(ticket.sla_due_at)}`} />
                <Info
                  label="SLA remaining"
                  value={ticket.sla_remaining_seconds !== null ? formatDuration(ticket.sla_remaining_seconds) : '—'}
                />
                <Info label="Created" value={formatDateTime(ticket.created_at)} />
                <Info label="Created by" value={ticket.created_by.name} />
                <Info label="First response" value={ticket.first_response_at ? formatDateTime(ticket.first_response_at) : '—'} />
                <Info label="Resolved" value={ticket.resolved_at ? formatDateTime(ticket.resolved_at) : '—'} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {(timeline ?? []).map((event, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-32 shrink-0 text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</span>
                    <span>
                      {event.description}
                      {event.actor_name && <span className="text-muted-foreground"> — {event.actor_name}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ActionField label="Assign">
              <Select value={ticket.owner?.id?.toString()} onValueChange={(v) => assign.mutate(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ActionField>

            <ActionField label="Status">
              <Select value={ticket.status} onValueChange={(v) => changeStatus.mutate(v as TicketStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ActionField>

            <ActionField label="Priority">
              <Select value={ticket.priority} onValueChange={(v) => changePriority.mutate(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ActionField>

            <Button
              disabled={ticket.status === 'resolved' || ticket.status === 'closed' || resolve.isPending}
              onClick={() => resolve.mutate()}
            >
              Resolve ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function ActionField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
