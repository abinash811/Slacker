import { useSearchParams } from 'react-router-dom'
import type { TicketFiltersState, TicketPriority, TicketStatus } from '@/types/api'

/**
 * Global filters (spec section 9) live in the URL so the same "Team =
 * Product" scope persists across navigation and is shareable/bookmarkable
 * — same pattern Linear uses for its issue views.
 */
export function useTicketFilters(): [TicketFiltersState, (next: Partial<TicketFiltersState>) => void] {
  const [params, setParams] = useSearchParams()

  const filters: TicketFiltersState = {
    team_id: params.get('team_id') ? Number(params.get('team_id')) : undefined,
    owner_id: params.get('owner_id') ? Number(params.get('owner_id')) : undefined,
    support_assignee_id: params.get('support_assignee_id') ? Number(params.get('support_assignee_id')) : undefined,
    category_id: params.get('category_id') ? Number(params.get('category_id')) : undefined,
    priority: (params.get('priority') as TicketPriority) || undefined,
    status: (params.get('status') as TicketStatus) || undefined,
    state: (params.get('state') as 'active' | 'done') || undefined,
    sla_status: (params.get('sla_status') as TicketFiltersState['sla_status']) || undefined,
    date_from: params.get('date_from') || undefined,
    date_to: params.get('date_to') || undefined,
    search: params.get('search') || undefined,
  }

  // Merge into the live URL, not `params`: React Router hands the updater
  // the params from the last render, so a second change made before the
  // page re-renders (e.g. setting "from" then "to" quickly) would otherwise
  // undo the first. BrowserRouter writes the URL synchronously.
  function update(next: Partial<TicketFiltersState>) {
    const merged = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '') merged.delete(key)
      else merged.set(key, String(value))
    }
    setParams(merged, { replace: true })
  }

  return [filters, update]
}
