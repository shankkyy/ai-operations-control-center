# Deploying to Render (free tier, manual — no Blueprint)

No `render.yaml`. On Render, only `web` services (and a time-limited free
Postgres) have a free tier — `worker`, `keyvalue` (Redis), and `pserv`
(private service) never do, Blueprint or not. To actually deploy for free,
this uses **4 Render web services + 1 external free Redis**, which needed two
small changes from the Docker Compose architecture:

- **Redis is Upstash** (a separate free managed Redis), not a Render service.
- **The BullMQ worker runs inside the gateway process** instead of as its own
  service — set via `RUN_WORKER_INLINE=true`
  (`gateway/src/index.ts`/`gateway/src/config/env.ts`). Defaults to `false`,
  so `docker-compose.yml`'s separate `worker:` container is untouched for
  local dev.
- **ai-service is a public `web` service**, not a private one — see the
  security trade-off in Gotchas below.

Your repo is already on GitHub at `shankkyy/ai-operations-control-center`, so
each Render service below can point straight at it.

## 1. Redis (Upstash, free)

Sign up at [upstash.com](https://upstash.com), create a free Redis database,
and copy its connection string (starts with `rediss://` — TLS; `ioredis`,
which the gateway already uses, handles that scheme automatically, no code
change needed).

## 2. Postgres

Render dashboard → New → PostgreSQL → name `aocc-postgres`, Free plan. Once
created, copy its **Internal Database URL** (used by the two services below)
— Render's free Postgres plan is time-limited and gets deleted after Render's
current free-tier window, so check Render's pricing page if you want this to
persist and upgrade if so.

### Enable pgvector + apply the schema (one-time)

From the Postgres page → Connect → PSQL Command, run it locally (or use the
dashboard's shell), then:

```bash
psql "<external connection string>" -f db/init/sql/schema.sql
```

(`schema.sql` already starts with `CREATE EXTENSION IF NOT EXISTS vector;` —
Render's managed Postgres supports pgvector natively, no custom image
needed.)

## 3. ai-service

New → Web Service → connect the repo → Root Directory `ai-service` → Runtime:
Docker (auto-detects `ai-service/Dockerfile`) → Instance Type: **Free**.

Env vars:
```
DATABASE_URL=<Postgres Internal Database URL from step 2>
PORT=8000
LLM_PROVIDER=mock
EMBEDDING_PROVIDER=mock
```

Deploy, then copy the generated URL (e.g. `https://ai-service-xxxx.onrender.com`)
— you need it in step 4.

## 4. gateway

New → Web Service → Root Directory `gateway` → Docker → **Free**.

Env vars:
```
DATABASE_URL=<Postgres Internal Database URL from step 2>
REDIS_URL=<Upstash connection string from step 1>
AI_SERVICE_URL=<ai-service's URL from step 3>
RUN_WORKER_INLINE=true
JWT_SECRET=<generate a real secret>
JWT_EXPIRES_IN=8h
SEED_ADMIN_EMAIL=admin@aocc.local
SEED_ADMIN_PASSWORD=<pick one>
```

Deploy, then copy gateway's generated URL — you need it in step 5.

## 5. frontend

New → Web Service → Root Directory `frontend` → Docker → **Free**.

Env vars:
```
PORT=5173
VITE_API_URL=<gateway's URL from step 4>/api/v1
```

Vite inlines `VITE_API_URL` into the browser bundle at build time (same
build-time-vs-runtime gotcha as `DECISIONS.md` #8 for Docker Compose), so this
has to be gateway's actual URL, known only after step 4 — there's no way to
express this ahead of time without a Blueprint's `fromService` reference.

## 6. Seed demo data (one-time)

Open the Shell tab on `gateway`'s dashboard page and run:

```bash
node dist/scripts/seed.js
```

## 7. Verify

Open `frontend`'s URL, log in with `admin@aocc.local` / your
`SEED_ADMIN_PASSWORD`, and check each service's Logs tab if anything 500s.

## Gotchas

- **Free web services spin down after 15 minutes idle** and cold-start
  (~30-60s) on the next request. Since the worker now runs inside gateway's
  process, a workflow approved while gateway is asleep sits queued until the
  next HTTP request wakes gateway back up — not until then does it actually
  run.
- **ai-service is public**, not private, to qualify for the free tier —
  anyone with its URL can call `/ingest`, `/rag/query`, etc. directly,
  bypassing gateway's auth entirely. Harmless in mock mode (no secrets, no
  paid API calls to leak); if you ever set a real `OPENAI_API_KEY` or
  `ANTHROPIC_API_KEY`, treat that URL as sensitive, since nothing currently
  stops someone else from burning your API budget through it.
- Render detects which port a Docker service listens on by scanning, not by
  reading the Dockerfile's `EXPOSE` — that's why `PORT` is set explicitly for
  `ai-service` (8000) and `frontend` (5173) above. `gateway` doesn't need one:
  it already reads `process.env.PORT` directly.
- No `render.yaml`, so cross-service values (`DATABASE_URL`,
  `AI_SERVICE_URL`, `REDIS_URL`) are copy-pasted between dashboard pages by
  hand instead of auto-wired by `fromService`/`fromDatabase` references —
  if you rotate a secret, you update it in every service that uses it.
