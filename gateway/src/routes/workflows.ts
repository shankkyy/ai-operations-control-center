import { Router } from "express";
import { approveRun, createRun, getRun, listRuns } from "../controllers/workflowsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const workflowsRouter = Router();

workflowsRouter.post("/workflows/runs", requireAuth, requireRole("admin", "operator"), asyncHandler(createRun));
workflowsRouter.get("/workflows/runs", requireAuth, asyncHandler(listRuns));
workflowsRouter.get("/workflows/runs/:id", requireAuth, asyncHandler(getRun));
workflowsRouter.post(
  "/workflows/runs/:id/approve",
  requireAuth,
  requireRole("admin", "operator"),
  asyncHandler(approveRun)
);
