# Architecture — Support Operations Platform

## 1. Research Summary (Slack platform, current docs)

| Area | Finding | Implication for this app |
|---|---|---|
| Socket Mode vs HTTP Events API | Slack: HTTP is recommended for production ("if your app doesn't need Socket Mode, use HTTP — fewer moving parts"). Socket Mode is meant for local dev / firewalled environments and doesn't scale horizontally (long-lived WebSocket per instance, reconnect overhead). HTTP is also required for Slack Marketplace distribution. | We use **HTTP Events API** via Slack Bolt's FastAPI adapter, mounted on the same backend. Socket Mode stays available as a `SLACK_USE_SOCKET_MODE=true` dev-only escape hatch behind one config flag, for local development without a public URL. |
| Interactivity | Block Kit supports `button`, `static_select`, `users_select`, and full `modal` views. Actions arrive as `block_actions` payloads; modal submissions as `view_submission`. All interactive payloads are signed the same way as events. | Ticket message = Block Kit message with buttons (`Assign`, `Status`, `Priority`, `Resolve`). Assign uses a `users_select` in a modal (native Slack user picker — no need to store a member directory ourselves beyond linking by `slack_user_id`). |
| Request verification | Every request (events, interactions, slash commands) carries `X-Slack-Signature` + `X-Slack-Request-Timestamp`, verified with the signing secret (HMAC-SHA256 over `v0:timestamp:body`). Reject if timestamp is >5 min old (replay protection). | Enforced centrally by Bolt's `SignatureVerifier`; we never hand-roll this. |
| Retries / rate limits | Events API requires a 2xx ack within 3 seconds; failed/slow acks are retried up to 3 times with `X-Slack-Retry-Num`/`X-Slack-Retry-Reason` headers, and Slack disables the subscription after sustained failures. Event delivery is capped at ~30,000 events/hour/workspace/app (excess dropped, `app_rate_limited` sent). `chat.postMessage` is limited to ~1 msg/sec/channel with short bursts tolerated; sustained overage returns HTTP 429 + `Retry-After`. | (1) All Slack event/interaction handlers ack immediately and do the DB work synchronously in-process (V1 ticket volume is far below limits, so a queue is unnecessary complexity for now — documented as the first V2 upgrade if volume grows). (2) We deduplicate by Slack's event/action id in a small `slack_event_dedup` table, since a slow ack can trigger a legitimate retry with the *same* event. (3) Outbound `chat.postMessage`/`chat.update` calls go through one small wrapper that respects `Retry-After` on 429. |
| Message/file retention | Paid workspaces retain messages/files indefinitely by default (admin-configurable retention/deletion policies exist); deleted messages are **not recoverable** via the API once gone, and there's no "trash". | We must not treat Slack as durable long-term storage for anything we need for accountability metrics. Every fact needed for SLA/ownership/timeline math is copied into Postgres at the moment it happens (timestamps, actor, transition). Slack is kept only as the live conversation + attachments; if a workspace admin later deletes history, our ticket record and metrics stay intact — we only lose the ability to re-render the original message content. |
| Threads | A reply to the ticket's root message carries `thread_ts` equal to the root message's `ts`. Slack's Events API delivers these as ordinary `message` events with `thread_ts` set. | Ticket ↔ Slack mapping is `(channel_id, message_ts)`, stored once on ticket creation. Any inbound `message` event whose `thread_ts` matches a known ticket message is a thread reply to that ticket — used to detect first response, without subscribing to or storing message content. |
| OAuth / app install | Standard OAuth v2 (`oauth.v2.access`) issues a bot token scoped to the workspace; `client_id`/`client_secret`/`signing_secret` come from the app config. | Single-workspace install is enough for V1 (one company workspace). Schema still has a home for a future `slack_installations` table if multi-workspace is ever needed — not built now (YAGNI). |

**Slack can give us:** identity of the acting Slack user (`user_id`) on every interaction, channel where an action happened, message timestamps, thread relationships, and rich modal/message UI.
**Slack cannot give us (so we own it):** durable ownership state, status/priority as structured fields, SLA math, cross-ticket history/analytics, "who had this ticket for how long" — none of that exists as Slack state; it only exists as a stream of events we must persist ourselves.

