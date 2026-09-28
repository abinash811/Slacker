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
cd backend && pytest                 # API + services, against a real Postgres
cd frontend && npm run typecheck     # TypeScript (app, tests, e2e)
cd frontend && npm run lint          # oxlint + design-system guardrail
cd frontend && npm test              # Vitest unit tests
cd frontend && npm run test:e2e      # Playwright, against a mocked API (no backend needed)
```

Backend tests need the one-time local Postgres setup in `docs/DEPLOYMENT.md`
(`CREATEDB` on the app's role, so tests can spin up an isolated
`slacker_test` database). GitHub Actions (`.github/workflows/ci.yml`) runs
all of the above on every pull request.

**API types** are generated from the backend's OpenAPI schema. After changing a
backend request or response schema, regenerate them and commit the result; CI
fails if they're stale:

```bash
cd backend && python -m scripts.export_openapi && cd ../frontend && npm run gen:api
```

## What's here vs. what's deferred

**Built**: two-way ticket sync between Slack and the dashboard, full
assignment/status/priority history (never overwritten in place), SLA due
dates + breach detection, dashboard analytics with week-over-week
comparisons, global filters, a dev-mode auth abstraction ready to be
swapped for company SSO, Slack event signature verification + retry
deduplication.

**Deliberately not built in V1**: ticket-level RBAC (Settings permissions
from Roles *are* enforced — see `backend/app/core/permissions.py`), real authentication,
notifications/escalation, email/WhatsApp integration, AI features,
multi-workspace Slack install. The schema and service-layer separation
were designed so these can be added later without rewriting what's here —
see `docs/ROADMAP.md` for the full list, including a few smaller gaps
identified while testing the Slack integration live.
