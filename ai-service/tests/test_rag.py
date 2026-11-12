import json

import pytest


def _parse_sse(body: str) -> list[dict]:
    events = []
    for line in body.splitlines():
        if line.startswith("data: "):
            events.append(json.loads(line[len("data: "):]))
    return events


async def _create_and_ingest(client, pool, title, content, content_hash):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO documents (title, content_hash) VALUES ($1, $2) RETURNING id",
            title,
            content_hash,
        )
    doc_id = str(row["id"])
    resp = await client.post(
        "/ingest", json={"document_id": doc_id, "title": title, "content": content, "metadata": {}}
    )
    assert resp.json()["status"] == "ready"
    return doc_id


@pytest.mark.asyncio
async def test_rag_query_returns_grounded_answer_with_sources(client, pool):
    await _create_and_ingest(
        client,
        pool,
        "Payment Gateway Outage Runbook",
        "When the payment gateway returns 503 errors, restart the gateway pods and check the processor status page.",
        "rag-hash-1",
    )

    resp = await client.post("/rag/query", json={"question": "payment gateway 503 errors", "top_k": 3})
    assert resp.status_code == 200
    events = _parse_sse(resp.text)
    final = next(e for e in events if e["type"] == "done")

    assert final["insufficient_evidence"] is False
    assert len(final["sources"]) > 0
    assert final["sources"][0]["title"] == "Payment Gateway Outage Runbook"
    assert "Payment Gateway Outage Runbook" in final["answer"]


@pytest.mark.asyncio
async def test_rag_query_with_no_matching_documents_is_insufficient(client, pool):
    resp = await client.post("/rag/query", json={"question": "something totally unrelated xyz"})
    events = _parse_sse(resp.text)
    final = next(e for e in events if e["type"] == "done")

    assert final["insufficient_evidence"] is True
    assert final["sources"] == []
    assert "don't have enough" in final["answer"].lower()
