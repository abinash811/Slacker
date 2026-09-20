# Support Operations / Ticket Accountability Platform

An internal support-ticketing system where **Slack is the operational
workspace** (create, assign, reassign, update status/priority, resolve —
all without opening a dashboard) and the **dashboard is the
management/analytics layer** (visibility, SLA tracking, ownership
accountability). Inspired by the operational feel of ClearFeed and Linear.

Read `docs/ARCHITECTURE.md` first — it covers the Slack platform research
this was built against, the architecture decisions, the database schema,
and documented limitations.

## Repository layout

```
backend/    FastAPI + SQLAlchemy + Alembic + Slack Bolt (Python)
frontend/   React + TypeScript + Vite + Tailwind (+ shadcn-style components)
docs/       ARCHITECTURE.md, DATABASE.md, API.md, SLACK_SETUP.md, DEPLOYMENT.md, ROADMAP.md
```

Inside `backend/app/`: `models/` (SQLAlchemy), `schemas/` (Pydantic),
`services/` (ticket/SLA/analytics/Slack business logic — the only place
state actually changes), `api/` (REST routers, thin), `slack/` (Bolt app —
calls into the same services the REST API uses, never touches the DB
directly).

## Quickstart (Docker)

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend python -m app.seed   # baseline teams/categories/SLA policies/users
```
Dashboard: `http://localhost:3000` · API docs: `http://localhost:8000/docs`

Slack isn't required to use the dashboard — ticket creation, filtering,
and analytics all work without it. To wire up the Slack side (create
tickets from Slack, assign/status/priority/resolve buttons, thread-reply
tracking), follow `docs/SLACK_SETUP.md`.

## Quickstart (without Docker)

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://slacker:slacker@localhost:5432/slacker
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Testing

```bash
cd backend && pytest
```
20 tests covering ticket creation, assignment/reassignment history,
status/priority transitions, SLA calculation, dashboard analytics, and
Slack event deduplication. See `docs/DEPLOYMENT.md` for the one-time local
Postgres setup they need (`CREATEDB` on the app's role, so tests can spin
up an isolated `slacker_test` database).

## What's here vs. what's deferred

**Built**: two-way ticket sync between Slack and the dashboard, full
assignment/status/priority history (never overwritten in place), SLA due
dates + breach detection, dashboard analytics with week-over-week
comparisons, global filters, a dev-mode auth abstraction ready to be
swapped for company SSO, Slack event signature verification + retry
deduplication.

**Deliberately not built in V1**: RBAC, real authentication,
notifications/escalation, email/WhatsApp integration, AI features,
multi-workspace Slack install. The schema and service-layer separation
were designed so these can be added later without rewriting what's here —
see `docs/ROADMAP.md` for the full list, including a few smaller gaps
identified while testing the Slack integration live.
