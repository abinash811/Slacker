import { useParams } from 'react-router-dom'
import { ArrowLeft, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ButtonLink, LoadingButton } from '@/components/patterns/buttons'
import { OptionSelect } from '@/components/patterns/option-select'
import { ToneBadge } from '@/components/patterns/tone-badge'
import { FormField } from '@/components/patterns/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/patterns/states'
import { ErrorState } from '@/components/patterns/states'
import { Caption, PageHeader } from '@/components/patterns/typography'
import { PriorityBadge, StatusBadge, SlaBadge } from '@/components/StatusPriorityBadges'
import { TagPicker } from '@/components/TagPicker'
import { NotFound } from '@/pages/NotFound'
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
import { PRIORITY_OPTIONS, STATUS_OPTIONS, toOptions } from '@/lib/tickets'
import type { TicketPriority, TicketStatus } from '@/types/api'

export function TicketDetail() {
  const { id } = useParams()
  const ticketId = Number(id)
  const validId = Number.isInteger(ticketId) && ticketId > 0
  const ticketQuery = useTicket(validId ? ticketId : undefined)
  const timeline = useTicketTimeline(validId ? ticketId : undefined)
  const { data: users } = useUsers()
  const { data: teams } = useTeams()
  const { data: activeTags } = useTags(false)

  const assign = useAssignTicket(ticketId)
  const changeTeam = useChangeTeam(ticketId)
  const changeStatus = useChangeStatus(ticketId)
  const changePriority = useChangePriority(ticketId)
  const resolve = useResolveTicket(ticketId)
  const updateTags = useUpdateTicketTags(ticketId)

  const notFound = !validId || (ticketQuery.error instanceof ApiError && ticketQuery.error.status === 404)
  if (notFound) {
    return <NotFound title="Ticket not found" description="It may have been deleted, or the link is wrong." />
  }
  if (ticketQuery.isError) {
    return (
      <ErrorState
        bordered
        title="Couldn't load this ticket"
        error={ticketQuery.error}
        onRetry={() => ticketQuery.refetch()}
        retrying={ticketQuery.isFetching}
      />
    )
  }
  const ticket = ticketQuery.data
  if (!ticket) return <TicketDetailSkeleton />

  const closed = ticket.status === 'resolved' || ticket.status === 'closed'

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <PageHeader
        title={`#${ticket.ticket_number} — ${ticket.title}`}
        description={`Opened ${formatDateTime(ticket.created_at)} by ${ticket.created_by.name}`}
        actions={
          <>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            <SlaBadge breached={ticket.sla_breached} remainingSeconds={ticket.sla_remaining_seconds} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="whitespace-pre-wrap text-foreground">{ticket.description}</p>
              {ticket.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ticket.tags.map((tag) => (
                    <ToneBadge key={tag.id} tone="info">
                      {tag.name}
                    </ToneBadge>
                  ))}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                <Info label="Customer" value={ticket.customer} />
                <Info label="Business ID" value={ticket.business_id ?? '—'} />
                <Info label="Mobile number" value={ticket.mobile_number ?? '—'} />
                <Info label="Doctor name" value={ticket.doctor_name ?? '—'} />
                <Info label="Category" value={ticket.category.name} />
                <Info label="Team" value={ticket.team.name} />
                <Info label="Assignee" value={ticket.owner?.name ?? 'Unassigned'} />
                <Info label="Support owner" value={ticket.support_assignee?.name ?? '—'} />
                <Info label="SLA" value={`${ticket.sla_hours}h — due ${formatDateTime(ticket.sla_due_at)}`} />
                <Info
                  label={ticket.sla_breached ? 'SLA breached by' : 'SLA remaining'}
                  value={ticket.sla_remaining_seconds !== null ? formatDuration(Math.abs(ticket.sla_remaining_seconds)) : '—'}
                />
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
              <CardTitle className="text-muted-foreground">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.isPending ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : timeline.isError ? (
                <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} retrying={timeline.isFetching} />
              ) : timeline.data.length === 0 ? (
                <EmptyState icon={History} title="No activity yet" description="Changes to this ticket will be listed here." />
              ) : (
                <ol className="flex flex-col gap-3">
                  {timeline.data.map((event, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <Caption className="w-32 shrink-0">{formatDateTime(event.timestamp)}</Caption>
                      <span>
                        {event.description}
                        {event.actor_name && <span className="text-muted-foreground"> — {event.actor_name}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField label="Assignee" htmlFor="ticket-assignee">
              <OptionSelect
                id="ticket-assignee"
                value={ticket.owner?.id?.toString() ?? null}
                onValueChange={(v) => assign.mutate(v ? Number(v) : null)}
                disabled={assign.isPending}
                emptyLabel="Unassigned"
                placeholder="Unassigned"
                options={toOptions(users)}
              />
            </FormField>

            <FormField label="Team" htmlFor="ticket-team">
              <OptionSelect
                id="ticket-team"
                value={ticket.team.id.toString()}
                onValueChange={(v) => v && changeTeam.mutate(Number(v))}
                disabled={changeTeam.isPending}
                options={toOptions(teams)}
              />
            </FormField>

            <FormField label="Status" htmlFor="ticket-status">
              <OptionSelect
                id="ticket-status"
                value={ticket.status}
                onValueChange={(v) => v && changeStatus.mutate(v as TicketStatus)}
                disabled={changeStatus.isPending}
                options={STATUS_OPTIONS}
              />
            </FormField>

            <FormField label="Priority" htmlFor="ticket-priority">
              <OptionSelect
                id="ticket-priority"
                value={ticket.priority}
                onValueChange={(v) => v && changePriority.mutate(v as TicketPriority)}
                disabled={changePriority.isPending}
                options={PRIORITY_OPTIONS}
              />
            </FormField>

            <FormField label="Tags">
              <TagPicker
                tags={activeTags ?? []}
                selectedIds={ticket.tags.map((t) => t.id)}
                onChange={(ids) => updateTags.mutate(ids)}
                disabled={updateTags.isPending}
              />
            </FormField>

            <LoadingButton disabled={closed} loading={resolve.isPending} onClick={() => resolve.mutate()}>
              {closed ? 'Resolved' : 'Resolve ticket'}
            </LoadingButton>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <ButtonLink variant="link" size="sm" className="w-fit px-0 text-muted-foreground hover:text-foreground" to="/tickets">
      <ArrowLeft data-icon="inline-start" /> Back to tickets
    </ButtonLink>
  )
}

function TicketDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading ticket">
      <BackLink />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Caption as="dt">{label}</Caption>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
