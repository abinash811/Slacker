import { describe, expect, it } from 'vitest'
import openapi from '../../openapi.json'
import { TICKET_COLUMNS } from '@/lib/ticket-columns'

describe('Tickets table', () => {
  it('only uses column ids the API can sort by', () => {
    const param = openapi.paths['/api/tickets'].get.parameters.find((p: { name: string }) => p.name === 'sort_by') as {
      schema: { enum: string[] }
    }
    const sortable = param.schema.enum
    const ids = TICKET_COLUMNS.map((c) => c.id ?? ('accessorKey' in c ? String(c.accessorKey) : ''))
    expect(ids.filter((id) => !sortable.includes(id))).toEqual([])
  })
})
