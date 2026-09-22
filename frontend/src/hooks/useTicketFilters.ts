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
    category_id: params.get('category_id') ? Number(params.get('category_id')) : undefined,
    priority: (params.get('priority') as TicketPriority) || undefined,
    status: (params.get('status') as TicketStatus) || undefined,
    sla_status: (params.get('sla_status') as 'breached' | 'ok') || undefined,
    date_from: params.get('date_from') || undefined,
    date_to: params.get('date_to') || undefined,
    search: params.get('search') || undefined,
  }

  function update(next: Partial<TicketFiltersState>) {
    const merged = { ...filters, ...next }
    const nextParams = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== '') nextParams.set(key, String(value))
    }
    setParams(nextParams, { replace: true })
  }

  return [filters, update]
}
