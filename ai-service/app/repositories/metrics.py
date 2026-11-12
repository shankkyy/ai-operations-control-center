import asyncpg


async def distinct_metric_names(pool: asyncpg.Pool) -> list[str]:
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT DISTINCT metric_name FROM operational_metrics")
    return [r["metric_name"] for r in rows]


async def recent_values(pool: asyncpg.Pool, metric_name: str, window: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """SELECT value, recorded_at FROM operational_metrics
               WHERE metric_name = $1
               ORDER BY recorded_at DESC
               LIMIT $2""",
            metric_name,
            window,
        )
