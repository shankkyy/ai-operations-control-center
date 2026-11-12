from app.services.llm.base import ContextChunk, LLMProvider

_SEVERITY_WEIGHT = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def _context_chunks(label: str, items: list[str]) -> list[ContextChunk]:
    return [
        ContextChunk(chunk_id=f"ctx-{i}", document_id="context", title=label, content=item, similarity=1.0)
        for i, item in enumerate(items)
    ]


async def _summarize_incident(context: dict, llm: LLMProvider) -> dict:
    events = context.get("events", [])
    text = await llm.generate(
        "Summarize this operational incident and call out the key timeline events.",
        _context_chunks("incident event", [str(e) for e in events]),
    )
    return {"summary": text}


async def _investigate_anomaly(context: dict, llm: LLMProvider) -> dict:
    anomaly = context.get("anomaly", {})
    text = await llm.generate(
        "Investigate this anomaly and list the most probable root causes to check.",
        _context_chunks("anomaly", [str(anomaly)]),
    )
    return {"analysis": text}


async def _compose_report(context: dict, llm: LLMProvider) -> dict:
    metrics = context.get("metrics", [])
    alerts = context.get("alerts", [])
    text = await llm.generate(
        "Compose an operational report summarizing these metrics and alerts.",
        _context_chunks("operational data", [str(metrics), str(alerts)]),
    )
    return {"report": text}


async def _prioritize_alerts(context: dict, _llm: LLMProvider) -> dict:
    alerts = context.get("alerts", [])
    ranked = sorted(
        alerts,
        key=lambda a: (_SEVERITY_WEIGHT.get(a.get("severity", "low"), 0), a.get("created_at", "")),
        reverse=True,
    )
    return {"ranked_alerts": ranked}


async def _suggest_remediation(context: dict, llm: LLMProvider) -> dict:
    subject = context.get("anomaly") or context.get("alert") or {}
    text = await llm.generate(
        "Suggest a concrete remediation action for this operational issue. "
        "This is a suggestion only — it will require human approval before execution.",
        _context_chunks("issue", [str(subject)]),
    )
    return {"suggested_action": text}


_HANDLERS = {
    ("incident_summary", "summarize"): _summarize_incident,
    ("anomaly_investigation", "analyze"): _investigate_anomaly,
    ("report_generation", "compose_report"): _compose_report,
    ("alert_prioritization", "rank"): _prioritize_alerts,
    ("remediation_suggestion", "suggest"): _suggest_remediation,
}


class UnknownWorkflowStep(Exception):
    pass


async def execute_step(workflow_type: str, step_name: str, context: dict, llm: LLMProvider) -> dict:
    handler = _HANDLERS.get((workflow_type, step_name))
    if handler is None:
        raise UnknownWorkflowStep(f"no handler for {workflow_type}/{step_name}")
    return await handler(context, llm)
