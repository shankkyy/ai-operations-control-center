import { Router } from "express";
import { pool } from "../services/db.js";
import { redis } from "../services/redis.js";
import { aiServiceHealthy } from "../services/aiServiceClient.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const [dbOk, redisOk, aiOk] = await Promise.all([
    pool.query("SELECT 1").then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
    aiServiceHealthy(),
  ]);

  const healthy = dbOk && redisOk && aiOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    postgres: dbOk,
    redis: redisOk,
    aiService: aiOk,
  });
});
