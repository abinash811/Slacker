import * as React from 'react'
import { Label } from '@/components/ui/label'
import { SectionLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * Label + control + optional hint/error. Every form control goes in one.
 * Pass the control's `id` as `htmlFor`, and set `aria-invalid` on the
 * control when `error` is set.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  error?: string | null
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  const messageId = htmlFor ? `${htmlFor}-message` : undefined
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required === false && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Groups related fields under a small uppercase label, separated from the previous group by a rule. */
export function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4 first:border-0 first:pt-0">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  )
}
