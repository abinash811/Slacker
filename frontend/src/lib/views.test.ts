import { describe, expect, it } from 'vitest'
import { activeFilters, sameFilters, toFilterState } from '@/lib/views'

describe('views', () => {
  it('ignores unset values and key order when comparing filters', () => {
    expect(sameFilters({ owner_id: 1, priority: undefined }, { owner_id: 1 })).toBe(true)
    expect(sameFilters({ owner_id: 1, status: 'open' }, { status: 'open', owner_id: 1 })).toBe(true)
    expect(sameFilters({ owner_id: 1 }, { owner_id: 2 })).toBe(false)
    expect(sameFilters({}, { search: '' })).toBe(true)
  })

  it('keeps only set filters when saving', () => {
    expect(activeFilters({ team_id: 3, search: '', priority: undefined })).toEqual({ team_id: 3 })
  })

  it('turns server nulls into "not set"', () => {
    expect(toFilterState({ team_id: null, priority: 'high' })).toEqual({ team_id: undefined, priority: 'high' })
  })
})
