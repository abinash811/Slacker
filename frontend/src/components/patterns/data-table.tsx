import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTable, type ColumnDef, type PaginationState, type RowData, type SortingState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorState } from '@/components/patterns/states'
import { dataTableFeatures, type DataTableFeatures } from '@/lib/data-table'
import { cn } from '@/lib/utils'

export type { PaginationState, SortingState }
type Dir = 'asc' | 'desc'
const flip = (d: Dir): Dir => (d === 'asc' ? 'desc' : 'asc')
const NO_SORT: SortingState = []

/**
 * shadcn's data-table pattern: TanStack Table for state, shadcn Table,
 * Button and Pagination for markup. Server-side sorting and paging; owns the
 * loading, error, and empty states. Build columns with `columnHelper<T>()`.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  rowCount,
  isLoading,
  loadingRows = 8,
  error,
  onRetry,
  retrying,
  errorTitle = "Couldn't load this list",
  empty,
  onRowClick,
  rowTone,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<DataTableFeatures, TData, any>[]
  data: TData[]
  getRowId: (row: TData) => string
  /** Omit for tables without sorting. */
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  rowCount?: number
  isLoading: boolean
  loadingRows?: number
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
  errorTitle?: string
  empty: React.ReactNode
  onRowClick?: (row: TData) => void
  rowTone?: (row: TData) => 'danger' | undefined
}) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: { sorting: sorting ?? NO_SORT, pagination: pagination ?? { pageIndex: 0, pageSize: data.length || 1 } },
    onSortingChange: (updater) =>
      onSortingChange?.(typeof updater === 'function' ? updater(sorting ?? NO_SORT) : updater),
    enableSorting: !!onSortingChange,
    onPaginationChange: (updater) => {
      if (!pagination || !onPaginationChange) return
      onPaginationChange(typeof updater === 'function' ? updater(pagination) : updater)
    },
    manualSorting: true,
    manualPagination: true,
    rowCount,
    enableSortingRemoval: false,
    enableMultiSort: false,
    sortDescFirst: true,
  })

  const columnCount = table.getAllLeafColumns().length
  const rows = table.getRowModel().rows
  const message = (content: React.ReactNode) => (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="whitespace-normal">
        {content}
      </TableCell>
    </TableRow>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const column = header.column
                  const meta = column.columnDef.meta
                  const sorted = column.getIsSorted()
                  const shown = sorted && meta?.invertSortIndicator ? flip(sorted) : sorted
                  const SortIcon = shown === 'asc' ? ArrowUp : shown === 'desc' ? ArrowDown : ArrowUpDown
                  return (
                    <TableHead
                      key={header.id}
                      scope="col"
                      aria-sort={shown === 'asc' ? 'ascending' : shown === 'desc' ? 'descending' : undefined}
                      className={cn('text-xs text-muted-foreground', meta?.align === 'right' && 'text-right')}
                    >
                      {header.isPlaceholder ? null : column.getCanSort() ? (
                        // shadcn data-table pattern: a ghost Button as the sort control.
                        <Button
                          variant="ghost"
                          size="xs"
                          className={cn('-ml-2 text-xs', shown ? 'text-foreground' : 'text-muted-foreground')}
                          onClick={() => column.toggleSorting()}
                        >
                          <table.FlexRender header={header} />
                          <SortIcon data-icon="inline-end" className={cn(!shown && 'opacity-40')} />
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: loadingRows }, (_, r) => (
                  <TableRow key={r} className="hover:bg-transparent">
                    {Array.from({ length: columnCount }, (_, c) => (
                      <TableCell key={c}>
                        <Skeleton className={cn('h-4', c === 0 ? 'w-12' : 'w-full max-w-32')} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : error
                ? message(<ErrorState title={errorTitle} error={error} onRetry={onRetry} retrying={retrying} />)
                : rows.length === 0
                  ? message(empty)
                  : rows.map((row) => {
                      const tone = rowTone?.(row.original)
                      return (
                        <TableRow
                          key={row.id}
                          onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                          className={cn(
                            'border-l-2 border-l-transparent',
                            onRowClick && 'cursor-pointer',
                            tone === 'danger' && 'border-l-destructive bg-destructive/5 hover:bg-destructive/10',
                          )}
                        >
                          {row.getAllCells().map((cell) => {
                            const meta = cell.column.columnDef.meta
                            return (
                              <TableCell
                                key={cell.id}
                                className={cn(meta?.muted && 'text-muted-foreground', meta?.align === 'right' && 'text-right', meta?.className)}
                              >
                                <table.FlexRender cell={cell} />
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
          </TableBody>
        </Table>
      </div>
      {pagination && onPaginationChange && rowCount !== undefined && rowCount > pagination.pageSize && (
        <TablePager
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          rowCount={rowCount}
          onPageChange={(i) => table.setPageIndex(i)}
          disabled={isLoading}
        />
      )}
    </div>
  )
}

/** Range summary + shadcn Pagination previous/next. `pageIndex` is 0-based. */
export function TablePager({
  pageIndex,
  pageSize,
  rowCount,
  onPageChange,
  disabled,
}: {
  pageIndex: number
  pageSize: number
  rowCount: number
  onPageChange: (pageIndex: number) => void
  disabled?: boolean
}) {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize))
  const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(rowCount, (pageIndex + 1) * pageSize)
  const atStart = disabled || pageIndex === 0
  const atEnd = disabled || pageIndex >= pageCount - 1
  const off = 'pointer-events-none opacity-50'

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground tabular-nums" aria-live="polite">
        Showing {from}–{to} of {rowCount}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem className="px-2 text-muted-foreground tabular-nums">
            Page {pageIndex + 1} of {pageCount}
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              aria-disabled={atStart}
              tabIndex={atStart ? -1 : undefined}
              className={cn(atStart && off)}
              onClick={() => !atStart && onPageChange(pageIndex - 1)}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              aria-disabled={atEnd}
              tabIndex={atEnd ? -1 : undefined}
              className={cn(atEnd && off)}
              onClick={() => !atEnd && onPageChange(pageIndex + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
