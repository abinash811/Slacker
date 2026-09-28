import type { SavedViewFilters, TicketFiltersState } from '@/types/api'

/** Only the filters that are actually set, in a stable key order. */
export function activeFilters(filters: TicketFiltersState | SavedViewFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, string | number>
}

export function sameFilters(a: TicketFiltersState | SavedViewFilters, b: TicketFiltersState | SavedViewFilters): boolean {
  return JSON.stringify(activeFilters(a)) === JSON.stringify(activeFilters(b))
}

/** A saved view's filters in the shape the filter bar uses (nulls become "not set"). */
export function toFilterState(filters: SavedViewFilters): Partial<TicketFiltersState> {
  return Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, v ?? undefined])) as Partial<TicketFiltersState>
}
