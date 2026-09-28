import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

// shadcn Badge variants cover neutral (secondary) and danger (destructive);
// info/success/warning add the brand/status tokens on top of `secondary`.
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: '',
  info: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: '',
}

/** Status pill. Always pair color with a text label (and an icon for SLA state). */
export function ToneBadge({ tone = 'neutral', className, ...props }: React.ComponentProps<typeof Badge> & { tone?: BadgeTone }) {
  return (
    <Badge variant={tone === 'danger' ? 'destructive' : 'secondary'} className={cn(TONE_CLASSES[tone], className)} {...props} />
  )
}
