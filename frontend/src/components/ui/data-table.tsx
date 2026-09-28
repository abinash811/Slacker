import * as React from 'react'
import { useTable, type ColumnDef, type PaginationState, type RowData, type SortingState } from '@tanstack/react-table'
import { ErrorState } from '@/components/ui/error-state'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableMessage,
  TableRow,
  TableSkeleton,
  type SortDirection,
} from '@/components/ui/table'
import { dataTableFeatures, type DataTableFeatures } from '@/lib/data-table'

export type { PaginationState, SortingState }

const flip = (d: SortDirection): SortDirection => (d === 'asc' ? 'desc' : 'asc')

/**
 * Server-driven data table: TanStack Table for column/sort/page state,
 * rendered with the ui/table parts. Owns the loading, error, and empty
 * states and the pagination footer, so every list behaves the same.
 * Build columns with `columnHelper<T>()` from lib/data-table.
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
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  rowCount?: number
  isLoading: boolean
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
    state: { sorting, pagination: pagination ?? { pageIndex: 0, pageSize: data.length || 1 } },
    onSortingChange: (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
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

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const column = header.column
                const meta = column.columnDef.meta
                const sorted = column.getIsSorted()
                const shown = sorted && meta?.invertSortIndicator ? flip(sorted) : sorted
                return (
                  <TableHead
                    key={header.id}
                    align={meta?.align}
                    sort={column.getCanSort() ? shown : undefined}
                    onSort={column.getCanSort() ? () => column.toggleSorting() : undefined}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                )
              })}
            </tr>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton columns={columnCount} rows={8} />
          ) : error ? (
            <TableMessage colSpan={columnCount}>
              <ErrorState title={errorTitle} error={error} onRetry={onRetry} retrying={retrying} />
            </TableMessage>
          ) : rows.length === 0 ? (
            <TableMessage colSpan={columnCount}>{empty}</TableMessage>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                interactive={!!onRowClick}
                tone={rowTone?.(row.original)}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getAllCells().map((cell) => {
                  const meta = cell.column.columnDef.meta
                  return (
                    <TableCell key={cell.id} muted={meta?.muted} align={meta?.align} className={meta?.className}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination && onPaginationChange && rowCount !== undefined && rowCount > pagination.pageSize && (
        <Pagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          rowCount={rowCount}
          onPageChange={(pageIndex) => table.setPageIndex(pageIndex)}
          disabled={isLoading}
        />
      )}
    </div>
  )
}
