import { lazy, Suspense, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

// The form (react-hook-form + zod) is its own chunk, fetched when the dialog first opens.
const CreateTicketForm = lazy(() => import('@/components/CreateTicketForm').then((m) => ({ default: m.CreateTicketForm })))

export function CreateTicketDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" /> Create ticket
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create ticket</DialogTitle>
          <DialogDescription>It's posted to the team's Slack channel as soon as you create it.</DialogDescription>
        </DialogHeader>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <CreateTicketForm onCreated={() => setOpen(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}
