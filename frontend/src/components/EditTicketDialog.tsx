import { lazy, Suspense, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Ticket } from '@/types/api'

// The form is its own chunk, fetched when the dialog first opens.
const EditTicketForm = lazy(() => import('@/components/EditTicketForm').then((m) => ({ default: m.EditTicketForm })))

export function EditTicketDialog({ ticket }: { ticket: Ticket }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil data-icon="inline-start" /> Edit
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit ticket #{ticket.ticket_number}</DialogTitle>
          <DialogDescription>Changes are saved to the timeline and update the Slack message.</DialogDescription>
        </DialogHeader>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <EditTicketForm ticket={ticket} onSaved={() => setOpen(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}
