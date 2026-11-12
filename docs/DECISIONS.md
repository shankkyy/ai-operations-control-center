# Decisions

Locked before implementation; changing these later means rework.

1. **Schema ownership**: plain SQL in `db/init/*.sql`, mounted to Postgres' `/docker-entrypoint-initdb.d`. No Prisma/Alembic/dual migrators. Init scripts only run against an empty volume — a schema change after first boot needs `docker compose down -v`. A second DB (`aocc_test`) is created in the same script for isolated test runs.
2. **Embedding dimension**: fixed at `vector(384)` in schema. Real provider (OpenAI-compatible) requests `dimensions=384`. Mock provider must also produce 384-dim vectors.
3. **Mock embedding is feature-hashed, not random**: tokenize → hash each token into one of 384 buckets → L2-normalize. Random vectors would make "semantic retrieval returns relevant records" untestable.
4. **Mock LLM answers extractively**: builds the answer from top-k retrieved chunks, cites their record IDs, returns "insufficient evidence" below a similarity threshold. Keeps groundedness/hallucination evals meaningful without a paid API key.
5. **One queue**: BullMQ (Node) owns job/workflow state and retries. Python is stateless compute over HTTP — no Celery/RQ.
6. **Service ownership**: Node = auth, RBAC, audit log, workflow/job state, CRUD, SSE to browser. Python = embeddings, ingestion, retrieval, generation, anomaly detection, summarization, eval. Python never touches the users table.
7. **Approval is enforced server-side in Node**: a workflow step flagged `requires_approval` sets the run to `awaiting_approval` and the worker stops; only a role-checked `POST /workflows/runs/:id/approve` re-enqueues it. Job submission has a unique idempotency-key constraint. Runs have a `max_steps` cap.
8. **Ports remapped** from the spec defaults because host 3000/8000 were already bound by another local container, and 5432 by a pre-existing local Postgres (left untouched): frontend 5173, gateway 3001, ai-service 8001, postgres 5433 (host) / 5432 (container-internal), redis 6379.
9. **Python pinned to 3.12** in the Dockerfile (host has 3.14; some ML wheels lag current CPython).
10. **No Alembic for now**: schema is stable and small enough that hand-written SQL is simpler than a migration framework for a greenfield project. Revisit if the schema needs to evolve after data exists.
