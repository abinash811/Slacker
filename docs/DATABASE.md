# Database Schema

PostgreSQL, plain SQL features only (no Supabase-specific extensions) — the
same schema runs unchanged against local Docker Postgres, Supabase
Postgres, or AWS RDS Postgres. Managed via SQLAlchemy models
(`backend/app/models/`) and Alembic migrations (`backend/alembic/versions/`).

## Design principle: state transitions are rows, not overwrites

The single most important rule in this schema (spec section 27): ownership,
status, and priority are never simply updated in place without a trail.
Every change to one of those fields on `tickets` also inserts a row into a
dedicated history table in the same transaction. `tickets.owner_id`,
`.status`, `.priority` always reflect the *current* value — the history
tables are what let us answer "who had this and when."

## Tables

### `users`
Internal identity, source of truth for accountability (owner/actor on
every action). `slack_user_id` links a row to a Slack member; it is
nullable and backfilled the first time that Slack user acts (see
`backend/app/slack/identity.py`) — a user created from the dashboard and
one created from Slack converge on the same row once they share an email.

### `teams`, `categories`
Simple lookup tables. Kept as their own tables (not enums) because the
spec's future roadmap needs them to carry more data later (channel
mappings, ownership rules) without a migration.

### `team_members`
`team_id` + `user_id` + `role` (`member`/`manager`). **Not used for
authorization in V1** (everyone can see everything, per spec) — it exists
so RBAC (section 13) can be added later by adding permission checks
against this table, without a schema change.

### `sla_policies`
A named duration (`"48 hours"` → `duration_hours=48`). `team_id`,
`category_id`, `priority` are optional scoping columns, unused for
selection logic in V1 (the ticket creator picks a policy explicitly from a
dropdown) but ready for a V2 "auto-select the right policy" feature.

### `slack_channels`
Routes a team to a Slack channel. A row with `team_id IS NULL AND
is_default = true` is the shared fallback channel; a row with a specific
`team_id` overrides it for that team. This implements the product decision
of "mostly one shared channel, with a few teams broken out."

### `tickets`
The core entity (spec section 4). Current state only — `status`,
`priority`, `owner_id` always reflect *now*; history lives in the tables
below. `ticket_number` is a human-facing sequential id (`#1000`, `#1001`,
…) backed by a dedicated Postgres sequence (`ticket_number_seq`, starting
at 1000), independent of the internal `id` primary key. `slack_channel_id`
+ `slack_message_ts` are the only Slack state stored — enough to update
the message later or map a thread reply back to this ticket; no message
content is duplicated.

Computed-at-read fields (SLA breached, remaining seconds, age) are
**never stored** — they're derived from `sla_due_at`/`resolved_at`/now on
every read (`app/services/sla_service.py`), so there is exactly one
definition of "breached" that can't drift out of sync with reality.

### `ticket_assignments`
One row per assign **and** reassign. `previous_owner_id` is `NULL` for the
first assignment. `created_at` is "the moment this owner took the
ticket" — subtracting consecutive rows' timestamps gives "time with each
owner," and counting rows per ticket gives "how many times was this
reassigned" (spec section 12).

### `ticket_status_history` / `ticket_priority_history`
Same pattern as assignments, for status and priority. The very first row
of each (`previous_status/priority IS NULL`) represents the ticket's
initial value at creation.

### `ticket_comments`
**References only** — `ticket_id`, `author_id`, `slack_ts`, `created_at`.
No message body. This is what spec section 16 means by "do not duplicate
Slack messages into the database": the Slack thread remains the only copy
of the actual conversation; this table exists purely so we can count
replies and timestamp the first one (first-response-time metric) without
copying content that could go stale, be edited, or be deleted independently
in Slack.

### `slack_event_dedup`
`slack_event_id` (unique) + `processed_at`. Slack's Events API redelivers
an event if our ack is slow or fails (see docs/ARCHITECTURE.md); this
table is the guard against applying the same thread-reply or interaction
twice.

### `audit_events`
Catch-all audit trail: `ticket_id` (nullable), `actor_id` (nullable),
`source` (`dashboard`/`slack`/`system`), `event_type`, `payload` (JSONB).
Written alongside every typed history row above. The typed tables answer
specific accountability questions efficiently; this table is the complete
raw log for anything else (e.g. future audit/compliance needs).

## Entity relationships

```
teams ──< team_members >── users
  │                          │
  │                          │
  ├──< slack_channels        │
  │                          │
categories                   │
  │                          │
  └──────┐                   │
         ▼                   ▼
       tickets ───────> sla_policies
         │  │  │
         │  │  └──> owner_id / created_by_id (users)
         │  └─────> slack_channel_id / slack_message_ts (Slack refs only)
         │
         ├──< ticket_assignments
         ├──< ticket_status_history
         ├──< ticket_priority_history
         ├──< ticket_comments
         └──< audit_events
```

## Migrations

Standard Alembic. From `backend/`:

```bash
alembic upgrade head          # apply all pending migrations
alembic revision --autogenerate -m "description"   # generate a new one after model changes
```

The initial migration (`ac96a6a26e96_initial_schema.py`) also contains a
hand-added `CREATE SEQUENCE ticket_number_seq START WITH 1000` — Alembic's
autogenerate does not detect standalone sequences, so this one line was
added manually after generation (documented in the migration's own
comments).
