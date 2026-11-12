# API Specification (v1)

All Node routes prefixed `/api/v1`. JWT in `Authorization: Bearer`. FastAPI routes are internal — reachable only from the Node gateway's Docker network (not exposed to the browser).

## Node gateway (public)
- `POST /auth/login` → `{token, user}`
- `GET /auth/me`
- `GET /health` — checks Postgres, Redis, and AI service `/health`
- `GET /dashboard/summary` — event/job/anomaly/health counts
- `GET /metrics` — operational metric time series grouped by metric name, for analytics charts
- `GET /documents`, `POST /documents` (upload, multipart), `GET /documents/:id`
- `POST /assistant/ask` (SSE stream) → relays FastAPI `/rag/query` stream, persists conversation
- `GET /conversations/:id`
- `GET /anomalies` — relays FastAPI anomaly scan results, cached
- `POST /workflows/runs` (requires `Idempotency-Key` header) → enqueues BullMQ job
- `GET /workflows/runs`, `GET /workflows/runs/:id`
- `POST /workflows/runs/:id/approve` (admin/operator only)
- `GET /jobs` — BullMQ job status list
- `GET /alerts`, `PATCH /alerts/:id`
- `GET /audit-logs` (paginated)
- `GET /settings` — provider/mode visibility (mock vs real LLM), whether API keys are configured (never the keys themselves), ai-service health

## FastAPI AI service (internal)
- `GET /health`
- `POST /ingest` — `{document_id, title, content, metadata?}` → chunks + embeds + stores
- `POST /rag/query` — `{question, top_k?, filters?}` → streamed `{answer_chunk}` events, final `{sources[], confidence}`
- `POST /anomalies/scan` — `{metric_name?, window?}` → `[{metric_name, value, z_score, severity, recorded_at}]`
- `POST /workflows/execute-step` — `{workflow_type, step_name, context}` → `{output, requires_approval}`
- `POST /eval/run` — runs the eval dataset, returns measured metrics (never fabricated)

All request/response bodies are Pydantic models (Python) / Zod-validated (Node) — see `services/*/schemas`.
