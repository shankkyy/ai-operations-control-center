from functools import lru_cache

from app.core.config import get_settings
from app.services.llm.anthropic import AnthropicLLMProvider
from app.services.llm.base import LLMProvider
from app.services.llm.mock import MockLLMProvider
from app.services.llm.openai import OpenAILLMProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.llm_provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("LLM_PROVIDER=openai requires OPENAI_API_KEY")
        return OpenAILLMProvider(settings.openai_api_key, settings.llm_model)
    if settings.llm_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise RuntimeError("LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY")
        return AnthropicLLMProvider(settings.anthropic_api_key, settings.llm_model)
    return MockLLMProvider()
