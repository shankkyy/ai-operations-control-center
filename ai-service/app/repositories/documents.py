import json

import asyncpg

from app.services.llm.base import ContextChunk


async def delete_chunks_for_document(pool: asyncpg.Pool, document_id: str) -> None:
    """Supports incremental/re-ingestion: wipe prior chunks before re-chunking."""
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM document_chunks WHERE document_id = $1", document_id)


async def insert_document(pool: asyncpg.Pool, title: str, content_hash: str) -> str:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO documents (title, content_hash, status)
               VALUES ($1, $2, 'pending') RETURNING id""",
            title,
            content_hash,
        )
    return str(row["id"])


async def delete_document(pool: asyncpg.Pool, document_id: str) -> None:
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM documents WHERE id = $1", document_id)


async def mark_document_status(
    pool: asyncpg.Pool, document_id: str, status: str, error: str | None = None
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE documents SET status = $2, error = $3 WHERE id = $1",
            document_id,
            status,
            error,
        )


async def insert_chunks(
    pool: asyncpg.Pool,
    document_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadata: dict,
) -> int:
    metadata_json = json.dumps(metadata)
    rows = [
        (document_id, idx, content, embedding, metadata_json)
        for idx, (content, embedding) in enumerate(zip(chunks, embeddings, strict=True))
    ]
    async with pool.acquire() as conn:
        await conn.executemany(
            """INSERT INTO document_chunks (document_id, chunk_index, content, embedding, metadata)
               VALUES ($1, $2, $3, $4, $5::jsonb)""",
            rows,
        )
    return len(rows)


async def search_similar_chunks(
    pool: asyncpg.Pool, query_embedding: list[float], top_k: int, filters: dict
) -> list[ContextChunk]:
    # metadata filters: simple equality match via JSONB containment
    filter_clause = ""
    args: list = [query_embedding, top_k]
    if filters:
        filter_clause = "WHERE dc.metadata @> $3::jsonb"
        args.append(json.dumps(filters))

    query = f"""
        SELECT dc.id AS chunk_id, dc.document_id, dc.content, d.title,
               1 - (dc.embedding <=> $1) AS similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        {filter_clause}
        ORDER BY dc.embedding <=> $1
        LIMIT $2
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)
    return [
        ContextChunk(
            chunk_id=str(r["chunk_id"]),
            document_id=str(r["document_id"]),
            title=r["title"],
            content=r["content"],
            similarity=float(r["similarity"]),
        )
        for r in rows
    ]
