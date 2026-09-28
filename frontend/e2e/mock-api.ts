import type { Page, Route } from '@playwright/test'
import type {
  Category,
  DashboardSummary,
  Role,
  Tag,
  Team,
  TeamDetail,
  Ticket,
  TicketListItem,
  User,
} from '../src/types/api'

const now = Date.now()
const hoursAgo = (h: number) => new Date(now - h * 3600e3).toISOString()

export const users: User[] = [
  { id: 1, email: 'priya@example.com', name: 'Priya Sharma', slack_user_id: null, avatar_url: null },
  { id: 2, email: 'arjun@example.com', name: 'Arjun Rao', slack_user_id: null, avatar_url: null },
]
export const teams: Team[] = [
  { id: 1, name: 'Support', is_default: true },
  { id: 2, name: 'Billing', is_default: false },
]
export const roles: Role[] = [
  { id: 1, name: 'Admin', can_create_settings: true, can_edit_settings: true, can_delete_settings: true, is_archived: false },
  { id: 2, name: 'Agent', can_create_settings: false, can_edit_settings: false, can_delete_settings: false, is_archived: false },
]
export const categories: Category[] = [{ id: 1, name: 'Prescriptions', is_archived: false }]
export const tags: Tag[] = [{ id: 1, name: 'Appointment', is_archived: false }]

export function makeTickets(count: number): TicketListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    ticket_number: 1000 + i,
    title: `Ticket ${i + 1}`,
    customer: 'Sunrise Clinic',
    business_id: null,
    mobile_number: null,
    doctor_name: null,
    category_name: 'Prescriptions',
    team_name: 'Support',
    owner_name: null,
    priority: 'medium',
    status: 'open',
    sla_breached: i === 0,
    sla_remaining_seconds: i === 0 ? -3600 : 7200,
    created_at: hoursAgo(i),
    age_seconds: i * 3600,
    updated_at: hoursAgo(i),
  }))
}

const summary: DashboardSummary = {
  total_open_tickets: 12,
  total_resolved_tickets: 40,
  avg_resolution_hours: 5,
  avg_first_response_hours: 0.5,
  sla_compliance_pct: 90,
  sla_breached_tickets: 1,
  tickets_pending: 3,
  tickets_created_this_week: 8,
  tickets_created_last_week: 6,
  tickets_resolved_this_week: 7,
  tickets_resolved_last_week: 7,
  sla_breached_this_week: 1,
  sla_breached_last_week: 2,
  created_comparison: { current: 8, previous: 6, change_pct: 33 },
  resolved_comparison: { current: 7, previous: 7, change_pct: 0 },
  sla_breach_comparison: { current: 1, previous: 2, change_pct: -50 },
}

export function ticketDetail(id: number): Ticket {
  return {
    id,
    ticket_number: 1000 + id,
    title: 'Prescriptions not syncing',
    description: 'Details',
    customer: 'Sunrise Clinic',
    business_id: null,
    mobile_number: null,
    doctor_name: null,
    category: categories[0],
    team: teams[0],
    priority: 'urgent',
    status: 'open',
    sla_hours: 24,
    sla_due_at: hoursAgo(-2),
    owner: users[0],
    support_assignee: null,
    created_by: users[1],
    slack_channel_id: null,
    slack_message_ts: null,
    created_at: hoursAgo(22),
    first_response_at: null,
    resolved_at: null,
    closed_at: null,
    updated_at: hoursAgo(1),
    sla_breached: false,
    sla_remaining_seconds: 7200,
    age_seconds: 22 * 3600,
    custom_field_values: [],
    tags: [],
  }
}

type Handler = (route: Route, url: URL) => unknown
export interface MockApi {
  /** Every request the app made, as "METHOD /path?query". */
  requests: string[]
  /** Override one endpoint: `api.on('POST', '/tags', (route) => route.fulfill(...))`. */
  on(method: string, path: string | RegExp, handler: Handler): void
}

/** Answers every /api call with fixture data; tests override single endpoints with `on`. */
export async function mockApi(
  page: Page,
  {
    tickets = makeTickets(3),
    settings = { create: true, edit: true, delete: true },
  }: { tickets?: TicketListItem[]; settings?: { create: boolean; edit: boolean; delete: boolean } } = {},
): Promise<MockApi> {
  const overrides: { method: string; path: string | RegExp; handler: Handler }[] = []
  const requests: string[] = []

  await page.route(/\/api\//, async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const path = url.pathname.replace(/^\/api/, '')
    requests.push(`${method} ${path}${url.search}`)

    const override = overrides.find(
      (o) => o.method === method && (typeof o.path === 'string' ? o.path === path : o.path.test(path)),
    )
    if (override) return override.handler(route, url)

    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (method !== 'GET') return json({})

    if (path === '/me') return json({ user: users[0], settings })
    if (path === '/users') return json(users)
    if (path === '/teams') return json(teams)
    if (/^\/teams\/\d+\/detail$/.test(path)) {
      const detail: TeamDetail = { ...teams[0], members: [{ id: 1, user: users[0], role: roles[0] }] }
      return json(detail)
    }
    if (path === '/roles') return json(roles)
    if (path === '/categories') return json(categories)
    if (path === '/tags') return json(tags)
    if (path === '/custom-fields') return json([])
    if (path === '/sla-settings') return json({ default_hours: 24 })
    if (path === '/tickets') {
      const page = Number(url.searchParams.get('page') ?? 1)
      const size = Number(url.searchParams.get('page_size') ?? 50)
      return json({ items: tickets.slice((page - 1) * size, page * size), total: tickets.length })
    }
    const ticketMatch = path.match(/^\/tickets\/(\d+)$/)
    if (ticketMatch) {
      const id = Number(ticketMatch[1])
      return id > 900 ? json({ detail: 'Ticket not found' }, 404) : json(ticketDetail(id))
    }
    if (/^\/tickets\/\d+\/timeline$/.test(path)) return json([])
    if (path === '/analytics/summary') return json(summary)
    if (path.startsWith('/analytics/')) return json([])
    return json({ detail: `Not mocked: ${path}` }, 404)
  })

  return {
    requests,
    on: (method, path, handler) => overrides.unshift({ method, path, handler }),
  }
}
