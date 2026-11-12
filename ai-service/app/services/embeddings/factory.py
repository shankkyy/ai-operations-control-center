from functools import lru_cache

from app.core.config import get_settings
from app.services.embeddings.base import EmbeddingProvider
from app.services.embeddings.mock import MockEmbeddingProvider
from app.services.embeddings.openai import OpenAIEmbeddingProvider


@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    if settings.embedding_provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("EMBEDDING_PROVIDER=openai requires OPENAI_API_KEY")
        return OpenAIEmbeddingProvider(
            settings.openai_api_key, settings.embedding_model, settings.embedding_dim
        )
    return MockEmbeddingProvider(settings.embedding_dim)
