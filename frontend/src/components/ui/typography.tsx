import * as React from 'react'
import { cn } from '@/lib/utils'

/** Top-level page title + optional description + optional right-aligned actions. One per page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

/** Secondary body text (subtitles, helper copy, table cell secondary values). */
export function Muted({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

/** Smallest text: field labels, meta info, table headers, timestamps. */
export function Caption({
  as: Component = 'span',
  className,
  ...props
}: { as?: 'span' | 'dt' } & React.HTMLAttributes<HTMLElement>) {
  return <Component className={cn('text-xs text-muted-foreground', className)} {...props} />
}

/**
 * Placeholder shown in place of an empty list/card.
 * `inline` = filled muted block inside a card (dashboard panels).
 * `bordered` = dashed-style bordered box (settings list pages).
 */
export function EmptyState({
  children,
  variant = 'inline',
  className,
}: {
  children: React.ReactNode
  variant?: 'inline' | 'bordered'
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-center text-sm text-muted-foreground',
        variant === 'inline' && 'rounded-md bg-muted px-3 py-4',
        variant === 'bordered' && 'rounded-lg border border-border bg-muted/20 px-3 py-8',
        className,
      )}
    >
      {children}
    </p>
  )
}
