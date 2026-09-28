import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Indeterminate progress for a single action (a saving button, a small panel). Use Skeleton for page/list loading. */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return <Loader2 role="status" aria-label={label} className={cn('size-4 animate-spin', className)} />
}
