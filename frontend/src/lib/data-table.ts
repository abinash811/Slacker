import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type RowData,
} from '@tanstack/react-table'

/** Features every DataTable registers. Sorting and paging are server-side (manual). */
export const dataTableFeatures = tableFeatures({ rowSortingFeature, rowPaginationFeature })
export type DataTableFeatures = typeof dataTableFeatures

/** Typed column builder for DataTable: `const col = columnHelper<Ticket>()`. */
export function columnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

declare module '@tanstack/react-table' {
  // Per-column presentation, read by DataTable when rendering cells.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> {
    /** Secondary-colored cell text. */
    muted?: boolean
    align?: 'left' | 'right'
    className?: string
    /** Sort arrows point the opposite way to the sort key (e.g. Age sorted by created_at). */
    invertSortIndicator?: boolean
  }
}
