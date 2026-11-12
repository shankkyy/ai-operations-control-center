import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.config import Settings, get_settings
from app.core.db import get_pool
from app.rag.pipeline import retrieve
from app.schemas.rag import RagQueryRequest
from app.services.embeddings.base import EmbeddingProvider
from app.services.embeddings.factory import get_embedding_provider
from app.services.llm.base import LLMProvider
from app.services.llm.factory import get_llm_provider

router = APIRouter()


@router.post("/rag/query")
async def rag_query(
    req: RagQueryRequest,
    pool=Depends(get_pool),
    embeddings: EmbeddingProvider = Depends(get_embedding_provider),
    llm: LLMProvider = Depends(get_llm_provider),
    settings: Settings = Depends(get_settings),
):
    result = await retrieve(pool, embeddings, settings, req.question, req.top_k, req.filters)

    async def event_stream():
        full_answer = []
        async for piece in llm.stream_answer(req.question, result.sources):
            full_answer.append(piece)
            yield f"data: {json.dumps({'type': 'answer_chunk', 'text': piece})}\n\n"

        final = {
            "type": "done",
            "answer": "".join(full_answer),
            "sources": [
                {
                    "document_id": s.document_id,
                    "chunk_id": s.chunk_id,
                    "title": s.title,
                    "similarity": s.similarity,
                    "excerpt": s.content[:200],
                }
                for s in result.sources
            ],
            "confidence": result.confidence,
            "insufficient_evidence": result.insufficient_evidence,
        }
        yield f"data: {json.dumps(final)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
