from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.db import get_pool
from app.evaluation.runner import run_eval
from app.schemas.eval import EvalRunResponse
from app.services.embeddings.base import EmbeddingProvider
from app.services.embeddings.factory import get_embedding_provider
from app.services.llm.base import LLMProvider
from app.services.llm.factory import get_llm_provider

router = APIRouter()


@router.post("/eval/run", response_model=EvalRunResponse)
async def run(
    pool=Depends(get_pool),
    embeddings: EmbeddingProvider = Depends(get_embedding_provider),
    llm: LLMProvider = Depends(get_llm_provider),
    settings: Settings = Depends(get_settings),
):
    metrics = await run_eval(pool, embeddings, llm, settings)
    return EvalRunResponse(metrics=metrics, provider=settings.llm_provider)
