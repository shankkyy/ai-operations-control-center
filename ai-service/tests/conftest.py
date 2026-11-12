import os

import asyncpg
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from pgvector.asyncpg import register_vector

TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL_TEST", "postgresql://aocc:aocc_dev_password@localhost:5432/aocc_test"
)

_TABLES = [
    "conversation_messages",
    "conversations",
    "workflow_steps",
    "workflow_runs",
    "audit_logs",
    "alerts",
    "operational_metrics",
    "document_chunks",
    "documents",
    "users",
]


async def _init_connection(conn: asyncpg.Connection) -> None:
    await register_vector(conn)


@pytest_asyncio.fixture
async def pool():
    pool = await asyncpg.create_pool(TEST_DATABASE_URL, init=_init_connection, min_size=1, max_size=5)
    async with pool.acquire() as conn:
        await conn.execute(f"TRUNCATE {', '.join(_TABLES)} RESTART IDENTITY CASCADE")
    yield pool
    await pool.close()


@pytest_asyncio.fixture
async def client(pool):
    from app.core.db import get_pool
    from app.main import app

    app.dependency_overrides[get_pool] = lambda: pool
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
