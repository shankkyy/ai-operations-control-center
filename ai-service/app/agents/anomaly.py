import statistics

import asyncpg

from app.repositories.metrics import distinct_metric_names, recent_values
from app.schemas.anomaly import Anomaly


def _severity(z: float, threshold: float) -> str:
    if z >= threshold * 1.6:
        return "critical"
    if z >= threshold * 1.3:
        return "high"
    return "medium"


async def detect_anomalies(
    pool: asyncpg.Pool, metric_name: str | None, window: int, z_threshold: float
) -> tuple[list[Anomaly], int]:
    names = [metric_name] if metric_name else await distinct_metric_names(pool)
    anomalies: list[Anomaly] = []

    for name in names:
        rows = await recent_values(pool, name, window)
        if len(rows) < 3:
            continue
        values = [float(r["value"]) for r in rows]
        mean = statistics.mean(values)
        stdev = statistics.pstdev(values)
        if stdev == 0:
            continue
        # newest point is rows[0] (DESC order)
        latest_value = values[0]
        z = (latest_value - mean) / stdev
        if abs(z) >= z_threshold:
            anomalies.append(
                Anomaly(
                    metric_name=name,
                    value=latest_value,
                    z_score=round(z, 3),
                    severity=_severity(abs(z), z_threshold),
                    recorded_at=rows[0]["recorded_at"],
                )
            )

    return anomalies, len(names)
