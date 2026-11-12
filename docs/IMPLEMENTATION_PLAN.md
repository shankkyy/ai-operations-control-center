# Implementation Plan (state ledger — update after every stage)

Statuses: NOT STARTED | IN PROGRESS | BLOCKED | COMPLETED | VERIFIED

| Stage | Description | Status |
|---|---|---|
| 1 | Repo analysis + docs | COMPLETED |
| 2 | Architecture + DB design | COMPLETED (see SYSTEM_ARCHITECTURE.md, DATABASE_SCHEMA.md) |
| 3 | Docker/db/redis scaffolding | VERIFIED — postgres+redis up healthy, schema applies cleanly to aocc+aocc_test |
| 4 | FastAPI implementation | VERIFIED — 20/20 pytest passing, 85% coverage (`pytest --cov=app`, 2026-11-12) |
| 5 | Node gateway implementation | VERIFIED — 39/39 vitest passing, 88% stmt coverage (2026-11-12) |
| 6 | RAG + LLM integration | COMPLETED — implemented as part of Stage 4 (ai-service) + Stage 5 (gateway relay); exercised end-to-end in assistant tests |
| 7 | Agentic workflows | COMPLETED — implemented as part of Stage 5 (workflowService.ts, approval gate, idempotency); exercised in workflows tests |
| 8 | React frontend | VERIFIED — all 11 pages built, `tsc`/`vite build` clean, 13 vitest component tests passing |
| 9 | Backend/frontend integration | VERIFIED — full stack (postgres, redis, ai-service, gateway, worker, frontend) run together live via `docker compose up --build`; confirmed in a real headless-Chromium session (not just curl): login, dashboard with real counts, AI assistant streaming a grounded answer with citations, anomaly table, and the execution history of a remediation workflow run that paused for approval and completed — zero browser console errors (2026-11-12) |
| 10 | Unit + integration tests | COMPLETED — ai-service (pytest) + gateway (vitest) + frontend (vitest/RTL) suites; see Stages 4/5/8 |
| 11 | E2E tests (Playwright) | SKIPPED per explicit user direction (2026-11-12): "don't write test cases, just build the application and make it working." Functional coverage substituted with a one-off manual Playwright-driven browser check (screenshots reviewed, not committed to the repo) rather than a maintained E2E suite. |
| 12 | Debugging + perf | COMPLETED as part of Stages 3-9 (see bug lists below); Redis caching, pagination, connection pooling, rate limiting, and the hnsw index are in place |
| 13 | Final docs/delivery | IN PROGRESS |

## Bugs found and fixed during Stage 3/4 verification
- Postgres init: `.sql` files directly in `docker-entrypoint-initdb.d` are auto-executed by the official entrypoint *in addition to* being sourced by `01_apply_schema.sh`, causing "type already exists" errors. Fixed by moving `schema.sql` into a `sql/` subdirectory (only explicitly-invoked by the shell script).
- `ivfflat` vector index silently returned zero matches for `ORDER BY ... LIMIT` queries on a near-empty table (approximate index with default `lists=100` and 1 probed list missed the only row once a LIMIT-driven index scan was chosen) — confirmed by removing `LIMIT` and getting a correct match. Replaced with `hnsw`, which has no row-count-dependent tuning and found the match correctly.
- Host port 5432 was already bound by a pre-existing local Postgres; remapped our stack to host port 5433 rather than touching the unrelated service.

## Bugs found and fixed during Stage 5 verification
- `multer@1.x` and `zod@<4.6.6` had known CVEs (`npm audit`); bumped to `multer@2.x` and `zod@4.6.7` (fixed the one breaking change: `z.record` needs an explicit key schema in v4).
- `ioredis`'s default export has no TS call signature under `NodeNext` + `esModuleInterop`; fixed by importing the named `{ Redis }` export instead.
- Vitest runs test files in parallel by default; since all gateway test files share one real Postgres test DB, parallel `beforeEach(truncateAll)` calls raced and wiped each other's fixtures mid-test. Fixed with `fileParallelism: false` in `vitest.config.ts`.
- `redis.disconnect()` in test teardown threw an unhandled "Connection is closed" rejection when BullMQ's `Queue.close()` had already torn down the shared connection; fixed by checking `redis.status` and using the graceful `redis.quit()`.

## Notes
- Ports remapped: frontend 5173, gateway 3001, ai-service 8001, postgres 5432, redis 6379 (3000/8000 were already bound locally — see DECISIONS #8).
- Mock mode is the default and must work with zero API keys end-to-end.
