export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Team {
  id: number
  name: string
}

export interface Role {
  id: number
  name: string
  can_create_settings: boolean
  can_edit_settings: boolean
  can_delete_settings: boolean
  is_archived: boolean
}

export interface TeamMemberEntry {
  id: number
  user: User
  role: Role
}

export interface TeamDetail {
  id: number
  name: string
  members: TeamMemberEntry[]
}

export interface Category {
  id: number
  name: string
}

export interface SLAPolicy {
  id: number
  name: string
  duration_hours: number
  is_default: boolean
}

export interface User {
  id: number
  email: string
  name: string
  slack_user_id: string | null
  avatar_url: string | null
}

export interface Ticket {
  id: number
  ticket_number: number
  title: string
  description: string
  customer: string
  category: Category
  team: Team
  priority: TicketPriority
  status: TicketStatus
  sla_policy: SLAPolicy
  sla_due_at: string
  owner: User | null
  created_by: User
  slack_channel_id: string | null
  slack_message_ts: string | null
  created_at: string
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  updated_at: string
  sla_breached: boolean
  sla_remaining_seconds: number | null
  age_seconds: number
}

export interface TicketListItem {
  id: number
  ticket_number: number
  title: string
  customer: string
  category_name: string
  team_name: string
  owner_name: string | null
  priority: TicketPriority
  status: TicketStatus
  sla_breached: boolean
  created_at: string
  age_seconds: number
  updated_at: string
}

export interface TicketListResponse {
  items: TicketListItem[]
  total: number
}

export interface TimelineEvent {
  timestamp: string
  event_type: string
  description: string
  actor_name: string | null
}

export interface PeriodComparison {
  current: number
  previous: number
  change_pct: number | null
}

export interface DashboardSummary {
  total_open_tickets: number
  total_resolved_tickets: number
  avg_resolution_hours: number | null
  avg_first_response_hours: number | null
  sla_compliance_pct: number | null
  sla_breached_tickets: number
  tickets_pending: number
  tickets_created_this_week: number
  tickets_created_last_week: number
  tickets_resolved_this_week: number
  tickets_resolved_last_week: number
  sla_breached_this_week: number
  sla_breached_last_week: number
  created_comparison: PeriodComparison
  resolved_comparison: PeriodComparison
  sla_breach_comparison: PeriodComparison
}

export interface BreakdownItem {
  key: string
  label: string
  total: number
  pending: number
  sla_breached: number
  avg_resolution_hours: number | null
}

export interface OwnerPendingItem {
  owner_id: number | null
  owner_name: string
  pending_count: number
}

export interface TicketFiltersState {
  team_id?: number
  owner_id?: number
  category_id?: number
  priority?: TicketPriority
  status?: TicketStatus
  sla_status?: 'breached' | 'ok'
  date_from?: string
  date_to?: string
}

export interface TicketCreateRequest {
  title: string
  description: string
  customer: string
  category_id: number
  team_id: number
  priority: TicketPriority
  sla_policy_id: number
  owner_id?: number | null
  push_to_slack: boolean
}
