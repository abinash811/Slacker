import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { modalClasses, overlayClasses } from '@/components/ui/styles'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
/** Pass the trigger element via `render`, e.g. `<DialogTrigger render={<Button />}>New</DialogTrigger>`. */
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  size = 'md',
  ...props
}: DialogPrimitive.Popup.Props & { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={overlayClasses} />
      <DialogPrimitive.Popup
        className={cn(
          modalClasses,
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-2xl',
          className,
        )}
        {...props}
      >
        {children as React.ReactNode}
        <DialogPrimitive.Close
          render={<Button variant="ghost" size="icon-sm" className="absolute right-3 top-3 text-muted-foreground" />}
        >
          <X />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />
}

export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold', className)} {...props} />
}

/** One line under the title saying what the dialog does. Required for screen readers — always include one. */
export function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

/** Action row: secondary (Cancel) first, primary last, right-aligned. */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end', className)} {...props} />
}
