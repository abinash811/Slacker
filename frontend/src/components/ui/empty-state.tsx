import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * What a list/panel shows when it has nothing in it. Copy rules
 * (docs/DESIGN_SYSTEM.md → Writing): title says what's empty, description
 * says why or what to do, action offers the next step.
 *
 * variant: `plain` (inside a card/table), `bordered` (standalone on a page).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'plain',
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: 'plain' | 'bordered'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-4 text-center',
        variant === 'plain' && 'py-6',
        variant === 'bordered' && 'rounded-lg border border-dashed border-border py-10',
        className,
      )}
    >
      {Icon && (
        <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
