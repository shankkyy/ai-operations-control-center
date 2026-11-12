from collections.abc import AsyncIterator
from dataclasses import dataclass

import asyncpg

from app.core.config import Settings
from app.repositories.documents import (
    delete_chunks_for_document,
    insert_chunks,
    mark_document_status,
    search_similar_chunks,
)
from app.services.chunking import chunk_text
from app.services.embeddings.base import EmbeddingProvider
from app.services.llm.base import ContextChunk, LLMProvider


@dataclass
class IngestResult:
    chunks_created: int
    status: str
    error: str | None = None


async def ingest_document(
    pool: asyncpg.Pool,
    embeddings: EmbeddingProvider,
    settings: Settings,
    document_id: str,
    content: str,
    metadata: dict,
) -> IngestResult:
    try:
        await delete_chunks_for_document(pool, document_id)
        chunks = chunk_text(content, settings.rag_chunk_size, settings.rag_chunk_overlap)
        if not chunks:
            await mark_document_status(pool, document_id, "failed", "empty content")
            return IngestResult(0, "failed", "empty content")

        vectors = await embeddings.embed(chunks)
        created = await insert_chunks(pool, document_id, chunks, vectors, metadata)
        await mark_document_status(pool, document_id, "ready")
        return IngestResult(created, "ready")
    except Exception as exc:  # noqa: BLE001 - surfaced to caller, not swallowed
        await mark_document_status(pool, document_id, "failed", str(exc))
        return IngestResult(0, "failed", str(exc))


@dataclass
class QueryResult:
    sources: list[ContextChunk]
    confidence: float
    insufficient_evidence: bool


async def retrieve(
    pool: asyncpg.Pool,
    embeddings: EmbeddingProvider,
    settings: Settings,
    question: str,
    top_k: int | None,
    filters: dict,
) -> QueryResult:
    k = top_k or settings.rag_top_k
    [query_vec] = await embeddings.embed([question])
    chunks = await search_similar_chunks(pool, query_vec, k, filters)

    confidence = chunks[0].similarity if chunks else 0.0
    insufficient = confidence < settings.rag_min_similarity
    return QueryResult(sources=[] if insufficient else chunks, confidence=confidence, insufficient_evidence=insufficient)


async def stream_answer(
    llm: LLMProvider, question: str, result: QueryResult
) -> AsyncIterator[str]:
    async for piece in llm.stream_answer(question, result.sources):
        yield piece
