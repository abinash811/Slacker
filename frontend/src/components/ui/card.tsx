import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-card', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-4', className)} {...props} />
}

/** Card/section title. `tone="strong"` for a card that is the page's main subject; `tone="danger"` for alert cards. */
export function CardTitle({
  className,
  tone = 'default',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { tone?: 'default' | 'strong' | 'danger' }) {
  return (
    <h3
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-muted-foreground [&_svg]:size-4',
        tone === 'strong' && 'text-base font-semibold text-foreground',
        tone === 'danger' && 'font-semibold text-danger',
        className,
      )}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />
}
