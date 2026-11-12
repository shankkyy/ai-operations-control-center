# AI Operations Control Center

An AI-powered operations dashboard: monitor metrics and alerts, ask natural-language
questions answered via RAG over your operational documents, get statistical anomaly
detection, and run agentic workflows that pause for human approval before anything
consequential happens.

Runs entirely with **mock LLM/embedding providers by default — no paid API keys
required.**

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- API gateway: Node.js + Express + BullMQ (jobs/workflows)
- AI service: Python + FastAPI (RAG, embeddings, anomaly detection, LLM providers)
- Database: PostgreSQL + pgvector
- Cache/queue: Redis

See [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) for the full design,
[docs/DECISIONS.md](docs/DECISIONS.md) for why things are built the way they are, and
[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for build/verification status.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Wait for all services to report healthy (`docker compose ps`), then seed demo data
(users, metrics, alerts, sample runbook documents):

```bash
docker compose run --rm seed
```

Open the app:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Gateway API | http://localhost:3001/api/v1 |
| AI service (internal, not for browser use) | http://localhost:8001 |

## Login

The seed script creates three demo users (passwords from `.env`):

| Email | Role | Password |
|---|---|---|
| `admin@aocc.local` | admin | `SEED_ADMIN_PASSWORD` in `.env` (default `ChangeMe123!`) |
| `operator@aocc.local` | operator | `Operator123!` |
| `viewer@aocc.local` | viewer | `Viewer123!` |

## Environment variables

See [.env.example](.env.example) for the full list with defaults. The important ones:

- `LLM_PROVIDER` / `EMBEDDING_PROVIDER` — `mock` (default), `openai`, or `anthropic`
  (embeddings only supports `mock`/`openai` — Anthropic has no embeddings API).
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — only needed if you switch off `mock`.
- `JWT_SECRET` — change this for anything beyond local use.
- Ports are remapped from common defaults to avoid colliding with other local
  services (see `DECISIONS.md` #8): gateway `3001`, ai-service `8001`, postgres
  `5433` (host side), frontend `5173`, redis `6379`.

## Running tests

```bash
# AI service
cd ai-service && uv venv .venv && uv pip install -r requirements.txt --python .venv/bin/python
DATABASE_URL_TEST=postgresql://aocc:aocc_dev_password@localhost:5433/aocc_test \
  .venv/bin/python -m pytest --cov=app --cov-report=term-missing

# Gateway
cd gateway && npm install && npx vitest run --coverage

# Frontend
cd frontend && npm install && npx vitest run --coverage
```

All three require `postgres` + `redis` (and for the gateway, the `ai-service`
container or an equivalent mock) to be running — `docker compose up -d postgres
redis ai-service` is enough.

## Database

Schema lives in `db/init/` and is applied automatically on first container start
(to both `aocc` and the isolated `aocc_test` database). If you change the schema,
you need to recreate the volume:

```bash
docker compose down -v
docker compose up --build
```

## Troubleshooting

- **Port already in use**: another local service (often a native Postgres) may
  already be bound to a port this stack wants. Change the host-side port in
  `.env` (the container-internal port stays the same).
- **`docker info` hangs / containers won't start**: the Docker daemon can get
  into a stuck state, especially after the host disk fills up. Quit Docker
  Desktop fully (`pkill -f com.docker.backend` if the GUI quit doesn't actually
  stop the backend process) and relaunch it.
- **ai-service unhealthy**: check `docker compose logs ai-service` — the most
  common cause is `DATABASE_URL` pointing at a database that doesn't have the
  `vector` extension or the schema applied.
- **Assistant always says "insufficient evidence"**: no documents have been
  ingested yet, or the question doesn't share enough vocabulary with any
  ingested document (the mock embedding is a bag-of-words model, not true
  semantic understanding — see `DECISIONS.md` #3).

## Known limitations

- Mock mode trades real semantic understanding for being free and deterministic;
  answer/retrieval quality with `LLM_PROVIDER=openai` or `anthropic` will be
  meaningfully better.
- The `apply` step of the `remediation_suggestion` workflow is a stub — it
  records that an action was approved and taken, but doesn't call out to a real
  external system (PagerDuty, AWS, etc.). That integration point is exactly
  where the approval gate already sits.
- No horizontal scaling story; this targets Docker Compose on a single host,
  not Kubernetes.
- Frontend automated test coverage is intentionally lighter than the backend's
  (see `docs/TESTING_STRATEGY.md`) — UI correctness was also verified by hand
  in a real browser session against the live stack.
