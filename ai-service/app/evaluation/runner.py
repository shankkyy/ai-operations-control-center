import re
import time

import asyncpg

from app.core.config import Settings
from app.evaluation.dataset import CORPUS, QUERIES
from app.rag.pipeline import retrieve
from app.repositories.documents import delete_document, insert_chunks, insert_document
from app.schemas.eval import EvalMetrics
from app.schemas.rag import RagQueryResponse, SourceRef
from app.services.chunking import chunk_text
from app.services.embeddings.base import EmbeddingProvider
from app.services.llm.base import LLMProvider

_WORD_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> set[str]:
    return set(_WORD_RE.findall(text.lower()))


async def _load_corpus(pool: asyncpg.Pool, embeddings: EmbeddingProvider) -> list[str]:
    doc_ids = []
    for i, doc in enumerate(CORPUS):
        doc_id = await insert_document(pool, doc["title"], f"eval-{i}-{time.time_ns()}")
        chunks = chunk_text(doc["content"], chunk_size=500, overlap=0)
        vectors = await embeddings.embed(chunks)
        await insert_chunks(pool, doc_id, chunks, vectors, metadata={"eval": True})
        doc_ids.append(doc_id)
    return doc_ids


async def run_eval(
    pool: asyncpg.Pool, embeddings: EmbeddingProvider, llm: LLMProvider, settings: Settings
) -> EvalMetrics:
    doc_ids = await _load_corpus(pool, embeddings)
    try:
        relevance_scores = []
        groundedness_scores = []
        precisions = []
        recalls = []
        hallucination_hits = 0
        hallucination_total = 0
        structure_valid = 0
        latencies_ms = []

        for case in QUERIES:
            start = time.perf_counter()
            result = await retrieve(pool, embeddings, settings, case["question"], top_k=3, filters={})
            answer = await llm.generate(case["question"], result.sources)
            elapsed_ms = (time.perf_counter() - start) * 1000
            latencies_ms.append(elapsed_ms)

            response = {
                "answer": answer,
                "sources": [
                    SourceRef(
                        document_id=s.document_id,
                        chunk_id=s.chunk_id,
                        title=s.title,
                        similarity=s.similarity,
                        excerpt=s.content[:200],
                    )
                    for s in result.sources
                ],
                "confidence": result.confidence,
                "insufficient_evidence": result.insufficient_evidence,
            }
            try:
                RagQueryResponse(**response)
                structure_valid += 1
            except Exception:  # noqa: BLE001 - counted as a structure-validity failure, not swallowed
                pass

            if case["expect_insufficient"]:
                hallucination_total += 1
                if result.insufficient_evidence:
                    hallucination_hits += 1
                continue

            retrieved_titles = {s.title for s in result.sources}
            expected_titles = set(case["expected_titles"])
            overlap = retrieved_titles & expected_titles
            precisions.append(len(overlap) / len(retrieved_titles) if retrieved_titles else 0.0)
            recalls.append(len(overlap) / len(expected_titles) if expected_titles else 1.0)

            keyword_hits = sum(1 for kw in case["expected_keywords"] if kw.lower() in answer.lower())
            relevance_scores.append(keyword_hits / len(case["expected_keywords"]) if case["expected_keywords"] else 1.0)

            context_tokens: set[str] = set()
            for s in result.sources:
                context_tokens |= _tokens(s.content)
            answer_tokens = _tokens(answer)
            groundedness_scores.append(
                len(answer_tokens & context_tokens) / len(answer_tokens) if answer_tokens else 0.0
            )

        def _avg(values: list[float]) -> float:
            return sum(values) / len(values) if values else 0.0

        return EvalMetrics(
            answer_relevance=round(_avg(relevance_scores), 3),
            groundedness=round(_avg(groundedness_scores), 3),
            retrieval_precision=round(_avg(precisions), 3),
            retrieval_recall=round(_avg(recalls), 3),
            hallucination_resistance=round(hallucination_hits / hallucination_total, 3) if hallucination_total else 0.0,
            structure_validity=round(structure_valid / len(QUERIES), 3),
            avg_latency_ms=round(_avg(latencies_ms), 2),
            cases_run=len(QUERIES),
        )
    finally:
        for doc_id in doc_ids:
            await delete_document(pool, doc_id)
