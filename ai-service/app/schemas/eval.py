from pydantic import BaseModel


class EvalMetrics(BaseModel):
    answer_relevance: float
    groundedness: float
    retrieval_precision: float
    retrieval_recall: float
    hallucination_resistance: float
    structure_validity: float
    avg_latency_ms: float
    cases_run: int


class EvalRunResponse(BaseModel):
    metrics: EvalMetrics
    provider: str
