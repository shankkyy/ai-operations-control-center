# Project Requirements

## Product
AI Operations Control Center — ops teams monitor operational metrics/jobs/alerts, ask natural-language questions answered via RAG over operational records, get anomaly detection and recommended actions, and run agentic workflows that require human approval before any consequential action.

## Users & roles
- `admin` — full access, can approve sensitive workflow steps, manage users.
- `operator` — views dashboards, uses AI assistant, runs/approves workflows they're authorized for, manages documents.
- `viewer` — read-only: dashboards, audit logs, chat (no document upload, no workflow execution).

## Functional requirements
1. Auth: JWT login, RBAC on every route.
2. Dashboard: live counts (events, active/failed jobs, anomalies, health) and recent alerts/incidents from real APIs.
3. Document ingestion: upload operational docs/records → chunk → embed → store in pgvector, with dedup and incremental ingestion.
4. AI assistant: natural-language Q&A, streamed, grounded in retrieved chunks, cites sources, says "insufficient evidence" when retrieval confidence is low.
5. Anomaly detection over operational metrics (statistical, not ML-trained — see DECISIONS).
6. Agentic workflows (incident summary, anomaly investigation, report generation, alert prioritization, remediation suggestion) with explicit steps, tool calls, audit log, and a human-approval gate before any step that would modify external state.
7. Job monitoring: BullMQ job list, status, retry/idempotency.
8. Audit log: every auth event, document ingestion, workflow step, and approval decision.
9. Settings: provider/mode (mock vs real LLM) visibility, API key presence (never the key itself) .

## Non-functional requirements
- Mock LLM/embedding provider must make the whole product usable with zero paid API keys.
- No secrets committed; `.env.example` only.
- 80%+ meaningful backend test coverage, measured with real coverage tooling, not estimated.
- `docker compose up --build` brings up the full stack.

## Out of scope (explicitly, to avoid scope creep)
- Multi-tenant orgs, SSO/OAuth providers, billing.
- A trained anomaly-detection ML model (statistical z-score/IQR detection is sufficient and verifiable without a training pipeline).
- Horizontal scaling / k8s manifests — Docker Compose is the only deployment target.
