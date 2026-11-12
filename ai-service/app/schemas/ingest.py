from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    document_id: str
    title: str
    content: str = Field(min_length=1)
    metadata: dict = Field(default_factory=dict)


class IngestResponse(BaseModel):
    document_id: str
    chunks_created: int
    status: str
    error: str | None = None
