import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery } from '@/lib/api'
import type {
  BreakdownItem,
  Category,
  DashboardSummary,
  OwnerPendingItem,
  SLAPolicy,
  Team,
  Ticket,
  TicketCreateRequest,
  TicketFiltersState,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
  TimelineEvent,
  User,
} from '@/types/api'

function filtersToQuery(filters: TicketFiltersState) {
  return buildQuery({
    team_id: filters.team_id,
    owner_id: filters.owner_id,
    category_id: filters.category_id,
    priority: filters.priority,
    status: filters.status,
    sla_status: filters.sla_status,
    date_from: filters.date_from,
    date_to: filters.date_to,
  })
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: () => api.get<Team[]>('/teams') })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') })
}

export function useSlaPolicies() {
  return useQuery({ queryKey: ['sla-policies'], queryFn: () => api.get<SLAPolicy[]>('/sla-policies') })
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<User[]>('/users') })
}

export function useTickets(
  filters: TicketFiltersState,
  opts: { sortBy?: string; sortDir?: 'asc' | 'desc'; page?: number; pageSize?: number } = {},
) {
  const query = buildQuery({
    team_id: filters.team_id,
    owner_id: filters.owner_id,
    category_id: filters.category_id,
    priority: filters.priority,
    status: filters.status,
    sla_status: filters.sla_status,
    date_from: filters.date_from,
    date_to: filters.date_to,
    sort_by: opts.sortBy,
    sort_dir: opts.sortDir,
    page: opts.page,
    page_size: opts.pageSize,
  })
  return useQuery({
    queryKey: ['tickets', filters, opts],
    queryFn: () => api.get<TicketListResponse>(`/tickets${query}`),
  })
}

export function useTicket(id: number | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`),
    enabled: id !== undefined,
  })
}

export function useTicketTimeline(id: number | undefined) {
  return useQuery({
    queryKey: ['ticket-timeline', id],
    queryFn: () => api.get<TimelineEvent[]>(`/tickets/${id}/timeline`),
    enabled: id !== undefined,
  })
}

export function useSummary(filters: TicketFiltersState) {
  return useQuery({
    queryKey: ['summary', filters],
    queryFn: () => api.get<DashboardSummary>(`/analytics/summary${filtersToQuery(filters)}`),
  })
}

export function useBreakdown(dimension: 'team' | 'category' | 'priority', filters: TicketFiltersState) {
  return useQuery({
    queryKey: ['breakdown', dimension, filters],
    queryFn: () => api.get<BreakdownItem[]>(`/analytics/breakdown/${dimension}${filtersToQuery(filters)}`),
  })
}

export function useOwnerPending(filters: TicketFiltersState) {
  return useQuery({
    queryKey: ['owner-pending', filters],
    queryFn: () => api.get<OwnerPendingItem[]>(`/analytics/owner-pending${filtersToQuery(filters)}`),
  })
}

function useTicketMutation() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'teams' && q.queryKey[0] !== 'categories' })
  return { queryClient, invalidate }
}

export function useCreateTicket() {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (payload: TicketCreateRequest) => api.post<Ticket>('/tickets', payload),
    onSuccess: invalidate,
  })
}

export function useAssignTicket(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (owner_id: number) => api.post<Ticket>(`/tickets/${ticketId}/assign`, { owner_id }),
    onSuccess: invalidate,
  })
}

export function useChangeStatus(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (status: TicketStatus) => api.post<Ticket>(`/tickets/${ticketId}/status`, { status }),
    onSuccess: invalidate,
  })
}

export function useChangePriority(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (priority: TicketPriority) => api.post<Ticket>(`/tickets/${ticketId}/priority`, { priority }),
    onSuccess: invalidate,
  })
}

export function useResolveTicket(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: () => api.post<Ticket>(`/tickets/${ticketId}/resolve`),
    onSuccess: invalidate,
  })
}
