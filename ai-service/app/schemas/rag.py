from pydantic import BaseModel, Field


class RagQueryRequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int | None = None
    filters: dict = Field(default_factory=dict)


class SourceRef(BaseModel):
    document_id: str
    chunk_id: str
    title: str
    similarity: float
    excerpt: str


class RagQueryResponse(BaseModel):
    answer: str
    sources: list[SourceRef]
    confidence: float
    insufficient_evidence: bool
