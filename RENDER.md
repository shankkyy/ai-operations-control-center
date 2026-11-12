# Deploying to Render

`render.yaml` is Render's native Blueprint spec — it declares all 5 services
(Postgres, Redis, ai-service, gateway, worker, frontend) in one file. No new
Dockerfiles needed: Render's managed Postgres supports the `vector` extension
directly, so unlike some other platforms there's no custom Postgres image to
build — just a `CREATE EXTENSION` command (step 3 below).

Your repo is already on GitHub at `shankkyy/ai-operations-control-center`, so
Render's Blueprint flow can read `render.yaml` straight from it.

## 1. Deploy the blueprint

Render dashboard → New → Blueprint → connect this repo → Render parses
`render.yaml` and shows all 5 resources with their plans for review *before*
anything is created. This is also where you pick plan tiers — note that
private services, background workers, and Key Value instances have no free
tier on Render (only `web` services do), so check the cost preview before
confirming.

`SEED_ADMIN_PASSWORD` and `VITE_API_URL` are marked `sync: false` in the file
(secrets/values Render won't auto-fill) — it'll prompt you for
`SEED_ADMIN_PASSWORD` now; leave `VITE_API_URL` blank for the moment, you'll
set it in step 5.

Click **Apply** and wait for all 5 services to finish their first deploy.

## 2. What got created

- **`aocc-postgres`** — managed Postgres, not reachable from outside Render by
  default.
- **`aocc-redis`** — a `keyvalue` (Render's current name for managed Redis)
  instance; exposes `connectionString` to other services.
- **`ai-service`** — a private service (`pserv`), reachable only from other
  services in this environment, on `ai-service:8000`.
- **`gateway`** — a public `web` service; gets a `https://gateway-<id>.onrender.com`
  URL automatically.
- **`aocc-worker`** — a `worker` (no HTTP, no public/private address) running
  the same image as `gateway` with `dockerCommand: node dist/workers/index.js`
  overriding the Dockerfile's `CMD` — this is `docker-compose.yml`'s `worker:`
  entry.

## 3. Enable pgvector + apply the schema (one-time)

Open `aocc-postgres` in the Render dashboard → Connect → PSQL Command, run it
locally (or use the dashboard's built-in shell), then:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then apply the schema itself (the same file Docker Compose applies via
`db/init/sql/schema.sql`):

```bash
psql "$RENDER_POSTGRES_EXTERNAL_URL" -f db/init/sql/schema.sql
```

(`db/init/sql/schema.sql` already starts with `CREATE EXTENSION IF NOT EXISTS
vector;`, so the dashboard step above is redundant once you run this — it's
there mainly so you can confirm pgvector is available before running anything
else.)

## 4. Seed demo data (one-time)

Render's dashboard has a Shell tab per service. Open it on `gateway` and run:

```bash
node dist/scripts/seed.js
```

This runs with `gateway`'s own environment (`DATABASE_URL`, `AI_SERVICE_URL`),
so it needs no extra configuration.

## 5. Wire up the frontend's API URL

Vite inlines `VITE_API_URL` into the browser bundle at build time (same
build-time-vs-runtime gotcha noted in `DECISIONS.md` #8 for Docker Compose),
and `render.yaml` can't predict `gateway`'s generated URL ahead of its first
deploy — so this is the one step Render can't do declaratively:

1. Copy `gateway`'s URL from its dashboard page, e.g.
   `https://gateway-ab12.onrender.com`.
2. On `frontend` → Environment, set `VITE_API_URL` to
   `https://gateway-ab12.onrender.com/api/v1`.
3. Manually redeploy `frontend` (Environment changes alone don't trigger a
   rebuild for a Docker service's build-arg-consumed vars — use "Clear build
   cache & deploy" to force Vite to actually re-inline it).

## 6. Verify

Open `frontend`'s URL, log in with `admin@aocc.local` / the
`SEED_ADMIN_PASSWORD` you set in step 1, and check each service's Logs tab in
the dashboard if anything 500s.

## Gotchas

- Render detects which port a Docker service listens on by scanning, not by
  reading the Dockerfile's `EXPOSE` — set an explicit `PORT` env var
  (already done for `ai-service` and `frontend` in `render.yaml`) whenever the
  container's hardcoded listen port isn't the Render default of `10000`.
  `gateway` doesn't need one: it already reads `process.env.PORT` directly
  (`gateway/src/config/env.ts`), so whatever Render injects just works.
- `AI_SERVICE_URL` comes from `fromService`/`hostport`, which is `host:port`
  with no scheme — `gateway/src/config/env.ts` now normalizes a scheme-less
  value to `http://...` (a one-line change made for this; Docker Compose's
  existing full-URL value passes through unchanged).
- `render.yaml` can't concatenate two values into one env var (e.g. a
  service's generated URL + a fixed path suffix), which is why step 5 is
  manual rather than a `fromService` reference — Render *does* expose a
  service's public URL via `fromService`/`envVarKey: RENDER_EXTERNAL_URL`, but
  only as the bare origin, not with `/api/v1` appended.
- Each service rebuilds independently on every push by default; Render's
  per-service "Root Directory"/build filters aren't needed here since each
  service already points at its own `dockerContext`, but a change to, say,
  `frontend/` will still trigger Render to *check* all 5 services (cheaply) —
  only the one whose context actually changed rebuilds.
