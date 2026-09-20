# Roadmap

What's deliberately out of V1, in rough order of what's likely next. This
is a living list — add to it as new gaps surface (as several did during
live Slack testing) rather than building them ad hoc mid-task.

## Near-term (small, contained changes to what already exists)

- **Resolve with a note.** Slack's `confirm` dialog (what Resolve
  currently uses) is Yes/No only — it cannot collect text. Adding a note
  means replacing it with a modal (like Assign/Status/Priority already
  use), with the note optionally required or optional. The note itself
  would post into the Slack thread rather than being duplicated into the
  database, consistent with the existing "Slack holds conversation"
  principle.
- **A "Reopen" button in place of the four action buttons once a ticket
  is Resolved/Closed.** Slack Block Kit has no disabled-button state —
  the only way to stop Resolve from being clicked again is to remove it
  from the message. Reopening is an ordinary status change back to Open
  (same ticket, already fully supported by `ticket_service.change_status`
  and its history table) — no new backend logic needed, just a new button
  and a status-conditional branch in `build_ticket_blocks`.
- **A dashboard-level "reopened tickets" metric.** The underlying data
  already exists the moment the Reopen button above is built (a
  `ticket_status_history` row where `new_status=open` and
  `previous_status` was resolved/closed is a reopen event, already
  visible on that ticket's own timeline) — but nothing aggregates it into
  a count/list on the analytics page yet.
- **Related/linked tickets.** When one Slack message actually describes
  several distinct issues for different teams, V1's answer is to create
  separate tickets manually — there's no field linking them as siblings
  of one source conversation. Needs a small data model addition (e.g. a
  `related_ticket_id` column or a join table) plus a dashboard/Slack
  surface for it.
- **A "Create ticket from this message" Slack message shortcut** (as
  opposed to today's global shortcut, which starts blank). Right-clicking
  an existing message and pre-filling the ticket description with its
  text and a permalink would speed up the manual multi-ticket workflow
  above, though it still wouldn't link the resulting tickets together
  (see previous point).

## V2

- Team/member management (an actual admin UI over `teams`/`team_members`,
  which today only exist as tables)
- RBAC — enforcing `team_members.role` for who can see/assign/resolve what
  (the schema already supports this; V1 just doesn't check it)
- Company SSO, replacing the dev-mode `AuthProvider`
- SLA automation — auto-selecting a policy by team/category/priority
  instead of the creator picking one (the `sla_policies` scoping columns
  already exist for this)
- Business-hours SLA calendars (V1 is calendar-hours only)
- Notifications and automatic reminders (e.g. "ticket about to breach SLA")
- Escalation rules
- Manager-level dashboards/views
- Advanced analytics (per-person accountability breakdowns beyond what's
  in V1: resolution-time trends, reassignment counts per person, etc. —
  the data model already supports these, just not surfaced yet)
- Full Slack workspace directory sync via `team_join`/`user_change`
  events, if the "organic growth via interaction" approach used in V1
  turns out to be too slow for a large team

## V3

- AI ticket classification / automatic team assignment / automatic
  priority
- Suggested responses
- Duplicate ticket detection
- Ticket summarization
- AI-powered support analytics

## Explicitly not planned unless requirements change

Multi-workspace Slack OAuth install, a customer-facing portal, email/
WhatsApp integration, billing/subscription management — all out of scope
per the original product spec, and nothing in the current architecture
blocks adding them later if priorities change.
