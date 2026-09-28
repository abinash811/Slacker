import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Bordered, horizontally scrollable table. All data tables use these parts — never a raw <table>. */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b border-border bg-muted/50" {...props} />
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="[&>tr:last-child]:border-0" {...props} />
}

/** `interactive` for rows that open something; `tone="danger"` flags a row needing attention (never color alone — pair with a badge/icon in a cell). */
export function TableRow({
  className,
  interactive,
  tone,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean; tone?: 'danger' }) {
  return (
    <tr
      className={cn(
        'border-b border-border border-l-2 border-l-transparent transition-colors duration-150 ease-standard',
        interactive && 'cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50',
        tone === 'danger' && 'border-l-danger bg-danger-bg/30',
        tone === 'danger' && interactive && 'hover:bg-danger-bg/60 focus-within:bg-danger-bg/60',
        className,
      )}
      {...props}
    />
  )
}

export type SortDirection = 'asc' | 'desc'

export function TableHead({
  className,
  children,
  sort,
  onSort,
  align = 'left',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  /** Current sort on this column (false = sortable, not active). Omit for non-sortable columns. */
  sort?: SortDirection | false
  onSort?: () => void
  align?: 'left' | 'right'
}) {
  const sortable = sort !== undefined && onSort
  const SortIcon = sort === 'asc' ? ArrowUp : sort === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <th
      scope="col"
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
      className={cn(
        'h-9 whitespace-nowrap px-3 text-xs font-medium text-muted-foreground',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'focus-ring -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:text-foreground',
            sort && 'text-foreground',
          )}
        >
          {children}
          <SortIcon className={cn('size-3', !sort && 'opacity-40')} aria-hidden />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export function TableCell({
  className,
  muted,
  align = 'left',
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { muted?: boolean; align?: 'left' | 'right' }) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-3 py-2.5 align-middle',
        muted && 'text-muted-foreground',
        align === 'right' && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

/** Full-width row for the table's empty or error state. */
export function TableMessage({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan}>{children}</td>
    </tr>
  )
}

/** Placeholder rows while the table's first page loads. */
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-3 py-3">
              <Skeleton className={cn('h-4', c === 0 ? 'w-12' : 'w-full max-w-32')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
