# Testing Strategy

- **Python**: Pytest + pytest-asyncio + pytest-cov, against `aocc_test` DB. Mock LLM/embedding providers used by default (deterministic, no network). Coverage: `pytest --cov=app --cov-report=term-missing`.
- **Node**: Vitest + Supertest, against `aocc_test` DB and a real (test-instance) Redis. Python service calls mocked via `nock`/msw at the HTTP layer for unit tests; one integration test hits the real AI service container.
- **Frontend**: Vitest + React Testing Library, API calls mocked via MSW.
- **E2E**: Playwright against the full `docker compose` stack, mock LLM mode, seeded data.
- No fake/hardcoded "passing" results — every reported number comes from an executed command, pasted into the stage report.
- Coverage target: 80%+ meaningful line coverage on Node + Python services (not frontend, not generated code).
