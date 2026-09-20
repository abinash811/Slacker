# Deployment

## Local (Docker Compose)

```bash
cp .env.example .env   # fill in Slack credentials once you have them (docs/SLACK_SETUP.md)
docker compose up --build
```

This starts three containers:
- `db` — Postgres 16, with a named volume so data survives restarts
- `backend` — FastAPI + Slack Bolt, runs `alembic upgrade head` on every
  start (safe/idempotent — Alembic no-ops once a revision is applied),
  then serves the API on `:8000`
- `frontend` — a static Vite build served by nginx on `:3000`, which
  reverse-proxies `/api/*` to the backend container so the browser never
  makes a cross-origin request in this setup (no CORS needed in prod)

Seed baseline lookup data (teams/categories/SLA policies/users) once:
```bash
docker compose exec backend python -m app.seed
```

Then visit `http://localhost:3000`.

> **Note on this repository's own build/test history**: everything above
> was built and verified against a local (non-Docker) Postgres + Python
> venv + Vite dev server inside the sandboxed environment this project was
> developed in, because that sandbox's network policy blocks Docker Hub
> image pulls. The `docker-compose.yml` and both `Dockerfile`s were
> reviewed for correctness and `docker compose config` validates cleanly,
> but a full `docker compose up` was not exercised in that sandbox. Run it
> in a normal environment (a laptop, CI, or AWS) where Docker Hub is
> reachable — nothing about the images themselves is sandbox-specific.

## Environment variables

See `.env.example` for the full list. Nothing sensitive is committed;
`.env` is gitignored.

## Database migrations

Standard Alembic, from `backend/`:
```bash
alembic upgrade head
```
This also runs automatically as part of the backend container's start
command. To generate a new migration after a model change:
```bash
alembic revision --autogenerate -m "add ticket_team_history"
```
Review the generated file before committing — Alembic does not detect
everything automatically (see the note about the ticket-number sequence in
`docs/DATABASE.md`).

## AWS deployment (recommended, intentionally small for V1)

- **Compute**: ECS Fargate, one service for the backend container, one for
  the frontend container (or serve the frontend's static build from S3 +
  CloudFront instead of a container — either works with the same image).
- **Database**: RDS for PostgreSQL. Point `DATABASE_URL` at it — no code
  or schema changes needed; this is the same Postgres the app already runs
  against locally.
- **Networking**: an Application Load Balancer in front of the backend
  service, terminating HTTPS. Slack's Events/Interactivity Request URL
  points at this ALB's `/slack/events` path — this is why HTTP mode (not
  Socket Mode) is required in production (see `docs/ARCHITECTURE.md`).
- **Secrets**: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN`,
  `DATABASE_URL` etc. via AWS Secrets Manager or SSM Parameter Store,
  injected as container environment variables — never baked into the image.
- Deliberately **not** included for V1: multi-AZ complexity beyond what
  RDS/ECS give you by default, a message queue, a separate worker service,
  or multi-region — none of these are needed at V1's scale (see spec
  section 25/26 for what's explicitly deferred).

## CI/testing

From `backend/`, with a local Postgres reachable and the `slacker` role
granted `CREATEDB` (tests create/drop a dedicated `slacker_test` database
so they run against the real schema, not an approximation):
```bash
pip install -r requirements.txt
pytest
```
