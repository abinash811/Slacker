import { lazy, Suspense, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Ticket } from '@/types/api'

// The form (react-hook-form + zod) is its own chunk, fetched when the dialog first opens.
const CreateTicketForm = lazy(() => import('@/components/CreateTicketForm').then((m) => ({ default: m.CreateTicketForm })))

/**
 * Create a ticket, or with `parent`, a sub-issue of that ticket (its own
 * ticket and Slack thread, linked to the parent).
 */
export function CreateTicketDialog({ parent }: { parent?: Ticket }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={parent ? <Button variant="outline" size="sm" /> : <Button />}>
        <Plus data-icon="inline-start" /> {parent ? 'Add sub-issue' : 'Create ticket'}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{parent ? `Add a sub-issue to #${parent.ticket_number}` : 'Create ticket'}</DialogTitle>
          <DialogDescription>
            {parent
              ? 'It gets its own Slack message and thread, and a link is posted in the main ticket’s thread.'
              : 'One issue per ticket. It’s posted to the team’s Slack channel as soon as you create it.'}
          </DialogDescription>
        </DialogHeader>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <CreateTicketForm parent={parent} onCreated={() => setOpen(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}
