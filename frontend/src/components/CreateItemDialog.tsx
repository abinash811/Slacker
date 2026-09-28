import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/patterns/buttons'
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
 * around a `useZodForm` form, with Cancel/Create footer, a pending state,
 * field errors from the schema, and the server error shown inline so the
 * user can fix and retry without retyping. Resets when closed.
 */
export function CreateItemDialog<TInput extends FieldValues, TOutput extends FieldValues>({
  noun,
  description,
  form,
  onSubmit,
  triggerLabel = 'New',
  triggerVariant = 'default',
  submitLabel,
  children,
}: {
  /** Lowercase item name, e.g. "tag" → title "New tag", button "Create tag". */
  noun: string
  description: string
  form: UseFormReturn<TInput, unknown, TOutput>
  onSubmit: (values: TOutput) => Promise<unknown>
  triggerLabel?: string
  triggerVariant?: 'default' | 'ghost' | 'outline'
  submitLabel?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<unknown>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setError(null)
      form.reset()
    }
  }

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await onSubmit(values)
      handleOpenChange(false)
    } catch (err) {
      setError(err)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} />}>
        <Plus data-icon="inline-start" /> {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New {noun}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          {children}
          {error != null && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Couldn't create {noun}</AlertTitle>
              <AlertDescription>{describeError(error)}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <LoadingButton type="submit" loading={form.formState.isSubmitting}>
              {submitLabel ?? `Create ${noun}`}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
