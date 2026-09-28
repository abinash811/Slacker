import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Footer for a paged list: range summary + previous/next. `pageIndex` is 0-based. */
export function Pagination({
  pageIndex,
  pageSize,
  rowCount,
  onPageChange,
  disabled,
  className,
}: {
  pageIndex: number
  pageSize: number
  rowCount: number
  onPageChange: (pageIndex: number) => void
  disabled?: boolean
  className?: string
}) {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize))
  const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(rowCount, (pageIndex + 1) * pageSize)

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-4 text-sm', className)}>
      <p className="text-muted-foreground tabular-nums" aria-live="polite">
        Showing {from}–{to} of {rowCount}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground tabular-nums">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={disabled || pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={disabled || pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
