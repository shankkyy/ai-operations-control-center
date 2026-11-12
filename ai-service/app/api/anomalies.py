from fastapi import APIRouter, Depends

from app.agents.anomaly import detect_anomalies
from app.core.db import get_pool
from app.schemas.anomaly import AnomalyScanRequest, AnomalyScanResponse

router = APIRouter()


@router.post("/anomalies/scan", response_model=AnomalyScanResponse)
async def scan(req: AnomalyScanRequest, pool=Depends(get_pool)):
    anomalies, scanned = await detect_anomalies(pool, req.metric_name, req.window, req.z_threshold)
    return AnomalyScanResponse(anomalies=anomalies, scanned_metrics=scanned)
