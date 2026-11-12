from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.db import get_pool
from app.rag.pipeline import ingest_document
from app.schemas.ingest import IngestRequest, IngestResponse
from app.services.embeddings.base import EmbeddingProvider
from app.services.embeddings.factory import get_embedding_provider

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    req: IngestRequest,
    pool=Depends(get_pool),
    embeddings: EmbeddingProvider = Depends(get_embedding_provider),
    settings: Settings = Depends(get_settings),
):
    result = await ingest_document(pool, embeddings, settings, req.document_id, req.content, req.metadata)
    return IngestResponse(
        document_id=req.document_id,
        chunks_created=result.chunks_created,
        status=result.status,
        error=result.error,
    )
