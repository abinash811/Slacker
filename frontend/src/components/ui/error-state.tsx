import { AlertCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Replaces a page, card, or list whose data failed to load. Always offers Retry when possible. */
export function ErrorState({
  title = "Couldn't load this",
  error,
  onRetry,
  retrying,
  variant = 'plain',
  className,
}: {
  title?: string
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
  variant?: 'plain' | 'bordered'
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-4 text-center',
        variant === 'plain' && 'py-6',
        variant === 'bordered' && 'rounded-lg border border-danger/30 bg-danger-bg/40 py-10',
        className,
      )}
    >
      <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-danger-bg text-danger">
        <AlertCircle className="size-4" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{describeError(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry} loading={retrying}>
          {!retrying && <RotateCw />} Try again
        </Button>
      )}
    </div>
  )
}
