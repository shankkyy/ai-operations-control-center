# Database Schema

Single Postgres instance (`pgvector/pgvector:pg16`), two databases: `aocc` (app) and `aocc_test` (tests), same schema, created in `db/init/01_init.sql`.

## Tables

- **users** (id, email unique, password_hash, role enum[admin,operator,viewer], created_at)
- **documents** (id, title, source_type, content_hash unique — dedup, status enum[pending,ready,failed], uploaded_by → users, created_at)
- **document_chunks** (id, document_id → documents, chunk_index, content text, embedding vector(384), metadata jsonb, created_at) — hnsw index on `embedding` (cosine ops; chosen over ivfflat, which needs `lists` tuned to row count and silently drops matches on small tables)
- **operational_metrics** (id, metric_name, value numeric, recorded_at, metadata jsonb) — index on (metric_name, recorded_at) for anomaly scans
- **alerts** (id, title, severity enum[low,medium,high,critical], status enum[open,acknowledged,resolved], source, created_at)
- **workflow_runs** (id, workflow_type, status enum[pending,running,awaiting_approval,completed,failed], idempotency_key unique, input jsonb, output jsonb, current_step int, max_steps int, created_by → users, created_at, updated_at)
- **workflow_steps** (id, run_id → workflow_runs, step_index, name, status, tool_name, requires_approval bool, approved_by → users nullable, input jsonb, output jsonb, error text, created_at)
- **audit_logs** (id, actor → users nullable, action, resource_type, resource_id, details jsonb, created_at) — append-only, never updated/deleted by app code
- **conversations** / **conversation_messages** (chat history: id, conversation_id, role, content, sources jsonb, created_at)

## Notes
- `embedding vector(384)` ties schema to the embedding dimension (see DECISIONS #2). Changing it requires `docker compose down -v` + re-ingest.
- Indexes: hnsw on embeddings (semantic search), btree on `documents.content_hash` (dedup), `workflow_runs.idempotency_key` (duplicate submission rejection), `(metric_name, recorded_at)` (anomaly queries), `audit_logs.created_at` (pagination).
