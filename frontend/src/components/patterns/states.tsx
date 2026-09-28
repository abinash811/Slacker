import * as React from 'react'
import { AlertCircle, RotateCw, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { describeError } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * What a list or panel shows when it has nothing in it (shadcn Empty).
 * Title says what's empty; description says why or what to do; action offers the next step.
 * `bordered` for standalone use on a page; plain inside a card or table.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bordered,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  bordered?: boolean
  className?: string
}) {
  return (
    <Empty className={cn(bordered && 'border', className)}>
      <EmptyHeader>
        {Icon && (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

/** Replaces a page, card, or list whose data failed to load (shadcn Empty, destructive tone). */
export function ErrorState({
  title = "Couldn't load this",
  error,
  onRetry,
  retrying,
  bordered,
  className,
}: {
  title?: string
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
  bordered?: boolean
  className?: string
}) {
  return (
    <Empty role="alert" className={cn(bordered && 'border border-destructive/30 bg-destructive/5', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <AlertCircle />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{describeError(error)}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
            {retrying ? <Spinner data-icon="inline-start" /> : <RotateCw data-icon="inline-start" />}
            Try again
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
