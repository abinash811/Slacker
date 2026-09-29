import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery } from '@/lib/api'
import { dayEndIso, dayStartIso } from '@/lib/dates'
import type {
  AgingBucket,
  ApiToken,
  ApiTokenCreated,
  McpInfo,
  BreakdownItem,
  Category,
  CustomFieldDefinition,
  CustomFieldType,
  DashboardSummary,
  Me,
  SavedView,
  SavedViewFilters,
  SettingsPermissions,
  OwnerPendingItem,
  PersonScore,
  Role,
  SLASettings,
  Tag,
  Team,
  TeamDetail,
  TeamMemberEntry,
  Ticket,
  TicketCreateRequest,
  TicketUpdateRequest,
  TicketFiltersState,
  TicketListResponse,
  TicketPriority,
  TicketSortColumn,
  TicketStatus,
  TimelineEvent,
  User,
  WeeklyTrend,
} from '@/types/api'

function filterParams(filters: TicketFiltersState) {
  return {
    team_id: filters.team_id,
    owner_id: filters.owner_id,
    support_assignee_id: filters.support_assignee_id,
    category_id: filters.category_id,
    priority: filters.priority,
    status: filters.status,
    state: filters.state,
    sla_status: filters.sla_status,
    date_from: filters.date_from ? dayStartIso(filters.date_from) : undefined,
    date_to: filters.date_to ? dayEndIso(filters.date_to) : undefined,
    search: filters.search,
  }
}

function filtersToQuery(filters: TicketFiltersState) {
  return buildQuery(filterParams(filters))
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
    meta: { success: 'SLA updated', errorTitle: "Couldn't update SLA" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sla-settings'] }),
  })
}

/** The current user and their Settings permissions. The server enforces them; the UI hides what's not allowed. */
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/me'), staleTime: 60_000 })
}

const NO_PERMISSIONS: SettingsPermissions = { create: false, edit: false, delete: false }

/** What the current user may do in Settings. Everything is off until /me loads. */
export function useSettingsPermissions(): SettingsPermissions {
  return useMe().data?.settings ?? NO_PERMISSIONS
}

// --- Saved views (personal) ---

export function useSavedViews() {
  return useQuery({ queryKey: ['saved-views'], queryFn: () => api.get<SavedView[]>('/me/views') })
}

