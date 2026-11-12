import datetime

import pytest


async def _insert_metric(pool, name, value, recorded_at):
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO operational_metrics (metric_name, value, recorded_at) VALUES ($1, $2, $3)",
            name,
            value,
            recorded_at,
        )


@pytest.mark.asyncio
async def test_detects_spike_against_stable_baseline(client, pool):
    now = datetime.datetime.now(datetime.timezone.utc)
    for i in range(20):
        await _insert_metric(pool, "cpu_usage", 50 + (i % 2), now - datetime.timedelta(minutes=20 - i))
    # latest point is a clear spike
    await _insert_metric(pool, "cpu_usage", 500, now)

    resp = await client.post("/anomalies/scan", json={"metric_name": "cpu_usage", "window": 21, "z_threshold": 2.0})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["anomalies"]) == 1
    assert body["anomalies"][0]["metric_name"] == "cpu_usage"
    assert body["anomalies"][0]["severity"] in {"medium", "high", "critical"}


@pytest.mark.asyncio
async def test_stable_metric_has_no_anomalies(client, pool):
    now = datetime.datetime.now(datetime.timezone.utc)
    for i in range(10):
        await _insert_metric(pool, "stable_metric", 50, now - datetime.timedelta(minutes=i))

    resp = await client.post("/anomalies/scan", json={"metric_name": "stable_metric", "window": 10})
    assert resp.json()["anomalies"] == []


@pytest.mark.asyncio
async def test_insufficient_data_points_are_skipped(client, pool):
    await _insert_metric(pool, "sparse_metric", 1, datetime.datetime.now(datetime.timezone.utc))
    resp = await client.post("/anomalies/scan", json={"metric_name": "sparse_metric"})
    assert resp.json()["anomalies"] == []
