import math

import pytest

from app.services.embeddings.mock import MockEmbeddingProvider


@pytest.mark.asyncio
async def test_embeddings_are_unit_length():
    provider = MockEmbeddingProvider(dim=384)
    [vec] = await provider.embed(["the payment gateway returned a 503 error"])
    norm = math.sqrt(sum(v * v for v in vec))
    assert abs(norm - 1.0) < 1e-6


@pytest.mark.asyncio
async def test_similar_texts_are_closer_than_unrelated_text():
    provider = MockEmbeddingProvider(dim=384)
    a, b, c = await provider.embed(
        [
            "payment gateway returned a 503 error during checkout",
            "the gateway is returning 503 errors on payment requests",
            "quarterly stock buyback policy announcement",
        ]
    )

    def cosine(x, y):
        return sum(xi * yi for xi, yi in zip(x, y, strict=True))

    assert cosine(a, b) > cosine(a, c)


@pytest.mark.asyncio
async def test_is_deterministic():
    provider = MockEmbeddingProvider(dim=384)
    [v1] = await provider.embed(["same text twice"])
    [v2] = await provider.embed(["same text twice"])
    assert v1 == v2
