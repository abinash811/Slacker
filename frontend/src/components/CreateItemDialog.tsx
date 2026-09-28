import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { describeError } from '@/lib/api'

/**
 * The standard "+ New" flow for adding an item to a list: a small dialog
 * with the fields, Cancel/Create footer, a pending state, and the server
 * error shown inline so the user can fix and retry without retyping.
 */
export function CreateItemDialog({
  noun,
  description,
  triggerLabel = 'New',
  triggerVariant = 'default',
  submitLabel,
  canSubmit,
  onSubmit,
  onReset,
  children,
}: {
  /** Lowercase item name, e.g. "tag" → title "New tag", button "Create tag". */
  noun: string
  description: string
  triggerLabel?: string
  triggerVariant?: 'default' | 'ghost' | 'outline'
  submitLabel?: string
  canSubmit: boolean
  onSubmit: () => Promise<unknown>
  onReset: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setError(null)
      onReset()
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || pending) return
    setPending(true)
    setError(null)
    try {
      await onSubmit()
      handleOpenChange(false)
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} />}>
        <Plus /> {triggerLabel}
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New {noun}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          {children}
          {error != null && (
            <Alert tone="danger" title={`Couldn't create ${noun}`}>
              {describeError(error)}
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={!canSubmit} loading={pending}>
              {submitLabel ?? `Create ${noun}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
