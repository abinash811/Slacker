import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { Button } from '@/components/ui/button'
import { modalClasses, overlayClasses } from '@/components/ui/styles'
import { cn } from '@/lib/utils'

/**
 * Confirmation step for destructive or hard-to-undo actions (remove, delete,
 * archive something in use). Not for routine saves.
 *
 * <ConfirmDialog trigger={<Button variant="destructive-ghost" size="sm" />} triggerLabel="Remove"
 *   title="Remove Priya from Billing?" description="They'll lose access to…" confirmLabel="Remove" onConfirm={…} />
 */
export function ConfirmDialog({
  trigger,
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
}: {
  trigger: React.ReactElement
  triggerLabel: React.ReactNode
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => void | Promise<unknown>
}) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  async function confirm() {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // The global mutation error toast reports the failure; keep the dialog open to retry.
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AlertDialogPrimitive.Trigger render={trigger}>{triggerLabel}</AlertDialogPrimitive.Trigger>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop className={overlayClasses} />
        <AlertDialogPrimitive.Popup className={cn(modalClasses, 'max-w-sm')}>
          <div className="flex flex-col gap-1">
            <AlertDialogPrimitive.Title className="text-base font-semibold">{title}</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Close render={<Button variant="outline" />}>{cancelLabel}</AlertDialogPrimitive.Close>
            <Button variant={tone === 'danger' ? 'destructive' : 'default'} loading={pending} onClick={confirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