export function useCreateSavedView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; filters: SavedViewFilters }) => api.post<SavedView>('/me/views', payload),
    meta: { success: 'View saved', inlineError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-views'] }),
  })
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/me/views/${id}`),
    meta: { success: 'View deleted', errorTitle: "Couldn't delete view" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-views'] }),
  })
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<User[]>('/users') })
}

export function useTickets(
  filters: TicketFiltersState,
  opts: { sortBy?: TicketSortColumn; sortDir?: 'asc' | 'desc'; page?: number; pageSize?: number } = {},
) {
  const query = buildQuery({
    ...filterParams(filters),
    sort_by: opts.sortBy,
    sort_dir: opts.sortDir,
    page: opts.page,
    page_size: opts.pageSize,
  })
  return useQuery({
    queryKey: ['tickets', filters, opts],
    queryFn: () => api.get<TicketListResponse>(`/tickets${query}`),
    // Keep the current page on screen while the next page/sort loads.
    placeholderData: keepPreviousData,
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

export function useTrends(filters: TicketFiltersState, weeks = 12) {
  return useQuery({
    queryKey: ['trends', filters, weeks],
    queryFn: () => {
      const query = filtersToQuery(filters)
      return api.get<WeeklyTrend[]>(`/analytics/trends${query ? `${query}&` : '?'}weeks=${weeks}`)
    },
  })
}

export function useOwnerPending(filters: TicketFiltersState) {
  return useQuery({
    queryKey: ['owner-pending', filters],
    queryFn: () => api.get<OwnerPendingItem[]>(`/analytics/owner-pending${filtersToQuery(filters)}`),
  })
}

export function useAging(filters: TicketFiltersState) {
  return useQuery({
    queryKey: ['aging', filters],
    queryFn: () => api.get<AgingBucket[]>(`/analytics/aging${filtersToQuery(filters)}`),
  })
}

export function usePeopleScorecard(filters: TicketFiltersState) {
  return useQuery({
    queryKey: ['people-scorecard', filters],
    queryFn: () => api.get<PersonScore[]>(`/analytics/people${filtersToQuery(filters)}`),
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
    meta: { success: 'Ticket created and posted to Slack', inlineError: true },
    onSuccess: invalidate,
  })
}

export function useUpdateTicket(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (payload: TicketUpdateRequest) => api.patch<Ticket>(`/tickets/${ticketId}`, payload),
    meta: { success: 'Ticket updated', inlineError: true },
    onSuccess: invalidate,
  })
}

export function useAssignTicket(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (owner_id: number | null) => api.post<Ticket>(`/tickets/${ticketId}/assign`, { owner_id }),
    meta: { success: 'Assignee updated', errorTitle: "Couldn't reassign ticket" },
    onSuccess: invalidate,
  })
}

export function useChangeTeam(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (team_id: number) => api.post<Ticket>(`/tickets/${ticketId}/team`, { team_id }),
    meta: { success: 'Team updated', errorTitle: "Couldn't change team" },
    onSuccess: invalidate,
  })
}

export function useChangeStatus(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (status: TicketStatus) => api.post<Ticket>(`/tickets/${ticketId}/status`, { status }),
    meta: { success: 'Status updated', errorTitle: "Couldn't change status" },
    onSuccess: invalidate,
  })
}

export function useChangePriority(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (priority: TicketPriority) => api.post<Ticket>(`/tickets/${ticketId}/priority`, { priority }),
    meta: { success: 'Priority updated', errorTitle: "Couldn't change priority" },
    onSuccess: invalidate,
  })
}

export function useResolveTicket(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: () => api.post<Ticket>(`/tickets/${ticketId}/resolve`),
    meta: { success: 'Ticket resolved', errorTitle: "Couldn't resolve ticket" },
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
    meta: { success: 'Role created', inlineError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<RoleInput> & { id: number; is_archived?: boolean }) =>
      api.patch<Role>(`/roles/${id}`, payload),
    meta: { success: (v: { is_archived?: boolean }) => (v.is_archived ? 'Role archived' : v.is_archived === false ? 'Role restored' : 'Role updated'), errorTitle: "Couldn't update role" },
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
    meta: { success: 'Team created', inlineError: true },
    onSuccess: invalidate,
  })
}

export function useRenameTeam(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (name: string) => api.patch<TeamDetail>(`/teams/${teamId}`, { name }),
    meta: { success: 'Team renamed', errorTitle: "Couldn't rename team" },
    onSuccess: invalidate,
  })
}

export function useSetDefaultTeam() {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (teamId: number) => api.post<TeamDetail>(`/teams/${teamId}/set-default`),
    meta: { success: 'Default team updated', errorTitle: "Couldn't change default team" },
    onSuccess: invalidate,
  })
}

export function useAddTeamMember(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (payload: { user_id: number; role_id: number }) =>
      api.post<TeamMemberEntry>(`/teams/${teamId}/members`, payload),
    meta: { success: 'Member added', errorTitle: "Couldn't add member" },
    onSuccess: invalidate,
  })
}

export function useUpdateTeamMemberRole(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: number; roleId: number }) =>
      api.patch<TeamMemberEntry>(`/teams/${teamId}/members/${memberId}`, { role_id: roleId }),
    meta: { success: 'Role updated', errorTitle: "Couldn't change role" },
    onSuccess: invalidate,
  })
}

export function useRemoveTeamMember(teamId: number) {
  const invalidate = useTeamMutation()
  return useMutation({
    mutationFn: (memberId: number) => api.delete(`/teams/${teamId}/members/${memberId}`),
    meta: { success: 'Member removed', errorTitle: "Couldn't remove member" },
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
    meta: { success: 'Category created', inlineError: true },
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useLookupMutation(['categories', 'categories-admin'])
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; is_archived?: boolean }) =>
      api.patch<Category>(`/categories/${id}`, payload),
    meta: { success: (v: { is_archived?: boolean }) => (v.is_archived ? 'Category archived' : v.is_archived === false ? 'Category restored' : 'Category updated'), errorTitle: "Couldn't update category" },
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
    meta: { success: 'Custom field created', inlineError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] }),
  })
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; label?: string; options?: string[] | null; is_archived?: boolean }) =>
      api.patch<CustomFieldDefinition>(`/custom-fields/${id}`, payload),
    meta: { success: (v: { is_archived?: boolean }) => (v.is_archived ? 'Custom field archived' : v.is_archived === false ? 'Custom field restored' : 'Custom field updated'), errorTitle: "Couldn't update custom field" },
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
    meta: { success: 'Tag created', inlineError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; is_archived?: boolean }) =>
      api.patch<Tag>(`/tags/${id}`, payload),
    meta: { success: (v: { is_archived?: boolean }) => (v.is_archived ? 'Tag archived' : v.is_archived === false ? 'Tag restored' : 'Tag updated'), errorTitle: "Couldn't update tag" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTicketTags(ticketId: number) {
  const { invalidate } = useTicketMutation()
  return useMutation({
    mutationFn: (tag_ids: number[]) => api.post<Ticket>(`/tickets/${ticketId}/tags`, { tag_ids }),
    meta: { errorTitle: "Couldn't update tags" },
    onSuccess: invalidate,
  })
}

// --- AI assistant access (MCP) ---

export function useMcpInfo() {
  return useQuery({ queryKey: ['mcp-info'], queryFn: () => api.get<McpInfo>('/mcp-info'), staleTime: Infinity })
}

export function useApiTokens() {
  return useQuery({ queryKey: ['api-tokens'], queryFn: () => api.get<ApiToken[]>('/me/tokens') })
}

export function useCreateApiToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<ApiTokenCreated>('/me/tokens', { name }),
    meta: { errorTitle: "Couldn't create a key" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
  })
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/me/tokens/${id}`),
    meta: { success: 'Key revoked', errorTitle: "Couldn't revoke the key" },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
  })
}
