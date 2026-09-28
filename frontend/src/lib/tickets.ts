import type { TicketFiltersState, TicketPriority, TicketStatus } from '@/types/api'
import type { SelectOption } from '@/components/ui/select'

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const STATUS_OPTIONS: SelectOption[] = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))
export const PRIORITY_OPTIONS: SelectOption[] = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))

export function toOptions<T extends { id: number; name: string }>(items: T[] | undefined): SelectOption[] {
  return (items ?? []).map((i) => ({ value: String(i.id), label: i.name }))
}

export const EMPTY_FILTERS: Partial<TicketFiltersState> = {
  team_id: undefined,
  owner_id: undefined,
  support_assignee_id: undefined,
  category_id: undefined,
  priority: undefined,
  status: undefined,
  sla_status: undefined,
  search: undefined,
}
