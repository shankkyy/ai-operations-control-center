import { Router } from "express";
import { listMetricSeries } from "../controllers/metricsController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const metricsRouter = Router();

metricsRouter.get("/metrics", requireAuth, asyncHandler(listMetricSeries));