Sources: [Comparing HTTP & Socket Mode](https://docs.slack.dev/apis/events-api/comparing-http-socket-mode/), [Event delivery](https://api.slack.com/apis/event-delivery), [Rate limits](https://docs.slack.dev/apis/web-api/rate-limits/), [Slack retention](https://slack.com/help/articles/203457187-Customize-data-retention-in-Slack).

## 2. Recommended Architecture

```
┌─────────────────┐         REST API          ┌──────────────────────┐
│  React Dashboard │ ───────────────────────▶  │   FastAPI Backend    │
│ (Vite + TS + TW) │ ◀───────────────────────  │                       │
└─────────────────┘                            │  ┌─────────────────┐ │        ┌───────────────┐
                                                │  │ Ticket Service  │ │        │               │
                                                │  │ SLA Service     │ │──────▶ │  Slack Web API │
                                                │  │ Analytics Svc   │ │ (Bolt) │  (chat.post/   │
                                                │  │ Assignment Svc  │ │ ◀──────│   update, views│
                                                │  │ Audit Service   │ │  HTTP  │   .open, ...)  │
                                                │  └────────┬────────┘ │ Events └───────┬───────┘
                                                │           │          │                │
                                                │  ┌────────▼────────┐ │        ┌───────▼───────┐
                                                │  │   SQLAlchemy    │ │        │  Slack Workspace│
                                                │  └────────┬────────┘ │        │ (buttons, modal,│
                                                └───────────┼──────────┘        │  threads)       │
                                                            │                   └────────────────┘
                                                   ┌────────▼────────┐
                                                   │   PostgreSQL    │
                                                   └─────────────────┘
```

- **One backend process**, two logical entry points: `/api/*` (dashboard REST API) and `/slack/events` (Bolt's HTTP adapter, mounted as FastAPI routes). They share the same service layer, DB session, and models — there is exactly one source of truth for ticket mutation logic, whether the trigger was a dashboard click or a Slack button.
- **Slack integration is isolated** in `backend/app/slack/` (Bolt app, Block Kit builders, event/action handlers). It calls into `backend/app/services/` — it never touches the DB directly. This means the same `TicketService.assign_ticket(...)` is called from both the REST router and the Slack action handler, so business rules (recording history, computing SLA) can't drift between the two entry points.
- **AuthProvider abstraction** (`backend/app/core/auth.py`): a `get_current_user` dependency with a `DevAuthProvider` implementation (resolves user from an `X-Dev-User-Email` header / configurable default). Swapping to company SSO later means writing one new provider class and changing one dependency wire-up — no business logic changes.

## 3. Database Schema (Postgres, via SQLAlchemy + Alembic)

Every **state transition** gets its own history row — current state is never silently overwritten without a trail (Section 27 of the spec).

- `users` — id, email, name, slack_user_id (nullable, unique), is_active
- `teams` — id, name
- `team_members` — team_id, user_id, role (`member`/`manager`) — future RBAC hook, unused for authz in V1
- `categories` — id, name
- `sla_policies` — id, name, duration_hours, team_id (nullable), category_id (nullable), priority (nullable), is_default — supports "different SLA per category/team" later; V1 just picks a policy at creation time
- `slack_channels` — id, slack_channel_id, name, team_id (nullable, unique per team), is_default — implements the "one default channel, some teams override" routing rule
- `tickets` — id, ticket_number, title, description, customer, category_id, team_id, priority, status, sla_policy_id, sla_due_at, owner_id, created_by_id, slack_channel_id, slack_message_ts, created_at, first_response_at, resolved_at, closed_at, updated_at
- `ticket_assignments` — ticket_id, previous_owner_id, new_owner_id, changed_by_id, created_at — every assign/reassign
- `ticket_status_history` — ticket_id, previous_status, new_status, changed_by_id, created_at
- `ticket_priority_history` — ticket_id, previous_priority, new_priority, changed_by_id, created_at
- `ticket_comments` — ticket_id, author_id, slack_ts, created_at — **reference only**, no message body (Slack thread stays the source of truth for content); lets us count/timestamp comments for first-response and activity metrics without duplicating data
- `slack_event_dedup` — slack_event_id (unique), processed_at — swallow Slack's at-least-once retries
- `audit_events` — ticket_id (nullable), actor_id (nullable), source (`slack`/`dashboard`/`system`), event_type, payload (JSONB), created_at — catch-all audit trail for anything not covered by a typed history table

Full column-level detail lives in `docs/DATABASE.md`.

## 4. Ticket Lifecycle & Metric Derivation

- **First response time** = first `ticket_comments` row (or `ticket_status_history` row) timestamp minus `created_at`. Captured by the Slack `message` event handler matching `thread_ts` to a ticket.
- **Time to assignment** = first `ticket_assignments` row timestamp minus `created_at`.
- **Time with each owner** = for each `ticket_assignments` row, the gap between its `created_at` and the next row's `created_at` (or now/resolved_at for the last one).
- **Time with each team** = same pattern, keyed on team reassignment (V1 tracks current team on the ticket; team-transfer history can reuse `audit_events` — noted as a V2 table (`ticket_team_history`) if team reassignment becomes a first-class action).
- **Total resolution time** = `resolved_at - created_at`.
- **SLA breach** = `now() > sla_due_at AND resolved_at IS NULL`, or `resolved_at > sla_due_at` for already-resolved tickets. `sla_due_at = created_at + sla_policy.duration_hours` (calendar hours, per product decision — business-hours SLA is a documented V2 upgrade needing a team calendar/timezone config).

## 5. Deployment

- **Dev**: `docker-compose up` — Postgres + backend (Uvicorn) + frontend (Vite dev server). No external services required (no Supabase dependency — plain `DATABASE_URL`).
- **Prod (AWS)**: containers to **ECS Fargate** (backend + frontend, or frontend as static S3+CloudFront build) behind an **ALB** with a public HTTPS URL for Slack's Events/Interactivity request URL; **RDS PostgreSQL** as the database — same SQLAlchemy models, zero code changes from Docker Postgres. Secrets (`SLACK_*`, `DATABASE_URL`) via env vars / AWS Secrets Manager, never committed. Kept intentionally small for V1 — no queue, no separate worker service, no multi-region.

## 6. Explicit Limitations (documented, not silently worked around)

1. Slack has no durable "ticket" concept — losing our DB loses all operational state even if Slack history survives, and vice versa (losing Slack history loses conversation content but not metrics). This is by design (Section 16) but worth stating plainly.
2. Events API retries mean **idempotency is mandatory** — handled via `slack_event_dedup`.
3. Single shared Slack workspace/install assumed for V1 (no multi-tenant OAuth flow).
4. `users_select` in Slack shows the full workspace member list, not filtered by our `team_members` mapping — V1 accepts this (spec explicitly defers RBAC); a V2 improvement is to filter via a static `conversations_select`-style allow-list once team membership is enforced.
5. Business-hours SLA, notifications, escalation, and reassignment-of-team history are intentionally out of scope for V1 per the spec.
