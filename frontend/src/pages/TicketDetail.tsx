import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/StatusPriorityBadges'
import { TagPicker } from '@/components/TagPicker'
import {
  useAssignTicket,
  useChangePriority,
  useChangeStatus,
  useChangeTeam,
  useResolveTicket,
  useTags,
  useTeams,
  useTicket,
  useTicketTimeline,
  useUpdateTicketTags,
  useUsers,
} from '@/hooks/useApi'
import { ApiError } from '@/lib/api'
import { formatDateTime, formatDuration } from '@/lib/format'
import type { TicketPriority, TicketStatus } from '@/types/api'

function errorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  try {
    return JSON.parse(error.message).detail ?? error.message
  } catch {
    return error.message
  }
}

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

export function TicketDetail() {
  const { id } = useParams()
  const ticketId = Number(id)
  const { data: ticket } = useTicket(ticketId)
  const { data: timeline } = useTicketTimeline(ticketId)
  const { data: users } = useUsers()
  const { data: teams } = useTeams()
  const { data: activeTags } = useTags(false)

  const assign = useAssignTicket(ticketId)
  const changeTeam = useChangeTeam(ticketId)
  const changeStatus = useChangeStatus(ticketId)
  const changePriority = useChangePriority(ticketId)
  const resolve = useResolveTicket(ticketId)
  const updateTags = useUpdateTicketTags(ticketId)

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
                  <SlaBadge breached={ticket.sla_breached} remainingSeconds={ticket.sla_remaining_seconds} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="whitespace-pre-wrap text-foreground">{ticket.description}</p>
              {ticket.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ticket.tags.map((tag) => (
                    <Badge key={tag.id} variant="accent">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                <Info label="Customer" value={ticket.customer} />
                <Info label="Business ID" value={ticket.business_id ?? '—'} />
                <Info label="Mobile Number" value={ticket.mobile_number ?? '—'} />
                <Info label="Doctor Name" value={ticket.doctor_name ?? '—'} />
                <Info label="Category" value={ticket.category.name} />
                <Info label="Team" value={ticket.team.name} />
                <Info label="Assignee" value={ticket.owner?.name ?? 'Unassigned'} />
                <Info label="Support Owner" value={ticket.support_assignee?.name ?? '—'} />
                <Info label="SLA" value={`${ticket.sla_hours}h — due ${formatDateTime(ticket.sla_due_at)}`} />
                <Info
                  label={ticket.sla_breached ? 'SLA breached by' : 'SLA remaining'}
                  value={ticket.sla_remaining_seconds !== null ? formatDuration(Math.abs(ticket.sla_remaining_seconds)) : '—'}
                />
                <Info label="Created" value={formatDateTime(ticket.created_at)} />
                <Info label="Created by" value={ticket.created_by.name} />
                <Info label="First response" value={ticket.first_response_at ? formatDateTime(ticket.first_response_at) : '—'} />
                <Info label="Resolved" value={ticket.resolved_at ? formatDateTime(ticket.resolved_at) : '—'} />
                {ticket.custom_field_values.map((field) => (
                  <Info key={field.field_definition_id} label={field.label} value={field.value} />
                ))}
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
            <ActionField label="Assign" error={errorMessage(assign.error)}>
              <Select
                value={ticket.owner?.id?.toString() ?? '__unassigned'}
                onValueChange={(v) => assign.mutate(v === '__unassigned' ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned">Unassigned</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ActionField>

            <ActionField label="Team" error={errorMessage(changeTeam.error)}>
              <Select value={ticket.team.id.toString()} onValueChange={(v) => changeTeam.mutate(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(teams ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
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

            <ActionField label="Tags">
              <TagPicker
                tags={activeTags ?? []}
                selectedIds={ticket.tags.map((t) => t.id)}
                onChange={(ids) => updateTags.mutate(ids)}
              />
            </ActionField>
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

function ActionField({
  label,
  error,
  children,
}: {
  label: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
