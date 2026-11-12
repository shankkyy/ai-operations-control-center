import { Router } from "express";
import { listAnomalies } from "../controllers/anomaliesController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const anomaliesRouter = Router();

anomaliesRouter.get("/anomalies", requireAuth, asyncHandler(listAnomalies));
