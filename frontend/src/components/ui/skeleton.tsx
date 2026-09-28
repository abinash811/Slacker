import { cn } from '@/lib/utils'

/** Placeholder shape shown while data loads. Match the size of what will replace it. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />
}
