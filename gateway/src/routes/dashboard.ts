import { Router } from "express";
import { getSummary } from "../controllers/dashboardController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/summary", requireAuth, asyncHandler(getSummary));
