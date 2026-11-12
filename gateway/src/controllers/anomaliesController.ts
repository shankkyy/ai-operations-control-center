import type { Request, Response } from "express";
import { redis } from "../services/redis.js";
import { anomalyScan } from "../services/aiServiceClient.js";

const CACHE_TTL_SECONDS = 30;

export async function listAnomalies(req: Request, res: Response): Promise<void> {
  const metricName = typeof req.query.metric_name === "string" ? req.query.metric_name : undefined;
  const cacheKey = `anomalies:${metricName ?? "all"}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const result = await anomalyScan(metricName, 50, 2.5);
  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  res.json(result);
}
