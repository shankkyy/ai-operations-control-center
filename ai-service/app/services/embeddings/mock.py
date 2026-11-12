import hashlib
import math
import re

from app.services.embeddings.base import EmbeddingProvider

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


class MockEmbeddingProvider(EmbeddingProvider):
    """Deterministic feature-hashed bag-of-words embedding.

    Not a trained model, but a real signal: texts sharing vocabulary land
    close in cosine space, so semantic-retrieval tests are meaningful
    without a paid embeddings API.
    """

    def __init__(self, dim: int = 384):
        self.dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]

    def _embed_one(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for token in _tokenize(text):
            digest = hashlib.sha256(token.encode()).digest()
            bucket = int.from_bytes(digest[:4], "big") % self.dim
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vec[bucket] += sign

        norm = math.sqrt(sum(v * v for v in vec))
        if norm == 0:
            return vec
        return [v / norm for v in vec]
