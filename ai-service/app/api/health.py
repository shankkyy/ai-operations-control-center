from fastapi import APIRouter, Depends

from app.core.db import get_pool

router = APIRouter()


@router.get("/health")
async def health(pool=Depends(get_pool)):
    async with pool.acquire() as conn:
        await conn.execute("SELECT 1")
    return {"status": "ok"}
