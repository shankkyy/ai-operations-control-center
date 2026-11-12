import pytest


@pytest.mark.asyncio
async def test_eval_run_returns_measured_metrics(client):
    resp = await client.post("/eval/run", json={})
    assert resp.status_code == 200
    metrics = resp.json()["metrics"]

    assert metrics["cases_run"] == 5
    for key in (
        "answer_relevance",
        "groundedness",
        "retrieval_precision",
        "retrieval_recall",
        "hallucination_resistance",
        "structure_validity",
    ):
        assert 0.0 <= metrics[key] <= 1.0
    assert metrics["avg_latency_ms"] > 0
