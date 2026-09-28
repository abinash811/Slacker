import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Class recipes shared by several ui/ primitives. Kept out of the component
// files so those only export components (fast refresh).

export const buttonVariants = cva(
  [
    'focus-ring inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium',
    'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-standard',
    'active:not-disabled:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-muted data-popup-open:bg-muted',
        secondary: 'bg-muted text-foreground hover:bg-muted/70',
        ghost: 'text-foreground hover:bg-muted data-popup-open:bg-muted',
        destructive: 'bg-danger text-danger-foreground hover:bg-danger/90',
        'destructive-ghost': 'text-danger hover:bg-danger-bg',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 px-2.5 text-xs',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

/** Shared by every text-like control: border, focus, invalid, disabled states. */
export const controlClasses = cn(
  'w-full rounded-md border border-input bg-background text-sm text-foreground',
  'transition-[border-color,box-shadow] duration-150 ease-standard',
  'placeholder:text-muted-foreground',
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20',
  'aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
)

export const overlayClasses =
  'fixed inset-0 z-50 bg-overlay duration-150 ease-standard data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'

export const modalClasses = cn(
  'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto',
  'rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-dialog outline-none',
  'duration-150 ease-standard data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
)
