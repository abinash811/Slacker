# API Reference

Base URL: `http://localhost:8000/api` (dev). All request/response bodies
are JSON. Interactive docs are also available at `/docs` (Swagger UI) and
`/redoc` while the backend is running.

## Authentication (dev mode)

No real authentication in V1 (spec section 14). Every request is
attributed to a user via the `X-Dev-User-Email` header; if omitted, the
backend falls back to `DEV_DEFAULT_USER_EMAIL`. See
`backend/app/core/auth.py` — this is the only place that will change when
company SSO is integrated.

```
X-Dev-User-Email: alice@example.com
```

## Tickets

### `GET /tickets`
List tickets with filters, sorting, and pagination.

Query params (all optional): `team_id`, `owner_id`, `category_id`,
`priority` (`low|medium|high|urgent`), `status`
(`open|in_progress|pending|resolved|closed`), `sla_status`
(`breached|ok`), `date_from`, `date_to` (ISO 8601, filters on
`created_at`), `sort_by` (`created_at|updated_at|priority|status|sla_due_at|ticket_number`),
`sort_dir` (`asc|desc`), `page`, `page_size`.

Response: `{ "items": [TicketListItem], "total": number }`

### `POST /tickets`
Create a ticket (Workflow A — dashboard, spec section 5).

```json
{
  "title": "Prescription issue",
  "description": "...",
  "customer": "ABC Clinic",
  "category_id": 1,
  "team_id": 1,
  "priority": "high",
  "sla_policy_id": 2,
  "owner_id": null,
  "push_to_slack": true,
  "slack_channel_id": null
}
```

`push_to_slack: true` (default) posts the ticket to Slack immediately
after creation and stores the resulting `slack_channel_id` /
`slack_message_ts` on the ticket. If the Slack post fails (e.g. Slack not
yet configured), the ticket is still created — the database is the source
of truth for ticket state (spec section 3); the failure is logged, not
raised, and can be retried by any future "push to Slack" action.

Returns the full `Ticket` object (201).

### `GET /tickets/{id}`
Full ticket detail, including computed SLA fields.

### `GET /tickets/{id}/timeline`
The full accountability timeline (spec section 11): created, every
assignment/reassignment, every status change, every priority change, and
every Slack thread reply — merged and sorted chronologically.

```json
[
  { "timestamp": "...", "event_type": "created", "description": "Ticket created", "actor_name": "Admin User" },
  { "timestamp": "...", "event_type": "assigned", "description": "Assigned to Abinash", "actor_name": "Admin User" },
  { "timestamp": "...", "event_type": "assigned", "description": "Reassigned to Rahul (from Abinash)", "actor_name": "Admin User" },
  { "timestamp": "...", "event_type": "status_changed", "description": "Status changed to In Progress", "actor_name": "Admin User" }
]
```

### `POST /tickets/{id}/assign`
`{ "owner_id": 3 }` → reassigns and records history. Same underlying call
as clicking **Assign** in Slack.

### `POST /tickets/{id}/status`
`{ "status": "in_progress" }`

### `POST /tickets/{id}/priority`
`{ "priority": "urgent" }`

### `POST /tickets/{id}/resolve`
No body. Sets status to `resolved` and stamps `resolved_at`.

Every mutation endpoint above also updates the ticket's Slack message
in-place (`chat.update`) if it was pushed to Slack, so the Slack message
never goes stale relative to the dashboard.

## Analytics

All accept the same filter query params as `GET /tickets` (minus sorting/pagination).

- `GET /analytics/summary` → `DashboardSummary` (spec section 8): open/resolved/pending
  counts, SLA compliance %, avg first-response/resolution hours, and
  this-week-vs-last-week comparisons for created/resolved/SLA-breached.
- `GET /analytics/breakdown/team` / `/category` / `/priority` → per-group
  totals, pending count, SLA breaches, avg resolution hours (spec section 9).
- `GET /analytics/owner-pending` → pending ticket count per current owner.

## Lookups

`GET /teams`, `GET /categories`, `GET /sla-policies`, `GET /users` — flat
lists used to populate dropdowns (dashboard and Slack modals both read
from the same tables).

## Error format

FastAPI's default: `{ "detail": "message" }` with an appropriate HTTP
status (404 for missing resources, 400 for invalid input like an unknown
SLA policy, 401 if no user can be resolved).
