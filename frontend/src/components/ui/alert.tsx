import * as React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const TONE: Record<AlertTone, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'border-border bg-muted/40 [&>svg]:text-primary' },
  success: { icon: CheckCircle2, classes: 'border-success/30 bg-success-bg [&>svg]:text-success' },
  warning: { icon: AlertTriangle, classes: 'border-warning/30 bg-warning-bg [&>svg]:text-warning' },
  danger: { icon: AlertCircle, classes: 'border-danger/30 bg-danger-bg [&>svg]:text-danger' },
}

/**
 * Inline, persistent message inside a page, card, or dialog — e.g. a failed
 * save inside a form. For transient feedback use `toast`; for a whole
 * section that failed to load use `ErrorState`.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  const Icon = TONE[tone].icon
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm', TONE[tone].classes, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium text-foreground">{title}</p>
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
      {action}
    </div>
  )
}
