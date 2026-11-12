from datetime import datetime

from pydantic import BaseModel


class AnomalyScanRequest(BaseModel):
    metric_name: str | None = None
    window: int = 50
    z_threshold: float = 2.5


class Anomaly(BaseModel):
    metric_name: str
    value: float
    z_score: float
    severity: str
    recorded_at: datetime


class AnomalyScanResponse(BaseModel):
    anomalies: list[Anomaly]
    scanned_metrics: int
