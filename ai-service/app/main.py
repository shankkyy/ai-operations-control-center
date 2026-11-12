from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import anomalies, eval as eval_api, health, ingest, rag, workflows
from app.core.db import close_pool, get_pool
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="AI Operations Control Center — AI Service", version="1.0.0", lifespan=lifespan)

app.include_router(health.router)
app.include_router(ingest.router)
app.include_router(rag.router)
app.include_router(anomalies.router)
app.include_router(workflows.router)
app.include_router(eval_api.router)
