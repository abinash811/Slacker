import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery } from '@/lib/api'
import type {
  BreakdownItem,
  Category,
  CustomFieldDefinition,
  CustomFieldType,
  DashboardSummary,
  OwnerPendingItem,
  Role,
  SLASettings,
  Tag,
  Team,
  TeamDetail,
  TeamMemberEntry,
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
    search: filters.search,
  })
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: () => api.get<Team[]>('/teams') })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') })
}

export function useSlaSettings() {
  return useQuery({ queryKey: ['sla-settings'], queryFn: () => api.get<SLASettings>('/sla-settings') })
}

export function useUpdateSlaSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (default_hours: number) => api.patch<SLASettings>('/sla-settings', { default_hours }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sla-settings'] }),
  })
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
    search: filters.search,
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
    mutationFn: (owner_id: number | null) => api.post<Ticket>(`/tickets/${ticketId}/assign`, { owner_id }),
    onSuccess: invalidate,
  })
}

export function useChangeTeam(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (team_id: number) => api.post<Ticket>(`/tickets/${ticketId}/team`, { team_id }),
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

// --- Roles & Teams (Settings) ---

export function useRoles(includeArchived = false) {
  return useQuery({
    queryKey: ['roles', includeArchived],
    queryFn: () => api.get<Role[]>(`/roles${buildQuery({ include_archived: includeArchived ? 'true' : undefined })}`),
  })
}

interface RoleInput {
  name: string
  can_create_settings: boolean
  can_edit_settings: boolean
  can_delete_settings: boolean
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RoleInput) => api.post<Role>('/roles', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<RoleInput> & { id: number; is_archived?: boolean }) =>
      api.patch<Role>(`/roles/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useTeamsList() {
  return useQuery({ queryKey: ['teams'], queryFn: () => api.get<Team[]>('/teams') })
}

export function useTeamDetail(teamId: number | undefined) {
  return useQuery({
    queryKey: ['team-detail', teamId],
    queryFn: () => api.get<TeamDetail>(`/teams/${teamId}/detail`),
    enabled: teamId !== undefined,
  })
}

function useTeamMutation() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ predicate: (q) => ['teams', 'team-detail'].includes(q.queryKey[0] as string) })
}

export function useCreateTeam() {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (name: string) => api.post<TeamDetail>('/teams', { name }),
    onSuccess: invalidate,
  })
}

export function useRenameTeam(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (name: string) => api.patch<TeamDetail>(`/teams/${teamId}`, { name }),
    onSuccess: invalidate,
  })
}

export function useSetDefaultTeam() {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (teamId: number) => api.post<TeamDetail>(`/teams/${teamId}/set-default`),
    onSuccess: invalidate,
  })
}

export function useAddTeamMember(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (payload: { user_id: number; role_id: number }) =>
      api.post<TeamMemberEntry>(`/teams/${teamId}/members`, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTeamMemberRole(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: number; roleId: number }) =>
      api.patch<TeamMemberEntry>(`/teams/${teamId}/members/${memberId}`, { role_id: roleId }),
    onSuccess: invalidate,
  })
}

export function useRemoveTeamMember(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (memberId: number) => api.delete(`/teams/${teamId}/members/${memberId}`),
    onSuccess: invalidate,
  })
}

// --- Form Fields & Dropdowns (Settings) ---

export function useCategoriesAdmin(includeArchived = true) {
  return useQuery({
    queryKey: ['categories-admin', includeArchived],
    queryFn: () => api.get<Category[]>(`/categories${buildQuery({ include_archived: includeArchived ? 'true' : undefined })}`),
  })
}

function useLookupMutation(keys: string[]) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ predicate: (q) => keys.includes(q.queryKey[0] as string) })
}

export function useCreateCategory() {
  const invalidate = useLookupMutation(['categories', 'categories-admin'])
  return useMutation({
    mutationFn: (name: string) => api.post<Category>('/categories', { name }),
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useLookupMutation(['categories', 'categories-admin'])
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; is_archived?: boolean }) =>
      api.patch<Category>(`/categories/${id}`, payload),
    onSuccess: invalidate,
  })
}

export function useCustomFields(includeArchived = true) {
  return useQuery({
    queryKey: ['custom-fields', includeArchived],
    queryFn: () =>
      api.get<CustomFieldDefinition[]>(`/custom-fields${buildQuery({ include_archived: includeArchived ? 'true' : undefined })}`),
  })
}

export function useCreateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { label: string; field_type: CustomFieldType; options: string[] | null }) =>
      api.post<CustomFieldDefinition>('/custom-fields', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] }),
  })
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; label?: string; options?: string[] | null; is_archived?: boolean }) =>
      api.patch<CustomFieldDefinition>(`/custom-fields/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] }),
  })
}

export function useTags(includeArchived = true) {
  return useQuery({
    queryKey: ['tags', includeArchived],
    queryFn: () => api.get<Tag[]>(`/tags${buildQuery({ include_archived: includeArchived ? 'true' : undefined })}`),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<Tag>('/tags', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; is_archived?: boolean }) =>
      api.patch<Tag>(`/tags/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTicketTags(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (tag_ids: number[]) => api.post<Ticket>(`/tickets/${ticketId}/tags`, { tag_ids }),
    onSuccess: invalidate,
  })
}
