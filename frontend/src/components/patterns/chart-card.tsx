import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export interface ChartTableColumn<T> {
  header: string
  cell: (row: T) => React.ReactNode
  align?: 'left' | 'right'
}

/**
 * A chart on a shadcn Card, with a "Show table" toggle so every value is
 * readable without the chart (screen readers, color-blind users, exact
 * numbers). The chart itself is passed as children.
 */
export function ChartCard<T>({
  title,
  description,
  rows,
  columns,
  rowKey,
  children,
}: {
  title: string
  description: string
  rows: T[]
  columns: ChartTableColumn<T>[]
  rowKey: (row: T) => string
  children: React.ReactNode
}) {
  const [asTable, setAsTable] = React.useState(false)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="xs" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
            {asTable ? 'Show chart' : 'Show table'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {asTable ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.header} scope="col" className={c.align === 'right' ? 'text-right' : undefined}>
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.header} className={c.align === 'right' ? 'text-right tabular-nums' : undefined}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
