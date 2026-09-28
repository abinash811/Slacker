import * as React from 'react'
import { cn } from '@/lib/utils'

/** Top-level page title (h1) + optional description + right-aligned actions. Exactly one per page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Section title (h2) inside a page, e.g. each Settings tab. Owns its bottom spacing; put buttons in `actions`. */
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Small uppercase label above a group: form sections, sidebar lists, panel headings. */
export function SectionLabel({
  as: Component = 'h3',
  className,
  ...props
}: { as?: 'h2' | 'h3' | 'h4' | 'span' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Component
      className={cn(
        'flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  )
}

/** Secondary body text (subtitles, helper copy). */
export function Muted({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

/** Smallest text: meta info, timestamps, read-only field labels. Pass `as="dt"` inside a `<dl>`. */
export function Caption({
  as: Component = 'span',
  className,
  ...props
}: { as?: 'span' | 'dt' | 'p' } & React.HTMLAttributes<HTMLElement>) {
  return <Component className={cn('text-xs text-muted-foreground', className)} {...props} />
}
