from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://aocc:aocc_dev_password@localhost:5432/aocc"

    llm_provider: str = "mock"
    embedding_provider: str = "mock"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 384

    rag_top_k: int = 5
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50
    rag_min_similarity: float = 0.2

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
