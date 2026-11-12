import { Router } from "express";
import { listAlerts, patchAlert } from "../controllers/alertsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const alertsRouter = Router();

alertsRouter.get("/alerts", requireAuth, asyncHandler(listAlerts));
alertsRouter.patch("/alerts/:id", requireAuth, requireRole("admin", "operator"), asyncHandler(patchAlert));
