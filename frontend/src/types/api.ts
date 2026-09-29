// API types come from the backend's OpenAPI schema — never hand-write a
// response shape here. Regenerate after changing a backend schema:
//   cd backend && python -m scripts.export_openapi && cd ../frontend && npm run gen:api
// CI fails if frontend/openapi.json or api.gen.ts is stale.
import type { components, operations } from './api.gen'

type Schemas = components['schemas']

export type TicketStatus = Schemas['TicketStatus']
export type TicketPriority = Schemas['TicketPriority']
export type Team = Schemas['TeamOut']
export type Role = Schemas['RoleOut']
export type TeamMemberEntry = Schemas['TeamMemberOut']
export type TeamDetail = Schemas['TeamDetailOut']
export type Category = Schemas['CategoryOut']
export type SLASettings = Schemas['SLASettingsOut']
export type Tag = Schemas['TagOut']
export type CustomFieldType = Schemas['CustomFieldType']
export type CustomFieldDefinition = Schemas['CustomFieldDefinitionOut']
export type CustomFieldValue = Schemas['CustomFieldValueOut']
export type User = Schemas['UserOut']
export type Ticket = Schemas['TicketOut']
export type TicketListItem = Schemas['TicketListItem']
export type TicketListResponse = Schemas['TicketListResponse']
export type TimelineEvent = Schemas['TimelineEvent']
export type PeriodComparison = Schemas['PeriodComparison']
export type DashboardSummary = Schemas['DashboardSummary']
export type BreakdownItem = Schemas['BreakdownItem']
export type OwnerPendingItem = Schemas['OwnerPendingItem']
export type WeeklyTrend = Schemas['WeeklyTrend']
export type TicketCreateRequest = Schemas['TicketCreateRequest']
export type TicketUpdateRequest = Schemas['TicketUpdateRequest']
export type Me = Schemas['MeOut']
export type SavedView = Schemas['SavedViewOut']
export type SavedViewFilters = Schemas['SavedViewFilters']
export type SettingsPermissions = Schemas['SettingsPermissions']

/** Columns the ticket list endpoint can sort by (enum from the backend). */
export type TicketSortColumn = NonNullable<
  NonNullable<operations['list_tickets_api_tickets_get']['parameters']['query']>['sort_by']
>

/** Client-side filter state (URL-backed); not an API schema. */
export interface TicketFiltersState {
  team_id?: number
  owner_id?: number
  support_assignee_id?: number
  category_id?: number
  priority?: TicketPriority
  status?: TicketStatus
  sla_status?: 'breached' | 'ok'
  date_from?: string
  date_to?: string
  search?: string
}
