import { Link } from 'react-router-dom'
import { ListTree } from 'lucide-react'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { StatusBadge } from '@/components/StatusPriorityBadges'
import { EmptyState } from '@/components/patterns/states'
import { Caption } from '@/components/patterns/typography'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import type { Ticket } from '@/types/api'

const isDone = (status: string) => status === 'resolved' || status === 'closed'

/** A main ticket's sub-issues, with progress and a way to add one. */
export function SubIssuesCard({ ticket }: { ticket: Ticket }) {
  const subs = ticket.sub_issues
  const done = subs.filter((s) => isDone(s.status)).length
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">Sub-issues</CardTitle>
        <CardAction>
          <CreateTicketDialog parent={ticket} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {subs.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title="No sub-issues"
            description="Split this into parts that each have their own owner, Slack thread and SLA."
          />
        ) : (
          <>
            <Progress value={(done / subs.length) * 100}>
              <ProgressLabel className="font-normal text-muted-foreground tabular-nums">
                {done} of {subs.length} done
              </ProgressLabel>
            </Progress>
            <ul className="flex flex-col divide-y">
              {subs.map((sub) => (
                <li key={sub.id} className="flex items-center gap-3 py-2 text-sm">
                  <Link to={`/tickets/${sub.id}`} className="focus-ring shrink-0 rounded-sm font-medium hover:underline">
                    #{sub.ticket_number}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">{sub.title}</span>
                  <Caption className="shrink-0">{sub.owner?.name ?? 'Unassigned'}</Caption>
                  <StatusBadge status={sub.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
