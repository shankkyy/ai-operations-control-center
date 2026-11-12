import pytest


@pytest.mark.asyncio
async def test_incident_summary_step(client):
    resp = await client.post(
        "/workflows/execute-step",
        json={
            "workflow_type": "incident_summary",
            "step_name": "summarize",
            "context": {"events": ["gateway returned 503s at 10:00", "restarted pods at 10:05"]},
        },
    )
    assert resp.status_code == 200
    assert "summary" in resp.json()["output"]


@pytest.mark.asyncio
async def test_alert_prioritization_ranks_by_severity(client):
    resp = await client.post(
        "/workflows/execute-step",
        json={
            "workflow_type": "alert_prioritization",
            "step_name": "rank",
            "context": {
                "alerts": [
                    {"title": "low one", "severity": "low", "created_at": "2026-01-01"},
                    {"title": "critical one", "severity": "critical", "created_at": "2026-01-01"},
                ]
            },
        },
    )
    assert resp.status_code == 200
    ranked = resp.json()["output"]["ranked_alerts"]
    assert ranked[0]["title"] == "critical one"


@pytest.mark.asyncio
async def test_unknown_step_returns_400(client):
    resp = await client.post(
        "/workflows/execute-step",
        json={"workflow_type": "incident_summary", "step_name": "not_a_real_step", "context": {}},
    )
    assert resp.status_code == 400
