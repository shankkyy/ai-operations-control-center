import pytest


async def _create_document(pool, title="Test Doc", content_hash="hash-1"):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO documents (title, content_hash) VALUES ($1, $2) RETURNING id",
            title,
            content_hash,
        )
    return str(row["id"])


@pytest.mark.asyncio
async def test_ingest_creates_chunks_and_marks_ready(client, pool):
    doc_id = await _create_document(pool)
    resp = await client.post(
        "/ingest",
        json={
            "document_id": doc_id,
            "title": "Test Doc",
            "content": "word " * 50,
            "metadata": {"source": "test"},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ready"
    assert body["chunks_created"] > 0

    async with pool.acquire() as conn:
        count = await conn.fetchval(
            "SELECT count(*) FROM document_chunks WHERE document_id = $1", doc_id
        )
        status = await conn.fetchval("SELECT status FROM documents WHERE id = $1", doc_id)
    assert count == body["chunks_created"]
    assert status == "ready"


@pytest.mark.asyncio
async def test_ingest_empty_content_marks_failed(client, pool):
    doc_id = await _create_document(pool, content_hash="hash-2")
    resp = await client.post(
        "/ingest", json={"document_id": doc_id, "title": "Empty", "content": "   ", "metadata": {}}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "failed"
    assert body["chunks_created"] == 0


@pytest.mark.asyncio
async def test_reingest_replaces_prior_chunks(client, pool):
    doc_id = await _create_document(pool, content_hash="hash-3")
    await client.post(
        "/ingest", json={"document_id": doc_id, "title": "Doc", "content": "a " * 20, "metadata": {}}
    )
    resp = await client.post(
        "/ingest", json={"document_id": doc_id, "title": "Doc", "content": "b " * 5, "metadata": {}}
    )
    assert resp.status_code == 200
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            "SELECT count(*) FROM document_chunks WHERE document_id = $1", doc_id
        )
    assert count == resp.json()["chunks_created"]
