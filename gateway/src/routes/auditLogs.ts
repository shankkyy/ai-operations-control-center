import { Router } from "express";
import { listAuditLogs } from "../controllers/auditLogsController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const auditLogsRouter = Router();

auditLogsRouter.get("/audit-logs", requireAuth, asyncHandler(listAuditLogs));
